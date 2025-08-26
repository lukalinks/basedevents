import { NextResponse } from "next/server";
import { listInAppNotifications } from "@/lib/inapp";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const address = searchParams.get('address');
	if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 });
	const items = await listInAppNotifications(address, 50);
	return NextResponse.json({ items });
}