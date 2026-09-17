/**
 * Official iGOT Karmayogi Integration Service
 *
 * Dedicated abstraction layer connecting Skillstat AI to iGOT Karmayogi.
 * Handles course catalog querying, role/skill matching, progress lookup, and enrollment status.
 */
import { IGOT_CATALOGUE } from '../data/igotMockData.js'
import { initialCourses } from '../components/admin/adminData.js'

/**
 * Retrieve the active catalog combining verified standard catalog with courses
 * dynamically registered or edited by administrators in the Admin Portal.
 */
export function getUnifiedCatalog() {
  let adminCourses = []
  try {
    const saved = localStorage.getItem('skillstat_admin_courses')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        adminCourses = parsed
      }
    }
  } catch {}

  // Merge admin courses, initialCourses, and legacy IGOT_CATALOGUE
  const basePool = [...(adminCourses.length > 0 ? adminCourses : initialCourses), ...IGOT_CATALOGUE]
  const map = new Map()
  for (const c of basePool) {
    if (!c?.id) continue
    if (!map.has(c.id)) {
      map.set(c.id, c)
    }
  }
  return Array.from(map.values())
}

/**
 * Domain semantic keyword groups for multi-tier matching.
 */
const DOMAIN_KEYWORDS = {
  health: ['health', 'medical', 'doctor', 'nurse', 'clinical', 'patient', 'hospital', 'epidemiology', 'biostat', 'medicine', 'disease', 'pharma', 'surgery', 'care'],
  agriculture: ['agri', 'crop', 'yield', 'rural', 'horticulture', 'farm', 'krishi', 'soil', 'harvest', 'cultivation', 'farmer'],
  economics: ['macro', 'micro', 'econometric', 'econometrics', 'economics', 'economy', 'cpi', 'inflation', 'price', 'gdp', 'wpi', 'fiscal', 'monetary', 'market intelligence', 'finance'],
  statistics: ['statistic', 'statistics', 'sampling', 'survey', 'regression', 'inference', 'hypothesis', 'census', 'nss', 'mospi', 'sample', 'variance', 'probability', 'data analysis', 'nqaf', 'quality'],
  policy: ['policy', 'governance', 'public', 'administration', 'civil', 'apar', 'program evaluation', 'niti', 'regulation', 'administrative', 'compliance'],
  technology: ['ai', 'ml', 'machine learning', 'python', 'sql', 'cloud', 'gis', 'database', 'cybersecurity', 'software', 'developer', 'code', 'programming'],
  labour: ['labour', 'labor', 'employment', 'worker', 'workforce', 'wage', 'job', 'plfs', 'occupational'],
  industry: ['industry', 'industrial', 'manufacturing', 'factory', 'production', 'iip', 'asi', 'plant', 'engineering'],
}

/**
 * Tokenize an input string or array into a lowercase set of non-trivial words.
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
 * Retrieve all verified courses from the unified catalog.
 */
export async function getCourses() {
  return getUnifiedCatalog()
}

/**
 * Search courses matching a skill, role, or department.
 */
export async function searchCourses(skill = '', role = '', department = '') {
  const normSkill = skill.toLowerCase().trim()
  const normRole = role.toLowerCase().trim()
  const normDept = department.toLowerCase().trim()
  const catalog = getUnifiedCatalog()

  return catalog.filter((course) => {
    const courseDept = (course.department || '').toLowerCase()
    const courseSkills = (course.skills || []).map((s) => s.toLowerCase())
    const courseComp = (course.competency || '').toLowerCase()
    const courseTitle = (course.title || '').toLowerCase()
    const courseRole = (course.role || course.whyRecommended || '').toLowerCase()

    const matchDept = !normDept || courseDept === 'all departments' || courseDept.includes(normDept) || normDept.includes(courseDept)
    const matchSkill = !normSkill || courseComp.includes(normSkill) || courseSkills.some((s) => s.includes(normSkill)) || courseTitle.includes(normSkill)
    const matchRole = !normRole || courseRole.includes(normRole) || courseTitle.includes(normRole)

    return matchDept && (matchSkill || matchRole)
  })
}

