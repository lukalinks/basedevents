import { NextResponse } from "next/server";
import { sendPushToAddress } from "@/lib/push";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { address, title, body: message, url } = body as any;
		if (!address || !title) return NextResponse.json({ error: 'Missing address or title' }, { status: 400 });
		const res = await sendPushToAddress(address, { title, body: message, data: { url } });
		return NextResponse.json({ success: true, result: res });
	} catch (e) {
		return NextResponse.json({ error: 'Failed to send push' }, { status: 500 });
	}
}