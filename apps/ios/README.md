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

## Clerk authentication

The app uses Clerk's native sign-in/sign-up UI and sends fresh Clerk session
tokens to the API. Debug and Release currently use the same Clerk test instance
as the existing web app. Replace the publishable key in both xcconfig files
with the live instance key before App Store release.

Before native authentication can complete, enable **Native API** in that
instance's Clerk Dashboard and add an iOS native application using the app's
bundle ID (`com.samshahverdipersonalteam.WentToEvent`) and your Apple App ID
Prefix.

The app callback URL scheme and Clerk frontend `webcredentials` associated
domain are configured in `Config/Info.plist` and
`Config/WentToEvent.entitlements`.

Build it with:

```bash
xcodebuild -project WentToEvent.xcodeproj \
  -scheme WentToEvent \
  -sdk iphonesimulator \
  -configuration Debug \
  -derivedDataPath /tmp/wte-ios-derived \
  CODE_SIGNING_ALLOWED=NO build
```
