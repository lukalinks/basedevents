import type { Resend } from 'resend'

let resendClient: Resend | null = null

export type SendEmailParams = {
	to: string
	subject: string
	html: string
	from?: string
}

export async function sendEmail({ to, subject, html, from }: SendEmailParams) {
	try {
		if (!process.env.RESEND_API_KEY) {
			console.warn('Email disabled: RESEND_API_KEY missing')
			return { sent: false, reason: 'no_api_key' }
		}
		// Lazy import to avoid adding to client bundle
		const { Resend } = await import('resend')
		if (!resendClient) {
			resendClient = new Resend(process.env.RESEND_API_KEY)
		}
		const sender = from || process.env.EMAIL_FROM || 'noreply@basedevents.local'
		const res = await resendClient.emails.send({ to, subject, html, from: sender })
		return { sent: true, id: (res as any)?.id }
	} catch (error) {
		console.error('Failed to send email', error)
		return { sent: false, reason: 'exception' }
	}
}