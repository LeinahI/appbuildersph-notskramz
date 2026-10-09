import { fileURLToPath } from 'node:url';

/** Reads hub/.env into process.env when the file exists. Variables already set in the shell win. */
export function loadEnvFile(): void {
  try {
    process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}
