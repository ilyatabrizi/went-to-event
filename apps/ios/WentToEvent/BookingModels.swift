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
    let createdAt: Date
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
