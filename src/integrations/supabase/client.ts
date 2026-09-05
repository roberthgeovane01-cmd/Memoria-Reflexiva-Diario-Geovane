import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

// Frontend usa apenas URL + publishable key. Nenhuma chave secreta/service_role
// deve existir no cliente.
export const SUPABASE_URL = "https://dxigfruylgfxnosmogky.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_A-ZjsxmVajUFy0Q4PTc9yA_dXqD6eBn";

const isBrowser = typeof window !== "undefined";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: isBrowser,
    autoRefreshToken: isBrowser,
    detectSessionInUrl: isBrowser,
    storage: isBrowser ? window.localStorage : undefined,
  },
});
