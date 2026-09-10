/**
 * Official iGOT Karmayogi Integration Service
 *
 * Dedicated abstraction layer connecting Skillstat AI to iGOT Karmayogi.
 * Handles course catalog querying, role/skill matching, progress lookup, and enrollment status.
 */
import { IGOT_CATALOGUE } from '../data/igotMockData'

/**
 * Retrieve all verified iGOT courses.
 */
export async function getCourses() {
  return [...IGOT_CATALOGUE]
}

/**
 * Search iGOT courses matching a skill or job role.
 */
export async function searchCourses(skill = '', role = '') {
  const normSkill = skill.toLowerCase().trim()
  const normRole = role.toLowerCase().trim()

  return IGOT_CATALOGUE.filter((course) => {
    const matchSkill =
      !normSkill ||
      course.competency.toLowerCase().includes(normSkill) ||
      course.skills.some((s) => s.toLowerCase().includes(normSkill)) ||
      course.title.toLowerCase().includes(normSkill)

    const matchRole =
      !normRole ||
      course.whyRecommended.toLowerCase().includes(normRole) ||
      course.title.toLowerCase().includes(normRole)

    return matchSkill || matchRole
  })
}

/**
 * Fetch a specific course by ID.
 */
export async function getCourse(courseId) {
  const course = IGOT_CATALOGUE.find((c) => c.id === courseId)
  return course ? { ...course } : null
}

/**
 * Get recommended official iGOT courses based on employee profile and skill gap.
 */
export async function getRecommendedCourses(profile = {}, skillGap = {}) {
  const targetSkill = skillGap.skill || ''
  const normSkill = targetSkill.toLowerCase().trim()

  if (!normSkill) {
    return IGOT_CATALOGUE.slice(0, 3)
  }

  // Exact or close competency matches
  const directMatches = IGOT_CATALOGUE.filter((course) => {
    const compMatch = course.competency.toLowerCase() === normSkill
    const skillListMatch = course.skills.some((s) => s.toLowerCase() === normSkill)
    const titleMatch = course.title.toLowerCase().includes(normSkill)
    return compMatch || skillListMatch || titleMatch
  })

  if (directMatches.length > 0) {
    return directMatches
  }

  // Related competency match fallback
  const relatedMatches = IGOT_CATALOGUE.filter((course) => {
    return (
      course.skills.some((s) => s.toLowerCase().includes(normSkill) || normSkill.includes(s.toLowerCase())) ||
      course.whyRecommended.toLowerCase().includes(normSkill)
    )
  })

  return relatedMatches
}

/**
 * Get progress for a given course ID.
 */
export async function getCourseProgress(courseId) {
  const course = await getCourse(courseId)
  return course ? course.progress : 0
}

/**
 * Get enrollment status for a given course ID.
 */
export async function getEnrollmentStatus(courseId) {
  const course = await getCourse(courseId)
  return course ? course.enrollmentStatus : 'Not Enrolled'
}
