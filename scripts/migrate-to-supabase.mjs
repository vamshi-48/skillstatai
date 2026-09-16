import fs from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.join(process.cwd(), '.env')
try {
  const envContent = await fs.readFile(envPath, 'utf8')
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim()
      let val = trimmed.slice(eqIdx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
} catch {}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env to run migration.')
  console.error('Add your Supabase credentials to .env and try again.\n')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const dataFile = path.join(process.cwd(), 'data', 'skillstat-users.json')

async function migrate() {
  console.log('🔄 Starting migration from data/skillstat-users.json to Supabase...')
  let raw
  try {
    raw = await fs.readFile(dataFile, 'utf8')
  } catch {
    console.log('ℹ️  No data/skillstat-users.json file found. Nothing to migrate.')
    return
  }

  const parsed = JSON.parse(raw)
  const users = parsed.users || []
  console.log(`Found ${users.length} users to migrate.`)

  let successCount = 0
  let errorCount = 0

  for (const u of users) {
    const row = {
      id: u.id,
      identity: u.identity || u.email,
      email: u.email,
      employee_id: u.employeeId || '',
      password_hash: u.passwordHash || '',
      session_token: u.sessionToken || '',
      is_email_verified: Boolean(u.isEmailVerified),
      verification_code: u.verificationCode || '',
      verification_expires: Number(u.verificationExpires || 0),
      last_verification_sent_at: Number(u.lastVerificationSentAt || 0),
      state: u.state || {},
    }

    const { error } = await supabase.from('users').upsert(row, { onConflict: 'id' })
    if (error) {
      console.error(`❌ Failed to migrate user ${u.email}:`, error.message)
      errorCount++
    } else {
      console.log(`✅ Migrated user: ${u.email} (${u.id})`)
      successCount++
    }
  }

  console.log(`\n🎉 Migration completed! Successfully migrated: ${successCount}, Failed: ${errorCount}\n`)
}

migrate().catch((err) => {
  console.error('Fatal migration error:', err)
  process.exit(1)
})