/**
 * Fetch a specific course by ID.
 */
export async function getCourse(courseId) {
  const catalog = getUnifiedCatalog()
  const course = catalog.find((c) => c.id === courseId)
  return course ? { ...course } : null
}

/**
 * Get recommended official iGOT courses strictly personalized to:
 * 1. Employee Department (highest priority)
 * 2. Role & Designation
 * 3. Specific Evaluated Skill / Selected Skills
 */
export async function getRecommendedCourses(profile = {}, skillGap = {}) {
  const catalog = getUnifiedCatalog()
  const userDept = String(profile.department || '').trim()
  const roleName = String(profile.role || profile.designation || '').trim()
  const targetSkill = String(skillGap.skill || '').trim()
  const domainHint = String(skillGap.domain || '').trim()
  const userSkills = Array.isArray(profile.skills)
    ? profile.skills
    : Array.isArray(profile.selectedSkills)
      ? profile.selectedSkills
      : []

  const userTokens = new Set([
    ...extractTokens(userDept),
    ...extractTokens(roleName),
    ...extractTokens(targetSkill),
    ...extractTokens(domainHint),
    ...extractTokens(userSkills),
  ])

  const normUserDept = userDept.toLowerCase()
  const normRole = roleName.toLowerCase()
  const normTargetSkill = targetSkill.toLowerCase()

  // Domain flags
  const isHealth = [...userTokens].some((t) => DOMAIN_KEYWORDS.health.some((k) => t.includes(k) || k.includes(t)))
  const isAgri = [...userTokens].some((t) => DOMAIN_KEYWORDS.agriculture.some((k) => t.includes(k) || k.includes(t)))
  const isEcon = [...userTokens].some((t) => DOMAIN_KEYWORDS.economics.some((k) => t.includes(k) || k.includes(t)))
  const isStat = [...userTokens].some((t) => DOMAIN_KEYWORDS.statistics.some((k) => t.includes(k) || k.includes(t)))
  const isTech = [...userTokens].some((t) => DOMAIN_KEYWORDS.technology.some((k) => t.includes(k) || k.includes(t)))
  const isLabour = [...userTokens].some((t) => DOMAIN_KEYWORDS.labour.some((k) => t.includes(k) || k.includes(t)))
  const isIndustry = [...userTokens].some((t) => DOMAIN_KEYWORDS.industry.some((k) => t.includes(k) || k.includes(t)))

  // Score each course in unified catalog
  const scored = catalog.map((course) => {
    let score = 0
    const courseDept = (course.department || 'All Departments').toLowerCase()
    const courseComp = (course.competency || '').toLowerCase()
    const courseTitle = (course.title || '').toLowerCase()
    const courseSkills = (course.skills || []).map((s) => s.toLowerCase())
    const courseRole = (course.role || '').toLowerCase()
    const courseReason = (course.whyRecommended || '').toLowerCase()
    const courseTokens = new Set([
      ...extractTokens(course.title),
      ...extractTokens(course.competency),
      ...extractTokens(course.skills),
      ...extractTokens(course.whyRecommended),
      ...extractTokens(course.department),
    ])

    // --- TIER 1: EXACT DEPARTMENT AFFINITY ---
    if (normUserDept) {
      if (courseDept === normUserDept) {
        score += 85
      } else if (courseDept !== 'all departments' && (courseDept.includes(normUserDept) || normUserDept.includes(courseDept))) {
        score += 65
      } else if (courseDept === 'all departments') {
        score += 25
      } else {
        // Course is assigned to a different explicit department -> penalize heavily
        score -= 90
      }
    }

    // --- TIER 2: ROLE & DESIGNATION MATCH ---
    if (normRole) {
      if (courseRole && (courseRole === normRole || normRole.includes(courseRole) || courseRole.includes(normRole))) {
        score += 55
      } else if (courseTitle.includes(normRole) || courseReason.includes(normRole)) {
        score += 35
      }
    }

    // --- TIER 3: SPECIFIC SKILL & COMPETENCY MATCH ---
    if (normTargetSkill) {
      if (courseComp === normTargetSkill) {
        score += 60
      } else if (courseComp.includes(normTargetSkill) || normTargetSkill.includes(courseComp)) {
        score += 40
      }
      if (courseSkills.includes(normTargetSkill)) {
        score += 50
      } else if (courseSkills.some((s) => s.includes(normTargetSkill) || normTargetSkill.includes(s))) {
        score += 30
      }
      if (courseTitle.includes(normTargetSkill)) {
        score += 25
      }
    }

    // --- TIER 4: DOMAIN ALIGNMENT ---
    if (isHealth && (courseDept.includes('health') || courseComp.includes('health') || courseSkills.some((s) => s.includes('medic') || s.includes('health') || s.includes('patient')))) {
      score += 40
    }
    if (isAgri && (courseDept.includes('agri') || courseComp.includes('agri') || courseTitle.includes('crop') || courseSkills.some((s) => s.includes('agri') || s.includes('yield')))) {
      score += 40
    }
    if (isEcon && (courseDept.includes('price') || courseComp.includes('econ') || courseTitle.includes('cpi') || courseSkills.some((s) => s.includes('econ') || s.includes('price')))) {
      score += 40
    }
    if (isTech && (courseDept.includes('tech') || courseComp.includes('python') || courseComp.includes('sql') || courseSkills.some((s) => s.includes('python') || s.includes('data science') || s.includes('sql')))) {
      score += 40
    }
    if (isLabour && (courseDept.includes('labour') || courseComp.includes('labour') || courseTitle.includes('employment'))) {
      score += 40
    }
    if (isIndustry && (courseDept.includes('industry') || courseComp.includes('industrial') || courseTitle.includes('manufacturing'))) {
      score += 40
    }
    if (isStat && (courseDept.includes('nso') || courseComp.includes('stat') || courseSkills.some((s) => s.includes('sampling') || s.includes('survey')))) {
      score += 35
    }

    // --- TIER 5: TOKEN OVERLAP ---
    let tokenOverlap = 0
    for (const t of userTokens) {
      if (courseTokens.has(t)) tokenOverlap++
    }
    score += tokenOverlap * 3

    return { course, score }
  })

  // Filter out negatively scored courses (which belong to other incompatible departments)
  scored.sort((a, b) => b.score - a.score)
  const matches = scored.filter((item) => item.score > 20).map((item) => item.course)

  if (matches.length > 0) {
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

  // --- TIER 6: CONTEXTUAL DOMAIN FALLBACK ---
  // If no high score match, find courses matching the user's department first
  if (normUserDept) {
    const deptFallback = catalog.filter((c) => {
      const d = (c.department || '').toLowerCase()
      return d === normUserDept || d.includes(normUserDept) || normUserDept.includes(d)
    })
    if (deptFallback.length > 0) {
      return deptFallback.slice(0, 3)
    }
  }

  // General fallbacks: prefer general governance and data quality courses
  const generalFallbacks = catalog.filter((c) => (c.department || '') === 'All Departments' || c.id === 'crs-gov-01' || c.id === 'crs-nso-01')
  if (generalFallbacks.length > 0) {
    return generalFallbacks.slice(0, 3)
  }

  return catalog.slice(0, 3)
}

/**
 * Get progress for a given course ID.
 */
export async function getCourseProgress(courseId) {
  const course = await getCourse(courseId)
  return course ? (course.progress || 0) : 0
}

/**
 * Get enrollment status for a given course ID.
 */
export async function getEnrollmentStatus(courseId) {
  const course = await getCourse(courseId)
  return course ? (course.enrollmentStatus || 'Available') : 'Available'
}
