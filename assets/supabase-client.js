// ============================================================
// Fill these in from your Supabase project:
// Project Settings → API → Project URL / anon public key
// These two values are safe to expose in client-side code —
// Supabase's Row Level Security (set up in supabase-schema.sql)
// is what actually protects each user's data.
// ============================================================
const SUPABASE_URL = "https://bfqixescpqyoamicsjnf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6QVXBgP-RWZ9nPgZxPh4Ug_ZG-_ONQd";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
