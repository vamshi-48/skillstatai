import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Try loading local .env if process.env is missing values
try {
  const envPath = path.join(process.cwd(), '.env')
  if (fsSync.existsSync(envPath)) {
    const envContent = fsSync.readFileSync(envPath, 'utf8')
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
  }
} catch {}

export function cleanSupabaseUrl(rawUrl) {
  if (!rawUrl) return ''
  let clean = String(rawUrl).trim()
  if (clean.includes('supabase.com/dashboard/project/')) {
    const match = clean.match(/project\/([a-zA-Z0-9_-]+)/)
    if (match && match[1]) {
      clean = `https://${match[1]}.supabase.co`
    }
  }
  clean = clean.replace(/\/rest\/v1\/?$/i, '')
  clean = clean.replace(/\/rest\/?$/i, '')
  clean = clean.replace(/\/+$/, '')
  return clean
}

const rawSupabaseUrl = process.env.SUPABASE_URL || ''
const supabaseUrl = cleanSupabaseUrl(rawSupabaseUrl)
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '').trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

let supabase = null
if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

const dataFile = path.join(process.cwd(), 'data', 'skillstat-users.json')

// Local JSON fallback store helpers
async function readLocalStore() {
  try {
    return JSON.parse(await fs.readFile(dataFile, 'utf8'))
  } catch {
    return { users: [] }
  }
}

async function writeLocalStore(store) {
  try {
    await fs.mkdir(path.dirname(dataFile), { recursive: true })
    await fs.writeFile(dataFile, JSON.stringify(store, null, 2), 'utf8')
  } catch (err) {
    console.warn('[DB] Failed to write local JSON file (normal on read-only environments):', err.message)
  }
}

// Convert DB snake_case row to JS camelCase user object
export function fromDbUser(row) {
  if (!row) return null
  return {
    id: row.id,
    identity: row.identity,
    email: row.email,
    employeeId: row.employee_id || '',
    passwordHash: row.password_hash || '',
    sessionToken: row.session_token || '',
    isEmailVerified: Boolean(row.is_email_verified),
    verificationCode: row.verification_code || '',
    verificationExpires: Number(row.verification_expires || 0),
    lastVerificationSentAt: Number(row.last_verification_sent_at || 0),
    state: row.state || { profile: {}, selectedSkillList: [] },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Convert JS camelCase user object to DB snake_case row
export function toDbUser(user) {
  return {
    id: user.id,
    identity: user.identity,
    email: user.email,
    employee_id: user.employeeId || '',
    password_hash: user.passwordHash || '',
    session_token: user.sessionToken || '',
    is_email_verified: Boolean(user.isEmailVerified),
    verification_code: user.verificationCode || '',
    verification_expires: Number(user.verificationExpires || 0),
    last_verification_sent_at: Number(user.lastVerificationSentAt || 0),
    state: user.state || {},
  }
}

function formatSupabaseError(error) {
  if (!error) return 'Unknown database error'
  const msg = error.message || String(error)
  if (msg.toLowerCase().includes('invalid path specified')) {
    return 'Invalid SUPABASE_URL configured in Vercel. Ensure SUPABASE_URL is https://<project-ref>.supabase.co without /rest/v1 or trailing slashes.'
  }
  if (msg.includes('relation "public.users" does not exist') || msg.toLowerCase().includes("could not find the table 'users'")) {
    return "Database table 'users' does not exist in Supabase. Please execute the SQL in supabase/schema.sql in your Supabase SQL Editor."
  }
  return msg
}

/**
 * Finds user by active session token
 */
export async function getUserBySessionToken(token) {
  if (!token) return null

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('session_token', token)
      .maybeSingle()

    if (error) {
      console.error('[DB Supabase Error] getUserBySessionToken:', error.message)
      throw new Error(`Database error: ${formatSupabaseError(error)}`)
    }
    return fromDbUser(data)
  }

  // Fallback to local store
  const store = await readLocalStore()
  return store.users.find((user) => user.sessionToken === token) || null
}

/**
 * Finds user by ID
 */
export async function getUserById(id) {
  if (!id) return null

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('[DB Supabase Error] getUserById:', error.message)
      throw new Error(`Database error: ${formatSupabaseError(error)}`)
    }
    return fromDbUser(data)
  }

  const store = await readLocalStore()
  return store.users.find((user) => user.id === id) || null
}

/**
 * Finds user by email or identity
 */
export async function getUserByIdentityOrEmail(identityOrEmail) {
  if (!identityOrEmail) return null
  const clean = String(identityOrEmail).trim().toLowerCase()

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`identity.eq.${clean},email.eq.${clean}`)
      .maybeSingle()

    if (error) {
      console.error('[DB Supabase Error] getUserByIdentityOrEmail:', error.message)
      throw new Error(`Database error: ${formatSupabaseError(error)}`)
    }
    return fromDbUser(data)
  }

  const store = await readLocalStore()
  return store.users.find((u) => u.identity?.toLowerCase() === clean || u.email?.toLowerCase() === clean) || null
}

/**
 * Finds user by email, identity, or employee ID
 */
export async function findUser({ email = '', employeeId = '', identity = '' }) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanEmployeeId = String(employeeId || '').trim()
  const cleanIdentity = String(identity || '').trim().toLowerCase()

  if (isSupabaseConfigured && supabase) {
    const conditions = []
    if (cleanIdentity) conditions.push(`identity.eq.${cleanIdentity}`)
    if (cleanEmail) conditions.push(`email.eq.${cleanEmail}`)
    if (cleanEmployeeId) conditions.push(`employee_id.ilike.${cleanEmployeeId}`)

    if (conditions.length === 0) return null

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(conditions.join(','))
      .maybeSingle()

    if (error) {
      console.error('[DB Supabase Error] findUser:', error.message)
      throw new Error(`Database error: ${formatSupabaseError(error)}`)
    }
    return fromDbUser(data)
  }

  const store = await readLocalStore()
  return store.users.find((u) =>
    (cleanIdentity && u.identity?.toLowerCase() === cleanIdentity) ||
    (cleanEmail && u.email?.toLowerCase() === cleanEmail) ||
    (cleanEmployeeId && u.employeeId?.toLowerCase() === cleanEmployeeId.toLowerCase())
  ) || null
}

/**
 * Upserts a user (inserts if not exists, updates if exists)
 */
export async function upsertUser(user) {
  if (!user || !user.id) throw new Error('User must have an id')

  if (isSupabaseConfigured && supabase) {
    const row = toDbUser(user)
    const { data, error } = await supabase
      .from('users')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      console.error('[DB Supabase Error] upsertUser:', error.message)
      throw new Error(`Database error: ${formatSupabaseError(error)}`)
    }
    return fromDbUser(data)
  }

  // Fallback to local JSON
  const store = await readLocalStore()
  const existingIdx = store.users.findIndex((u) => u.id === user.id || (u.identity && u.identity === user.identity))
  if (existingIdx >= 0) {
    store.users[existingIdx] = { ...store.users[existingIdx], ...user }
  } else {
    store.users.push(user)
  }
  await writeLocalStore(store)
  return user
}

/**
 * Gets all users (useful for migrations)
 */
export async function getAllUsers() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('users').select('*')
    if (error) throw error
    return (data || []).map(fromDbUser)
  }
  const store = await readLocalStore()
  return store.users || []
}

export { supabase }
