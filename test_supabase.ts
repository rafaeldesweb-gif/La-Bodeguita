import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function test() {
  console.log('Testing Supabase update...');
  // Lets see orders in the DB
  const { data, error } = await supabase.from('orders').select('*');
  console.log('Orders error:', error);
  console.log('Orders data:', data);
}

test().catch(console.error);
