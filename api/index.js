import crypto from 'node:crypto'
import {
  syncToSupabaseAuth,
  findUser,
  getUserByIdentityOrEmail,
  getUserBySessionToken,
  upsertUser,
  getAllUsers,
} from '../lib/db.js'

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(`${salt}:${derivedKey.toString('hex')}`)
    })
  })
}

async function verifyPassword(password, storedHash) {
  const [salt, expected] = String(storedHash || '').split(':')
  if (!salt || !expected) return false
  const actual = (await hashPassword(password, salt)).split(':')[1]
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
}

function hashOtp(code) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.createHash('sha256').update(`${salt}:${String(code).trim()}`).digest('hex')
  return `sha256:${salt}:${hash}`
}

async function checkCodeMatch(inputCode, storedHash) {
  if (!inputCode || !storedHash) return false
  const cleanInput = String(inputCode).trim()
  const cleanStored = String(storedHash).trim()

  // 1. Direct plain-text match
  if (cleanStored === cleanInput) return true

  // 2. SHA-256 salted hash: "sha256:salt:hash"
  if (cleanStored.startsWith('sha256:')) {
    const parts = cleanStored.split(':')
    const salt = parts[1]
    const expected = parts[2]
    if (salt && expected) {
      const actual = crypto.createHash('sha256').update(`${salt}:${cleanInput}`).digest('hex')
      if (actual.toLowerCase() === expected.toLowerCase()) return true
    }
  }

  // 3. Scrypt password hash: "salt:hash" (legacy)
  if (cleanStored.includes(':') && !cleanStored.startsWith('sha256:')) {
    try {
      const isMatch = await verifyPassword(cleanInput, cleanStored)
      if (isMatch) return true
    } catch {
      // ignore
    }
  }

  return false
}

function getEnv(key) {
  return process.env[key] || ''
}

async function sendVerificationEmail(email, code, name = '') {
  const emailjsServiceId = getEnv('EMAILJS_SERVICE_ID') || 'service_ulsssyg'
  const emailjsTemplateId = getEnv('EMAILJS_TEMPLATE_ID') || 'template_vwrujof'
  const emailjsPublicKey = getEnv('EMAILJS_PUBLIC_KEY') || '64bi_aUhJjCY07_VY'
  const resendApiKey = getEnv('RESEND_API_KEY')
  const fromEmail = getEnv('RESEND_FROM_EMAIL') || 'Skillstat AI <onboarding@resend.dev>'

  // 1. Try EmailJS
  if (emailjsServiceId && emailjsTemplateId && emailjsPublicKey) {
    try {
      const emailjsRes = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://skillstatai.vercel.app',
          'User-Agent': 'Mozilla/5.0',
        },
        body: JSON.stringify({
          service_id: emailjsServiceId,
          template_id: emailjsTemplateId,
          user_id: emailjsPublicKey,
          template_params: {
            to_email: email,
            email: email,
            to_name: name || email.split('@')[0],
            name: name || email.split('@')[0],
            otp: code,
            code: code,
            passcode: code,
            verification_code: code,
            message: `Your Skillstat AI verification code is ${code}. It expires in 15 minutes.`,
          },
        }),
      })

      if (emailjsRes.ok) {
        console.log(`[EMAIL DISPATCH] Verification OTP ${code} sent successfully to ${email} via EmailJS`)
        return { success: true, provider: 'emailjs' }
      }

      const errText = await emailjsRes.text()
      console.error('EmailJS dispatch failed:', errText)
      throw new Error(`EmailJS failed: ${errText}`)
    } catch (err) {
      console.error('EmailJS error:', err.message)
      if (!resendApiKey) throw err
    }
  }

  // 2. Try Resend if configured
  if (resendApiKey) {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f4; margin: 0; padding: 24px; color: #1e293b; }
            .card { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
            .brand { font-size: 20px; font-weight: 800; color: #15803d; letter-spacing: -0.5px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 12px; }
            .text { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px; }
            .code-box { background: #f0fdf4; border: 2px dashed #86efac; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
            .code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #166534; margin: 0; }
            .expiry { font-size: 13px; color: #64748b; margin-top: 8px; font-weight: 500; }
            .footer { border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">Skillstat AI</div>
            <h1 class="title">Verify your email address</h1>
            <p class="text">Welcome to Skillstat AI! Please enter the 6-digit verification code below to verify your email address and activate your account:</p>
            <div class="code-box">
              <div class="code">${code}</div>
              <div class="expiry">Expires in 15 minutes</div>
            </div>
            <p class="text">If you didn't create an account with Skillstat AI, you can safely ignore this message.</p>
            <div class="footer">
              &copy; ${new Date().getFullYear()} Skillstat AI. Official Workplace Competency Assessment.
            </div>
          </div>
        </body>
      </html>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `${code} is your Skillstat AI verification code`,
        html,
      }),
    })

    const payload = await res.json()
    if (!res.ok) {
      console.error('Resend API Error:', payload)
      throw new Error(payload.message || payload.error?.message || `Resend email dispatch failed (${res.status})`)
    }
    return { success: true, id: payload.id, provider: 'resend' }
  }

  // 3. Fallback to Local/Dev simulated mode
  console.log('\n======================================================')
  console.log(' [SIMULATED] No email provider configured')
  console.log(` Verification email for: ${email}`)
  console.log(` Verification OTP Code:  ${code}`)
  console.log('======================================================\n')
  return { success: true, simulated: true }
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    profile: user.state?.profile || {},
    isEmailVerified: user.isEmailVerified !== false,
  }
}

