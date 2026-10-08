import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

type PushSubscription = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export class PushNotificationService {
  private readonly configured: boolean

  constructor(private readonly database: SupabaseClient) {
    const subject = process.env.WEB_PUSH_SUBJECT
    const publicKey = process.env.VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    this.configured = Boolean(subject && publicKey && privateKey)
    if (this.configured) webpush.setVapidDetails(subject!, publicKey!, privateKey!)
  }

  async subscribe(userId: string, subscription: PushSubscription) {
    if (!this.isValidSubscription(subscription)) throw new Error('Invalid push subscription')
    const { error } = await this.database.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,endpoint' })
    if (error) throw error
    return { subscribed: true }
  }

  async unsubscribe(userId: string, endpoint: string) {
    const { error } = await this.database.from('push_subscriptions')
      .delete().eq('user_id', userId).eq('endpoint', endpoint)
    if (error) throw error
    return { unsubscribed: true }
  }

  async notifyMessage(conversationId: string, senderId: string, body: string) {
    if (!this.configured) return
    const { data: members, error: memberError } = await this.database.from('conversation_members')
      .select('user_id').eq('conversation_id', conversationId).neq('user_id', senderId)
    if (memberError) throw memberError
    const recipientIds = [...new Set((members ?? []).map((member) => member.user_id))]
    if (!recipientIds.length) return
    const { data: subscriptions, error } = await this.database.from('push_subscriptions')
      .select('id, endpoint, p256dh, auth').in('user_id', recipientIds)
    if (error) throw error

    await Promise.all((subscriptions ?? []).map(async (subscription) => {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({
          title: 'New message',
          body: body.length > 120 ? `${body.slice(0, 117)}…` : body,
          url: '/',
        }))
      } catch (failure) {
        const statusCode = typeof failure === 'object' && failure !== null && 'statusCode' in failure ? failure.statusCode : null
        if (statusCode === 404 || statusCode === 410) {
          await this.database.from('push_subscriptions').delete().eq('id', subscription.id)
          return
        }
        console.error('Push notification failed.', failure)
      }
    }))
  }

  private isValidSubscription(value: PushSubscription): value is PushSubscription {
    return typeof value?.endpoint === 'string'
      && value.endpoint.startsWith('https://')
      && typeof value.keys?.p256dh === 'string'
      && typeof value.keys?.auth === 'string'
  }
}

export function createPushNotificationService(database: SupabaseClient) {
  return new PushNotificationService(database)
}
