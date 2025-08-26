'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

export default function InAppBell() {
	const { address } = useAccount();
	const [open, setOpen] = useState(false);
	const [items, setItems] = useState<any[]>([]);

	useEffect(() => {
		(async () => {
			if (!address) return;
			try {
				const res = await fetch(`/api/inapp/feed?address=${address}`);
				const json = await res.json();
				setItems(json.items || []);
			} catch {}
		})();
	}, [address, open]);

	return (
		<div className="relative">
			<button onClick={() => setOpen(v => !v)} className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm">
				<span className="sr-only">Notifications</span>
				<svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM19 11V7a7 7 0 10-14 0v4a3 3 0 01-2 2.7V16h18v-2.3a3 3 0 01-2-2.7z" /></svg>
				{items.length > 0 && <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px]">{items.length}</span>}
			</button>
			{open && (
				<div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 max-h-80 overflow-auto">
					{items.length === 0 ? (
						<div className="text-sm text-gray-500 p-4 text-center">No notifications</div>
					) : (
						<ul className="divide-y divide-gray-100">
							{items.map((n) => (
								<li key={n.id} className="p-2">
									<div className="text-sm font-medium text-gray-900">{n.title}</div>
									<div className="text-xs text-gray-600">{n.body}</div>
									<div className="text-[10px] text-gray-400 mt-1">{new Date(n.timestamp).toLocaleString()}</div>
								</li>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	);
}