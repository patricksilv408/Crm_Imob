import { createClient } from '@supabase/supabase-js';

// This client is for server-side operations that require admin privileges.
// It uses the SERVICE_ROLE_KEY, which should be kept secret.
export const createSupabaseServiceRoleClient = () => {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in .env.local");
    }

    return createClient(
        'https://spwhaaycmdzrnmkfplfo.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}