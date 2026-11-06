# Expo libraries for dictation, encrypted storage, sign-in, attestation, backups and export

Research for [#45](https://github.com/shrujancheruku/look-together/issues/45). Sources were read on 2026-11-03. The current Expo release is **SDK 58** (released 2026-10-15, [Expo changelog](https://expo.dev/changelog)). The only Expo app in the repo, `prototypes/voice-livekit/app` on the `prototype/voice-livekit` branch, already runs `expo ~58.0.21`, React Native 0.88.1, React 19.3 and TypeScript 6.0, as a dev build (EAS profile `proto`). It was built for LiveKit, which has since been dropped.

## Answer in short

| Need | Library | Expo Go? | Gaps |
|---|---|---|---|
| Dictation audio as PCM chunks | **`expo-audio` `useAudioStream` / `AudioStream`** (first-party, added in SDK 56) on iOS and Android; **our own `getUserMedia` + `AudioWorklet`** on web | Yes | The hook is a **no-op stub on web**, even though the docs list web. It isn't covered by the module's interruption handling, and nothing is said about it in the background. |
| Encrypted database | **`expo-sqlite` with `useSQLCipher: true`**, and the key in **`expo-secure-store`** | **No.** In Expo Go, `PRAGMA key` silently does nothing and the database is stored **unencrypted**. | iOS, Android and macOS only. Check `PRAGMA cipher_version` before keying. |
| Sign in with Apple | iOS: **`expo-apple-authentication`**. Android: **`@invertase/react-native-apple-authentication`** (web flow). Web: **Sign in with Apple JS**. | iOS only (and with Expo Go's bundle ID) | Two different `aud` values to verify: the bundle ID (iOS) and the Services ID (Android, web). Android and web need a Services ID, a verified domain and a return URL. |
| Google sign-in | Native: **`react-native-nitro-google-signin`** (Credential Manager) or **`@react-native-google-signin/google-signin`** (free version on the deprecated Android SDK). Web: **Google Identity Services**. | No | The free package's modern Android and web support is paid ("Universal Sign In"). Nitro is 5 months old. `expo-auth-session` is no route on Android. |
| Attestation | **`@expo/app-integrity`** (first-party: App Attest + Play Integrity Standard). Web: **Firebase App Check** JS SDK with reCAPTCHA Enterprise, verified with `firebase-admin`. | Listed in Expo Go, but App Attest needs the entitlement and a real device | No web in `@expo/app-integrity`. No App Attest on the Simulator. |
| OS backups | Nothing to add. Exclusion is a config plugin of our own (Android XML rules) plus a small native call (iOS `isExcludedFromBackup`). | n/a | **Both platforms back up the database file by default.** Neither ever restores a usable key to a *new* device by default, except an encrypted Mac/PC backup on iOS. |
| Recap export | **`expo-sharing`** + `expo-file-system` (+ `expo-print` for PDF) on native. On web: `navigator.share({ files })`, a download link or `expo-clipboard`. | Yes | `expo-sharing` can't share a local file on web, and the Web Share API is patchy there. |

**A dev build is needed anyway.** SQLCipher, Google sign-in and Apple sign-in on Android all need custom native code, so Expo Go drops out with or without LiveKit. Expo Go is still useful for quick UI work, as long as nothing writes real Inquiries.

## 1. Streaming dictation audio

### expo-audio `AudioStream` (recommended for native)

- **What it is:** `useAudioStream(options)` returns `{ stream, isStreaming }`. `stream.start()` begins "real-time PCM microphone capture", and every buffer arrives through `onBuffer` or the `audioStreamBuffer` event as `{ data: ArrayBuffer, sampleRate, channels, timestamp }`. Microphone permission comes from `requestRecordingPermissionsAsync()`. [expo-audio SDK 58 reference](https://docs.expo.dev/versions/v58.0.0/sdk/audio/#useaudiostreamoptions)
- **Format:** `sampleRate` defaults to 48000 ("the actual rate may differ if the hardware cannot deliver it", so read `stream.sampleRate` after `start()`). `encoding` is `'float32'` (default) or `'int16'` ("2 bytes per sample, little-endian signed integers"). `channels` defaults to 1. [AudioStreamOptions](https://docs.expo.dev/versions/v58.0.0/sdk/audio/#audiostreamoptions), [AudioStreamBuffer](https://docs.expo.dev/versions/v58.0.0/sdk/audio/#audiostreambuffer)
  - So `{ sampleRate: 16000, encoding: 'int16', channels: 1 }` gives exactly Cloud STT's `LINEAR16` at 16 kHz. Google recommends capturing at 16 kHz or higher, a lossless codec (`LINEAR16` or FLAC), no resampling where avoidable, and **100 ms frames** "as a good tradeoff between latency and efficiency". [Cloud STT v2 best practices](https://docs.cloud.google.com/speech-to-text/v2/docs/best-practices-provide-speech-data)
  - On iOS the module asks the session for the requested rate and converts with `AVAudioConverter` from the hardware format. On Android it opens `AudioRecord` with `MediaRecorder.AudioSource.MIC`. [AudioStream.swift](https://github.com/expo/expo/blob/main/packages/expo-audio/ios/AudioStream.swift), [AudioStream.kt](https://github.com/expo/expo/blob/main/packages/expo-audio/android/src/main/java/expo/modules/audio/AudioStream.kt)
  - The buffer size isn't an option, so group buffers into ~100 ms (3.2 KB at 16 kHz int16) before each WebSocket send.
  - The iOS stream sets the session to `.record` with mode `.measurement`, which turns off the OS voice processing. That matches Google's advice against processed audio, but it means **playback ("listen") needs `setAudioModeAsync` again after the stream stops**. [AudioStream.swift](https://github.com/expo/expo/blob/main/packages/expo-audio/ios/AudioStream.swift)
- **Maturity:** first-party. `useAudioStream` was added in expo-audio 56.0.0 (SDK 56, May 2026). SDK 58 added `startFileRecordingAsync` / `stopFileRecordingAsync` (WAV or PCM written alongside the buffers). 58.0.2 fixed Android buffers carrying stale trailing bytes. So it's about six months old and still settling. [expo-audio CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-audio/CHANGELOG.md)
- **Expo Go:** yes, "Included in Expo Go". [expo-audio](https://docs.expo.dev/versions/v58.0.0/sdk/audio/)
- **Web gap: the docs list web, but the web build is a stub.** `AudioStream.web.ts` on both `main` and `sdk-58` is `return { stream: null as any, isStreaming: false }`. [AudioStream.web.ts](https://github.com/expo/expo/blob/main/packages/expo-audio/src/AudioStream.web.ts)
- **Background:** background recording is an opt-in config plugin flag (`enableBackgroundRecording`: on Android a foreground service with a persistent "Recording audio" notification, on iOS the `audio` background mode) plus `allowsBackgroundRecording: true` at runtime. The docs describe this for the recorder; they say nothing about the stream. [Recording audio in the background](https://docs.expo.dev/versions/v58.0.0/sdk/audio/#recording-audio-in-the-background) Dictation is a foreground action, so **leave background recording off** and stop the stream on `AppState` → `background`. The Reflection draft stays, since it's text.
- **Interruptions:** `interruptionMode` is `'mixWithOthers'` by default. On Android that mode means no audio-focus-loss callbacks (for example, a phone call). [AudioMode](https://docs.expo.dev/versions/v58.0.0/sdk/audio/#audiomode) The module's iOS interruption handler pauses players and recorders, **not streams**. [AudioModule.swift](https://github.com/expo/expo/blob/main/packages/expo-audio/ios/AudioModule.swift) So: set `interruptionMode: 'doNotMix'` while dictating, and treat a stall in buffers or `isStreaming` going false as "dictation stopped". Keep the text so far, and let the person tap to resume. Test a phone call on both platforms in the dictation prototype.

### Alternatives (not recommended)

- **`@siteed/audio-studio`** (formerly `@siteed/expo-audio-stream`, repo [deeeed/audiolab](https://github.com/deeeed/audiolab)): streaming PCM through `onAudioStream` at a chosen `sampleRate` / `encoding` (`pcm_16bit`, `pcm_32bit`), with call-interruption auto pause/resume, background recording and a web build. It's mostly the work of one maintainer: 354 stars, latest npm 3.2.1 (2026-08-23), repo active 2026-11-02. It needs a config plugin, so it means a dev build. [README](https://github.com/deeeed/audiolab/blob/main/packages/audio-studio/README.md) It's the fallback if expo-audio's stream disappoints on interruptions.
- **`react-native-live-audio-stream`:** last npm release 1.1.1 in 2022, repo last pushed 2023-10. Unmaintained. [repo](https://github.com/xiqi/react-native-live-audio-stream)

### Web: getUserMedia + AudioWorklet (our own code)

- Create the `AudioContext` at the **default rate**. In Firefox, `createMediaStreamSource` throws `NotSupportedError` when the context's rate differs from the microphone's, and Mozilla tests for that on purpose. [Firefox mochitest](https://searchfox.org/firefox-main/source/dom/media/webrtc/tests/mochitests/test_getUserMedia_nonDefaultRate.html)
- In an `AudioWorkletProcessor`, convert Float32 to Int16 and either downsample to 16 kHz or send the native rate (usually 48 kHz) and set it in the STT config, which Google prefers to resampling. [Cloud STT v2 best practices](https://docs.cloud.google.com/speech-to-text/v2/docs/best-practices-provide-speech-data)
- Ask `getUserMedia` for `echoCancellation`, `noiseSuppression` and `autoGainControl` off, to match native.
- Put this behind one `startDictation(onChunk)` interface with a `.web.ts` file, so the WebSocket client is shared.

## 2. Encrypted storage

- **Still supported, and first-party:** SQLCipher has been in `expo-sqlite` since 15.0.0 (2024-10-22). SDK 58 ships SQLite 3.53.3 with **SQLCipher 4.17.0**. [expo-sqlite CHANGELOG](https://github.com/expo/expo/blob/main/packages/expo-sqlite/CHANGELOG.md)
- **How to turn it on:**
  1. Set `["expo-sqlite", { "useSQLCipher": true }]` in `app.json`.
  2. Run `npx expo prebuild` and rebuild.
  3. Right after opening, run `PRAGMA key = '…'`.

  It works on Android, iOS and macOS. [expo-sqlite: SQLCipher](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/#sqlcipher)
- **Silent failure:** "If the app binary does not include SQLCipher, `PRAGMA key` has no effect and does not throw an error … it stores the database without encryption. This happens in Expo Go…". Expo's own advice is to query `PRAGMA cipher_version` first, which "returns a row only when the app uses SQLCipher". [expo-sqlite: SQLCipher](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/#sqlcipher) **Make that a hard startup check: refuse to store an Inquiry if it returns nothing.**
- **Key:**
  1. Make 32 random bytes with `expo-crypto` `getRandomBytes`.
  2. Store them hex-encoded in `expo-secure-store` (iOS Keychain `kSecClassGenericPassword`; Android Keystore-backed). [expo-secure-store](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/)
  3. Pass them as a raw key (`PRAGMA key = "x'…'"`), so SQLCipher skips its passphrase derivation. [SQLCipher API: raw key data](https://www.zetetic.net/sqlcipher/sqlcipher-api/#key)

  Set `keychainAccessible` explicitly (see §5). SecureStore is in Expo Go but **not on web**, and Expo says "There is no web equivalent". [Authentication guide](https://docs.expo.dev/guides/authentication/)
- **Where the file lives:** `defaultDatabaseDirectory` is `<Documents>/SQLite` on iOS and `<filesDir>/SQLite` on Android. [SQLiteModule.swift](https://github.com/expo/expo/blob/main/packages/expo-sqlite/ios/SQLiteModule.swift), [SQLiteModule.kt](https://github.com/expo/expo/blob/main/packages/expo-sqlite/android/src/main/java/expo/modules/sqlite/SQLiteModule.kt) Both are backed up by default (§5).
- **Web:** `expo-sqlite` on web needs wasm in Metro and the COOP/COEP headers for `SharedArrayBuffer`. [Web setup](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/#web-setup) Web keeps nothing ([#9](https://github.com/shrujancheruku/look-together/issues/9)), so **don't load `expo-sqlite` on web**. That also avoids `Cross-Origin-Opener-Policy: same-origin`, which would break the Apple and Google sign-in popups.

## 3. Sign-in (ID tokens verified on our Node backend)

### Sign in with Apple

- **iOS: `expo-apple-authentication`** (first-party, in Expo Go). Set `ios.usesAppleSignIn: true`. `signInAsync({ requestedScopes, nonce })` returns `identityToken`, a JWT. "It does not yet support Android or web." [expo-apple-authentication](https://docs.expo.dev/versions/v58.0.0/sdk/apple-authentication/) In Expo Go the token's `aud` is Expo Go's bundle ID, not ours, so real backend verification needs the dev build.
- **Android: `@invertase/react-native-apple-authentication`.**
  - It runs Apple's web flow in a WebView and intercepts the redirect.
  - `appleAuthAndroid.configure({ clientId: <Services ID>, redirectUri, responseType: ALL, scope: ALL, nonce })` returns `id_token`.
  - It has an Expo config plugin, so it needs a dev build. You need a Services ID, a domain and a return URL registered with Apple.
  - Maturity: 1.7K stars, v2.5.1 (2026-03), repo last pushed 2026-01, so active but slow.

  [README](https://github.com/invertase/react-native-apple-authentication), [Android setup](https://github.com/invertase/react-native-apple-authentication/blob/main/docs/ANDROID_EXTRA.md)
- **Web: Sign in with Apple JS.** `AppleID.auth.init({ clientId: <Services ID>, redirectURI, usePopup: true, nonce })`, then `signIn()` resolves with `authorization.id_token`. The page's origin must match a return URL on the Services ID. [Configuring your webpage for Sign in with Apple](https://developer.apple.com/documentation/signinwithapplejs/configuring-your-webpage-for-sign-in-with-apple)
- **Backend:** verify against Apple's JWKS (`https://appleid.apple.com/auth/keys`), with `iss` `https://appleid.apple.com`, and **accept two audiences**: the iOS bundle ID and the Services ID. Check the nonce. Apple sends name and email only on the first authorisation, so store them on the Account then. The email may be a private relay address, as ADR 0006 assumes.

### Google

- **Expo's guide** now names two libraries. It notes that "the legacy Google Sign-In SDK for Android … is deprecated", and that neither library works in Expo Go. [Expo: Google authentication](https://docs.expo.dev/guides/google-authentication/) Google says the legacy SDK "will be removed from the Google Play services Auth SDK in a future release". [Android: legacy GSI migration](https://developer.android.com/identity/sign-in/legacy-gsi-migration)
  - **`react-native-nitro-google-signin`:**
    - Uses Credential Manager on Android and the Google Sign-In SDK on iOS. It has a config plugin and needs `react-native-nitro-modules`.
    - Very active (v2.3.1, 2026-10-31) but young: first release 2026-06-01, 58 stars.
    - **No web.**

    [README](https://github.com/react-native-nitro-google-sign-in/google-signin)
  - **`@react-native-google-signin/google-signin`:**
    - Widely used (3.5K stars, v17.0.0 on 2026-10-29).
    - The free version "uses the legacy Google Sign-In SDK on Android". Credential Manager, web and custom nonce are in the paid **Universal Sign In**.

    [README](https://github.com/react-native-google-signin/google-signin)
- **Web: Google Identity Services** (the "Sign in with Google" button or One Tap). The callback's `credential` is the ID token. [GIS for web](https://developers.google.com/identity/gsi/web/guides/overview)
- **`expo-auth-session` isn't a route on Android:** "Custom URI schemes are no longer supported on Android and Chrome apps." [Google OAuth for native apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- **Backend:** verify with `google-auth-library` `verifyIdToken({ audience: [...] })`, listing the web client ID (which native also uses as the server client ID) and any other client IDs whose tokens you accept.
- **Pick:** Nitro on native plus GIS on web keeps everything on current Google APIs at no cost. The risk is a young library, so pin it and keep the sign-in behind one `signInWithGoogle()` interface. Paying for Universal Sign In is the low-effort fallback: one API across all three platforms, and maintained.

The emailed-code option in ADR 0006 needs no device library.

## 4. Attestation

- **Native: `@expo/app-integrity`** (first-party, SDK 58 docs, listed in Expo Go). [AppIntegrity](https://docs.expo.dev/versions/v58.0.0/sdk/app-integrity/)
  - **Android:** Play Integrity **Standard** requests. Call `prepareIntegrityTokenProviderAsync(cloudProjectNumber)`, then `requestIntegrityCheckAsync(requestHash)` per request. On `ERR_APP_INTEGRITY_PROVIDER_INVALID`, call `prepare` again. Decrypt the verdict on the server through Google's API.
  - **iOS:** App Attest. Check `isSupported`, then `generateKeyAsync()`, `attestKeyAsync(keyId, challenge)` and `generateAssertionAsync(keyId, clientData)`. Add the App Attest capability. It isn't supported on the Simulator, so verify on a real device. The key lives in the Secure Enclave, so store `keyId`, and expect to **attest again after a reinstall or a restore**.
  - Expo Go has neither our App ID's App Attest entitlement nor a Play-recognised package, so real verdicts need a store-signed or internal-track build.
- **Web: Firebase App Check** JS SDK with the reCAPTCHA Enterprise provider. The token goes in `X-Firebase-AppCheck` and is checked on our Node backend with `getAppCheck().verifyToken(token)`, or by hand against `https://firebaseappcheck.googleapis.com/v1/jwks`. Optional replay protection: `{ consume: true }`, Node and Python only. [App Check: custom backend](https://firebase.google.com/docs/app-check/custom-resource-backend) This uses App Check only, not Firebase Auth, so ADR 0006's US-only concern doesn't arise. App Check tokens carry no user data.
- **Alternative:** `@react-native-firebase/app-check` gives App Attest and Play Integrity *through* App Check, so there's one verifier for all three platforms. The cost is adding React Native Firebase to the app. Not needed.

## 5. OS backups (feeds #46)

### What is backed up by default

| | iOS (iCloud Backup) | Android (Auto Backup, Android 6+) |
|---|---|---|
| Database file (`Documents/SQLite`, `files/SQLite`) | **Yes.** Everything in the container except `Library/Caches` and `tmp`. [Apple: Optimizing your app's data for iCloud Backup](https://developer.apple.com/documentation/foundation/optimizing-your-app-s-data-for-icloud-backup) | **Yes.** `getFilesDir()`, databases and shared prefs are included. Only cache, code cache and `getNoBackupFilesDir()` are excluded. Up to 25 MB, to Google Drive, end-to-end encrypted on Android 9+ with a screen lock. [Android Auto Backup](https://developer.android.com/identity/data/autobackup) |
| SecureStore key | The device keychain is in iCloud Backup, but "encrypted with a key derived from the Secure Enclave UID … allows the database to be restored only to the same device". [Apple: iCloud Backup security](https://support.apple.com/guide/security/icloud-backup-security-sec2c21e7f49/web) `…ThisDeviceOnly` items "are always protected with the UID" and don't work on a different device. `WhenPasscodeSetThisDeviceOnly` items "aren't backed up". [Apple: Keychain data protection](https://support.apple.com/guide/security/keychain-data-protection-secb0694df1a/web) Without `ThisDeviceOnly`, an **encrypted Finder/iTunes backup** can carry the item to a new device. SecureStore never sets `kSecAttrSynchronizable`, so nothing goes through iCloud Keychain. [SecureStoreModule.swift](https://github.com/expo/expo/blob/main/packages/expo-secure-store/ios/SecureStoreModule.swift) | **No.** expo-secure-store excludes its shared prefs automatically when the app has no custom backup rules, because "it's impossible to decrypt them after restoring the backup — app's entries are deleted from the Android Key Store when the app is uninstalled". [expo-secure-store: Android Auto Backup](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/#android-auto-backup) |
| Key across reinstall | **Survives** an uninstall and reinstall (Keychain), though "you should never rely on" it. [expo-secure-store](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/) | Lost on uninstall. |

**So by default:** a backup carries the encrypted database. On a **new** device it arrives without its key (iCloud on iOS; always on Android), so it's dead ciphertext. On the **same** device (iCloud restore after an erase), or on iOS through an encrypted Mac/PC backup, the key comes too and the Inquiries reappear. Neither outcome is what [#9](https://github.com/shrujancheruku/look-together/issues/9) promised ("a lost device loses its Inquiries", nothing off the device).

### How to exclude

- **iOS, key:** set `keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY` (or `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`), since the item "is not migrated to a new device when restoring from a backup". Going further, `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY` isn't backed up at all, but it needs a passcode and the entry is deleted if the passcode is removed. [expo-secure-store constants](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/#securestorewhen_unlocked_this_device_only)
- **iOS, database:** set `URLResourceValues.isExcludedFromBackup = true` (`NSURLIsExcludedFromBackupKey`) on the `SQLite` directory, and again after each recreation, because "certain file operations can reset resource values". Apple warns it's "not a mechanism to guarantee those items never appear in a backup". [Apple: Optimizing your app's data for iCloud Backup](https://developer.apple.com/documentation/foundation/optimizing-your-app-s-data-for-icloud-backup) **No Expo API sets it** (nothing in expo-file-system; the only Expo backup flag is `updates.excludeFromBackup`, for expo-updates). [app config](https://docs.expo.dev/versions/v58.0.0/config/app/#excludefrombackup) That means a ~20-line local Expo module.
- **Android:** either
  - `android.allowBackup: false` in app config, though for apps targeting API 31+ "on devices from some device manufacturers" it "doesn't disable device-to-device transfers" [Android Auto Backup](https://developer.android.com/identity/data/autobackup#EnablingAutoBackup), [app config](https://docs.expo.dev/versions/v58.0.0/config/app/#allowbackup); or, better,
  - explicit rules: `dataExtractionRules` with `<exclude domain="file" path="SQLite/"/>` and the SecureStore `sharedpref` entry, in both `<cloud-backup>` and `<device-transfer>` (and `<cross-platform-transfer platform="ios">`, new in Android 16 QPR2), plus `fullBackupContent` for Android 11 and lower.

  Writing your own rules means **setting `configureAndroidBackup: false` on expo-secure-store and excluding its prefs yourself**. [expo-secure-store: Android Auto Backup](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/#android-auto-backup) This is a small config plugin of our own (`withAndroidManifest` + an XML resource).
- **Both:** since exclusion isn't guaranteed, open the database defensively. If the file exists but the key is missing or wrong (SQLCipher fails on the first read), delete the file and start empty. Never prompt.

### What it means for #46

- **Inquiries are bound to the device install, not to an Account.** A different Account signing in on the same device sees the same database unless we key it per Account. A per-Account key in SecureStore (one database file per Account id) is cheap and keeps "an Account knows nothing of Inquiries" true *on the device* too.
- **Backups:** recommend excluding the database on both platforms and making keys `ThisDeviceOnly`. Restores then never bring Inquiries back, which matches "a lost device loses its Inquiries". The alternative, allowing same-device restore, would need the iOS key *without* `ThisDeviceOnly` and Android rules that include the database, and it still fails across devices on Android.
- **Reinstall:** iOS keeps the key in the Keychain but deletes the database, so the orphan key does no harm. Clear or rotate keys on the first launch (a flag in a non-backed-up file) so a stale key never meets a restored file. On Android, both are gone.
- **Export is the only way to carry Inquiries off the device** (§6), and it's the person's own act.

## 6. Recap export and share

- **Native:**
  1. Render the Recap to Markdown/text, or to PDF with `expo-print` `printToFileAsync({ html })` (writes to the cache directory). [expo-print](https://docs.expo.dev/versions/v58.0.0/sdk/print/)
  2. Write text with `expo-file-system` `new File(Paths.cache, …)`. [expo-file-system](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/)
  3. Open the share sheet with `expo-sharing` `shareAsync(uri, { mimeType, UTI, dialogTitle })`. [expo-sharing](https://docs.expo.dev/versions/v58.0.0/sdk/sharing/)
  4. Delete the temporary file afterwards.

  All of it works in Expo Go. For plain text, React Native's built-in `Share.share({ message })` is enough. `expo-sharing`'s *receiving* side (share extension, intents) is experimental and not needed.
- **Web:** "Sharing local files by URI works on Android and iOS, but not on web … you will need to upload them somewhere", and the Web Share API needs HTTPS and "has very limited browser support". [expo-sharing](https://docs.expo.dev/versions/v58.0.0/sdk/sharing/) Uploading breaks ADR 0003, so on web:
  - use `navigator.canShare({ files })` → `navigator.share({ files: [new File([text], 'recap.md')] })` where it's supported;
  - otherwise use a Blob download link, plus copy to clipboard with `expo-clipboard` (in Expo Go and on web);
  - `expo-print` on web only opens the print dialog for the current page.

## What changes earlier decisions

- **[#9 storage](https://github.com/shrujancheruku/look-together/issues/9):** SQLCipher + SecureStore holds, but only in a dev build. Add the `PRAGMA cipher_version` guard. The "a lost device loses its Inquiries" promise is **false by default on iOS same-device restores and encrypted Mac backups**, and needs the exclusions in §5.
- **[#36 dictation](https://github.com/shrujancheruku/look-together/issues/36):** with LiveKit gone, capture is first-party `expo-audio` on native but **custom code on web**, because the documented web support is a stub. The prototype must test interruptions (calls, Siri, headphone unplug) on both platforms.
- **[ADR 0006 sign-in](https://github.com/shrujancheruku/look-together/blob/main/docs/adr/0006-sign-in-is-required-and-knows-nothing-of-inquiries.md):** fine as decided. The backend accepts several `aud` values per provider. Apple on Android and web needs a Services ID, a verified domain and a return URL.
- **[#30 usage limits](https://github.com/shrujancheruku/look-together/issues/30):** App Attest and Play Integrity are covered by first-party `@expo/app-integrity`. App Check on web uses only the Firebase JS App Check SDK and `firebase-admin`.
- **Expo Go** is out for real Inquiries. The existing EAS `proto` dev-build profile carries over.
