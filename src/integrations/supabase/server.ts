import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createSupabaseServerClient = () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error("Missing Supabase URL or Anon Key from environment variables. Please check your .env.local file.");
    }

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                async get(name: string) {
                    const cookieStore = await cookies();
                    return cookieStore.get(name)?.value;
                },
                async set(name: string, value: string, options: CookieOptions) {
                    try {
                        const cookieStore = await cookies();
                        cookieStore.set({ name, value, ...options });
                    } catch (error: any) {
                        // Re-throw NEXT_REDIRECT errors to stop rendering and trigger the redirect
                        if (error.digest?.includes('NEXT_REDIRECT')) {
                            throw error;
                        }
                        // The `set` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing sessions.
                    }
                },
                async remove(name: string, options: CookieOptions) {
                    try {
                        const cookieStore = await cookies();
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error: any) {
                        // Re-throw NEXT_REDIRECT errors to stop rendering and trigger the redirect
                        if (error.digest?.includes('NEXT_REDIRECT')) {
                            throw error;
                        }
                        // The `delete` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing sessions.
                    }
                },
            },
        }
    );
}