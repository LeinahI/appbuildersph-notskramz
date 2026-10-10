package ph.appbuilders.ugatan;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.LinkAddress;
import android.net.LinkProperties;
import android.net.Network;
import android.net.RouteInfo;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.ai.edge.litertlm.Backend;
import com.google.ai.edge.litertlm.BenchmarkInfo;
import com.google.ai.edge.litertlm.Content;
import com.google.ai.edge.litertlm.Contents;
import com.google.ai.edge.litertlm.Conversation;
import com.google.ai.edge.litertlm.ConversationConfig;
import com.google.ai.edge.litertlm.Engine;
import com.google.ai.edge.litertlm.EngineConfig;
import com.google.ai.edge.litertlm.Message;
import com.google.ai.edge.litertlm.SamplerConfig;
import com.google.ai.edge.litertlm.ThinkingConfig;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.net.Inet4Address;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.RandomAccessFile;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;
import java.nio.charset.StandardCharsets;

/**
 * Gemma 4 E2B on the phone itself, through Google's LiteRT-LM, for phones whose GPU cannot run the model in the web
 * view (WebGPU). The model file (about 2.6 GB) comes once from the hub over its Wi-Fi and stays in the app's private
 * storage. It runs on the CPU by default: no WebGPU, no 16-bit shaders, and the 1.12 GB embedding table is
 * memory-mapped from the file instead of loaded.
 *
 * Calls from the page: status(), download({ url }), load({ backend }), generate({ system, turns, prompt, image,
 * maxTokens }), unload(). Download progress arrives as "downloadProgress" events ({ loaded, total }).
 */
@CapacitorPlugin(name = "LocalLlm")
public class LocalLlmPlugin extends Plugin {
    private static final String MODEL_FILE = "gemma-4-E2B-it.litertlm";
    /** Room kept free on the phone beyond the download, so the app and the phone keep working. */
    private static final long SPARE_BYTES = 300L * 1024 * 1024;
    /** Context the engine keeps: the app's prompts with notes and four earlier turns stay well under it. */
    private static final int MAX_TOKENS = 4096;

    /** One download at a time, and one model job at a time, each off the page's thread. */
    private final ExecutorService downloads = Executors.newSingleThreadExecutor();
    private final ExecutorService engineJobs = Executors.newSingleThreadExecutor();
    private volatile Engine engine;
    private volatile String backendName = "";

    private File modelFile() {
        return new File(new File(getContext().getFilesDir(), "models"), MODEL_FILE);
    }

    private File partFile() {
        return new File(modelFile().getPath() + ".part");
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("downloaded", modelFile().isFile());
        result.put("bytes", modelFile().length());
        result.put("partBytes", partFile().length());
        result.put("loaded", engine != null);
        result.put("backend", backendName);
        result.put("freeBytes", getContext().getFilesDir().getUsableSpace());
        call.resolve(result);
    }

    /** Parallel parts of the download. The hotspot's latency caps one stream at about 1 MB/s; four share the link. */
    private static final int PARTS = 4;