async function getAuthenticatedUser(request) {
  const token = (request.headers?.authorization || request.headers?.Authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  return await getUserBySessionToken(token)
}

async function readJson(request) {
  if (request.body && typeof request.body === 'object') {
    return request.body
  }
  if (typeof request.body === 'string' && request.body.trim()) {
    try {
      return JSON.parse(request.body)
    } catch {
      return {}
    }
  }
  let body = ''
  for await (const chunk of request) body += chunk
  try {
    return JSON.parse(body || '{}')
  } catch {
    return {}
  }
}

function sendJson(response, status, payload) {
  if (typeof response.status === 'function' && typeof response.json === 'function') {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    return response.status(status).json(payload)
  }
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  })
  response.end(JSON.stringify(payload))
}

export default async function handler(request, response) {
  // CORS Preflight
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  // Parse path from request.url
  const parsedUrl = new URL(request.url, 'http://localhost')
  const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/'

  const validRoutes = [
    '/api/questions',
    '/api/chat',
    '/api/auth/signup',
    '/api/auth/login',
    '/api/auth/verify-email',
    '/api/auth/resend-verification',
    '/api/auth/parichay',
    '/api/auth/logout',
    '/api/state',
    '/api/admin/users',
  ]

  if (!['POST', 'GET'].includes(request.method) || !validRoutes.includes(pathname)) {
    sendJson(response, 404, { error: 'Not found' })
    return
  }

  const reqAuth = (request.headers?.authorization || request.headers?.Authorization || '').replace(/^Bearer\s+/i, '')
  const apiKey = process.env.OPENAI_API_KEY || ''
  const geminiApiKey = process.env.GEMINI_API_KEY || ''
  const effectiveKey = reqAuth || apiKey

  try {
    // ---------------- PARICHAY AUTH ----------------
    if (pathname === '/api/auth/parichay') {
      const body = await readJson(request)
      const email = String(body.email || '').trim().toLowerCase()
      const mobile = String(body.mobile || '').trim()
      const name = String(body.name || '').trim()
      const designation = String(body.designation || '').trim()
      const department = String(body.department || '').trim()
      const officialIdProof = String(body.officialIdProof || '').trim()

      if (!/^[^\s@]+@(?:nic\.in|gov\.in)$/i.test(email)) {
        sendJson(response, 400, { error: 'Parichay requires a government email ending in @nic.in or @gov.in.' })
        return
      }
      if (!/^\+?[0-9\s-]{10,15}$/.test(mobile) || !name || !designation || !department || !officialIdProof || body.nodalApproval !== true) {
        sendJson(response, 400, { error: 'Complete the required Parichay identity and approval details.' })
        return
      }

      let user = await getUserByIdentityOrEmail(email)
      if (!user) {
        user = {
          id: crypto.randomUUID(),
          identity: email,
          email,
          employeeId: `PAR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          passwordHash: '',
          sessionToken: crypto.randomBytes(32).toString('hex'),
          isEmailVerified: true,
          state: {
            profile: { name, email, mobile, designation, department, organization: department, employeeId: '' },
            selectedSkillList: [],
          },
        }
        user.state.profile.employeeId = user.employeeId
      } else {
        user.sessionToken = crypto.randomBytes(32).toString('hex')
        user.state = {
          ...(user.state || {}),
          profile: {
            ...(user.state?.profile || {}),
            name,
            email,
            mobile,
            designation,
            department,
            organization: department,
            officialIdProof,
          },
        }
      }

      await upsertUser(user)
          await syncToSupabaseAuth(user, 'DefaultAuthPass!23')
      sendJson(response, 200, { token: user.sessionToken, user: publicUser(user), state: user.state })
      return
    }

    // ---------------- SIGNUP ----------------
    if (pathname === '/api/auth/signup') {
      const body = await readJson(request)
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const name = String(body.name || '').trim()

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        sendJson(response, 400, { error: 'A valid work email is required.' })
        return
      }
      if (!password || password.length < 8) {
        sendJson(response, 400, { error: 'Password must contain at least 8 characters.' })
        return
      }

      let user = await getUserByIdentityOrEmail(email)
      if (user && user.isEmailVerified !== false) {
        sendJson(response, 409, { error: 'An account already exists for this email address.' })
        return
      }

      const otpCode = String(crypto.randomInt(100000, 1000000))
      const codeHash = hashOtp(otpCode)
      const codeExpires = Date.now() + 15 * 60 * 1000

      if (user) {
        user.passwordHash = await hashPassword(password)
        const recentOtpHashes = Array.isArray(user.state?.recentOtpHashes) ? user.state.recentOtpHashes : []
        if (user.verificationCode) {
          recentOtpHashes.push(user.verificationCode)
        }
        user.state = user.state || { profile: { name, email }, selectedSkillList: [] }
        user.state.recentOtpHashes = recentOtpHashes.slice(-5)
        user.verificationCode = codeHash
        user.verificationExpires = codeExpires
        user.lastVerificationSentAt = Date.now()
        if (name) user.state.profile.name = name
      } else {
        user = {
          id: crypto.randomUUID(),
          identity: email,
          email,
          employeeId: '',
          passwordHash: await hashPassword(password),
          sessionToken: '',
          isEmailVerified: false,
          verificationCode: codeHash,
          verificationExpires: codeExpires,
          lastVerificationSentAt: Date.now(),
          state: {
            profile: { name: name || '', email, employeeId: '' },
            selectedSkillList: [],
            recentOtpHashes: [],
          },
        }
      }

      try {
        await sendVerificationEmail(email, otpCode, name)
      } catch (err) {
        sendJson(response, 502, { error: `Failed to dispatch verification email: ${err.message}` })
        return
      }

      await upsertUser(user)
          await syncToSupabaseAuth(user, 'DefaultAuthPass!23')

      sendJson(response, 200, {
        requiresVerification: true,
        email,
      })
      return
    }

    // ---------------- VERIFY EMAIL ----------------
    if (pathname === '/api/auth/verify-email') {
      const body = await readJson(request)
      const email = String(body.email || '').trim().toLowerCase()
      const code = String(body.code || '').trim()

      if (!email || !code) {
        sendJson(response, 400, { error: 'Email and verification code are required.' })
        return
      }

      const user = await getUserByIdentityOrEmail(email)
      if (!user) {
        sendJson(response, 404, { error: 'Account not found for this email address.' })
        return
      }

      if (user.isEmailVerified !== false) {
        user.sessionToken = user.sessionToken || crypto.randomBytes(32).toString('hex')
        await upsertUser(user)
          await syncToSupabaseAuth(user, 'DefaultAuthPass!23')
        sendJson(response, 200, { token: user.sessionToken, user: publicUser(user), state: user.state })
        return
      }

      if (!user.verificationExpires || Date.now() > user.verificationExpires) {
        sendJson(response, 400, { error: 'Verification code has expired. Please request a new code.' })
        return
      }

      // Check against current verificationCode and any recent valid OTP hashes
      const candidateHashes = [
        user.verificationCode,
        ...(Array.isArray(user.state?.recentOtpHashes) ? user.state.recentOtpHashes : []),
      ].filter(Boolean)

      let isMatch = false
      for (const candidate of candidateHashes) {
        if (await checkCodeMatch(code, candidate)) {
          isMatch = true
          break
        }
      }

      if (!isMatch) {
        sendJson(response, 400, { error: 'Incorrect verification code. Please check your email and try again.' })
        return
      }

      user.isEmailVerified = true
      user.verificationCode = ''
      user.verificationExpires = 0
      if (user.state) {
        user.state.recentOtpHashes = []
      }
      user.sessionToken = crypto.randomBytes(32).toString('hex')
      await upsertUser(user)
          await syncToSupabaseAuth(user, 'DefaultAuthPass!23')

      sendJson(response, 200, { token: user.sessionToken, user: publicUser(user), state: user.state })
      return
    }

    // ---------------- RESEND VERIFICATION ----------------
    if (pathname === '/api/auth/resend-verification') {
      const body = await readJson(request)
      const email = String(body.email || '').trim().toLowerCase()

      if (!email) {
        sendJson(response, 400, { error: 'Email address is required.' })
        return
      }

      const user = await getUserByIdentityOrEmail(email)
      if (!user) {
        sendJson(response, 404, { error: 'Account not found for this email address.' })
        return
      }

      if (user.isEmailVerified !== false) {
        sendJson(response, 400, { error: 'This email is already verified. Please sign in.' })
        return
      }

      const now = Date.now()
      if (user.lastVerificationSentAt && now - user.lastVerificationSentAt < 30000) {
        const remainingSec = Math.ceil((30000 - (now - user.lastVerificationSentAt)) / 1000)
        sendJson(response, 429, { error: `Please wait ${remainingSec}s before requesting a new code.` })
        return
      }

      const otpCode = String(crypto.randomInt(100000, 1000000))
      const codeHash = hashOtp(otpCode)
      user.state = user.state || {}
      const recentOtpHashes = Array.isArray(user.state.recentOtpHashes) ? user.state.recentOtpHashes : []
      if (user.verificationCode) {
        recentOtpHashes.push(user.verificationCode)
      }
      user.state.recentOtpHashes = recentOtpHashes.slice(-5)
      user.verificationCode = codeHash
      user.verificationExpires = now + 15 * 60 * 1000
      user.lastVerificationSentAt = now

      try {
        await sendVerificationEmail(email, otpCode, user.state?.profile?.name || '')
      } catch (err) {
        sendJson(response, 502, { error: `Failed to dispatch verification email: ${err.message}` })
        return
      }

      await upsertUser(user)
          await syncToSupabaseAuth(user, 'DefaultAuthPass!23')
      sendJson(response, 200, { sent: true })
      return
    }

    // ---------------- LOGIN ----------------
    if (pathname === '/api/auth/login') {
      const body = await readJson(request)
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const employeeId = String(body.employeeId || '').trim()

      if (!email && !employeeId) {
        sendJson(response, 400, { error: 'Work email or employee ID is required.' })
        return
      }
      if (!password || password.length < 8) {
        sendJson(response, 400, { error: 'Password must contain at least 8 characters.' })
        return
      }

      const user = await findUser({ email, employeeId, identity: email || employeeId.toLowerCase() })
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        sendJson(response, 401, { error: 'Invalid work email, employee ID, or password.' })
        return
      }

      if (user.isEmailVerified === false) {
        sendJson(response, 403, {
          error: 'Please verify your email address before signing in.',
          emailUnverified: true,
          email: user.email,
        })
        return
      }

      user.sessionToken = crypto.randomBytes(32).toString('hex')
      await upsertUser(user)
          await syncToSupabaseAuth(user, 'DefaultAuthPass!23')
      sendJson(response, 200, { token: user.sessionToken, user: publicUser(user), state: user.state })
      return
    }

    // ---------------- STATE (GET & POST) ----------------
    if (pathname === '/api/state') {
      const user = await getAuthenticatedUser(request)
      if (!user) {
        sendJson(response, 401, { error: 'Authentication required.' })
        return
      }

      if (request.method === 'GET') {
        sendJson(response, 200, { state: user.state || {} })
        return
      }

      const state = await readJson(request)
      user.state = state
      await upsertUser(user)
          await syncToSupabaseAuth(user, 'DefaultAuthPass!23')
      sendJson(response, 200, { saved: true })
      return
    }

    // ---------------- ADMIN ENDPOINTS ----------------
    if (pathname === '/api/admin/users' && request.method === 'GET') {
      const user = await getAuthenticatedUser(request)
      if (!user) {
        sendJson(response, 401, { error: 'Authentication required.' })
        return
      }
      
      const allowedAdmins = (process.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
      if (!allowedAdmins.includes(user.email.toLowerCase())) {
        sendJson(response, 403, { error: 'Forbidden. Admin access required.' })
        return
      }
      
      const allUsers = await getAllUsers()
      sendJson(response, 200, {
        users: allUsers.map(u => ({
          id: u.id,
          email: u.email,
          profile: u.state?.profile || {},
          overallScore: u.state?.overallScore || 0,
          updatedAt: u.updatedAt || new Date().toISOString()
        }))
      })
      return
    }

    // ---------------- FORGOT PASSWORD ----------------
    if (pathname === '/api/auth/forgot-password' && request.method === 'POST') {
      const body = await readJson(request)
      const { email } = body
      if (!email) {
        sendJson(response, 400, { error: 'Email is required.' })
        return
      }
      // Mock successful email send
      sendJson(response, 200, { success: true, message: 'If an account matches, a reset link has been sent.' })
      return
    }

    // ---------------- LOGOUT ----------------
    if (pathname === '/api/auth/logout') {
      const user = await getAuthenticatedUser(request)
      if (user) {
        user.sessionToken = ''
        await upsertUser(user)
          await syncToSupabaseAuth(user, 'DefaultAuthPass!23')
      }
      sendJson(response, 200, { loggedOut: true })
      return
    }

    // ---------------- CHAT (GEMINI) ----------------
    if (pathname === '/api/chat') {
      const activeGeminiKey = geminiApiKey || process.env.GEMINI_API_KEY || ''
      if (!activeGeminiKey) {
        sendJson(response, 503, { error: 'GEMINI_API_KEY is not configured on the server.' })
        return
      }

      const { message, context = {}, history = [] } = await readJson(request)
      const contextText = JSON.stringify(context)
      const contents = [
        ...history
          .filter((item) => item?.text && ['user', 'model'].includes(item.role))
          .map((item) => ({ role: item.role, parts: [{ text: String(item.text) }] })),
        { role: 'user', parts: [{ text: String(message || '') }] },
      ]

      const candidateModels = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3-flash-preview']
      let responseText = ''
      let lastErr = null

      for (const modelName of candidateModels) {
        try {
          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeGeminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [
                    {
                      text: `You are Skillstat AI Copilot, a helpful, encouraging, and authoritative career, competency, and learning coach for professionals.
User profile and context: ${contextText}.
Provide practical, well-formatted answers with clear action steps, recommending official iGOT Karmayogi Bharat courses, NSSTA workshop calendars, or skill gap strategies matching their role and department. Keep answers structured, friendly, and empowering.`,
                    },
                  ],
                },
                contents,
                generationConfig: { temperature: 0.6, maxOutputTokens: 1200 },
              }),
            }
          )

          const payload = await geminiResponse.json()
          if (geminiResponse.ok) {
            responseText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
            if (responseText) break
          } else {
            lastErr = new Error(payload.error?.message || `Gemini status ${geminiResponse.status}`)
          }
        } catch (err) {
          lastErr = err
        }
      }

      if (!responseText) {
        throw lastErr || new Error('Gemini returned an empty response')
      }

      sendJson(response, 200, { text: responseText })
      return
    }

    // ---------------- QUESTIONS (OPENAI) ----------------
    if (pathname === '/api/questions') {
      const profile = await readJson(request)
      const isNotesMode = profile.quizMode === 'notes' || Boolean(profile.notesContent || profile.documentText)
      const rawNotes = String(profile.notesContent || profile.documentText || '').trim()

      if (!effectiveKey) {
        sendJson(response, 503, {
          error: 'API key is not configured on server. Local fallback questions will be used.',
        })
        return
      }

      if (isNotesMode && rawNotes.length >= 20) {
        const notesExcerpt = rawNotes.slice(0, 7500)
        const promptText = `You are an expert assessment creator. Generate exactly 10 high-quality, realistic multiple-choice questions directly based on the uploaded document text provided below.

DOCUMENT CONTENT:
"""
${notesExcerpt}
"""



CRITICAL RULES:
0. Generate all questions and options in the language corresponding to this language code: .

0. Generate all questions and options in the language corresponding to this language code: .

1. Every question MUST test real facts, principles, directives, definitions, numerical thresholds, or procedures explicitly mentioned in the document text above.
2. Distribute questions across different sections/topics of the document. Do NOT ask about the same sentence or concept multiple times.
3. Every question MUST be unique (NO repeated prompts).
4. Each question MUST have:
   - "type": "choice"
   - "skill": A concise 2-4 word topic or section title extracted from the document
   - "label": "Document Question 1" (up to 10)
   - "sourceBadge": "Notes • [topic title]"
   - "prompt": A clear, realistic scenario or comprehension question directly referencing the document content
   - "options": exactly 4 distinct, meaningful options. One option must be the accurate statement from the document. The other 3 must be plausible, distinct alternative claims. NEVER repeat options within a question, and NEVER use identical option text across questions.
   - "answerIndex": index of the correct answer (0, 1, 2, or 3). Randomly distribute the correct answer index across 0, 1, 2, and 3.

Return valid JSON strictly in this format:
{
  "questions": [
    {
      "type": "choice",
      "skill": "...",
      "label": "Document Question 1",
      "sourceBadge": "Notes • ...",
      "prompt": "...",
      "options": ["...", "...", "...", "..."],
      "answerIndex": 1
    }
  ]
}`
        const activeGeminiKey = process.env.GEMINI_API_KEY || effectiveKey || ''
      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${activeGeminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: 'You generate accurate assessments in valid JSON. Return ONLY a valid JSON object.' }]
          },
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.6, responseMimeType: 'application/json' },
        }),
      })

      const payload = await aiResponse.json()
      if (!aiResponse.ok) {
        throw new Error(payload.error?.message || `Gemini API returned status ${aiResponse.status}`)
      }

      let content = payload.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
      if (content.startsWith('```json')) {
          content = content.replace(/^```json/, '').replace(/```$/, '').trim()
      }
      const parsed = JSON.parse(content)
        sendJson(response, 200, { questions: parsed.questions || [] })
        return
      }

      const skillsList = String(profile.skills || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((skill, index, skills) => skills.findIndex((item) => item.toLowerCase() === skill.toLowerCase()) === index)

      if (skillsList.length === 0) {
        sendJson(response, 400, { error: 'Select at least one relevant skill before starting an assessment.' })
        return
      }

      const codingLanguages = String(profile.codingLanguage || '')
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean)
      const hasCodingSkill = codingLanguages.length > 0 && !codingLanguages.every((skill) => skill.toLowerCase() === 'none')

      const questionsPerSkill = 10
      const totalQuestions = skillsList.length * questionsPerSkill
      const codingSkills = skillsList.filter((skill) =>
        codingLanguages.some((codingLanguage) => skill.toLowerCase() === codingLanguage.toLowerCase())
      )

      const promptText = `You are an expert assessment creator. Generate exactly ${totalQuestions} high-quality, realistic skill-assessment questions for:
Role: ${profile.role}
Skills: ${skillsList.join(', ')}
Experience Level: ${profile.experience || '1-3 years'}
Coding Languages: ${hasCodingSkill ? codingLanguages.join(', ') : 'NONE (strictly non-coding profile)'}

CRITICAL RULES:
1. Skills are: ${skillsList.join(', ')}. Generate exactly 10 questions for every selected skill, for a total of ${totalQuestions}. For every question, include the specific "skill" field matching one selected skill. Mix the question order; do not group questions by skill.
2. ${
        codingSkills.length > 0
          ? `For every selected coding skill (${codingSkills.join(', ')}), all 10 questions for that skill must be practical coding challenges of type "code". Each challenge must include exactly 4 independently checkable requirements. For non-coding skills, use practical scenario questions of type "choice".`
          : `STRICT REQUIREMENT: This is a NON-CODING profile. You MUST NEVER generate any coding challenges, syntax questions, code blocks, or 'code' type questions. ALL ${totalQuestions} questions MUST be type "choice" scenario questions covering practical real-world situations, problem-solving, and domain judgment.`
      }
3. REAL WORLD SCENARIOS & NO REPETITION:
   - Each question prompt must be an authentic, practical scenario from real-world public administration, governance, official statistics, clinical healthcare, agricultural estimation, economic price tracking, or data management.
   - Do NOT repeat questions. Every question must describe a unique, distinct scenario or challenge.
   - For choice questions, every option across the question must be distinct and meaningful. Do NOT repeat options within a question, and do NOT use repetitive option text across different questions.
4. Each 'choice' question must have:
   - "type": "choice"
   - "skill": "exact skill name from the user's selected skills"
   - "prompt": "Realistic, challenging scenario question"
   - "options": ["Option 1", "Option 2", "Option 3", "Option 4"] (distribute the correct answer dynamically among options 0, 1, 2, and 3; NEVER place the correct option at index 0 every time)
   - "answerIndex": index of the correct answer (0, 1, 2, or 3)
5. Any 'code' question (ONLY if coding skill was selected) must have:
   - "type": "code"
   - "skill": "one of the selected coding skills"
   - "prompt": "Coding problem description"
   - "language": "the selected coding language"
   - "starter": "starter function code"
   - "checks": ["regex pattern 1", "regex pattern 2", "regex pattern 3", "regex pattern 4"]

Return valid JSON strictly in this format:
{
  "questions": [
    {
      "type": "choice",
      "skill": "...",
      "prompt": "...",
      "options": ["...", "...", "...", "..."],
      "answerIndex": 1
    }
  ]
}`

      const activeGeminiKey = process.env.GEMINI_API_KEY || effectiveKey || ''
      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${activeGeminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: 'You generate accurate assessments in valid JSON. Return ONLY a valid JSON object.' }]
          },
          contents: [{ role: 'user', parts: [{ text: promptText }] }],
          generationConfig: { temperature: 0.6, responseMimeType: 'application/json' },
        }),
      })

      const payload = await aiResponse.json()
      if (!aiResponse.ok) {
        throw new Error(payload.error?.message || `Gemini API returned status ${aiResponse.status}`)
      }

      let content = payload.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
      if (content.startsWith('```json')) {
          content = content.replace(/^```json/, '').replace(/```$/, '').trim()
      }
      const parsed = JSON.parse(content)

      if (Array.isArray(parsed.questions)) {
        parsed.questions = parsed.questions.map((q, qIdx) => {
          if (q.type === 'choice' && Array.isArray(q.options) && q.options.length > 1) {
            const rawCorrect =
              typeof q.answerIndex === 'number'
                ? q.answerIndex
                : typeof q.correctIndex === 'number'
                ? q.correctIndex
                : 0
            const safeCorrect = rawCorrect >= 0 && rawCorrect < q.options.length ? rawCorrect : 0
            const items = q.options.map((opt, idx) => ({ text: opt, isCorrect: idx === safeCorrect }))

            // Shuffle options
            for (let i = items.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              ;[items[i], items[j]] = [items[j], items[i]]
            }

            let newCorrect = items.findIndex((it) => it.isCorrect)
            const nonZeroPositions = [1, 2, 3]
            if (newCorrect === 0) {
              const swapTarget = nonZeroPositions[qIdx % nonZeroPositions.length]
              if (swapTarget < items.length) {
                ;[items[0], items[swapTarget]] = [items[swapTarget], items[0]]
                newCorrect = swapTarget
              }
            }

            return {
              ...q,
              options: items.map((it) => it.text),
              answerIndex: newCorrect,
              correctIndex: newCorrect,
            }
          }
          return q
        })
      }

      sendJson(response, 200, parsed)
      return
    }

    sendJson(response, 404, { error: 'Not found' })
  } catch (error) {
    console.error('[API Error]:', error)
    sendJson(response, 502, { error: error.message || 'Internal server error' })
  }
}


