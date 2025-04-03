// lib/supabase.ts
"use client"

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Ensure both values are available
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or API key is missing.')
    throw new Error('Supabase URL or API key is missing.')
  }

  // Create the client with explicit options to handle Accept headers
  const client = createClientComponentClient<Database>({
    supabaseUrl,
    supabaseKey,
    options: {
      global: {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    }
  })
  
  return client
}