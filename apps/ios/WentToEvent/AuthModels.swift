import Foundation

struct AuthUser: Codable, Hashable {
    let id: String
    let email: String?
}

struct NativeSession: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: Date?
    let user: AuthUser?
}

struct AuthResponse: Decodable {
    let accessToken: String?
    let refreshToken: String?
    let expiresIn: Int?
    let user: AuthUser?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case refreshToken = "refresh_token"
        case expiresIn = "expires_in"
        case user
    }
}

struct APIUserResponse: Decodable {
    let user: AuthUser
}

struct AuthErrorResponse: Decodable {
    let msg: String?
    let errorDescription: String?

    enum CodingKeys: String, CodingKey {
        case msg
        case errorDescription = "error_description"
    }
}
