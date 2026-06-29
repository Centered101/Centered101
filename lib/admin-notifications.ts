import { createAdminClient } from '@/lib/supabase/admin'

export type NotificationType = 'deploy' | 'warning' | 'security' | 'info'

export async function writeNotification(options: {
  type: NotificationType
  title: string
  message?: string
  actorUserId?: string
  resource?: string
  resourceId?: string
}) {
  const supabase = createAdminClient()
  if (!supabase) return

  const { error } = await supabase.from('notifications').insert({
    type: options.type,
    title: options.title,
    message: options.message ?? null,
    actor_user_id: options.actorUserId ?? null,
    resource: options.resource ?? null,
    resource_id: options.resourceId ?? null,
  })

  if (error) console.warn('writeNotification failed:', error.message)
}
