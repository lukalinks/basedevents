import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { to } = body as { to: string };
		if (!to) return NextResponse.json({ error: 'Missing to' }, { status: 400 });
		const res = await sendEmail({ to, subject: 'Based Events: Email Test', html: '<p>This is a test email from Based Events.</p>' });
		return NextResponse.json({ result: res });
	} catch (e) {
		return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
	}
}