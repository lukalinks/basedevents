import { NextResponse } from "next/server";
import { saveSubscription } from "@/lib/push";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { address, subscription } = body as { address: string; subscription: any };
		if (!address || !subscription) {
			return NextResponse.json({ error: 'Missing address or subscription' }, { status: 400 });
		}
		const ok = await saveSubscription(address, subscription);
		return NextResponse.json({ success: ok });
	} catch (e) {
		return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
	}
}