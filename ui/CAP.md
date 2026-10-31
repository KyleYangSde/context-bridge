# Cap quick ref

See **[`../CAP-NATIVE.md`](../CAP-NATIVE.md)** for full Android/iOS ship notes.

```bash
npm run build && npx cap sync
npx cap open android   # needs Android Studio + SDK
npx cap open ios       # macOS + Xcode + CocoaPods
```

**Mobile → Relay `:17832` only.** Never bind Cap to local-api `:17831`.

Set `VITE_RELAY_URL` to a LAN-reachable host before `cap:sync` for real devices (`.env.capacitor.example`).
