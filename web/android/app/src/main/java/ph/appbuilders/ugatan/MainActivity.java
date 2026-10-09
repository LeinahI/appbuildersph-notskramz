package ph.appbuilders.ugatan;

import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private ConnectivityManager connectivity;
    private ConnectivityManager.NetworkCallback wifiCallback;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Gemma on the phone itself (LiteRT-LM), for phones whose GPU cannot run it in the web view.
        registerPlugin(LocalLlmPlugin.class);
        super.onCreate(savedInstanceState);
        useWifiForTheHub();
    }

    /**
     * The hub's Wi-Fi has no internet, so Android keeps mobile data as the default network and the app's requests to
     * the hub go out over mobile data and never arrive. The app needs no internet at all, so while the phone is on
     * Wi-Fi, all of the app's traffic (the web view and the model download) goes over that Wi-Fi.
     */
    private void useWifiForTheHub() {
        connectivity = getSystemService(ConnectivityManager.class);
        if (connectivity == null) return;
        NetworkRequest wifi = new NetworkRequest.Builder()
                .addTransportType(NetworkCapabilities.TRANSPORT_WIFI)
                .removeCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build();
        wifiCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(Network network) {
                connectivity.bindProcessToNetwork(network);
            }

            @Override
            public void onLost(Network network) {
                if (network.equals(connectivity.getBoundNetworkForProcess())) connectivity.bindProcessToNetwork(null);
            }
        };
        connectivity.registerNetworkCallback(wifi, wifiCallback);
    }

    @Override
    public void onDestroy() {
        if (connectivity != null && wifiCallback != null) {
            connectivity.unregisterNetworkCallback(wifiCallback);
            connectivity.bindProcessToNetwork(null);
        }
        super.onDestroy();
    }
}
