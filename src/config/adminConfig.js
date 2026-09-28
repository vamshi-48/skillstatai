/**
 * Admin Panel Access Control Configuration
 * 
 * Add any authorized administrator email addresses to the list below.
 * You can also define VITE_ADMIN_EMAILS in your .env file as a comma-separated list
 * (e.g., VITE_ADMIN_EMAILS=user1@example.com,user2@domain.com).
 */

export const ALLOWED_ADMIN_EMAILS = [
  'karshikalamvamshi48@gmail.com',
  'karshikalamvamshi34@gmail.com',
  'sathvika846@gmail.com',
  'vivekchaitanyasambu@gmail.com',
  'harinchedam@gmail.com',
  'vundhyalaakshaya@gmail.com',
  'varshithgotur30@gmail.com',
]

export const ADMIN_DIRECTORY = [
  {
    name: 'Karshikala Vamshi',
    email: 'karshikalamvamshi48@gmail.com',
    role: 'Chief Administrative Officer',
    designation: 'Director General & System Administrator',
    department: 'National Statistical Office (NSO)',
    division: 'Executive Directorate',
    employeeId: 'ADM-MoSPI-001',
    badge: 'Super Admin',
  },
  {
    name: 'Dr. V. Ramanathan',
    email: 'karshikalamvamshi34@gmail.com',
    role: 'Senior Executive HR Director',
    designation: 'Chair of Senior Executive HR & Talent Assessment Panel',
    department: 'Ministry of Statistics & Programme Implementation',
    division: 'Talent Evaluation Board',
    employeeId: 'ADM-HR-CHAIR-002',
    badge: 'Panel Chair',
  },
  {
    name: 'Sathvika R.',
    email: 'sathvika846@gmail.com',
    role: 'Lead HR Evaluator',
    designation: 'Senior Evaluator & Competency Assessor',
    department: 'National Statistical Systems Training Academy (NSSTA)',
    division: 'Assessment & Certification Cell',
    employeeId: 'ADM-NSSTA-003',
    badge: 'Lead Evaluator',
  },
  {
    name: 'Vivek Chaitanya Sambu',
    email: 'vivekchaitanyasambu@gmail.com',
    role: 'Chief Analytics Officer',
    designation: 'Director of Statistical Quality & Analytics',
    department: 'National Statistical Office (NSO)',
    division: 'Data Analytics & Innovation Cell',
    employeeId: 'ADM-NSO-004',
    badge: 'Analytics Lead',
  },
  {
    name: 'Harin Chedam',
    email: 'harinchedam@gmail.com',
    role: 'Quality & Audit Director',
    designation: 'Joint Director of Data Quality Audit',
    department: 'MoSPI Quality Assurance Division',
    division: 'National Audit Cell',
    employeeId: 'ADM-QA-005',
    badge: 'Audit Director',
  },
  {
    name: 'Akshaya Vundhyala',
    email: 'vundhyalaakshaya@gmail.com',
    role: 'Competency Commissioner',
    designation: 'Director of Civil Services Training',
    department: 'iGOT Karmayogi Directorate',
    division: 'Civil Services Competency Bureau',
    employeeId: 'ADM-iGOT-006',
    badge: 'Commissioner',
  },
  {
    name: 'Varshith Gotur',
    email: 'varshithgotur30@gmail.com',
    role: 'Operations Head',
    designation: 'Deputy Director of Field Operations',
    department: 'Directorate of Field Operations',
    division: 'Survey Administration Division',
    employeeId: 'ADM-FOD-007',
    badge: 'Operations Head',
  },
]

/**
 * Retrieves full admin profile details for a given email address.
 *
 * @param {string} [email]
 * @returns {object} Admin profile object
 */
export function getAdminDetails(email) {
  if (!email || typeof email !== 'string') {
    return ADMIN_DIRECTORY[0]
  }
  const clean = email.trim().toLowerCase()
  const matched = ADMIN_DIRECTORY.find((admin) => {
    const adminEmail = admin.email.toLowerCase()
    return (
      adminEmail === clean ||
      clean.startsWith(adminEmail.split('@')[0]) ||
      adminEmail.startsWith(clean.split('@')[0])
    )
  })
  if (matched) return matched

  // Fallback for custom or environment-configured admin
  const handle = clean.split('@')[0]
  const formattedName = handle
    .split(/[._-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') || 'Authorized Administrator'

  return {
    name: formattedName,
    email: clean,
    role: 'System Administrator',
    designation: 'Directorate of MoSPI Competency Framework',
    department: 'National Statistical Office (NSO)',
    division: 'Central Administration Cell',
    employeeId: `ADM-${handle.toUpperCase().slice(0, 8)}`,
    badge: 'Administrator',
  }
}

/**
 * Checks whether the given email address is authorized for admin access.
 * Comparison is case-insensitive and ignores leading/trailing whitespace.
 * Also accommodates username/handle matches (e.g., 'karshikalamvamshi48' vs 'karshikalamvamshi48@gmail.com').
 *
 * @param {string} [email] - User's email address
 * @returns {boolean} True if the email is in the authorized admin list
 */
export function isAllowedAdmin(email) {
  if (!email || typeof email !== 'string') return false
  const cleanEmail = email.trim().toLowerCase()

  const matchesEntry = (target, input) => {
    if (target === input) return true
    // If target has no '@', match against input or input's handle
    if (!target.includes('@') && (input === `${target}@gmail.com` || input.startsWith(`${target}@`))) return true
    // If input has no '@', match against target's handle
    if (!input.includes('@') && (target === `${input}@gmail.com` || target.startsWith(`${input}@`))) return true
    return false
  }

  // 1. Check statically configured admin emails
  const staticAllowed = ALLOWED_ADMIN_EMAILS.map((e) => e.trim().toLowerCase())
  if (staticAllowed.some((allowed) => matchesEntry(allowed, cleanEmail))) {
    return true
  }

  // 2. Check environment variable VITE_ADMIN_EMAILS (comma-separated)
  try {
    const envEmails = (import.meta.env.VITE_ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    if (envEmails.some((allowed) => matchesEntry(allowed, cleanEmail))) {
      return true
    }
  } catch {
    // Environment variable not accessible in this context
  }

  return false
}
