"use client"

import { createClient } from "@supabase/supabase-js"
import { hasSupabase } from "@/config"

export const browserAuth = hasSupabase
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  : null
