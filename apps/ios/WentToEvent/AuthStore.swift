import ClerkKit
import Combine
import Foundation

@MainActor
final class AuthStore: ObservableObject {
    @Published private(set) var isSignedIn = false
    @Published private(set) var user: AuthUser?
    @Published private(set) var isLoading = false
    @Published var errorMessage: String?
    @Published var noticeMessage: String?

    private let apiClient = APIClient()

    func accessToken() async throws -> String {
        guard let session = Clerk.shared.session,
              let token = try await session.getToken()
        else {
            throw APIError.message("Please sign in again to continue.")
        }
        return token
    }

    func refreshUser() async {
        guard let clerkUser = Clerk.shared.user else {
            clearSession()
            return
        }

        isSignedIn = true
        user = AuthUser(id: clerkUser.id, email: clerkUser.primaryEmailAddress?.emailAddress)
        isLoading = true
        errorMessage = nil

        do {
            user = try await apiClient.getCurrentUser(accessToken: accessToken())
        } catch {
            errorMessage = message(for: error)
        }

        isLoading = false
    }

    func signOut() async {
        isLoading = true
        errorMessage = nil
        do {
            try await Clerk.shared.auth.signOut()
            clearSession()
            noticeMessage = "Signed out."
        } catch {
            errorMessage = message(for: error)
        }
        isLoading = false
    }

    func clearSession() {
        isSignedIn = false
        user = nil
        errorMessage = nil
    }

    private func message(for error: Error) -> String {
        (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
    }
}
