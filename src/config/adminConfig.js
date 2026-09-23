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
]

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
