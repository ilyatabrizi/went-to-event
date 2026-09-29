import type { EventRepository } from '../contracts/events.js'
import { InMemoryEventRepository } from './events.js'
import { createSupabaseEventRepository } from './supabase-events.js'

export function createEventRepository(): EventRepository {
  return createSupabaseEventRepository() ?? new InMemoryEventRepository()
}
