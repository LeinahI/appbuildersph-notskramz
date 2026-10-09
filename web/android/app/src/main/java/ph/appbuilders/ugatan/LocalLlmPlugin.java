package ph.appbuilders.ugatan;

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

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

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

    /** Downloads the model from the hub, picking up a broken download where it stopped (HTTP Range). */
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
            HttpURLConnection conn = null;
            try {
                File part = partFile();
                File dir = part.getParentFile();
                if (dir != null && !dir.isDirectory() && !dir.mkdirs()) throw new IOException("Cannot make the model folder.");
                long have = part.isFile() ? part.length() : 0;
                conn = (HttpURLConnection) new URL(url).openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(60000);
                if (have > 0) conn.setRequestProperty("Range", "bytes=" + have + "-");
                int code = conn.getResponseCode();
                long total;
                if (code == 206) {
                    String range = conn.getHeaderField("Content-Range");
                    total = range != null && range.contains("/") ? Long.parseLong(range.substring(range.lastIndexOf('/') + 1).trim()) : -1;
                } else if (code == 200) {
                    have = 0; // the hub sent the whole file
                    total = conn.getContentLengthLong();
                } else {
                    throw new IOException("Hub returned " + code + " for the model.");
                }
                if (total > 0 && getContext().getFilesDir().getUsableSpace() < total - have + SPARE_BYTES) {
                    throw new IOException("NO_SPACE");
                }
                long loaded = have;
                long lastEvent = 0;
                try (InputStream in = new BufferedInputStream(conn.getInputStream(), 1 << 16);
                     OutputStream out = new FileOutputStream(part, have > 0)) {
                    byte[] buffer = new byte[1 << 16];
                    int n;
                    while ((n = in.read(buffer)) != -1) {
                        out.write(buffer, 0, n);
                        loaded += n;
                        long now = System.currentTimeMillis();
                        if (now - lastEvent > 300) {
                            lastEvent = now;
                            progress(loaded, total);
                        }
                    }
                }
                if (total > 0 && part.length() != total) {
                    throw new IOException("The download stopped at " + part.length() + " of " + total + " bytes.");
                }
                if (!part.renameTo(modelFile())) throw new IOException("Cannot keep the model file.");
                progress(modelFile().length(), modelFile().length());
                JSObject done = new JSObject();
                done.put("bytes", modelFile().length());
                call.resolve(done);
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : e.toString());
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
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
        engineJobs.execute(() -> {
            try {
                if (engine != null) {
                    resolveLoaded(call, 0);
                    return;
                }
                File file = modelFile();
                if (!file.isFile()) throw new IOException("The model is not on this phone yet.");
                Backend backend = "gpu".equals(wanted) ? new Backend.GPU() : new Backend.CPU();
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
