import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://spwhaaycmdzrnmkfplfo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwd2hhYXljbWR6cm5ta2ZwbGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDczMDcsImV4cCI6MjA3NDU4MzMwN30.emIrE2NJz39iM9eEO7ZYfj7c6nnDfbvj1n7GGM4AwfQ';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);