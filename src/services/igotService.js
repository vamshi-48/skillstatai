/**
 * Official iGOT Karmayogi Integration Service
 *
 * Dedicated abstraction layer connecting Skillstat AI to iGOT Karmayogi.
 * Handles course catalog querying, role/skill matching, progress lookup, and enrollment status.
 */
import { IGOT_CATALOGUE } from '../data/igotMockData.js'

/**
 * Domain semantic keyword groups for multi-tier matching.
 */
const DOMAIN_KEYWORDS = {
  agriculture: ['agri', 'crop', 'yield', 'rural', 'horticulture', 'farm', 'krishi', 'soil', 'harvest', 'cultivation'],
  economics: ['macro', 'micro', 'econometric', 'econometrics', 'economics', 'economy', 'cpi', 'inflation', 'price', 'gdp', 'wpi', 'fiscal', 'monetary', 'market intelligence'],
  statistics: ['statistic', 'statistics', 'sampling', 'survey', 'regression', 'inference', 'hypothesis', 'census', 'nss', 'mospi', 'sample', 'variance', 'probability', 'data analysis'],
  policy: ['policy', 'governance', 'public', 'administration', 'civil', 'apar', 'program evaluation', 'niti', 'regulation', 'administrative', 'compliance'],
  technology: ['ai', 'ml', 'machine learning', 'python', 'sql', 'cloud', 'gis', 'database', 'cybersecurity'],
}

/**
 * Curated Fallback Course IDs from official core civil service catalog.
 */
const CURATED_FALLBACK_IDS = [
  'igot-stat-10', // Official Statistics Fundamentals & Sampling Techniques
  'igot-gov-07',  // Government Data Governance and Digital Personal Data Protection
  'igot-python-06', // Python for Public Policy Analysis and Automated Reporting
  'igot-ai-01',   // AI for Official Statistics and Public Governance
  'igot-dataqual-05', // Data Quality Frameworks & National Statistical Standards
]

/**
 * Tokenize an input string or array into a lowercase set of non-trivial words.
 * Ensures order-independent matching.
 */
function extractTokens(input) {
  if (!input) return new Set()
  const text = Array.isArray(input) ? input.join(' ') : String(input)
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s/_-]/g, ' ')
    .split(/[\s/_-]+/)
    .filter((w) => w.length > 1)
  return new Set(words)
}

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
 *
 * Implements Multi-Tier Semantic Matching:
 * 1. Direct Role/Designation Domain Mapping (Agri, Economics, Statistics, Public Policy)
 * 2. Competency/Skill Tag Aggregation (order-independent token sets)
 * 3. Curated Civil Service Fallback Catalog (ensuring user never sees empty list)
 */
export async function getRecommendedCourses(profile = {}, skillGap = {}) {
  // Aggregate all user inputs regardless of order
  const roleName = String(profile.role || profile.designation || '').trim()
  const targetSkill = String(skillGap.skill || '').trim()
  const domainHint = String(skillGap.domain || '').trim()
  const userSkills = Array.isArray(profile.skills)
    ? profile.skills
    : Array.isArray(profile.selectedSkills)
      ? profile.selectedSkills
      : []

  // Tokenize all user inputs into order-independent token sets
  const userTokens = new Set([
    ...extractTokens(roleName),
    ...extractTokens(targetSkill),
    ...extractTokens(domainHint),
    ...extractTokens(userSkills),
  ])

  const normTargetSkill = targetSkill.toLowerCase()
  const normRole = roleName.toLowerCase()

  // Identify active domain affinities from tokens
  const isAgri = [...userTokens].some((t) => DOMAIN_KEYWORDS.agriculture.some((k) => t.includes(k) || k.includes(t)))
  const isEcon = [...userTokens].some((t) => DOMAIN_KEYWORDS.economics.some((k) => t.includes(k) || k.includes(t)))
  const isStat = [...userTokens].some((t) => DOMAIN_KEYWORDS.statistics.some((k) => t.includes(k) || k.includes(t)))
  const isPolicy = [...userTokens].some((t) => DOMAIN_KEYWORDS.policy.some((k) => t.includes(k) || k.includes(t)))

  // Score each course in catalog
  const scored = IGOT_CATALOGUE.map((course) => {
    let score = 0
    const courseComp = course.competency.toLowerCase()
    const courseTitle = course.title.toLowerCase()
    const courseSkills = course.skills.map((s) => s.toLowerCase())
    const courseReason = (course.whyRecommended || '').toLowerCase()
    const courseTokens = new Set([
      ...extractTokens(course.title),
      ...extractTokens(course.competency),
      ...extractTokens(course.skills),
      ...extractTokens(course.whyRecommended),
    ])

    // Tier 1: Direct Target Skill Match
    if (normTargetSkill) {
      if (courseComp === normTargetSkill) score += 50
      else if (courseComp.includes(normTargetSkill) || normTargetSkill.includes(courseComp)) score += 30
      if (courseSkills.includes(normTargetSkill)) score += 40
      else if (courseSkills.some((s) => s.includes(normTargetSkill) || normTargetSkill.includes(s))) score += 25
      if (courseTitle.includes(normTargetSkill)) score += 20
    }

    // Tier 2: Specific Domain Keyword Alignment
    if (isAgri && (courseComp.includes('agri') || courseTitle.includes('agri') || courseSkills.some((s) => s.includes('agri') || s.includes('crop')))) {
      score += 35
    }
    if (isEcon && (courseComp.includes('econ') || courseTitle.includes('econ') || courseTitle.includes('price') || courseSkills.some((s) => s.includes('econ') || s.includes('cpi')))) {
      score += 35
    }
    if (isStat && (courseComp.includes('stat') || courseTitle.includes('stat') || courseSkills.some((s) => s.includes('stat') || s.includes('sampling')))) {
      score += 30
    }
    if (isPolicy && (courseComp.includes('policy') || courseTitle.includes('policy') || courseTitle.includes('governance'))) {
      score += 30
    }

    // Tier 3: Role Name Substring Overlap
    if (normRole && (courseTitle.includes(normRole) || courseReason.includes(normRole))) {
      score += 25
    }

    // Tier 4: Order-Independent Token Intersection
    let tokenOverlap = 0
    for (const t of userTokens) {
      if (courseTokens.has(t)) tokenOverlap++
    }
    score += tokenOverlap * 4

    return { course, score }
  })

  // Filter and sort by score descending
  scored.sort((a, b) => b.score - a.score)
  const matches = scored.filter((item) => item.score > 15).map((item) => item.course)

  if (matches.length > 0) {
    // Deduplicate and return top 3-4 matches
    const uniqueIds = new Set()
    const result = []
    for (const c of matches) {
      if (!uniqueIds.has(c.id)) {
        uniqueIds.add(c.id)
        result.push(c)
      }
      if (result.length >= 4) break
    }
    return result
  }

  // Tier 5: Curated Fallback Catalog (Guarantees civil service recommendations never render empty)
  const fallbackCourses = CURATED_FALLBACK_IDS
    .map((id) => IGOT_CATALOGUE.find((c) => c.id === id))
    .filter(Boolean)

  return fallbackCourses.slice(0, 3)
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
