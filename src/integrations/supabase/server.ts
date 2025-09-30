import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const createSupabaseServerClient = () => {
    return createServerClient(
        'https://spwhaaycmdzrnmkfplfo.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwd2hhYXljbWR6cm5ta2ZwbGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDczMDcsImV4cCI6MjA3NDU4MzMwN30.emIrE2NJz39iM9eEO7ZYfj7c6nnDfbvj1n7GGM4AwfQ',
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