import Foundation

enum APIError: LocalizedError {
    case invalidResponse
    case requestFailed

    var errorDescription: String? {
        switch self {
        case .invalidResponse: "The server returned an invalid response."
        case .requestFailed: "Could not connect to Went To Event."
        }
    }
}

struct APIClient {
    // This Mac is currently sharing its connection over an iPhone hotspot.
    // Keep the API running with HOST=0.0.0.0 when testing on a physical iPhone.
    var baseURL = URL(string: "http://172.20.10.3:3000")!

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

    private func request<T: Decodable>(path: String, as type: T.Type) async throws -> T {
        let response = try await URLSession.shared.data(from: baseURL.appending(path: path))
        guard let httpResponse = response.1 as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            throw APIError.invalidResponse
        }

        do {
            return try decoder.decode(type, from: response.0)
        } catch {
            throw APIError.invalidResponse
        }
    }
}
