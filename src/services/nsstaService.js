/**
 * Official NSSTA / TPAC Specialised Training Service
 *
 * Dedicated abstraction layer connecting Skillstat AI to NSSTA (National Statistical Systems
 * Training Academy) and TPAC (Training Programme Advisory Committee) under MoSPI.
 */
import { NSSTA_CATALOGUE } from '../data/nsstaMockData'

/**
 * Retrieve all verified NSSTA training programmes.
 */
export async function getTrainingProgrammes() {
  return [...NSSTA_CATALOGUE]
}

/**
 * Search NSSTA programmes by skill, role, or keyword.
 */
export async function searchTrainingProgrammes(skill = '', role = '') {
  const normSkill = skill.toLowerCase().trim()
  const normRole = role.toLowerCase().trim()

  return NSSTA_CATALOGUE.filter((prog) => {
    const matchSkill =
      !normSkill ||
      prog.skill.toLowerCase().includes(normSkill) ||
      prog.skills.some((s) => s.toLowerCase().includes(normSkill)) ||
      prog.name.toLowerCase().includes(normSkill)

    const matchRole =
      !normRole ||
      prog.eligibility.toLowerCase().includes(normRole) ||
      prog.whyRecommended.toLowerCase().includes(normRole)

    return matchSkill || matchRole
  })
}

/**
 * Fetch a specific programme by ID.
 */
export async function getProgrammeDetails(programmeId) {
  const prog = NSSTA_CATALOGUE.find((p) => p.id === programmeId)
  return prog ? { ...prog } : null
}

/**
 * Get recommended official NSSTA / TPAC programmes based on employee profile and skill gap.
 */
export async function getRecommendedTraining(profile = {}, skillGap = {}) {
  const targetSkill = (skillGap.skill || '').toLowerCase().trim()
  const userDept = (profile.department || '').toLowerCase().trim()
  const userRole = (profile.role || profile.designation || '').toLowerCase().trim()

  const scored = NSSTA_CATALOGUE.map((prog) => {
    let score = 0
    const progDept = (prog.department || '').toLowerCase()
    const progSkill = (prog.skill || '').toLowerCase()
    const progSkills = (prog.skills || []).map((s) => s.toLowerCase())
    const progName = (prog.name || '').toLowerCase()
    const progElig = (prog.eligibility || '').toLowerCase()
    const progWhy = (prog.whyRecommended || '').toLowerCase()

    // 1. Department match
    if (userDept) {
      if (progDept && progDept === userDept) score += 60
      else if (progDept && (userDept.includes(progDept) || progDept.includes(userDept))) score += 40
      else if (progDept && progDept !== userDept) score -= 40
    }

    // 2. Target Skill match
    if (targetSkill) {
      if (progSkill === targetSkill) score += 50
      else if (progSkill.includes(targetSkill) || targetSkill.includes(progSkill)) score += 30
      if (progSkills.includes(targetSkill)) score += 40
      else if (progSkills.some((s) => s.includes(targetSkill) || targetSkill.includes(s))) score += 25
      if (progName.includes(targetSkill)) score += 20
    }

    // 3. Role / Eligibility match
    if (userRole) {
      if (progElig.includes(userRole) || progWhy.includes(userRole)) score += 30
    }

    return { prog, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const matches = scored.filter((item) => item.score > 15).map((item) => item.prog)
  if (matches.length > 0) {
    return matches.slice(0, 3)
  }

  // Domain fallback if no direct skill match
  if (userDept) {
    const deptMatches = NSSTA_CATALOGUE.filter((prog) => (prog.department || '').toLowerCase() === userDept)
    if (deptMatches.length > 0) return deptMatches.slice(0, 2)
  }

  return NSSTA_CATALOGUE.slice(0, 2)
}
