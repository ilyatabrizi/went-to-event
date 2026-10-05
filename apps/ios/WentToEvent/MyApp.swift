import SwiftUI
import ClerkKit
import ClerkKitUI

@main struct MyApp: App {
    init() {
        Clerk.configure(publishableKey: AppConfig.clerkPublishableKey)
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .prefetchClerkImages()
                .environment(Clerk.shared)
        }
    }
}
