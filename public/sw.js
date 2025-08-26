self.addEventListener('push', function(event) {
	let data = {}
	try { data = event.data ? event.data.json() : {} } catch {}
	const title = data.title || 'Based Events'
	const options = {
		body: data.body || '',
		icon: '/logo.png',
		badge: '/logo.png',
		data: data.data || {},
	}
	event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function(event) {
	event.notification.close()
	const targetUrl = (event.notification.data && event.notification.data.url) || '/'
	event.waitUntil(clients.openWindow(targetUrl))
})