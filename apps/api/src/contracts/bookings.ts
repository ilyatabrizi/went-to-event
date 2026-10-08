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
  tickets?: Ticket[]
}

export type Ticket = {
  id: string
  number: number
  qrCode: string
  checkedInAt: string | null
}

export type TicketCheckInResult = {
  status: 'checked_in' | 'already_checked_in'
  ticket: {
    id: string
    number: number
    checkedInAt: string
  }
  event: {
    id: string
    title: string
  }
}

export type BookingsResponse = {
  data: Booking[]
}
