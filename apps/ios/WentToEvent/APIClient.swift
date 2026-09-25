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
    // Simulator: 127.0.0.1 reaches the Mac running the API.
    // Physical iPhone: change this to http://YOUR-MAC-IP:3000.
    var baseURL = URL(string: "http://127.0.0.1:3000")!

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
