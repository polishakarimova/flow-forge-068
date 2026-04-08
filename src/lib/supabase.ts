import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://knwqhjutzlzckzjmbtto.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_aANhkc7nQgh01VcYGwGlJw_MS6R7xjj";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
