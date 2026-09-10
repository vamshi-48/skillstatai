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
  const targetSkill = skillGap.skill || ''
  const normSkill = targetSkill.toLowerCase().trim()

  if (!normSkill) {
    return NSSTA_CATALOGUE.slice(0, 2)
  }

  // Exact skill match or competency match
  const matches = NSSTA_CATALOGUE.filter((prog) => {
    const directSkill = prog.skill.toLowerCase() === normSkill
    const inSkills = prog.skills.some((s) => s.toLowerCase() === normSkill)
    const inName = prog.name.toLowerCase().includes(normSkill)
    return directSkill || inSkills || inName
  })

  return matches
}
