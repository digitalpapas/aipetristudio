import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pujouskjoghibojqzjis.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1am91c2tqb2doaWJvanF6amlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MzAyNTgsImV4cCI6MjA3MDUwNjI1OH0.5N3L_0qnFYmsRzV91_-zVz0h_h6w9FadeyH5D-MrRGM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})