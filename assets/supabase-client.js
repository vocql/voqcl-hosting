// ============================================================
// Fill these in from your Supabase project:
// Project Settings → API → Project URL / publishable (anon) key
// These two values are safe to expose in client-side code —
// Row Level Security (set up in supabase-schema.sql) is what
// actually protects each user's data on the read/delete side.
// The service role key (used only by the backend) is NOT this key
// and must never appear in this file.
// ============================================================
const SUPABASE_URL = "https://bfqixescpqyoamicsjnf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_6QVXBgP-RWZ9nPgZxPh4Ug_ZG-_ONQd";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
