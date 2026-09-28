import { getAllUsers, syncToSupabaseAuth, isSupabaseConfigured } from '../lib/db.js';

async function run() {
  if (!isSupabaseConfigured) {
    console.log('Supabase not configured, skipping backfill.');
    return;
  }
  const users = await getAllUsers();
  console.log('Found', users.length, 'users to sync to Supabase Auth.');
  for (const u of users) {
    await syncToSupabaseAuth(u, 'DefaultAuthPass!23');
    console.log('Synced', u.email);
  }
  console.log('Backfill complete.');
}
run();
