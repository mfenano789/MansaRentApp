# MansaRent — Android & iPhone app

The app is the same React code, bundled **inside** the phone with Capacitor (it does not load the website).
In the app: no footer or install banner, a back arrow in the top bar on inner pages, bottom tabs,
native status bar, splash screen, light vibration on taps, Android back button, push notifications,
page slide transitions and skeleton loaders.

## 1. One-time setup (Windows)

1. Install **Android Studio** (it includes Java and the Android SDK). Open it once and let it finish downloading.
2. In the project folder:
   ```powershell
   npm install
   cd backend; npm install; npx prisma db push; cd ..
   ```
   `db push` adds the new `DeviceToken` table (phones registered for notifications). Restart the backend after.
3. Allow the phone to reach the backend on port 4000 (PowerShell **as administrator**, once):
   ```powershell
   New-NetFirewallRule -DisplayName "MansaRent API" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow -Profile Private
   ```

## 2. Test on a real Android phone

1. Phone: **Settings → About phone → tap "Build number" 7 times**, then **Developer options → USB debugging: ON**.
2. Plug the phone into the PC with a USB cable and accept the "Allow USB debugging?" prompt.
3. Phone and PC must be on the **same Wi-Fi**. Backend running (`cd backend; npm run dev`).
4. In the project folder:
   ```powershell
   npm run android
   ```
   The build prints `📱 Appli mobile → API : http://192.168.x.x:4000/api` (your PC's Wi-Fi address, detected
   automatically), then installs and opens the app on the phone.
   Prefer Android Studio? `npm run android:open`, pick the phone at the top, press ▶ Run.

If the app shows no listings, check the printed address works in the phone's browser:
`http://192.168.x.x:4000/api/health` should show `{"ok":true}`.
To force an address, set `MOBILE_API_URL` in `mobile.env`.

**APK to share/sideload:** `./build-apk.ps1` (release build, needs `keystore.properties`).

## 3. iPhone (needs a Mac with Xcode)

The `ios/` project is already created (Swift Package Manager, icons and splash included, camera/photo permissions set).
On the Mac:
```bash
npm install
npm run ios        # builds, syncs, opens Xcode
```
In Xcode: select the **App** target → **Signing & Capabilities** → choose your Team, plug in the iPhone, press ▶.
First run: on the iPhone, **Settings → General → VPN & Device Management** → trust your developer certificate.

## 4. Push notifications

Sent automatically for **new chat messages** and **verification approved/rejected**.

1. Go to <https://console.firebase.google.com> → **Add project** "MansaRent".
2. **Add app → Android**, package name `com.mansarent.app` → download `google-services.json` → put it in `android/app/`.
3. Firebase **Project settings → Service accounts → Generate new private key**. Open the downloaded JSON,
   copy everything, then in MansaRent **Admin → Intégrations → Firebase** paste it, turn it on, save.
4. In `mobile.env` set `VITE_PUSH_ENABLED=1`, then `npm run android` again.
   (Keep it at 0 until `google-services.json` is in place — Android crashes on registration without it.)

iPhone push (on the Mac): Apple Developer → Keys → create an **APNs key (.p8)** → Firebase **Project settings →
Cloud Messaging → Apple app configuration** → upload it. Add an iOS app in Firebase (bundle `com.mansarent.app`),
put `GoogleService-Info.plist` in `ios/App/App/`, in Xcode add the package `https://github.com/firebase/firebase-ios-sdk`
(product **FirebaseMessaging**), enable the **Push Notifications** capability, and follow the
"iOS" section of <https://capacitorjs.com/docs/guides/push-notifications-firebase> for the 3 lines in `AppDelegate.swift`.

## 5. Icons & splash

Sources are in `assets/` (`icon-only.png`, `icon-foreground.png`, `icon-background.png`, `splash.png`, `splash-dark.png`).
After changing them: `npm run assets` (regenerates every Android/iOS size).

## 6. Preview in VS Code

`http://localhost:5173/preview.html` shows iPhone + Android frames. The **📱 Mode appli** button shows the app
interface (back arrow, no footer…). Vibration, camera and notifications only work on a real phone.

## Going live

When the backend is online (e.g. `https://api.mansarent.com`), set `MOBILE_API_URL=https://api.mansarent.com/api`
in `mobile.env` and rebuild. Then `android:usesCleartextTraffic` and `allowMixedContent` can be removed.
