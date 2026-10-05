# iOS app

The native SwiftUI app will be created here from Xcode. The initial iOS
milestone will mirror the web vertical slice: browse events, view event
detail, book a ticket, and view the pass.

The Xcode project is `WentToEvent.xcodeproj`. Open that project in Xcode, not
the `WentToEvent` source directory by itself.

## API configuration

Debug and Release builds use the deployed API at
`https://api-orcin-one-49.vercel.app`, so events load on a physical iPhone
without running a local server. The base URL is configured in the xcconfig
files rather than hardcoded in Swift.

To test against a local API instead, set `WTE_API_BASE_URL` in
`Config/Debug.xcconfig` to the Mac's LAN IP and run the API with
`HOST=0.0.0.0`.

## Guest preview

Clerk authentication and the Associated Domains entitlement are disabled in
this iOS preview so it can be signed with a basic iOS Team provisioning
profile. Public event browsing works; booking, profile updates, and other
signed-in features remain unavailable until authentication is added back.

Build it with:

```bash
xcodebuild -project WentToEvent.xcodeproj \
  -scheme WentToEvent \
  -sdk iphonesimulator \
  -configuration Debug \
  -derivedDataPath /tmp/wte-ios-derived \
  CODE_SIGNING_ALLOWED=NO build
```
