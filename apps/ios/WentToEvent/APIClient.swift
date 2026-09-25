import Foundation

enum APIError: LocalizedError {
    case invalidResponse
    case requestFailed
    case message(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse: "The server returned an invalid response."
        case .requestFailed: "Could not connect to Went To Event."
        case .message(let message): message
        }
    }
}

struct APIClient {
    // This Mac is currently sharing its connection over an iPhone hotspot.
    // Keep the API running with HOST=0.0.0.0 when testing on a physical iPhone.
    var baseURL = AppConfig.apiBaseURL

    private var decoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }

    func getEvents() async throws -> [Event] {
        try await request(path: "/events", as: EventsResponse.self).data
    }

    func getEvent(id: String) async throws -> Event {
        try await request(path: "/events/\(id)", as: EventResponse.self).data
    }

    func getCurrentUser(accessToken: String) async throws -> AuthUser {
        try await request(path: "/me", accessToken: accessToken, body: Optional<String>.none, as: APIUserResponse.self).user
    }

    func createBooking(accessToken: String, input: CreateBookingInput) async throws -> Booking {
        try await request(
            path: "/bookings",
            method: "POST",
            accessToken: accessToken,
            body: input,
            as: BookingResponse.self,
        ).data
    }

    func getBookings(accessToken: String) async throws -> [Booking] {
        try await request(path: "/me/bookings", accessToken: accessToken, body: Optional<String>.none, as: BookingsResponse.self).data
    }

    private func request<T: Decodable>(path: String, as type: T.Type) async throws -> T {
        try await request(path: path, method: "GET", accessToken: nil, body: Optional<String>.none, as: type)
    }

    private func request<Body: Encodable, T: Decodable>(
        path: String,
        method: String = "GET",
        accessToken: String?,
        body: Body?,
        as type: T.Type,
    ) async throws -> T {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            if let apiError = try? JSONDecoder().decode(APIMessageResponse.self, from: data) {
                throw APIError.message(apiError.error)
            }
            throw APIError.invalidResponse
        }

        do {
            return try decoder.decode(type, from: data)
        } catch {
            throw APIError.invalidResponse
        }
    }
}
