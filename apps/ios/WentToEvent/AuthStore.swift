import Foundation
import Combine

@MainActor
final class AuthStore: ObservableObject {
    @Published private(set) var session: NativeSession?
    @Published private(set) var user: AuthUser?
    @Published private(set) var isLoading = false
    @Published var errorMessage: String?
    @Published var noticeMessage: String?

    private let client: SupabaseAuthClient
    private let keychain: KeychainStore
    private let apiClient: APIClient

    var isSignedIn: Bool { session != nil }

    init(
        client: SupabaseAuthClient = SupabaseAuthClient(),
        keychain: KeychainStore = KeychainStore(),
        apiClient: APIClient = APIClient(),
    ) {
        self.client = client
        self.keychain = keychain
        self.apiClient = apiClient

        if let stored = try? keychain.load(NativeSession.self) {
            session = stored
            user = stored.user
            Task { await restore(stored) }
        }
    }

    func signIn(email: String, password: String) async {
        await authenticate {
            try await client.signIn(email: email, password: password)
        }
    }

    func signUp(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        noticeMessage = nil

        do {
            guard let newSession = try await client.signUp(email: email, password: password) else {
                noticeMessage = "Account created. Check your email to confirm it, then sign in."
                isLoading = false
                return
            }
            try await accept(newSession)
            noticeMessage = "Account created and signed in."
        } catch {
            errorMessage = message(for: error)
        }

        isLoading = false
    }

    func signOut() {
        session = nil
        user = nil
        errorMessage = nil
        noticeMessage = "Signed out."
        keychain.delete()
    }

    private func authenticate(_ operation: () async throws -> NativeSession) async {
        isLoading = true
        errorMessage = nil
        noticeMessage = nil

        do {
            try await accept(try await operation())
        } catch {
            errorMessage = message(for: error)
        }

        isLoading = false
    }

    private func restore(_ stored: NativeSession) async {
        do {
            if let expiresAt = stored.expiresAt, expiresAt < Date().addingTimeInterval(30) {
                try await accept(try await client.refresh(stored))
            } else {
                user = try await apiClient.getCurrentUser(accessToken: stored.accessToken)
            }
        } catch {
            signOut()
        }
    }

    private func accept(_ newSession: NativeSession) async throws {
        let verifiedUser = try await apiClient.getCurrentUser(accessToken: newSession.accessToken)
        let verifiedSession = NativeSession(
            accessToken: newSession.accessToken,
            refreshToken: newSession.refreshToken,
            expiresAt: newSession.expiresAt,
            user: verifiedUser,
        )
        try keychain.save(verifiedSession)
        session = verifiedSession
        user = verifiedUser
    }

    private func message(for error: Error) -> String {
        (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
    }
}
