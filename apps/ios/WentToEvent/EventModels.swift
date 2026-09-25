import Foundation

struct EventsResponse: Codable {
    let data: [Event]
    let total: Int
}

struct EventResponse: Codable {
    let data: Event
}

struct Event: Codable, Identifiable, Hashable {
    let id: String
    let category: String
    let title: String
    let description: String
    let startsAt: Date
    let endsAt: Date
    let venue: Venue
    let host: Host
    let goingCount: Int
    let ticketTiers: [TicketTier]

    struct Venue: Codable, Hashable {
        let name: String
        let address: String
    }

    struct Host: Codable, Hashable {
        let name: String
    }

    struct TicketTier: Codable, Hashable, Identifiable {
        let id: String
        let name: String
        let description: String
        let priceCents: Int
    }
}
