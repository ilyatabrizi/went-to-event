export type CreateBookingInput = {
  eventId: string
  ticketTierId: string
  quantity: number
}

export type Booking = {
  id: string
  eventId: string
  ticketTierId: string
  quantity: number
  status: 'pending' | 'confirmed' | 'cancelled'
  totalCents: number
  createdAt: string
}

export type BookingsResponse = {
  data: Booking[]
}
