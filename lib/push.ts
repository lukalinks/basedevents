import webpush from 'web-push'
import { redis } from './redis'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@basedevents.local'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
	webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
} else {
	console.warn('Web Push disabled: VAPID keys missing')
}

export function getVapidPublicKey() {
	return VAPID_PUBLIC_KEY || null
}

export type PushSubscription = {
	endpoint: string
	keys: { p256dh: string; auth: string }
}

const SUBS_SET_PREFIX = 'push:subs:' // push:subs:<address>

export async function saveSubscription(address: string, sub: PushSubscription) {
	try {
		if (!redis) return false
		await redis.sadd(`${SUBS_SET_PREFIX}${address.toLowerCase()}`, JSON.stringify(sub))
		return true
	} catch (e) {
		console.error('saveSubscription error', e)
		return false
	}
}

export async function getSubscriptions(address: string): Promise<PushSubscription[]> {
	if (!redis) return []
	const items = await redis.smembers<string>(`${SUBS_SET_PREFIX}${address.toLowerCase()}`)
	return items.map(i => JSON.parse(i))
}

export async function sendPushToAddress(address: string, payload: any) {
	if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return { sent: 0, failures: 0 }
	const subs = await getSubscriptions(address)
	let sent = 0, failures = 0
	await Promise.all(subs.map(async (sub) => {
		try {
			await webpush.sendNotification(sub as any, JSON.stringify(payload))
			sent++
		} catch (e) {
			console.warn('webpush error', e?.statusCode)
			failures++
		}
	}))
	return { sent, failures }
}