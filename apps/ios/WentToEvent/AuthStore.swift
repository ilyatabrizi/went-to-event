import Combine
import Foundation

@MainActor
final class AuthStore: ObservableObject {
    @Published private(set) var isSignedIn = false
    @Published private(set) var user: AuthUser?
    @Published private(set) var isLoading = false
    @Published var errorMessage: String?
    @Published var noticeMessage: String?

    func accessToken() async throws -> String {
        throw APIError.message("Sign-in is disabled in this iOS preview.")
    }

    func refreshUser() async {
        clearSession()
    }

    func signOut() async {
        clearSession()
        noticeMessage = "You’re using the iOS preview without an account."
    }

    func clearSession() {
        isSignedIn = false
        user = nil
        errorMessage = nil
    }
}
