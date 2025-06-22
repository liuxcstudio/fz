import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://hnrebwwcupnfplreyoup.supabase.co'; 
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucmVid3djdXBuZnBscmV5b3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NDgyMzksImV4cCI6MjA2NjEyNDIzOX0.YZsBmfCIVmJ8mfY2zR8lyHxXhBThDSEYSnIEnuizp0o';

export const supabase = createClient(supabaseUrl, supabaseKey);