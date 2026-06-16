import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "productos";

let _client: SupabaseClient | null = null;

// Lazy init: el cliente se crea solo cuando llega el primer request,
// no durante el build de Next.js (donde las vars de entorno no están disponibles).
export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY"
      );
    }
    _client = createClient(url, key, { auth: { persistSession: false } });
  }
  return _client;
}
