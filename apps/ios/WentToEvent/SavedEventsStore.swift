import Foundation
import Combine

@MainActor
final class SavedEventsStore: ObservableObject {
    @Published private(set) var eventIDs: [String]

    private let storageKey = "wte.saved-event-ids"

    init() {
        eventIDs = UserDefaults.standard.stringArray(forKey: storageKey) ?? []
    }

    func contains(_ eventID: String) -> Bool {
        eventIDs.contains(eventID)
    }

    func toggle(_ eventID: String) {
        if let index = eventIDs.firstIndex(of: eventID) {
            eventIDs.remove(at: index)
        } else {
            eventIDs.insert(eventID, at: 0)
        }
        UserDefaults.standard.set(eventIDs, forKey: storageKey)
    }
}
