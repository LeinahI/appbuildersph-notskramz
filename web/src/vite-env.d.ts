/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_HUB_URL?: string;
  readonly VITE_WS_URL?: string;
  /** '1' in a test build skips the phone-memory check, to test the AI download on a small emulator. */
  readonly VITE_TEST_SKIP_MEMORY_CHECK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
