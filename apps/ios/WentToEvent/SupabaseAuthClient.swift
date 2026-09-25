import Foundation

enum AuthError: LocalizedError {
    case invalidResponse
    case message(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse: "Supabase returned an invalid response."
        case .message(let message): message
        }
    }
}

struct SupabaseAuthClient {
    let baseURL: URL
    let anonKey: String

    init(baseURL: URL = AppConfig.supabaseURL, anonKey: String = AppConfig.supabaseAnonKey) {
        self.baseURL = baseURL
        self.anonKey = anonKey
    }

    func signIn(email: String, password: String) async throws -> NativeSession {
        try await authenticate(grantType: "password", body: [
            "email": email,
            "password": password,
        ])
    }

    func signUp(email: String, password: String) async throws -> NativeSession? {
        let response: AuthResponse = try await request(path: "/auth/v1/signup", method: "POST", body: [
            "email": email,
            "password": password,
        ])

        guard let accessToken = response.accessToken,
              let refreshToken = response.refreshToken else {
            return nil
        }

        return NativeSession(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresAt: expiry(from: response.expiresIn),
            user: response.user,
        )
    }

    func refresh(_ session: NativeSession) async throws -> NativeSession {
        try await authenticate(grantType: "refresh_token", body: [
            "refresh_token": session.refreshToken,
        ])
    }

    private func authenticate(grantType: String, body: [String: String]) async throws -> NativeSession {
        let response: AuthResponse = try await request(
            path: "/auth/v1/token",
            method: "POST",
            queryItems: [URLQueryItem(name: "grant_type", value: grantType)],
            body: body,
        )
        guard let accessToken = response.accessToken,
              let refreshToken = response.refreshToken else {
            throw AuthError.invalidResponse
        }

        return NativeSession(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresAt: expiry(from: response.expiresIn),
            user: response.user,
        )
    }

    private func expiry(from seconds: Int?) -> Date? {
        guard let seconds else { return nil }
        return Date().addingTimeInterval(TimeInterval(seconds))
    }

    private func request<T: Decodable>(
        path: String,
        method: String,
        queryItems: [URLQueryItem] = [],
        body: [String: String],
    ) async throws -> T {
        var components = URLComponents(
            url: baseURL.appendingPathComponent(path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))),
            resolvingAgainstBaseURL: false,
        )
        components?.queryItems = queryItems.isEmpty ? nil : queryItems
        guard let url = components?.url else { throw AuthError.invalidResponse }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.invalidResponse
        }
        guard 200..<300 ~= httpResponse.statusCode else {
            let apiError = try? JSONDecoder().decode(AuthErrorResponse.self, from: data)
            let message = apiError?.msg ?? apiError?.errorDescription ?? "Authentication failed (HTTP \(httpResponse.statusCode))."
            throw AuthError.message(message)
        }

        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw AuthError.invalidResponse
        }
    }
}