    /**
     * Downloads the model from the hub in PARTS byte ranges at once, each picking up where it stopped. Progress is kept
     * in a small file beside the download, so a dropped Wi-Fi or a closed app resumes instead of starting over.
     */
    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("No hub address for the model.");
            return;
        }
        if (modelFile().isFile()) {
            JSObject done = new JSObject();
            done.put("bytes", modelFile().length());
            call.resolve(done);
            return;
        }
        downloads.execute(() -> {
            try {
                File part = partFile();
                File dir = part.getParentFile();
                if (dir != null && !dir.isDirectory() && !dir.mkdirs()) throw new IOException("Cannot make the model folder.");
                long total = remoteSize(url);
                File state = new File(part.getPath() + ".json");
                long[][] ranges = loadRanges(state, part, total);
                long need = 0;
                for (long[] r : ranges) need += r[2] - r[1];
                if (getContext().getFilesDir().getUsableSpace() < need + SPARE_BYTES) throw new IOException("NO_SPACE");
                try (RandomAccessFile file = new RandomAccessFile(part, "rw")) {
                    if (file.length() != total) file.setLength(total);
                }
                AtomicLong loaded = new AtomicLong(total - need);
                AtomicReference<Exception> failure = new AtomicReference<>();
                Thread[] workers = new Thread[ranges.length];
                for (int i = 0; i < ranges.length; i++) {
                    long[] range = ranges[i];
                    workers[i] = new Thread(() -> {
                        try {
                            fetchRange(url, part, range, loaded);
                        } catch (Exception e) {
                            failure.compareAndSet(null, e);
                        }
                    }, "model-download-" + i);
                    workers[i].start();
                }
                // Report progress and save where each part is, until every part has finished.
                boolean running = true;
                while (running) {
                    running = false;
                    for (Thread t : workers) {
                        t.join(500);
                        if (t.isAlive()) running = true;
                    }
                    progress(loaded.get(), total);
                    saveRanges(state, total, ranges);
                }
                if (failure.get() != null) throw failure.get();
                for (long[] r : ranges) {
                    if (r[1] < r[2]) throw new IOException("The download stopped before the end. Try again on the hub's Wi-Fi.");
                }
                if (!part.renameTo(modelFile())) throw new IOException("Cannot keep the model file.");
                //noinspection ResultOfMethodCallIgnored
                state.delete();
                progress(total, total);
                JSObject done = new JSObject();
                done.put("bytes", modelFile().length());
                call.resolve(done);
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : e.toString());
            }
        });
    }

    /** The model's size, from a one-byte range request. */
    private static long remoteSize(String url) throws IOException {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        try {
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            conn.setRequestProperty("Range", "bytes=0-0");
            int code = conn.getResponseCode();
            if (code == 206) {
                String range = conn.getHeaderField("Content-Range");
                if (range != null && range.contains("/")) return Long.parseLong(range.substring(range.lastIndexOf('/') + 1).trim());
            }
            if (code == 200 && conn.getContentLengthLong() > 0) return conn.getContentLengthLong();
            throw new IOException("Hub returned " + code + " for the model.");
        } finally {
            conn.disconnect();
        }
    }

    /**
     * The parts still to fetch, as [index, next byte, end exclusive]. Resumes from the saved state when it matches the
     * file's size; an older single-stream download counts as a finished first part.
     */
    private static long[][] loadRanges(File state, File part, long total) {
        try {
            if (state.isFile() && part.isFile()) {
                JSONObject saved = new JSONObject(new String(java.nio.file.Files.readAllBytes(state.toPath()), StandardCharsets.UTF_8));
                if (saved.getLong("total") == total) {
                    JSONArray next = saved.getJSONArray("next");
                    JSONArray end = saved.getJSONArray("end");
                    long[][] ranges = new long[next.length()][];
                    for (int i = 0; i < next.length(); i++) ranges[i] = new long[] {i, next.getLong(i), end.getLong(i)};
                    return ranges;
                }
            }
        } catch (Exception ignored) {
            // A damaged state file: start the ranges again below.
        }
        long start = part.isFile() && !state.isFile() ? Math.min(part.length(), total) : 0;
        long size = total - start;
        long[][] ranges = new long[PARTS][];
        for (int i = 0; i < PARTS; i++) {
            long from = start + size * i / PARTS;
            long to = i == PARTS - 1 ? total : start + size * (i + 1) / PARTS;
            ranges[i] = new long[] {i, from, to};
        }
        return ranges;
    }

    private static void saveRanges(File state, long total, long[][] ranges) {
        try {
            JSONObject json = new JSONObject();
            json.put("total", total);
            JSONArray next = new JSONArray();
            JSONArray end = new JSONArray();
            for (long[] r : ranges) {
                next.put(r[1]);
                end.put(r[2]);
            }
            json.put("next", next);
            json.put("end", end);
            java.nio.file.Files.write(state.toPath(), json.toString().getBytes(StandardCharsets.UTF_8));
        } catch (Exception ignored) {
            // Progress is saved again in half a second.
        }
    }

    /** Fetches one part: from its next byte to its end, written in place. Moves range[1] forward as bytes arrive. */
    private static void fetchRange(String url, File part, long[] range, AtomicLong loaded) throws IOException {
        if (range[1] >= range[2]) return;
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        try {
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(60000);
            conn.setRequestProperty("Range", "bytes=" + range[1] + "-" + (range[2] - 1));
            if (conn.getResponseCode() != 206) throw new IOException("Hub returned " + conn.getResponseCode() + " for part of the model.");
            try (InputStream in = new BufferedInputStream(conn.getInputStream(), 1 << 16);
                 RandomAccessFile out = new RandomAccessFile(part, "rw")) {
                out.seek(range[1]);
                byte[] buffer = new byte[1 << 16];
                int n;
                while (range[1] < range[2] && (n = in.read(buffer, 0, (int) Math.min(buffer.length, range[2] - range[1]))) != -1) {
                    out.write(buffer, 0, n);
                    range[1] += n;
                    loaded.addAndGet(n);
                }
            }
        } finally {
            conn.disconnect();
        }
    }

    private void progress(long loaded, long total) {
        JSObject event = new JSObject();
        event.put("loaded", loaded);
        event.put("total", total);
        notifyListeners("downloadProgress", event);
    }

    /** Starts the engine on "cpu" (the default) or "gpu". Takes several seconds; the page shows it as preparing. */
    @PluginMethod
    public void load(PluginCall call) {
        String wanted = call.getString("backend", "cpu");
        // CPU threads. On a phone with 4 fast and 4 slow cores, using all 8 makes the fast ones wait on the slow ones.
        Integer threads = call.getInt("threads", 4);
        engineJobs.execute(() -> {
            try {
                if (engine != null) {
                    resolveLoaded(call, 0);
                    return;
                }
                File file = modelFile();
                if (!file.isFile()) throw new IOException("The model is not on this phone yet.");
                Backend backend = "gpu".equals(wanted) ? new Backend.GPU() : new Backend.CPU(threads != null && threads > 0 ? threads : null, null);
                // Library defaults (from its bytecode) for what is left out: no audio backend, no image limit. The vision
                // part runs on the CPU and loads on the first photo; the cache folder speeds up later starts.
                EngineConfig config = new EngineConfig(file.getAbsolutePath(), backend, new Backend.CPU(), null, MAX_TOKENS, null,
                        getContext().getCacheDir().getAbsolutePath());
                long started = System.currentTimeMillis();
                Engine created = new Engine(config);
                created.initialize();
                engine = created;
                backendName = "gpu".equals(wanted) ? "gpu" : "cpu";
                resolveLoaded(call, (System.currentTimeMillis() - started) / 1000.0);
            } catch (Throwable e) {
                call.reject(e.getMessage() != null ? e.getMessage() : e.toString());
            }
        });
    }

    private void resolveLoaded(PluginCall call, double seconds) {
        JSObject result = new JSObject();
        result.put("backend", backendName);
        result.put("initSeconds", seconds);
        call.resolve(result);
    }

    /**
     * One answer. `system` is the system prompt, `turns` the earlier chat ([{ role: "user" | "model", text }]),
     * `prompt` the new user message, `image` an optional base64 JPEG placed before the text, as the hub sends it.
     * Each call is a fresh conversation, so nothing leaks between questions. Greedy decoding, thinking off.
     */
    @PluginMethod
    public void generate(PluginCall call) {
        String system = call.getString("system", "");
        String prompt = call.getString("prompt", "");
        String image = call.getString("image");
        int maxTokens = call.getInt("maxTokens", 256);
        JSArray turns = call.getArray("turns", new JSArray());
        engineJobs.execute(() -> {
            Engine current = engine;
            if (current == null) {
                call.reject("The AI is not loaded.");
                return;
            }
            try {
                List<Message> earlier = new ArrayList<>();
                for (int i = 0; i < turns.length(); i++) {
                    JSONObject turn = turns.getJSONObject(i);
                    String text = turn.optString("text", "");
                    earlier.add("model".equals(turn.optString("role")) ? Message.Companion.model(text) : Message.Companion.user(text));
                }
                // The library's own defaults (read from its bytecode) for tools (none), automatic tool calling (on),
                // channels (none), extra context (empty), LoRA (none), and prefill preface (off). Greedy decoding
                // (top-k 1), a token cap, and thinking off.
                ConversationConfig config = new ConversationConfig(system.isEmpty() ? null : Contents.Companion.of(system), earlier,
                        Collections.emptyList(), new SamplerConfig(1, 1.0, 1.0, 0), true, null, Collections.emptyMap(), null, false,
                        maxTokens, new ThinkingConfig(false, 0));
                try (Conversation conversation = current.createConversation(config)) {
                    Message message = image != null && !image.isEmpty()
                            ? Message.Companion.user(Contents.Companion.of(new Content.ImageBytes(Base64.decode(image, Base64.DEFAULT)), new Content.Text(prompt)))
                            : Message.Companion.user(prompt);
                    Message reply = conversation.sendMessage(message);
                    StringBuilder text = new StringBuilder();
                    for (Content part : reply.getContents().getContents()) {
                        if (part instanceof Content.Text) text.append(((Content.Text) part).getText());
                    }
                    JSObject result = new JSObject();
                    result.put("text", text.toString());
                    try {
                        BenchmarkInfo info = conversation.getBenchmarkInfo();
                        result.put("prefillTokens", info.getLastPrefillTokenCount());
                        result.put("decodeTokens", info.getLastDecodeTokenCount());
                        result.put("prefillPerSecond", info.getLastPrefillTokensPerSecond());
                        result.put("decodePerSecond", info.getLastDecodeTokensPerSecond());
                        result.put("firstTokenSeconds", info.getTimeToFirstTokenInSecond());
                    } catch (Throwable ignored) {
                        // Speed figures are a bonus; the answer is what matters.
                    }
                    call.resolve(result);
                }
            } catch (Throwable e) {
                call.reject(e.getMessage() != null ? e.getMessage() : e.toString());
            }
        });
    }

    /**
     * The phone's network as the app finds the hub: the default gateway (on a laptop's hotspot, the laptop itself)
     * and the phone's own IPv4 address. Both are null when the phone is on no network.
     */
    @PluginMethod
    public void network(PluginCall call) {
        String gateway = null;
        String ip = null;
        try {
            ConnectivityManager cm = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
            Network active = cm == null ? null : cm.getActiveNetwork();
            LinkProperties link = active == null ? null : cm.getLinkProperties(active);
            if (link != null) {
                for (RouteInfo route : link.getRoutes()) {
                    if (route.isDefaultRoute() && route.getGateway() instanceof Inet4Address) {
                        gateway = route.getGateway().getHostAddress();
                        break;
                    }
                }
                for (LinkAddress address : link.getLinkAddresses()) {
                    if (address.getAddress() instanceof Inet4Address) {
                        ip = address.getAddress().getHostAddress();
                        break;
                    }
                }
            }
        } catch (Exception ignored) {
            // No network information: the app falls back to the usual hotspot addresses.
        }
        JSObject result = new JSObject();
        result.put("gateway", gateway);
        result.put("ip", ip);
        call.resolve(result);
    }

    /** Frees the model's memory. Loading again reads it from the phone's storage. */
    @PluginMethod
    public void unload(PluginCall call) {
        engineJobs.execute(() -> {
            Engine current = engine;
            engine = null;
            backendName = "";
            if (current != null) current.close();
            call.resolve();
        });
    }
}
