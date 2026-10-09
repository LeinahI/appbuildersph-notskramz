// Builds the debug APK with the Gradle wrapper in web/android, on Windows or Unix.
// Output: web/android/app/build/outputs/apk/debug/app-debug.apk
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const android = fileURLToPath(new URL('../android/', import.meta.url));
// A full path: Windows may not look in the working folder for commands.
const gradlew = join(android, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
// Gradle needs the Android SDK. Without ANDROID_HOME, use where Android Studio installs it.
const defaultSdk =
  process.platform === 'win32'
    ? join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk')
    : join(homedir(), process.platform === 'darwin' ? 'Library/Android/sdk' : 'Android/Sdk');
const env = { ...process.env };
if (!env.ANDROID_HOME && !env.ANDROID_SDK_ROOT && existsSync(defaultSdk)) env.ANDROID_HOME = defaultSdk;
const result = spawnSync(process.platform === 'win32' ? `"${gradlew}"` : gradlew, ['assembleDebug'], {
  cwd: android,
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
