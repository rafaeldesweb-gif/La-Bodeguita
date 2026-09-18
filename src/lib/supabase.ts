import { createClient } from '@supabase/supabase-js';

const env = import.meta.env as ImportMetaEnv & {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

const supabaseUrl = env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Cliente para el navegador. Solo utiliza la clave pública; nunca añadas una
 * clave `sb_secret_` o `service_role` a las variables `VITE_*`.
 */
export const supabase =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey)
    : null;

export const isSupabaseConfigured = Boolean(supabase);
