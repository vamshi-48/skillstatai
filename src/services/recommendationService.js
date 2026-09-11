/**
 * Combined Multi-Dimensional Recommendation Engine
 *
 * Evaluates employee competency gaps against:
 * - Designation, Department, Job Role, Assignment
 * - Experience & Previous Training (iGOT, NSSTA, External)
 * - Current Competency, Required Competency, Domain
 *
 * Routes learning needs to:
 * - A. iGOT Karmayogi (Online self-paced learning)
 * - B. NSSTA / TPAC (In-person specialised statistical training)
 * - C. BOTH
 */

import { getRecommendedCourses } from './igotService'
import { getRecommendedTraining } from './nsstaService'

/**
 * Generate comprehensive recommendations for a specific skill gap.
 */
export async function getRecommendations(profile = {}, skillGap = {}) {
  const skill = skillGap.skill || 'General Competency'
  const currentLevel = Number(skillGap.current ?? skillGap.proficiency ?? 45)
  const targetLevel = Number(skillGap.required ?? skillGap.target ?? 80)
  const gap = Math.max(0, targetLevel - currentLevel)

  // Determine priority
  let priority = skillGap.priority
  if (!priority) {
    if (gap >= 30) priority = 'Critical'
    else if (gap >= 15) priority = 'Moderate'
    else priority = 'Low'
  }

  // Fetch official courses and training
  const [igotCourses, nsstaPrograms] = await Promise.all([
    getRecommendedCourses(profile, { skill, currentLevel, targetLevel, gap }),
    getRecommendedTraining(profile, { skill, currentLevel, targetLevel, gap }),
  ])

  // Contextual reasoning based on profile & gap
  const roleName = profile.role || profile.designation || 'Statistical Officer'
  const experience = profile.experience || '1–2 years'
  const prevIGOT = profile.previousIGOT || 'Not yet attended'
  const prevNSSTA = profile.previousNSSTA || 'Not yet attended'

  let explanation = ''
  if (gap >= 30) {
    explanation = `Your current competency in ${skill} is ${currentLevel}%, compared to the required benchmark of ${targetLevel}% for ${roleName} (${gap} percentage points gap). Given your ${experience} experience and priority level (${priority}), comprehensive upskilling is recommended through foundational online learning combined with specialized practical training.`
  } else if (gap >= 15) {
    explanation = `Your ${skill} competency is ${currentLevel}%, with a moderate gap of ${gap} points toward the ${targetLevel}% standard for ${roleName}. Focused module practice and scenario review will close this gap effectively.`
  } else {
    explanation = `Your ${skill} competency is strong at ${currentLevel}% (target: ${targetLevel}%, gap: ${gap} points). Maintenance learning and advanced reference materials are recommended to maintain role readiness.`
  }

  // Additional context for training history
  if (prevIGOT === 'Completed' && prevNSSTA === 'Not yet attended' && nsstaPrograms.length > 0) {
    explanation += ` Since prior iGOT self-learning is recorded, an in-person NSSTA workshop will provide hands-on lab depth.`
  }

  return {
    skill,
    currentLevel,
    targetLevel,
    gap,
    priority,
    explanation,
    igotCourses,
    nsstaPrograms,
    noIgotMessage: 'No directly matching iGOT course found. Try a related competency.',
    noNsstaMessage: 'No directly matching NSSTA/TPAC programme found. Continue with iGOT learning and reassess the competency.',
  }
}
