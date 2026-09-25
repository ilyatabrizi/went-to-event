# iOS app

The native SwiftUI app will be created here from Xcode. The initial iOS
milestone will mirror the web vertical slice: browse events, view event
detail, book a ticket, and view the pass.

The Xcode project is `WentToEvent.xcodeproj`. Open that project in Xcode, not
the `WentToEvent` source directory by itself.

The project currently contains the default SwiftUI app shell. Build it with:

```bash
xcodebuild -project WentToEvent.xcodeproj \
  -scheme WentToEvent \
  -sdk iphonesimulator \
  -configuration Debug \
  -derivedDataPath /tmp/wte-ios-derived \
  CODE_SIGNING_ALLOWED=NO build
```
