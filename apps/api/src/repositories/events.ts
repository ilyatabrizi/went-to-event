import type { Event, EventRepository } from '../../../../packages/shared/src/events.js'
import { events } from '../data/events.js'

export class InMemoryEventRepository implements EventRepository {
  async list(): Promise<Event[]> {
    return events
  }

  async getById(id: string): Promise<Event | null> {
    return events.find((event) => event.id === id) ?? null
  }
}
