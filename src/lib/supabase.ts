import { createClient } from '@supabase/supabase-js';

// 这里换成你自己的 Supabase 地址和 Anon Key
const supabaseUrl = 'https://kockgextkiqsrgghybkd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvY2tnZXh0a2lxc3JnZ2h5YmtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTUzNzMsImV4cCI6MjA4OTk5MTM3M30.PvaihC7l5lcTL49XXvXzUOY7Ft20Zg03Mev_UVRPGrw'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey);