import Foundation
import Combine

@MainActor
final class EventStore: ObservableObject {
    @Published private(set) var events: [Event] = []
    @Published private(set) var isLoading = false
    @Published var errorMessage: String?

    private let client: APIClient

    init(client: APIClient = APIClient()) {
        self.client = client
    }

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil

        do {
            events = try await client.getEvents()
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? "Could not load events."
        }

        isLoading = false
    }
}
