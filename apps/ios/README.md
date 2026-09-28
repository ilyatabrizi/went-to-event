# iOS app

The native SwiftUI app will be created here from Xcode. The initial iOS
milestone will mirror the web vertical slice: browse events, view event
detail, book a ticket, and view the pass.

The Xcode project is `WentToEvent.xcodeproj`. Open that project in Xcode, not
the `WentToEvent` source directory by itself.

## Local API configuration

The API URL is configured in `Config/Debug.xcconfig` instead of being
hardcoded in Swift:

- iOS Simulator uses `http://127.0.0.1:3000` because it runs on the Mac.
- A physical iPhone uses the `iphoneos` value, currently
  `http://192.168.100.57:3000`.

If the Mac's hotspot or LAN address changes, update only the
`WTE_API_BASE_URL[sdk=iphoneos*]` line in `Config/Debug.xcconfig`, then rebuild.
The API must still be started with `HOST=0.0.0.0` for a physical device.

The project currently contains the default SwiftUI app shell. Build it with:

```bash
xcodebuild -project WentToEvent.xcodeproj \
  -scheme WentToEvent \
  -sdk iphonesimulator \
  -configuration Debug \
  -derivedDataPath /tmp/wte-ios-derived \
  CODE_SIGNING_ALLOWED=NO build
```
