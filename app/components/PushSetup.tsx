'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

export default function PushSetup() {
	const { address } = useAccount();
	const [ready, setReady] = useState(false);

	useEffect(() => {
		(async () => {
			try {
				if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
				await navigator.serviceWorker.register('/sw.js');
				setReady(true);
			} catch (e) {
				console.warn('Service worker registration failed', e);
			}
		})();
	}, []);

	useEffect(() => {
		(async () => {
			if (!ready || !address) return;
			try {
				const res = await fetch('/api/push/vapid');
				const { publicKey } = await res.json();
				if (!publicKey) return;
				const reg = await navigator.serviceWorker.ready;
				const sub = await reg.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(publicKey)
				});
				await fetch('/api/push/subscribe', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ address, subscription: sub })
				});
			} catch (e) {
				console.warn('Push subscription failed', e);
			}
		})();
	}, [ready, address]);

	return null;
}

function urlBase64ToUint8Array(base64String: string) {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}