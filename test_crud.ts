import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_SECRET_KEY || '';

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  // Confirm everyone's email
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("error listing users", listError);
    return;
  }
  
  for (const u of usersData.users) {
    if (!u.email_confirmed_at) {
      console.log(`Verifying email for ${u.email}...`);
      await supabase.auth.admin.updateUserById(u.id, { email_confirm: true });
    }
    
    // Ensure admin user has role admin
    if (u.email === 'rafael_o_maitin@yahoo.es') {
      console.log(`Setting role to admin for ${u.email}...`);
      await supabase.from('profiles').update({ role: 'admin' }).eq('id', u.id);
    }
  }
  
  console.log("Done checking users.");
}

run();
