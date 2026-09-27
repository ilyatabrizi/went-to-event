import Foundation

struct CreateBookingInput: Encodable {
    let eventId: String
    let ticketTierId: String
    let quantity: Int
}

struct Booking: Codable, Identifiable, Hashable {
    let id: String
    let eventId: String
    let ticketTierId: String
    let quantity: Int
    let status: String
    let totalCents: Int
    // The API contract represents timestamps as ISO strings. Keep this as a
    // string because JavaScript's toISOString() includes fractional seconds.
    let createdAt: String
}

struct BookingResponse: Decodable {
    let data: Booking
}

struct BookingsResponse: Decodable {
    let data: [Booking]
}

struct APIMessageResponse: Decodable {
    let error: String
}
