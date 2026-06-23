import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://utzvslmzjdtwbhzrolje.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0enZzbG16amR0d2JoenJvbGplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMTg3MDgsImV4cCI6MjA2ODY5NDcwOH0.koJweJzksc8Hg9I5uu02k9gZAWb-IvAL5DRJftkSm7g";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
