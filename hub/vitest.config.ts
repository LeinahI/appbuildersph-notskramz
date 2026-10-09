import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Loads hub/.env before the tests read LAYA_MODEL_DIR. Shell variables win.
    setupFiles: ['./test/setup-env.ts'],
  },
});
