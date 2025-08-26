import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Add debugging for environment variables (client-side only, dev)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
	// Only log once to avoid spam
	// @ts-ignore - augmenting window for debug flag
	if (!window.__supabaseDebugLogged) {
		console.log('🔍 Debug - Supabase URL:', supabaseUrl || '(missing)');
		console.log('🔍 Debug - Supabase Key:', supabaseAnonKey ? 'Set (length: ' + supabaseAnonKey.length + ')' : 'Missing');
		// @ts-ignore
		window.__supabaseDebugLogged = true;
	}
}

let supabase: ReturnType<typeof createClient> | any;

if (supabaseUrl && supabaseAnonKey) {
	supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
	// Do not throw at import time to allow builds to complete in environments
	// without Supabase env vars (e.g., static builds or preview deploys).
	// Instead, export a proxy that throws with a clear message upon actual use.
	const errorMessage = `Missing required Supabase environment variables.\n` +
		`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'Set' : 'Missing'}\n` +
		`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'Set' : 'Missing'}\n` +
		`Please configure these in your environment (e.g., .env.local).`;

	if (typeof console !== 'undefined') {
		console.warn('⚠️ ' + errorMessage);
	}

	supabase = new Proxy({}, {
		get() {
			throw new Error(errorMessage);
		}
	});
}

export { supabase }
