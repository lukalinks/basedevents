import { redis } from './redis'

const FEED_PREFIX = 'inapp:feed:' // inapp:feed:<address>

export type InAppNotification = {
	id: string
	title: string
	body: string
	data?: any
	timestamp: number
	read?: boolean
}

export async function addInAppNotification(address: string, note: Omit<InAppNotification, 'id'|'timestamp'|'read'>) {
	if (!redis) return null
	const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
	const item: InAppNotification = { id, timestamp: Date.now(), read: false, ...note }
	await redis.lpush(`${FEED_PREFIX}${address.toLowerCase()}`, JSON.stringify(item))
	await redis.ltrim(`${FEED_PREFIX}${address.toLowerCase()}`, 0, 199) // keep last 200
	return item
}

export async function listInAppNotifications(address: string, limit = 50): Promise<InAppNotification[]> {
	if (!redis) return []
	const items = await redis.lrange<string>(`${FEED_PREFIX}${address.toLowerCase()}`, 0, limit - 1)
	return items.map(i => JSON.parse(i))
}