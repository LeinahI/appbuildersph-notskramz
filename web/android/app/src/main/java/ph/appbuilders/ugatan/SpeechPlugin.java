package ph.appbuilders.ugatan;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;

/**
 * The phone's own speech recognizer (Android SpeechRecognizer), for the mic button in the app. It streams the words
 * as the farmer speaks, ends by itself when they stop talking, and reports the mic level for the listening screen.
 * Much faster than recording and sending the audio to the hub, which stays the fallback when this fails.
 *
 * Calls from the page: available(), start({ lang }), stop(), cancel(). Everything else arrives as "speech" events:
 * { type: "ready" | "speechStart" | "speechEnd" | "level" | "partial" | "final" | "error" | "end", text?, level?, error? }.
 */
@CapacitorPlugin(
        name = "Speech",
        permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone") })
public class SpeechPlugin extends Plugin {
    private SpeechRecognizer recognizer;
    /** Bumped for every session, so a late callback of a cancelled session is ignored. */
    private int session = 0;

    @PluginMethod
    public void available(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", SpeechRecognizer.isRecognitionAvailable(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphonePermission");
            return;
        }
        begin(call);
    }

    @PermissionCallback
    private void microphonePermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) begin(call);
        else call.reject("Microphone permission denied", "denied");
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (recognizer != null) recognizer.stopListening();
            call.resolve();
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            session++;
            release();
            call.resolve();
        });
    }

    private void begin(PluginCall call) {
        String lang = call.getString("lang", "fil-PH");
        getActivity().runOnUiThread(() -> {
            release();
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
                call.reject("No speech recognizer on this phone", "unavailable");
                return;
            }
            final int id = ++session;
            recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
            recognizer.setRecognitionListener(new Listener(id));

            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());
            // Hints for when the farmer is done: about a second of quiet. Some recognizers use their own timing.
            intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1200L);
            intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 1000L);
            try {
                recognizer.startListening(intent);
                call.resolve();
            } catch (RuntimeException e) {
                release();
                call.reject("Could not start the speech recognizer", "failed");
            }
        });
    }

    private void release() {
        if (recognizer == null) return;
        try {
            recognizer.cancel();
            recognizer.destroy();
        } catch (RuntimeException ignored) {
            // Already gone.
        }
        recognizer = null;
    }

    private static String firstText(Bundle bundle) {
        if (bundle == null) return "";
        ArrayList<String> texts = bundle.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        return texts == null || texts.isEmpty() || texts.get(0) == null ? "" : texts.get(0).trim();
    }

    /** The app's error kinds: denied, empty (nothing heard), offline (needs network or a language pack), failed. */
    private static String errorKind(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "denied";
            case SpeechRecognizer.ERROR_NO_MATCH:
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "empty";
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
            case SpeechRecognizer.ERROR_SERVER:
            case SpeechRecognizer.ERROR_SERVER_DISCONNECTED:
            case SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED:
            case SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE:
                return "offline";
            default:
                return "failed";
        }
    }

    private class Listener implements RecognitionListener {
        private final int id;
        private boolean ended = false;

        Listener(int id) {
            this.id = id;
        }

        private boolean current() {
            return id == session && !ended;
        }

        private void send(String type, JSObject data) {
            data.put("type", type);
            notifyListeners("speech", data);
        }

        private void finish() {
            ended = true;
            send("end", new JSObject());
            release();
        }

        @Override
        public void onReadyForSpeech(Bundle params) {
            if (current()) send("ready", new JSObject());
        }

        @Override
        public void onBeginningOfSpeech() {
            if (current()) send("speechStart", new JSObject());
        }

        @Override
        public void onRmsChanged(float rmsdB) {
            if (!current()) return;
            // Recognizers report roughly -2 dB (quiet) to 10 dB (loud speech); the page wants 0 to 1.
            JSObject data = new JSObject();
            data.put("level", Math.max(0f, Math.min(1f, (rmsdB + 2f) / 12f)));
            send("level", data);
        }

        @Override
        public void onBufferReceived(byte[] buffer) {}

        @Override
        public void onEndOfSpeech() {
            if (current()) send("speechEnd", new JSObject());
        }

        @Override
        public void onError(int error) {
            if (!current()) return;
            JSObject data = new JSObject();
            data.put("error", errorKind(error));
            send("error", data);
            finish();
        }

        @Override
        public void onResults(Bundle results) {
            if (!current()) return;
            JSObject data = new JSObject();
            data.put("text", firstText(results));
            send("final", data);
            finish();
        }

        @Override
        public void onPartialResults(Bundle partialResults) {
            if (!current()) return;
            String text = firstText(partialResults);
            if (text.isEmpty()) return;
            JSObject data = new JSObject();
            data.put("text", text);
            send("partial", data);
        }

        @Override
        public void onEvent(int eventType, Bundle params) {}
    }
}
