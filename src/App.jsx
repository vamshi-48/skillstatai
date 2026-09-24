import { useEffect, useRef, useState, useCallback } from 'react'
import './App.css'
import { extractTextFromFile, cleanExtractedText, validateDocumentText, extractConceptsFromText, extractDocumentQuizItems } from './utils/documentCleaner'
import { validateAndCleanQuiz } from './utils/questionValidator'
import { getRecommendations } from './services/recommendationService'
import ChatBot from './components/ChatBot'
import AdminPortal from './components/admin/AdminPortal'
import { isAllowedAdmin } from './config/adminConfig'

const getUserInitial = (name) => String(name || '').trim().charAt(0).toUpperCase() || 'U'

async function apiRequest(url, options = {}) {
  const token = localStorage.getItem('skillstat_session')
  let response
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })
  } catch {
    throw new Error('Backend server is not running. Start the app with npm run dev.')
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Request failed')
  return payload
}

function serializeQuestions(questions) {
  return questions.map((question) => ({
    ...question,
    checks: question.type === 'code'
      ? (question.checks || []).map((check) => String(check))
      : question.checks,
  }))
}

function restoreQuestions(questions) {
  return questions.map((question) => ({
    ...question,
    checks: question.type === 'code'
      ? (question.checks || []).map((check) => {
        if (check instanceof RegExp) return check
        const match = String(check).match(/^\/(.*)\/([a-z]*)$/i)
        try {
          return new RegExp(match ? match[1] : String(check), match?.[2] || 'i')
        } catch {
          return null
        }
      }).filter(Boolean)
      : question.checks,
  }))
}

const roles = [
  'Accountant', 'Accounts Payable Specialist', 'Accounts Receivable Specialist', 'Actuary', 'Administrative Assistant', 'Architect', 'Art Director', 'Auditor',
  'Brand Manager', 'Business Analyst', 'Business Development Manager', 'Buyer', 'Chemist', 'Chief Executive Officer', 'Chief Financial Officer', 'Chief Information Officer',
  'Chief Marketing Officer', 'Chief Operating Officer', 'Civil Engineer', 'Clinical Research Associate', 'Compliance Officer', 'Content Writer', 'Controller', 'Copywriter',
  'Customer Success Manager', 'Customer Support Specialist', 'Cybersecurity Analyst', 'Data Analyst', 'Data Engineer', 'Data Scientist', 'Database Administrator', 'Dentist',
  'DevOps Engineer', 'Digital Marketing Specialist', 'Doctor', 'Electrical Engineer', 'Event Manager', 'Executive Assistant', 'Facilities Manager', 'Fashion Designer',
  'Film Producer', 'Financial Advisor', 'Finance Manager', 'Front End Developer', 'Full Stack Developer', 'Game Developer', 'Graphic Designer', 'Health and Safety Officer',
  'Healthcare Administrator', 'Human Resources Manager', 'Industrial Designer', 'Industrial Engineer', 'Information Security Manager', 'Instructional Designer', 'Interior Designer', 'Investment Analyst',
  'IT Support Specialist', 'Journalist', 'Lawyer', 'Legal Assistant', 'Logistics Coordinator', 'Maintenance Technician', 'Management Consultant', 'Manufacturing Engineer',
  'Market Research Analyst', 'Marketing Manager', 'Mechanical Engineer', 'Medical Assistant', 'Medical Researcher', 'Nurse', 'Occupational Therapist', 'Office Manager',
  'Operations Manager', 'Optometrist', 'Paralegal', 'Payroll Specialist', 'Pharmacist', 'Photographer', 'Physiotherapist', 'Pilot', 'Plumber', 'Policy Analyst',
  'Product Designer', 'Product Manager', 'Program Manager', 'Project Coordinator', 'Project Manager', 'Property Manager', 'Public Relations Manager', 'Purchasing Manager',
  'QA Engineer', 'Quality Assurance Manager', 'Real Estate Agent', 'Recruiter', 'Research Scientist', 'Restaurant Manager', 'Risk Analyst', 'Sales Manager',
  'Scrum Master', 'Security Guard', 'Social Media Manager', 'Social Worker', 'Software Engineer', 'Solutions Architect', 'Supply Chain Manager', 'Systems Analyst',
  'Systems Administrator', 'Tax Specialist', 'Teacher', 'Technical Writer', 'Telecom Engineer', 'Tourism Manager', 'Training Specialist', 'Translator', 'Treasurer',
  'UI Designer', 'UX Designer', 'UX Researcher', 'Veterinarian', 'Video Editor', 'Warehouse Manager', 'Web Developer', 'Welder', 'Writer', 'Team Leader', 'Other role',
]

const roleSkillDomains = [
  {
    matches: ['software', 'developer', 'front end', 'full stack', 'web developer', 'game developer', 'engineer', 'devops', 'qa', 'architect', 'telecom', 'systems administrator', 'it support', 'solutions architect'],
    skills: ['Coding', 'JavaScript', 'TypeScript', 'Python', 'React', 'Node.js', 'Git', 'SQL', 'APIs', 'Cloud computing', 'Cybersecurity', 'Problem solving', 'Troubleshooting', 'System architecture', 'Documentation'],
  },
  {
    matches: ['data analyst', 'data scientist', 'data engineer', 'database', 'research scientist', 'statistician', 'market research'],
    skills: ['Data analysis', 'Python', 'SQL', 'Data visualization', 'Statistical analysis', 'Machine learning', 'Database management', 'Excel', 'Research', 'Critical thinking', 'Reporting'],
  },
  {
    matches: ['ui designer', 'ux designer', 'ux researcher', 'product designer', 'graphic designer', 'art director', 'interior designer', 'fashion designer', 'industrial designer', 'video editor', 'photographer', 'animat'],
    skills: ['UI design', 'Visual design', 'Design thinking', 'User research', 'Graphic design', 'Web design', 'Video editing', 'Photography', 'Illustration', 'Creative direction', 'Communication'],
  },
  {
    matches: ['writer', 'copywriter', 'content', 'journalist', 'technical writer', 'translator'],
    skills: ['Writing', 'Copywriting', 'Content marketing', 'Search engine optimization', 'Business writing', 'Technical writing', 'Research', 'Editing', 'Communication', 'Documentation'],
  },
  {
    matches: ['marketing', 'brand', 'social media', 'public relations', 'event manager', 'digital marketing'],
    skills: ['Digital marketing', 'Content marketing', 'Social media', 'Search engine optimization', 'Google Analytics', 'Marketing strategy', 'Event planning', 'Market research', 'Communication', 'Campaign management'],
  },
  {
    matches: ['sales', 'business development', 'real estate', 'customer success', 'customer support', 'account executive', 'buyer'],
    skills: ['Sales', 'Negotiation', 'Persuasion', 'Customer service', 'Presentation', 'Relationship management', 'Conflict resolution', 'Active listening', 'CRM management', 'Communication'],
  },
  {
    matches: ['accountant', 'finance', 'auditor', 'actuary', 'controller', 'tax', 'treasurer', 'investment', 'payroll', 'accounts payable', 'accounts receivable'],
    skills: ['Financial analysis', 'Financial reporting', 'Excel', 'Budgeting', 'Forecasting', 'Auditing', 'Accounting', 'Payroll', 'Risk management', 'Analytical thinking', 'Treasury management'],
  },
  {
    matches: ['doctor', 'nurse', 'dentist', 'pharmacist', 'medical', 'physiotherapist', 'therapist', 'veterinarian', 'health and safety', 'healthcare', 'clinical'],
    skills: ['Patient care', 'Clinical documentation', 'First aid', 'Health and safety', 'Active listening', 'Medical research', 'Infection control', 'Communication', 'Empathy', 'Teamwork'],
  },
  {
    matches: ['human resources', 'recruiter', 'training', 'lawyer', 'paralegal', 'compliance', 'legal'],
    skills: ['Recruitment', 'Employee relations', 'Interviewing', 'Training delivery', 'Conflict resolution', 'Legal research', 'Contract management', 'Compliance', 'Communication', 'Mentoring'],
  },
  {
    matches: ['supply chain', 'logistics', 'warehouse', 'purchasing', 'procurement', 'facilities', 'operations'],
    skills: ['Supply chain management', 'Logistics', 'Inventory management', 'Procurement', 'Operations management', 'Process improvement', 'Negotiation', 'Excel', 'Planning', 'Quality control'],
  },
  {
    matches: ['manager', 'director', 'officer', 'executive', 'scrum master', 'product manager', 'program manager', 'project manager', 'team leader', 'consultant'],
    skills: ['Leadership', 'Project management', 'Strategic planning', 'Agile methods', 'Stakeholder management', 'Decision making', 'Team building', 'Risk management', 'Process improvement', 'Coaching'],
  },
  {
    matches: ['teacher', 'instructional', 'trainer', 'education', 'coach', 'professor'],
    skills: ['Training delivery', 'Instructional design', 'Presentation', 'Mentoring', 'Coaching', 'Curriculum planning', 'Active listening', 'Communication', 'Evaluation'],
  },
]

const fallbackRoleSkills = [
  'Problem solving', 'Communication', 'Planning', 'Teamwork', 'Analytical thinking', 'Time management', 'Critical thinking', 'Decision making', 'Documentation', 'Adaptability',
]

const officialRoles = [
  'Statistical Officer', 'Senior Statistical Officer', 'Statistical Investigator',
  'Data Analyst', 'Data Scientist', 'Research Officer', 'Survey Officer', 'Economist',
  'GIS Analyst', 'Data Management Officer', 'Official Statistics Analyst',
]

const _competencyDomains = {
  'Statistical Competencies': ['Survey Design', 'Sampling', 'National Accounts', 'Price Statistics', 'Labour Statistics', 'Agricultural Statistics', 'Industrial Statistics', 'SDG Indicators', 'Metadata Standards', 'Data Quality Frameworks'],
  'Technical Competencies': ['Python', 'R', 'SQL', 'Stata', 'SPSS', 'SAS', 'GIS', 'Data Visualization', 'AI/ML', 'Cloud Computing', 'APIs', 'Open Data'],
  'Digital Governance': ['Cybersecurity', 'Data Privacy', 'Digital Signatures', 'Government Cloud', 'Digital Public Infrastructure'],
  'Behavioural & Managerial': ['Leadership', 'Communication', 'Project Management', 'Ethics', 'Decision Making', 'Change Management'],
}

const officialRoleDetails = {
  'Statistical Officer': {
    description: 'Responsible for statistical analysis, reporting, survey data and official statistical outputs.',
    domains: ['Statistics', 'Data Analysis', 'Data Quality', 'Digital Tools'],
    skills: ['Survey Design', 'Sampling', 'Data Quality Frameworks', 'Python', 'SQL', 'Data Visualization', 'Statistics'],
  },
  'Senior Statistical Officer': {
    description: 'Leads statistical programmes, quality assurance and evidence-based reporting across departments.',
    domains: ['Statistics', 'Leadership', 'Data Quality', 'Policy'],
    skills: ['Survey Design', 'National Accounts', 'Data Quality Frameworks', 'R', 'SQL', 'Leadership', 'Decision Making'],
  },
  'Statistical Investigator': {
    description: 'Collects, validates and interprets field and administrative data for official statistics.',
    domains: ['Survey Operations', 'Sampling', 'Data Quality', 'Field Systems'],
    skills: ['Sampling', 'Survey Design', 'Data Quality Frameworks', 'Data Privacy', 'Open Data', 'Communication'],
  },
  'Data Analyst': {
    description: 'Transforms official datasets into reliable analysis, visualizations and decision support.',
    domains: ['Data Analysis', 'Visualization', 'Digital Tools', 'Reporting'],
    skills: ['Python', 'SQL', 'Data Visualization', 'Data Quality Frameworks', 'Open Data', 'Communication'],
  },
}

const initialCompetencyGaps = []

const codingLanguages = ['C', 'C#', 'C++', 'Java', 'JavaScript', 'TypeScript', 'Python', 'Ruby', 'Kotlin', 'SQL', 'HTML', 'CSS', 'Node.js', 'React', 'Coding', 'C programming']
const supportedLanguages = [
  ['en', 'English'], ['hi', 'हिन्दी (Hindi)'], ['ta', 'தமிழ் (Tamil)'], ['te', 'తెలుగు (Telugu)'],
  ['bn', 'বাংলা (Bengali)'], ['mr', 'मराठी (Marathi)'], ['gu', 'ગુજરાતી (Gujarati)'], ['kn', 'ಕನ್ನಡ (Kannada)'], ['ml', 'മലയാളം (Malayalam)'],
]

const isCodingSkill = (skill) => codingLanguages.includes(skill)

const governmentDepartments = [
  { name: 'National Statistical Office (NSO)', designations: ['Statistical Officer', 'Senior Statistical Officer', 'Statistical Investigator', 'Data Analyst', 'Data Scientist', 'Research Officer'] },
  { name: 'Ministry of Statistics & Programme Implementation (MoSPI)', designations: ['Statistical Officer', 'Senior Statistical Officer', 'Programme Statistics Officer', 'Data Analyst', 'Research Officer'] },
  { name: 'State Directorates of Economics & Statistics', designations: ['State Statistical Officer', 'District Statistical Officer', 'Statistical Investigator', 'Economist', 'Data Analyst'] },
  { name: 'Agriculture & Farmers Welfare Statistics', designations: ['Agricultural Statistics Officer', 'Agricultural Economist', 'Survey Officer', 'Data Analyst', 'Research Officer'] },
  { name: 'Labour & Employment Statistics', designations: ['Labour Statistics Officer', 'Employment Statistics Officer', 'Survey Officer', 'Statistical Investigator', 'Data Analyst'] },
  { name: 'Health & Family Welfare Statistics', designations: ['Doctor', 'Senior Medical Officer', 'Health Statistics Officer', 'Health Data Analyst', 'Health Survey Officer', 'Biostatistics Officer', 'Healthcare Administrator', 'Research Officer'] },
  { name: 'Industrial & Manufacturing Statistics', designations: ['Industrial Statistics Officer', 'Manufacturing Data Analyst', 'Economic Statistics Officer', 'Survey Officer', 'Research Officer'] },
  { name: 'Price & Consumer Statistics', designations: ['Price Statistics Officer', 'Consumer Price Analyst', 'Market Statistics Officer', 'Survey Officer', 'Economist'] },
  { name: 'Social & Demographic Statistics', designations: ['Social Statistics Officer', 'Demographic Statistics Officer', 'Census Officer', 'Survey Officer', 'Research Officer'] },
  { name: 'Environment & Climate Statistics', designations: ['Environmental Statistics Officer', 'Climate Data Analyst', 'GIS Analyst', 'Survey Officer', 'Research Officer'] },
]

export function getEffectiveDepartments() {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('skillstat_admin_departments') : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = [...governmentDepartments]
        parsed.forEach((d) => {
          if (d && d.name) {
            const existingIndex = merged.findIndex((m) => m.name.toLowerCase() === d.name.toLowerCase())
            if (existingIndex >= 0) {
              merged[existingIndex] = {
                ...merged[existingIndex],
                ...d,
                designations: d.designations || merged[existingIndex].designations || ['Statistical Officer', 'Data Analyst', 'Research Officer'],
              }
            } else {
              merged.push({
                name: d.name,
                designations: d.designations || ['Statistical Officer', 'Data Analyst', 'Research Officer'],
                ...d,
              })
            }
          }
        })
        return merged
      }
    }
  } catch (err) {
    console.warn('Failed to parse admin departments:', err)
  }
  return governmentDepartments
}

export function getAdminPassThreshold() {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('skillstat_admin_settings') : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.passThreshold && !isNaN(Number(parsed.passThreshold))) {
        return Number(parsed.passThreshold)
      }
    }
  } catch {
    // fallback
  }
  return 75
}

const getDepartmentDetails = (departmentName) => getEffectiveDepartments().find((department) => department.name === departmentName)

const DEPARTMENT_ROLE_MAP = {
  'National Statistical Office (NSO)': [
    'Statistical Officer',
    'Senior Statistical Officer',
    'Statistical Investigator',
    'Data Analyst',
    'Data Scientist',
    'Research Officer',
    'Survey Operations Officer',
    'Census Officer',
  ],
  'Ministry of Statistics & Programme Implementation (MoSPI)': [
    'Statistical Officer',
    'Senior Statistical Officer',
    'Programme Statistics Officer',
    'Data Analyst',
    'Research Officer',
    'Statistical Programme Lead',
    'Official Statistics Analyst',
  ],
  'State Directorates of Economics & Statistics': [
    'State Statistical Officer',
    'District Statistical Officer',
    'Statistical Investigator',
    'Economist',
    'Data Analyst',
    'Sample Survey Officer',
  ],
  'Agriculture & Farmers Welfare Statistics': [
    'Agricultural Statistics Officer',
    'Agricultural Economist',
    'Crop Survey Statistician',
    'Survey Officer',
    'Agricultural Data Analyst',
    'Research Officer',
  ],
  'Labour & Employment Statistics': [
    'Labour Statistics Officer',
    'Employment Statistics Officer',
    'Workforce Survey Statistician',
    'Labour Statistics Analyst',
    'Survey Officer',
    'Statistical Investigator',
    'Data Analyst',
  ],
  'Health & Family Welfare Statistics': [
    'Doctor',
    'Senior Medical Officer',
    'Health Statistics Officer',
    'Health Data Analyst',
    'Health Survey Officer',
    'Biostatistics Officer',
    'Healthcare Administrator',
    'Medical Researcher',
    'Clinical Research Associate',
  ],
  'Industrial & Manufacturing Statistics': [
    'Industrial Statistics Officer',
    'Manufacturing Data Analyst',
    'Economic Statistics Officer',
    'Survey Officer',
    'Research Officer',
    'Industrial Economist',
  ],
  'Price & Consumer Statistics': [
    'Price Statistics Officer',
    'Consumer Price Analyst',
    'Market Statistics Officer',
    'Price Statistics Economist',
    'Survey Officer',
    'Inflation & Price Index Analyst',
  ],
  'Social & Demographic Statistics': [
    'Social Statistics Officer',
    'Demographic Statistics Officer',
    'Census Officer',
    'Survey Officer',
    'Research Officer',
    'Demographic Data Analyst',
  ],
  'Environment & Climate Statistics': [
    'Environmental Statistics Officer',
    'Climate Data Analyst',
    'GIS Analyst',
    'Geospatial Statistics Analyst',
    'Survey Officer',
    'Research Officer',
  ],
}

function getRolesForDepartment(departmentName, userRole = '', userDesignation = '') {
  const normDept = (departmentName || '').trim().toLowerCase()
  let matchedRoles = []

  for (const [deptKey, list] of Object.entries(DEPARTMENT_ROLE_MAP)) {
    if (deptKey.toLowerCase() === normDept || (normDept && deptKey.toLowerCase().includes(normDept)) || (normDept && normDept.includes(deptKey.toLowerCase()))) {
      matchedRoles = [...list]
      break
    }
  }

  // If not exact key, match by keywords
  if (matchedRoles.length === 0 && normDept) {
    if (normDept.includes('health') || normDept.includes('medic') || normDept.includes('hospital')) {
      matchedRoles = [...DEPARTMENT_ROLE_MAP['Health & Family Welfare Statistics']]
    } else if (normDept.includes('agri') || normDept.includes('farm')) {
      matchedRoles = [...DEPARTMENT_ROLE_MAP['Agriculture & Farmers Welfare Statistics']]
    } else if (normDept.includes('labour') || normDept.includes('employ')) {
      matchedRoles = [...DEPARTMENT_ROLE_MAP['Labour & Employment Statistics']]
    } else if (normDept.includes('price') || normDept.includes('consumer')) {
      matchedRoles = [...DEPARTMENT_ROLE_MAP['Price & Consumer Statistics']]
    } else if (normDept.includes('environ') || normDept.includes('climate')) {
      matchedRoles = [...DEPARTMENT_ROLE_MAP['Environment & Climate Statistics']]
    } else if (normDept.includes('state') || normDept.includes('directorate')) {
      matchedRoles = [...DEPARTMENT_ROLE_MAP['State Directorates of Economics & Statistics']]
    } else if (normDept.includes('mospi') || normDept.includes('programme implementation')) {
      matchedRoles = [...DEPARTMENT_ROLE_MAP['Ministry of Statistics & Programme Implementation (MoSPI)']]
    } else if (normDept.includes('nso') || normDept.includes('statistical office')) {
      matchedRoles = [...DEPARTMENT_ROLE_MAP['National Statistical Office (NSO)']]
    }
  }

  // If still not matched, check getEffectiveDepartments designations
  if (matchedRoles.length === 0) {
    const deptObj = getEffectiveDepartments().find((d) => d.name.toLowerCase() === normDept)
    if (deptObj?.designations?.length) {
      matchedRoles = [...deptObj.designations]
    }
  }

  // Fallback: If no department or unknown, use default statistical cadres
  if (matchedRoles.length === 0) {
    matchedRoles = [
      'Statistical Officer',
      'Senior Statistical Officer',
      'Statistical Investigator',
      'Data Analyst',
      'Research Officer',
    ]
  }

  // Guarantee that user's active role and designation are included in the list
  const userRoleClean = (userRole || '').trim()
  const userDesigClean = (userDesignation || '').trim()

  if (userRoleClean && !matchedRoles.some((r) => r.toLowerCase() === userRoleClean.toLowerCase())) {
    matchedRoles.unshift(userRoleClean)
  }
  if (userDesigClean && !matchedRoles.some((r) => r.toLowerCase() === userDesigClean.toLowerCase())) {
    matchedRoles.unshift(userDesigClean)
  }

  return Array.from(new Set(matchedRoles))
}

const designationRoleMap = {
  teacher: ['Physics Teacher', 'Mathematics Teacher', 'Chemistry Teacher', 'Biology Teacher', 'Computer Science Teacher', 'English Teacher', 'Social Science Teacher', 'Primary School Teacher'],
  'statistical officer': ['Economic Statistics Officer', 'Social Statistics Officer', 'Agricultural Statistics Officer', 'Data Quality Officer', 'Survey Operations Officer'],
  'senior statistical officer': ['Statistical Programme Lead', 'Survey Methodology Lead', 'Data Quality Lead', 'Official Statistics Analyst'],
  'statistical investigator': ['Field Survey Investigator', 'Census Investigator', 'Sample Survey Investigator', 'Data Validation Investigator'],
  'data analyst': ['Policy Data Analyst', 'Public Finance Data Analyst', 'Health Data Analyst', 'Education Data Analyst', 'Monitoring & Evaluation Analyst'],
  'data scientist': ['Statistical Data Scientist', 'Official Statistics ML Scientist', 'Survey Modelling Scientist', 'Predictive Statistics Scientist'],
  'research officer': ['Policy Research Officer', 'Education Research Officer', 'Health Research Officer', 'Economic Research Officer', 'Social Research Officer'],
  'survey officer': ['Survey Methodology Officer', 'Sample Survey Officer', 'Field Operations Officer', 'Survey Quality Officer'],
  economist: ['Economic Statistics Officer', 'National Accounts Economist', 'Price Statistics Economist', 'Policy Statistics Economist'],
  'gis analyst': ['Geospatial Statistics Analyst', 'Census GIS Analyst', 'Spatial Data Analyst', 'Statistical Mapping Analyst'],
  'data management officer': ['Data Governance Officer', 'Master Data Officer', 'Data Quality Officer', 'Database Administrator', 'Metadata Officer'],
  'official statistics analyst': ['Official Data Analyst', 'Statistical Quality Analyst', 'Statistical Reporting Analyst', 'Evidence and Indicators Analyst'],
}

const getRolesForDesignation = (designation) => {
  const normalized = (designation || '').trim().toLowerCase()
  const exactRoles = designationRoleMap[normalized]
  if (exactRoles?.length) return exactRoles
  if (normalized.includes('health') || normalized.includes('biostat')) return ['Health Statistics Analyst', 'Health Data Analyst', 'Biostatistics Analyst']
  if (normalized.includes('labour') || normalized.includes('employment')) return ['Labour Statistics Analyst', 'Employment Data Analyst', 'Workforce Survey Statistician']
  if (normalized.includes('price') || normalized.includes('consumer')) return ['Consumer Price Analyst', 'Price Statistics Analyst', 'Market Statistics Economist']
  if (normalized.includes('agricultur')) return ['Agricultural Statistics Analyst', 'Crop Survey Statistician', 'Agricultural Data Analyst']
  if (normalized.includes('industrial') || normalized.includes('manufactur')) return ['Industrial Statistics Analyst', 'Manufacturing Data Analyst', 'Economic Statistics Analyst']
  if (normalized.includes('social') || normalized.includes('demograph') || normalized.includes('census')) return ['Social Statistics Analyst', 'Demographic Data Analyst', 'Census Statistics Officer']
  if (normalized.includes('environment') || normalized.includes('climate')) return ['Environmental Statistics Analyst', 'Climate Data Analyst', 'Geospatial Statistics Analyst']
  if (normalized.includes('data analyst')) return ['Official Data Analyst', 'Statistical Quality Analyst', 'Statistical Reporting Analyst']
  if (normalized.includes('data scientist')) return ['Statistical Data Scientist', 'Official Statistics ML Scientist', 'Survey Modelling Scientist']
  if (normalized.includes('survey')) return ['Survey Methodology Officer', 'Sample Survey Officer', 'Survey Quality Officer']
  if (normalized.includes('economist')) return ['Economic Statistics Officer', 'National Accounts Economist', 'Policy Statistics Economist']
  if (normalized.includes('gis')) return ['Geospatial Statistics Analyst', 'Census GIS Analyst', 'Statistical Mapping Analyst']
  if (normalized.includes('research')) return ['Official Statistics Researcher', 'Statistical Methods Researcher', 'Evidence and Indicators Analyst']
  if (normalized.includes('agricultur')) return ['Agricultural Statistics Analyst', 'Crop Survey Statistician', 'Agricultural Data Analyst']
  if (normalized.includes('labour') || normalized.includes('employment')) return ['Labour Statistics Analyst', 'Employment Data Analyst', 'Workforce Survey Statistician']
  if (normalized.includes('health') || normalized.includes('biostat')) return ['Health Statistics Analyst', 'Biostatistics Analyst', 'Health Survey Statistician']
  if (normalized.includes('industrial') || normalized.includes('manufactur')) return ['Industrial Statistics Analyst', 'Manufacturing Data Analyst', 'Economic Statistics Analyst']
  if (normalized.includes('price') || normalized.includes('consumer')) return ['Consumer Price Analyst', 'Price Statistics Analyst', 'Market Statistics Economist']
  if (normalized.includes('social') || normalized.includes('demograph') || normalized.includes('census')) return ['Social Statistics Analyst', 'Demographic Data Analyst', 'Census Statistics Officer']
  if (normalized.includes('environment') || normalized.includes('climate')) return ['Environmental Statistics Analyst', 'Climate Data Analyst', 'Geospatial Statistics Analyst']
  if (normalized.includes('officer')) return ['Official Statistics Analyst', 'Statistical Quality Analyst', 'Statistical Reporting Analyst']
  return []
}

function _getRelatedSkills(role) {
  if (!role) return fallbackRoleSkills
  const normalized = role.toLowerCase()
  const found = roleSkillDomains.find((d) => d.matches.some((keyword) => normalized.includes(keyword)))
  if (found) return found.skills
  return fallbackRoleSkills
}

function getRecommendedRoles(profile) {
  const designation = (profile?.designation || '').trim().toLowerCase()
  const department = (profile?.department || '').trim().toLowerCase()
  const organization = (profile?.organization || '').trim().toLowerCase()
  const assignment = (profile?.assignment || '').trim().toLowerCase()

  const combinedSearch = `${designation} ${department} ${organization} ${assignment}`.trim()
  const designationRoles = getRolesForDesignation(designation)
  if (designationRoles.length > 0) {
    return designationRoles
  }

  if (department) {
    const deptRoles = getRolesForDepartment(department, profile?.role, profile?.designation)
    if (deptRoles.length > 0) {
      return deptRoles
    }
  }

  if (!combinedSearch) {
    return officialRoles.slice(0, 6)
  }

  const tokens = combinedSearch
    .split(/[\s,./\-_&]+/)
    .filter((w) => w.length > 2)

  const domainRules = [
    {
      keywords: ['architect', 'cad', 'bim', 'building', 'structural', 'construction', 'infrastructure', 'civil'],
      roles: ['Architect', 'Solutions Architect', 'Civil Engineer', 'Industrial Designer', 'Interior Designer', 'Project Manager'],
    },
    {
      keywords: ['statistic', 'survey', 'sampling', 'mospi', 'census', 'nssta', 'tpac', 'sdg', 'investigator', 'statistical'],
      roles: ['Statistical Officer', 'Senior Statistical Officer', 'Statistical Investigator', 'Data Analyst', 'Data Scientist', 'Research Officer', 'Survey Officer', 'Economist'],
    },
    {
      keywords: ['doctor', 'medic', 'health', 'clinic', 'hospital', 'nurse', 'pharma', 'physio', 'patient', 'dental'],
      roles: ['Doctor', 'Healthcare Administrator', 'Medical Researcher', 'Medical Assistant', 'Nurse', 'Pharmacist', 'Clinical Research Associate'],
    },
    {
      keywords: ['account', 'finance', 'audit', 'tax', 'budget', 'treasur', 'payroll', 'ledger', 'payable', 'receivable'],
      roles: ['Accountant', 'Auditor', 'Finance Manager', 'Financial Advisor', 'Accounts Payable Specialist', 'Controller', 'Tax Specialist'],
    },
    {
      keywords: ['data', 'analytics', 'database', 'sql', 'bi', 'intelligence', 'insight'],
      roles: ['Data Analyst', 'Data Scientist', 'Data Engineer', 'Database Administrator', 'Statistical Officer', 'Business Analyst'],
    },
    {
      keywords: ['software', 'develop', 'code', 'program', 'engineer', 'frontend', 'backend', 'fullstack', 'web', 'devops', 'tech'],
      roles: ['Software Engineer', 'Full Stack Developer', 'Front End Developer', 'Web Developer', 'DevOps Engineer', 'Solutions Architect', 'Systems Administrator'],
    },
    {
      keywords: ['hr', 'human resource', 'recruit', 'talent', 'personnel', 'staff'],
      roles: ['Human Resources Manager', 'Recruiter', 'Training Specialist', 'Administrative Assistant'],
    },
    {
      keywords: ['admin', 'manager', 'operations', 'executive', 'director', 'officer', 'governance', 'coordinat'],
      roles: ['Operations Manager', 'Project Manager', 'Program Manager', 'Administrative Assistant', 'Management Consultant', 'Policy Analyst'],
    },
    {
      keywords: ['legal', 'law', 'compliance', 'court', 'advocate', 'paralegal'],
      roles: ['Lawyer', 'Compliance Officer', 'Legal Assistant', 'Paralegal', 'Policy Analyst'],
    },
    {
      keywords: ['teach', 'educat', 'school', 'professor', 'faculty', 'trainer', 'training', 'instruct'],
      roles: ['Teacher', 'Training Specialist', 'Instructional Designer'],
    },
    {
      keywords: ['market', 'brand', 'media', 'pr', 'communication', 'content', 'writer', 'copywrit'],
      roles: ['Marketing Manager', 'Digital Marketing Specialist', 'Content Writer', 'Brand Manager', 'Public Relations Manager'],
    },
    {
      keywords: ['logistics', 'supply', 'warehouse', 'procure', 'transport', 'inventory'],
      roles: ['Supply Chain Manager', 'Logistics Coordinator', 'Warehouse Manager', 'Purchasing Manager'],
    },
  ]

  const matched = new Set()
  const allKnownRoles = [...officialRoles, ...roles]

  if (designation) {
    const exact = allKnownRoles.find((r) => r.toLowerCase() === designation)
    if (exact) matched.add(exact)
    allKnownRoles.forEach((r) => {
      if (r.toLowerCase().includes(designation) || designation.includes(r.toLowerCase())) {
        matched.add(r)
      }
    })
  }

  for (const rule of domainRules) {
    const matchesRule = rule.keywords.some(
      (k) => combinedSearch.includes(k) || tokens.some((t) => t.includes(k) || k.includes(t))
    )
    if (matchesRule) {
      rule.roles.forEach((r) => matched.add(r))
    }
  }

  for (const token of tokens) {
    allKnownRoles.forEach((r) => {
      if (r.toLowerCase().includes(token)) {
        matched.add(r)
      }
    })
  }

  if (profile?.designation && profile.designation.trim() && !matched.has(profile.designation.trim())) {
    matched.add(profile.designation.trim())
  }

  const results = Array.from(matched)
  if (results.length > 0) {
    return results.slice(0, 10)
  }

  return officialRoles.slice(0, 6)
}

const rolePromotionCatalog = {
  'Statistical Officer': {
    targetRole: 'Senior Statistical Officer (SSO)',
    higherTarget: 'Assistant Director (Statistics) / Lead Statistician',
    cadre: 'Official Statistics Cadre · Group A Gazetted Track',
    benchmarkScore: 75,
    gradeIncrement: 'Pay Level 7 → Pay Level 8 (Senior Scale, +22% Emoluments)',
    responsibilities: [
      'Lead and sign off on departmental survey methodologies and official releases',
      'Authorize National Quality Assurance Framework (NQAF) validation audits',
      'Supervise Statistical Investigators and junior analysts across zonal units',
      'Represent MoSPI/State Directorate at national TPAC technical conferences',
    ],
    promotionCriteria: [
      'Attain minimum 75% overall competency evaluation benchmark',
      'Clear core statistical domains: Survey Design, Data Quality, and National Accounts',
      'Complete at least 2 verified iGOT/NSSTA advanced training modules',
    ],
    courses: [
      {
        id: 'promo-stat-01',
        title: 'Advanced Sampling & Survey Estimation Protocols',
        provider: 'iGOT Karmayogi / Mission Karmayogi',
        duration: '12 Hours',
        difficulty: 'Advanced',
        format: 'Self-Paced Online',
        competency: 'Survey Design',
        skill: 'Survey Design',
        promotionImpact: '+25% Readiness Boost',
        impactScore: 25,
        outcomes: [
          'Master multi-stage stratified and cluster sampling designs for large-scale field inquiries',
          'Calculate complex variance estimates, design effects (deff), and weighted aggregates',
          'Implement non-sampling error reduction protocols under NQAF guidelines',
        ],
        certification: 'iGOT Advanced Survey Methodology Credential',
      },
      {
        id: 'promo-stat-02',
        title: 'National Quality Assurance Framework (NQAF) & Data Audit',
        provider: 'NSSTA / TPAC MoSPI',
        duration: '5 Days Lab',
        difficulty: 'Executive',
        format: 'In-Person Lab & Simulator',
        competency: 'Data Quality Frameworks',
        skill: 'Data Quality Frameworks',
        promotionImpact: '+30% Readiness Boost',
        impactScore: 30,
        outcomes: [
          'Formulate statistical audit checklists and automated duplicate detection rules',
          'Perform regression and donor imputation with full metadata audit logs',
          'Evaluate statistical disclosure control (SDC) methods for public microdata',
        ],
        certification: 'NSSTA Executive Quality Auditor Certification',
      },
      {
        id: 'promo-stat-03',
        title: 'Python for Automated Statistical Pipelines & Anomaly Detection',
        provider: 'MeitY / iGOT Karmayogi',
        duration: '16 Hours',
        difficulty: 'Intermediate',
        format: 'Hands-on Labs',
        competency: 'AI/ML & Python',
        skill: 'Python',
        promotionImpact: '+20% Readiness Boost',
        impactScore: 20,
        outcomes: [
          'Build end-to-end automated cleaning and validation pipelines using Pandas & NumPy',
          'Train outlier and anomaly detection algorithms on massive administrative registers',
          'Deploy reproducible statistical reports with Jupyter and Git versioning',
        ],
        certification: 'Digital India Advanced Data Science Badge',
      },
      {
        id: 'promo-stat-04',
        title: 'Strategic Public Leadership & Administrative Decision Making',
        provider: 'Centre for Good Governance / iGOT',
        duration: '8 Hours',
        difficulty: 'Executive',
        format: 'Interactive Case Studies',
        competency: 'Leadership',
        skill: 'Leadership',
        promotionImpact: '+15% Readiness Boost',
        impactScore: 15,
        outcomes: [
          'Evidence-based policy brief formulation for ministerial secretariats',
          'Staff performance appraisal (APAR) scoring and grievance arbitration',
          'Inter-departmental consensus building for decentralized statistical data',
        ],
        certification: 'Mission Karmayogi Public Leadership Award',
      },
    ],
  },
  'Senior Statistical Officer': {
    targetRole: 'Assistant Director / Joint Director (Statistics)',
    higherTarget: 'Director of Official Statistics / Economic Advisor',
    cadre: 'Senior Civil Statistics Directorate · Higher Administrative Grade',
    benchmarkScore: 82,
    gradeIncrement: 'Pay Level 8 → Pay Level 10/11 (Directorate Level, +28% Emoluments)',
    responsibilities: [
      'Oversee state and national statistical divisions and flagship economic census operations',
      'Lead high-level technical consultations with international agencies (UN-Stats, World Bank)',
      'Direct macro-economic forecasting, GVA/GDP deflator compilation, and SDG tracking',
      'Serve as Nodal Officer for National Data Sharing & Accessibility Policy (NDSAP)',
    ],
    promotionCriteria: [
      'Score 82%+ on comprehensive statistical leadership assessment',
      'Demonstrated mastery in Macro-economic modeling & Digital Public Infrastructure',
      'Publication or technical review of official statistical monographs',
    ],
    courses: [
      {
        id: 'promo-sso-01',
        title: 'Macroeconomic National Accounts & Supply-Use Tables (SUT)',
        provider: 'NSSTA - TPAC Advisory MoSPI',
        duration: '5 Days Workshop',
        difficulty: 'Advanced Masterclass',
        format: 'Executive Seminar',
        competency: 'National Accounts',
        skill: 'National Accounts',
        promotionImpact: '+35% Readiness Boost',
        impactScore: 35,
        outcomes: [
          'Balance dynamic Supply-Use Tables and compute sectoral Input-Output coefficients',
          'Measure digital economy transactions and informal sector GVA contributions',
          'Align state economic registers with the System of National Accounts (SNA 2008/2025)',
        ],
        certification: 'National Accounts Expert Fellow (NSSTA)',
      },
      {
        id: 'promo-sso-02',
        title: 'SDG Indicator Monitoring, Big Data & Geo-spatial Linkage',
        provider: 'United Nations Statistics Division / iGOT',
        duration: '14 Hours',
        difficulty: 'Advanced',
        format: 'Self-Paced with Capstone',
        competency: 'SDG Indicators & GIS',
        skill: 'GIS',
        promotionImpact: '+25% Readiness Boost',
        impactScore: 25,
        outcomes: [
          'Overlay satellite imagery and geospatial layers with census demographic grids',
          'Calculate global tier I, II, and III SDG indicators with high spatial resolution',
          'Construct interactive dashboard monitoring for state and district planning boards',
        ],
        certification: 'UN-Stats & MoSPI Sustainable Development Fellow',
      },
      {
        id: 'promo-sso-03',
        title: 'Executive Policy Governance, Procurement & Financial Management',
        provider: 'National Institute of Financial Management / iGOT',
        duration: '10 Hours',
        difficulty: 'Executive',
        format: 'Case Study Simulation',
        competency: 'Governance & Finance',
        skill: 'Ethics',
        promotionImpact: '+20% Readiness Boost',
        impactScore: 20,
        outcomes: [
          'Execute GeM procurement protocols and manage multi-crore departmental survey budgets',
          'Draft legislative responses and cabinet notes on official statistical indicators',
          'Lead risk governance and data sovereignty audits across cloud repositories',
        ],
        certification: 'Senior Civil Governance Diploma',
      },
    ],
  },
  'Data Analyst': {
    targetRole: 'Senior Data Analyst / Lead Data Scientist',
    higherTarget: 'Principal Analytics Lead / Director of Intelligence',
    cadre: 'Advanced Analytics & Data Science Cadre',
    benchmarkScore: 78,
    gradeIncrement: 'Tier 1 Analyst → Tier 2 Senior Lead (+25-35% Compensation Band)',
    responsibilities: [
      'Architect automated analytics pipelines and self-healing data warehouses',
      'Build and productionize machine learning models for anomaly detection and forecasting',
      'Translate raw data telemetry into executive strategic dashboards and KPIs',
      'Mentor junior analysts on code quality, testing, and modern data practices',
    ],
    promotionCriteria: [
      'Achieve 78%+ score in Technical & Analytical assessment',
      'Demonstrated end-to-end delivery of predictive intelligence or reporting system',
      'Proficiency in SQL, Python, and scalable Cloud visualization',
    ],
    courses: [
      {
        id: 'promo-da-01',
        title: 'Applied Machine Learning & Statistical Forecasting in Python',
        provider: 'MeitY / iGOT Karmayogi',
        duration: '18 Hours',
        difficulty: 'Advanced',
        format: 'Hands-on Projects',
        competency: 'Machine Learning',
        skill: 'Python',
        promotionImpact: '+30% Readiness Boost',
        impactScore: 30,
        outcomes: [
          'Train time-series forecasting models (ARIMA, Prophet, XGBoost) on trend data',
          'Deploy automated model evaluation, feature engineering, and cross-validation',
          'Construct REST API microservices for real-time model inference',
        ],
        certification: 'Certified Machine Learning Specialist',
      },
      {
        id: 'promo-da-02',
        title: 'Cloud Data Warehousing & Advanced Distributed SQL Optimization',
        provider: 'Digital India / Industry Consortium',
        duration: '12 Hours',
        difficulty: 'Advanced',
        format: 'Interactive Sandbox',
        competency: 'Database Architecture',
        skill: 'SQL',
        promotionImpact: '+25% Readiness Boost',
        impactScore: 25,
        outcomes: [
          'Optimize complex analytical queries using window functions and indexing strategies',
          'Design Star & Snowflake dimensional schemas for billion-row datasets',
          'Enforce column-level data encryption and role-based access security',
        ],
        certification: 'Cloud Data Architecture Professional',
      },
      {
        id: 'promo-da-03',
        title: 'Data Quality Auditing & Automated Validation Frameworks',
        provider: 'NSSTA / iGOT',
        duration: '8 Hours',
        difficulty: 'Intermediate',
        format: 'Self-Paced',
        competency: 'Data Governance',
        skill: 'Data Quality Frameworks',
        promotionImpact: '+20% Readiness Boost',
        impactScore: 20,
        outcomes: [
          'Implement automated unit tests for data pipelines with Great Expectations',
          'Construct real-time data freshness, drift, and schema violation alerts',
          'Publish standardized data dictionaries and open data catalog schemas',
        ],
        certification: 'Data Governance & Quality Auditor',
      },
    ],
  },
  'Statistical Investigator': {
    targetRole: 'Statistical Officer (Gazetted)',
    higherTarget: 'Senior Statistical Officer / Survey Operations Lead',
    cadre: 'Official Survey & Field Operations Cadre',
    benchmarkScore: 70,
    gradeIncrement: 'Pay Level 6 → Pay Level 7 (Gazetted Officer Cadre, +20% Emoluments)',
    responsibilities: [
      'Transition from field inspection to analytical survey design and indicator drafting',
      'Manage district and zonal survey teams and review sample frame coverage',
      'Validate primary survey responses using CAPI error checks and imputation logic',
      'Submit preliminary statistical releases for national consumer and enterprise surveys',
    ],
    promotionCriteria: [
      'Attain 70%+ score on core survey and statistical quality benchmarks',
      'Minimum 3 years field experience with stellar data fidelity record',
      'Completion of official CAPI & sampling design certifications',
    ],
    courses: [
      {
        id: 'promo-si-01',
        title: 'Survey Methodology, Sampling Design & CAPI Systems',
        provider: 'NSSTA - TPAC MoSPI',
        duration: '4 Days Intensive Lab',
        difficulty: 'Intermediate',
        format: 'Field Simulator',
        competency: 'Sampling & Surveys',
        skill: 'Sampling',
        promotionImpact: '+35% Readiness Boost',
        impactScore: 35,
        outcomes: [
          'Design digital questionnaires with complex skip-patterns and range constraints',
          'Implement dual-frame sampling and spatial address validation using GPS',
          'Manage field enumerator quality control and real-time synchronization',
        ],
        certification: 'NSSTA Official Survey Methodology Lead',
      },
      {
        id: 'promo-si-02',
        title: 'Official Data Quality Validation & Error Detection',
        provider: 'iGOT Karmayogi',
        duration: '10 Hours',
        difficulty: 'Foundational',
        format: 'Self-Paced',
        competency: 'Data Quality Frameworks',
        skill: 'Data Quality Frameworks',
        promotionImpact: '+25% Readiness Boost',
        impactScore: 25,
        outcomes: [
          'Identify systematic response bias and interviewer fabrication artifacts',
          'Perform cold-deck and hot-deck imputation on incomplete survey schedules',
          'Prepare verification dossiers for national survey sample balances',
        ],
        certification: 'Data Quality Assurance Credential',
      },
      {
        id: 'promo-si-03',
        title: 'Introductory Statistical Analysis with Python and Excel',
        provider: 'iGOT Karmayogi',
        duration: '12 Hours',
        difficulty: 'Foundational',
        format: 'Hands-on Exercises',
        competency: 'Analytical Tools',
        skill: 'Data Visualization',
        promotionImpact: '+20% Readiness Boost',
        impactScore: 20,
        outcomes: [
          'Create automated summary statistical tables, histograms, and box plots',
          'Compute central tendencies, index numbers, and inflation indicators',
          'Draft executive summaries from raw tabular data',
        ],
        certification: 'Mission Karmayogi Statistical Computing Badge',
      },
    ],
  },
  'Health Data Analyst': {
    targetRole: 'Senior Health Statistics Officer / Biostatistics Lead',
    higherTarget: 'Director of Epidemiology & Health Informatics',
    cadre: 'Health Informatics & Epidemiological Statistics Cadre',
    benchmarkScore: 78,
    gradeIncrement: 'Pay Level 7 → Pay Level 8/9 (Senior Informatics Grade, +24% Emoluments)',
    responsibilities: [
      'Lead national and state health survey analysis (NFHS, HMIS registries)',
      'Model disease transmission rates, immunization coverage, and healthcare utilization',
      'Enforce digital health data privacy (ABDM architecture standards)',
      'Draft policy recommendations for Ministry of Health & Family Welfare',
    ],
    promotionCriteria: [
      'Attain 78%+ score on health epidemiology and biostatistics benchmarks',
      'Verified competency in Health Indicators, Privacy-Preserving Analytics, and R/Python',
      'Successful completion of 2+ clinical health data accreditation programs',
    ],
    courses: [
      {
        id: 'promo-health-01',
        title: 'Biostatistics, Epidemiological Modeling & R Programming',
        provider: 'iGOT Karmayogi / AIIMS / ICMR',
        duration: '16 Hours',
        difficulty: 'Advanced',
        format: 'Practical Analytics Lab',
        competency: 'Health Statistics',
        skill: 'Biostatistics',
        promotionImpact: '+35% Readiness Boost',
        impactScore: 35,
        outcomes: [
          'Fit survival models, hazard ratios, and multivariate logistic regressions in R',
          'Calculate maternal and infant mortality indicators with demographic smoothing',
          'Design outbreak surveillance alert algorithms on HMIS hospital datasets',
        ],
        certification: 'Accredited Biostatistical Epidemiologist',
      },
      {
        id: 'promo-health-02',
        title: 'Healthcare Data Privacy, ABDM Standards & FHIR Architecture',
        provider: 'National Health Authority / MeitY',
        duration: '10 Hours',
        difficulty: 'Intermediate',
        format: 'Digital Sandbox',
        competency: 'Digital Health Governance',
        skill: 'Data Privacy',
        promotionImpact: '+25% Readiness Boost',
        impactScore: 25,
        outcomes: [
          'Implement Ayushman Bharat Digital Mission (ABDM) electronic health records standards',
          'Apply differential privacy and k-anonymity algorithms to public health datasets',
          'Enforce strict regulatory compliance under the Digital Personal Data Protection Act',
        ],
        certification: 'Digital Health Data Governance Specialist',
      },
    ],
  },
  'Software Engineer': {
    targetRole: 'Senior Software Engineer / Tech Lead',
    higherTarget: 'Principal Solutions Architect / Engineering Manager',
    cadre: 'Engineering & Technology Leadership Cadre',
    benchmarkScore: 80,
    gradeIncrement: 'Engineer Tier → Senior Engineer / Tech Lead (+30% Salary Band)',
    responsibilities: [
      'Own end-to-end architecture and scalability for core platform services',
      'Conduct rigorous code reviews, establish architectural RFCs, and reduce technical debt',
      'Lead incident response, zero-downtime deployments, and reliability SLAs',
      'Mentor and upskill junior engineers on clean code and systems design',
    ],
    promotionCriteria: [
      '80%+ score in system architecture, coding and problem-solving evaluations',
      'Demonstrated ownership of high-impact production microservice or framework',
      'Completion of advanced cloud architecture and security modules',
    ],
    courses: [
      {
        id: 'promo-swe-01',
        title: 'Distributed Systems Architecture & High-Concurrency Microservices',
        provider: 'Industry Engineering Academy',
        duration: '16 Hours',
        difficulty: 'Advanced',
        format: 'Code Labs & System Design',
        competency: 'System Architecture',
        skill: 'System architecture',
        promotionImpact: '+35% Readiness Boost',
        impactScore: 35,
        outcomes: [
          'Design event-driven architectures with Kafka, Redis, and message brokers',
          'Implement distributed transactions, idempotency, and circuit-breaker patterns',
          'Optimize database connection pooling, caching strategies, and horizontal scaling',
        ],
        certification: 'Certified Distributed Systems Architect',
      },
      {
        id: 'promo-swe-02',
        title: 'Cloud Infrastructure, CI/CD Pipelines & DevSecOps Mastery',
        provider: 'Cloud Native Foundation',
        duration: '12 Hours',
        difficulty: 'Intermediate-Advanced',
        format: 'Cloud Sandbox',
        competency: 'Cloud & DevOps',
        skill: 'Cloud computing',
        promotionImpact: '+25% Readiness Boost',
        impactScore: 25,
        outcomes: [
          'Provision infrastructure as code using Terraform and Docker containers',
          'Configure automated multi-stage CI/CD pipelines with automated security audits',
          'Implement observability metrics, structured logging, and distributed tracing',
        ],
        certification: 'Cloud Native DevOps Professional',
      },
      {
        id: 'promo-swe-03',
        title: 'Technical Leadership, Mentorship & Agile System Delivery',
        provider: 'Tech Leadership Institute',
        duration: '8 Hours',
        difficulty: 'Executive',
        format: 'Interactive Case Studies',
        competency: 'Leadership',
        skill: 'Problem solving',
        promotionImpact: '+20% Readiness Boost',
        impactScore: 20,
        outcomes: [
          'Facilitate effective architecture reviews and sprint estimations',
          'Manage cross-functional technical dependencies and stakeholder communications',
          'Build psychological safety, inclusive pair-programming, and engineering culture',
        ],
        certification: 'Engineering Leadership Credential',
      },
    ],
  },
  'Doctor': {
    targetRole: 'Senior Medical Officer (SMO) / Specialist Consultant (Grade I)',
    higherTarget: 'Chief Medical Officer (CMO) / Medical Superintendent / Director of Health Services',
    cadre: 'Central Health Services (CHS) · Specialist Medical Officers Cadre',
    benchmarkScore: 75,
    gradeIncrement: 'Pay Level 10 (₹56,100 - ₹1,77,500) → Pay Level 11/12 (Senior Medical Scale + 20% NPA)',
    responsibilities: [
      'Supervise clinical outpatient and inpatient care, emergency casualty triage, and departmental specialty protocols',
      'Lead hospital clinical audit committees, mortality reviews, and patient safety compliance standards',
      'Oversee junior medical officers, resident doctors, and clinical nursing departments across health facilities',
      'Authorize public health disease surveillance reports and liaise with National Health Mission (NHM) directorates',
    ],
    promotionCriteria: [
      'Attain 75%+ score on clinical governance, patient care standards, and healthcare administration assessments',
      'Completion of accredited modules in Clinical Audit, Patient Safety, and Public Health Epidemiology',
      'Satisfactory departmental performance dossier (APAR) with zero clinical negligence infractions',
    ],
    courses: [
      {
        id: 'promo-doc-01',
        title: 'Advanced Clinical Governance, Patient Safety & Quality Protocols',
        provider: 'iGOT Karmayogi / NHSRC MoHFW',
        duration: '14 Hours',
        difficulty: 'Advanced',
        format: 'Self-Paced Clinical Modules',
        competency: 'Clinical Governance',
        skill: 'Patient care',
        promotionImpact: '+30% Readiness Boost',
        impactScore: 30,
        outcomes: [
          'Formulate and enforce hospital infection control, sentinel event reporting, and root-cause analysis protocols',
          'Implement National Quality Assurance Standards (NQAS) and NABH hospital accreditation checklists',
          'Conduct structured clinical audits to optimize patient diagnostic pathways and reduce preventable complications',
        ],
        certification: 'Certified Clinical Governance & Healthcare Quality Specialist',
      },
      {
        id: 'promo-doc-02',
        title: 'Epidemiological Surveillance, Biostatistics & Public Health Informatics',
        provider: 'National Institute of Health & Family Welfare (NIHFW)',
        duration: '16 Hours',
        difficulty: 'Advanced',
        format: 'Interactive Case Studies & Sandbox',
        competency: 'Public Health Informatics',
        skill: 'Data analysis',
        promotionImpact: '+25% Readiness Boost',
        impactScore: 25,
        outcomes: [
          'Analyze integrated disease surveillance (IDSP) registries and outbreak prediction mathematical models',
          'Apply biostatistical hypothesis testing, relative risk, and odds ratio calculations to clinical registries',
          'Utilize digital health infrastructure (ABDM / Ayushman Bharat) for population health management',
        ],
        certification: 'Executive Credential in Public Health Informatics & Biostatistics',
      },
      {
        id: 'promo-doc-03',
        title: 'Hospital Administration, Medical Leadership & Crisis Response Management',
        provider: 'AIIMS Academy / Mission Karmayogi',
        duration: '10 Hours',
        difficulty: 'Executive',
        format: 'Clinical Simulations',
        competency: 'Healthcare Management',
        skill: 'Leadership',
        promotionImpact: '+20% Readiness Boost',
        impactScore: 20,
        outcomes: [
          'Oversee pharmaceutical inventory management, cold-chain logistics, and hospital resource budgeting',
          'Coordinate disaster and epidemic response plans, casualty triage mobilization, and emergency surge capacity',
          'Lead multidisciplinary clinical teams, resolve patient care grievances, and uphold bioethical standards',
        ],
        certification: 'Hospital Administration & Medical Leadership Certificate',
      },
    ],
  },
  'Senior Medical Officer': {
    targetRole: 'Chief Medical Officer (CMO) / Medical Superintendent',
    higherTarget: 'Director of Health Services / State Mission Director (NHM)',
    cadre: 'Central Health Services (CHS) · Senior Administrative & Executive Cadre',
    benchmarkScore: 80,
    gradeIncrement: 'Pay Level 11/12 → Pay Level 13 (Superintendent Scale, +25% Emoluments)',
    responsibilities: [
      'Direct overall clinical, surgical, and hospital administrative operations for zonal healthcare institutions',
      'Formulate state and national public health program implementation roadmaps (Ayushman Bharat, NHM)',
      'Chair bioethics committees, institutional review boards, and forensic medical boards',
      'Allocate hospital capital budgets, evaluate health technology assessments, and direct manpower deployment',
    ],
    promotionCriteria: [
      '80%+ score on hospital administrative leadership, healthcare finance, and statutory health law assessments',
      'Demonstrated successful execution of hospital accreditation or zonal health outreach programs',
      'Completion of senior executive health leadership and public health policy credentials',
    ],
    courses: [
      {
        id: 'promo-smo-01',
        title: 'Health Systems Leadership, Health Policy & Resource Economics',
        provider: 'NIHFW / Centre for Good Governance',
        duration: '16 Hours',
        difficulty: 'Executive',
        format: 'Case-Based Policy Labs',
        competency: 'Health Policy',
        skill: 'Leadership',
        promotionImpact: '+35% Readiness Boost',
        impactScore: 35,
        outcomes: [
          'Formulate comprehensive healthcare resource allocation models under state health budgets',
          'Evaluate universal health coverage metrics, cost-effectiveness analyses, and health insurance reforms',
          'Design inter-departmental contingency response frameworks for regional public health crises',
        ],
        certification: 'Executive Health Systems Leadership Award',
      },
      {
        id: 'promo-smo-02',
        title: 'Advanced Hospital Disaster Management & Epidemic Preparedness',
        provider: 'National Disaster Management Authority (NDMA) / iGOT',
        duration: '12 Hours',
        difficulty: 'Advanced',
        format: 'Simulation Drills',
        competency: 'Disaster Management',
        skill: 'Problem solving',
        promotionImpact: '+25% Readiness Boost',
        impactScore: 25,
        outcomes: [
          'Design mass casualty incident (MCI) triage plans and hospital surge capacity expansion models',
          'Coordinate quarantine protocols, biosafety containment, and emergency medical logistics',
          'Integrate multi-agency emergency communications with district magistrates and civil defense units',
        ],
        certification: 'Hospital Disaster & Emergency Preparedness Specialist',
      },
      {
        id: 'promo-smo-03',
        title: 'National Health Mission Governance & Digital Health Architecture',
        provider: 'National Health Authority (NHA) / MeitY',
        duration: '10 Hours',
        difficulty: 'Executive',
        format: 'Interactive Digital Sandbox',
        competency: 'Digital Health Architecture',
        skill: 'System architecture',
        promotionImpact: '+20% Readiness Boost',
        impactScore: 20,
        outcomes: [
          'Architect interoperable electronic health record (EHR) systems conforming to ABDM standards',
          'Enforce health data privacy, statutory bio-medical waste compliance, and medico-legal safeguards',
          'Leverage predictive epidemiology dashboards for targeted immunization and disease prevention',
        ],
        certification: 'National Digital Health Leadership Fellow',
      },
    ],
  },
  'Healthcare Administrator': {
    targetRole: 'Hospital Operations Director / Principal Healthcare Administrator',
    higherTarget: 'Chief Operating Officer (Healthcare) / Director of Hospital Services',
    cadre: 'Healthcare Operations & Hospital Administration Cadre',
    benchmarkScore: 75,
    gradeIncrement: 'Managerial Scale → Senior Executive Director (+25% Emolument Scale)',
    responsibilities: [
      'Direct full-scope hospital facility management, clinical support services, and patient experience workflows',
      'Manage healthcare budget allocation, pharmaceutical supply chain contracts, and equipment lifecycle audits',
      'Ensure strict regulatory compliance with statutory hospital licensing, bio-safety, and fire safety norms',
      'Optimize patient admission, bed turnover rates, and insurance billing clearance turnarounds',
    ],
    promotionCriteria: [
      '75%+ score on healthcare operations, hospital finance, and regulatory compliance evaluations',
      'Proven track record of improving operational throughput or achieving national hospital accreditation',
      'Completion of verified healthcare quality and administrative modules',
    ],
    courses: [
      {
        id: 'promo-ha-01',
        title: 'Hospital Supply Chain, Inventory & Medical Equipment Procurement',
        provider: 'iGOT Karmayogi / NHSRC',
        duration: '12 Hours',
        difficulty: 'Advanced',
        format: 'Applied Case Studies',
        competency: 'Hospital Operations',
        skill: 'Operations management',
        promotionImpact: '+30% Readiness Boost',
        impactScore: 30,
        outcomes: [
          'Optimize biomedical equipment uptime through preventative maintenance contracts and SLA monitoring',
          'Implement JIT inventory controls and cold-chain monitoring for critical drugs and vaccines',
          'Conduct vendor contract reviews adhering to General Financial Rules (GFR) procurement guidelines',
        ],
        certification: 'Certified Hospital Operations & Supply Chain Executive',
      },
      {
        id: 'promo-ha-02',
        title: 'Healthcare Accreditation (NABH / NQAS) & Quality Systems Management',
        provider: 'Quality Council of India (QCI) / NHSRC',
        duration: '14 Hours',
        difficulty: 'Advanced',
        format: 'Audit Framework Sandbox',
        competency: 'Quality Assurance',
        skill: 'Quality assurance',
        promotionImpact: '+25% Readiness Boost',
        impactScore: 25,
        outcomes: [
          'Draft standard operating procedures (SOPs) conforming to NABH standards across clinical departments',
          'Conduct periodic internal audits, safety mock drills, and clinical documentation compliance checks',
          'Manage patient satisfaction index surveys and incident redressal mechanisms',
        ],
        certification: 'Healthcare Quality & NABH Implementation Specialist',
      },
      {
        id: 'promo-ha-03',
        title: 'Healthcare Financial Management & Insurance Analytics',
        provider: 'National Health Authority (NHA) / iGOT',
        duration: '10 Hours',
        difficulty: 'Executive',
        format: 'Financial Modeling Labs',
        competency: 'Healthcare Finance',
        skill: 'Financial analysis',
        promotionImpact: '+20% Readiness Boost',
        impactScore: 20,
        outcomes: [
          'Analyze hospital revenue cycle management, tariff packages, and Ayushman Bharat claim settlements',
          'Model department-level operating costs, bed profitability, and capital expenditure amortization',
          'Enforce anti-fraud checks and audit compliance in third-party insurance billing',
        ],
        certification: 'Certified Healthcare Financial Administrator',
      },
    ],
  },
  'Biostatistics Officer': {
    targetRole: 'Senior Biostatistician / Principal Biostatistical Officer',
    higherTarget: 'Director (Biostatistics & Clinical Trial Analytics) / Joint Director (Health Statistics)',
    cadre: 'Biostatistics & Health Research Cadre · Group A Scientific Track',
    benchmarkScore: 78,
    gradeIncrement: 'Pay Level 7/8 → Pay Level 10/11 (Senior Scientist Scale, +25% Emoluments)',
    responsibilities: [
      'Lead statistical analysis plans (SAP) and sample size power calculations for clinical and health studies',
      'Validate survival analysis, Cox proportional hazards models, and epidemiological odds ratios',
      'Review and sign off on public health registry releases and statistical disease models',
      'Coordinate with clinical investigators and drug regulatory committees on protocol validity',
    ],
    promotionCriteria: [
      '78%+ assessment score in clinical biostatistics, statistical computing, and epidemiology',
      'Ownership of at least two validated statistical analysis protocols for health surveys or clinical studies',
      'Completion of advanced R/Python clinical data science certifications',
    ],
    courses: [
      {
        id: 'promo-bio-01',
        title: 'Advanced Biostatistics: Survival Analysis & Longitudinal Modeling in R/Python',
        provider: 'Indian Council of Medical Research (ICMR) / NIHFW',
        duration: '16 Hours',
        difficulty: 'Advanced',
        format: 'Hands-on Statistical Labs',
        competency: 'Biostatistical Analysis',
        skill: 'Statistical analysis',
        promotionImpact: '+35% Readiness Boost',
        impactScore: 35,
        outcomes: [
          'Implement Kaplan-Meier survival curves, log-rank tests, and Cox regression models on clinical datasets',
          'Model longitudinal patient outcomes using generalized estimating equations (GEE) and mixed-effects models',
          'Perform propensity score matching to control for confounding in observational health registries',
        ],
        certification: 'ICMR Advanced Biostatistical Modeling Credential',
      },
      {
        id: 'promo-bio-02',
        title: 'Clinical Trial Design, Sample Size Determination & Adaptive Protocols',
        provider: 'Clinical Development Services Agency / iGOT',
        duration: '14 Hours',
        difficulty: 'Advanced',
        format: 'Case Simulations',
        competency: 'Clinical Trial Design',
        skill: 'Research',
        promotionImpact: '+25% Readiness Boost',
        impactScore: 25,
        outcomes: [
          'Compute statistical power and sample size under complex randomized cluster and non-inferiority trials',
          'Design adaptive clinical trial protocols with pre-specified interim efficacy and futility stopping rules',
          'Enforce Good Clinical Practice (GCP) guidelines and regulatory statistical submission requirements',
        ],
        certification: 'Certified Clinical Trial Statistician',
      },
      {
        id: 'promo-bio-03',
        title: 'Health Data Quality, Missing Data Imputation & Registry Governance',
        provider: 'Ministry of Health & Family Welfare / iGOT',
        duration: '10 Hours',
        difficulty: 'Intermediate',
        format: 'Data Sandbox',
        competency: 'Data Quality Frameworks',
        skill: 'Data cleaning',
        promotionImpact: '+20% Readiness Boost',
        impactScore: 20,
        outcomes: [
          'Apply multiple imputation by chained equations (MICE) for non-random missingness in health registries',
          'Perform automated data quality auditing against WHO health data standards and metadata benchmarks',
          'Formulate statistical disclosure control (SDC) protocols for sharing de-identified public health microdata',
        ],
        certification: 'Health Registry Data Governance Specialist',
      },
    ],
  },
  'Agricultural Statistics Officer': {
    targetRole: 'Senior Agricultural Statistician / Director of Agricultural Accounts',
    higherTarget: 'Adviser (Agriculture & Food Statistics) / Directorate of Economics & Statistics (DES)',
    cadre: 'Agricultural Economics & Statistics Cadre · Group A Track',
    benchmarkScore: 75,
    gradeIncrement: 'Pay Level 7 → Pay Level 8/10 (Senior Scale, +22% Emoluments)',
    responsibilities: [
      'Sign off on Advance Estimates of crop production, crop-cutting experiment (CCE) sample designs, and yield indices',
      'Validate satellite remote sensing and GIS spatial analytics for agricultural acreage estimation',
      'Supervise agricultural census enumeration and digital agriculture registry integration across districts',
      'Provide technical guidance for minimum support price (MSP) calculation and agricultural cost accounts',
    ],
    promotionCriteria: [
      '75%+ score on agricultural survey design, spatial crop modeling, and agrarian econometrics',
      'Completion of accredited modules in Remote Sensing Crop Yield Estimation and Agricultural Surveys',
      'Documented APAR clearance with verified field survey oversight credits',
    ],
    courses: [
      {
        id: 'promo-agri-01',
        title: 'Crop Yield Estimation, Remote Sensing & GIS Spatial Analytics',
        provider: 'ICAR - Indian Agricultural Statistics Research Institute (IASRI)',
        duration: '16 Hours',
        difficulty: 'Advanced',
        format: 'Spatial Lab & Code Sandbox',
        competency: 'Spatial Agricultural Analytics',
        skill: 'GIS',
        promotionImpact: '+35% Readiness Boost',
        impactScore: 35,
        outcomes: [
          'Process multispectral satellite imagery (NDVI/EVI) to classify crop acreage and monitor crop health',
          'Design multi-stage stratified sampling frameworks for crop-cutting experiments (CCEs)',
          'Integrate weather indices, soil sensor data, and yield simulation models for advance crop forecasts',
        ],
        certification: 'ICAR Certified Spatial Agricultural Statistician',
      },
      {
        id: 'promo-agri-02',
        title: 'Agricultural Survey Quality Assurance & Food Security Indicators',
        provider: 'FAO / iGOT Karmayogi Bharat',
        duration: '12 Hours',
        difficulty: 'Intermediate',
        format: 'Interactive Case Studies',
        competency: 'Agricultural Survey Design',
        skill: 'Survey Design',
        promotionImpact: '+25% Readiness Boost',
        impactScore: 25,
        outcomes: [
          'Formulate data quality audit checklists for land-use statistics and agricultural census registers',
          'Calculate agricultural terms of trade, farm harvest prices, and food balance sheet indicators',
          'Apply non-sampling error reduction protocols to field-level agricultural surveys',
        ],
        certification: 'Agricultural Survey Methodology & Food Security Fellow',
      },
      {
        id: 'promo-agri-03',
        title: 'Digital Agriculture Platforms, Agritech Registries & Census Automation',
        provider: 'Ministry of Agriculture & Farmers Welfare / MeitY',
        duration: '10 Hours',
        difficulty: 'Executive',
        format: 'Digital Sandbox',
        competency: 'Digital Agritech Transformation',
        skill: 'Digital Transformation',
        promotionImpact: '+20% Readiness Boost',
        impactScore: 20,
        outcomes: [
          'Integrate farmer identification registries (AgriStack) with digital land records and PM-KISAN databases',
          'Deploy smartphone-based CCE mobile apps with automated geotagging and real-time validation',
          'Design executive monitoring dashboards for agricultural disaster relief and crop insurance claims',
        ],
        certification: 'Digital Agriculture Systems Specialist',
      },
    ],
  },
  'Teacher': {
    targetRole: 'Senior PGT / Academic Department Head / Curriculum Specialist',
    higherTarget: 'Vice Principal / Principal / District Education Officer (DEO)',
    cadre: 'National & State Education Cadre · Group A Academic Track',
    benchmarkScore: 75,
    gradeIncrement: 'Pay Level 8 → Pay Level 10/11 (+25% Salary Band & Administrative Allowance)',
    responsibilities: [
      'Lead departmental pedagogical innovation, competency-based lesson planning, and NEP 2020 curriculum alignment',
      'Mentor probationary faculty members, conduct peer teaching evaluations, and optimize student learning outcomes',
      'Coordinate school accreditation reviews, board examination assessments, and parent-teacher councils',
      'Oversee academic laboratory resources, digital smart classrooms, and co-curricular enrichment programs',
    ],
    promotionCriteria: [
      '75%+ score on modern pedagogy, educational assessment frameworks, and institutional administration',
      'Completion of accredited modules in Competency-Based Education, NEP 2020, and Educational Leadership',
      'Proven student academic improvement metrics and satisfactory institutional performance appraisal',
    ],
    courses: [
      {
        id: 'promo-edu-01',
        title: 'Competency-Based Education, Formative Assessment & NEP 2020 Framework',
        provider: 'NCERT / DIKSHA / iGOT Karmayogi',
        duration: '14 Hours',
        difficulty: 'Advanced',
        format: 'Pedagogical Case Labs',
        competency: 'Pedagogical Innovation',
        skill: 'Instructional design',
        promotionImpact: '+35% Readiness Boost',
        impactScore: 35,
        outcomes: [
          'Design learning outcomes-aligned lesson modules moving beyond rote memorization to analytical inquiry',
          'Formulate holistic progress cards (HPC), rubric-based assessment tasks, and formative feedback loops',
          'Implement inclusive classroom differentiation strategies for diverse learning paces and special needs',
        ],
        certification: 'National Certified Master Teacher in Competency Pedagogy',
      },
      {
        id: 'promo-edu-02',
        title: 'Educational Leadership, School Administration & Institutional Governance',
        provider: 'National Institute of Educational Planning & Administration (NIEPA)',
        duration: '12 Hours',
        difficulty: 'Executive',
        format: 'Interactive Case Studies',
        competency: 'Educational Leadership',
        skill: 'Leadership',
        promotionImpact: '+25% Readiness Boost',
        impactScore: 25,
        outcomes: [
          'Direct institutional development plans, academic timetables, and resource optimization schedules',
          'Conduct transparent teacher peer reviews, continuous professional development (CPD), and mentorship',
          'Navigate conflict resolution, student counseling frameworks, and community stakeholder consensus',
        ],
        certification: 'Executive Certificate in School Leadership & Governance',
      },
      {
        id: 'promo-edu-03',
        title: 'Digital Pedagogy, Smart Classrooms & Educational Analytics',
        provider: 'MeitY / Swayam / Central Institute of Educational Technology',
        duration: '10 Hours',
        difficulty: 'Intermediate',
        format: 'Interactive EdTech Sandbox',
        competency: 'EdTech & Digital Learning',
        skill: 'Digital Transformation',
        promotionImpact: '+20% Readiness Boost',
        impactScore: 20,
        outcomes: [
          'Deploy interactive digital simulations, virtual lab experiments, and learning management systems (LMS)',
          'Analyze classroom learning analytics to identify early student retention and conceptual gap risks',
          'Enforce student cyber safety, digital copyright compliance, and open educational resources (OER) usage',
        ],
        certification: 'Digital Classroom Pedagogy Specialist',
      },
    ],
  },
  'Data Scientist': {
    targetRole: 'Lead Data Scientist / AI Systems Architect',
    higherTarget: 'Chief Data Officer (CDO) / Head of Artificial Intelligence & Analytics',
    cadre: 'Advanced Analytics & Artificial Intelligence Cadre · Principal Track',
    benchmarkScore: 80,
    gradeIncrement: 'Scientist Tier → Lead Principal Scientist (+30% Salary Band & Executive Equity)',
    responsibilities: [
      'Architect production-grade machine learning models, retrieval-augmented LLM architectures, and real-time inference clusters',
      'Formulate organizational AI ethics guidelines, algorithmic bias mitigation, and data privacy safeguards',
      'Direct cross-functional ML engineering teams, oversee model registry lifecycle, and maintain model drift monitoring SLAs',
      'Partner with business executive leadership to define high-impact AI strategy, roadmap investments, and ROI KPIs',
    ],
    promotionCriteria: [
      '80%+ score on system architecture, machine learning engineering, and algorithmic optimization assessments',
      'Demonstrated ownership of high-impact production predictive or generative AI service',
      'Completion of advanced distributed MLOps and Responsible AI credentials',
    ],
    courses: [
      {
        id: 'promo-ds-01',
        title: 'Production MLOps, Distributed Model Training & LLM Infrastructure',
        provider: 'AI Engineering Institute / Cloud Native Academy',
        duration: '18 Hours',
        difficulty: 'Advanced',
        format: 'Hands-on Code & Cluster Labs',
        competency: 'MLOps & Distributed AI',
        skill: 'Machine learning',
        promotionImpact: '+35% Readiness Boost',
        impactScore: 35,
        outcomes: [
          'Design automated continuous training (CT) and deployment pipelines with MLflow, Kubeflow, and Triton server',
          'Deploy distributed model training across multi-GPU nodes with parameter-efficient fine-tuning (PEFT/LoRA)',
          'Implement automated data drift, concept drift, and adversarial vulnerability detection monitors',
        ],
        certification: 'Certified Principal Machine Learning Architect',
      },
      {
        id: 'promo-ds-02',
        title: 'Responsible AI, Algorithmic Auditing & Explainable AI Governance',
        provider: 'Data Ethics Board / Mission Karmayogi',
        duration: '12 Hours',
        difficulty: 'Advanced',
        format: 'Governance Sandbox & Case Labs',
        competency: 'AI Governance & Ethics',
        skill: 'AI/ML',
        promotionImpact: '+25% Readiness Boost',
        impactScore: 25,
        outcomes: [
          'Audit black-box models using SHAP, Integrated Gradients, and counterfactual explanation frameworks',
          'Quantify and remediate disparate impact, demographic parity gaps, and protected attribute bias',
          'Formulate institutional AI governance charters complying with EU AI Act and National Data Governance Policy',
        ],
        certification: 'Responsible AI & Algorithmic Governance Fellow',
      },
      {
        id: 'promo-ds-03',
        title: 'Strategic Data Leadership, Product Analytics & Executive Influence',
        provider: 'Tech Leadership Institute',
        duration: '10 Hours',
        difficulty: 'Executive',
        format: 'Executive Case Simulations',
        competency: 'Data Leadership',
        skill: 'Leadership',
        promotionImpact: '+20% Readiness Boost',
        impactScore: 20,
        outcomes: [
          'Translate business problems into mathematically tractable machine learning specifications with clear ROI',
          'Lead technical design reviews (RFCs), mentor junior data scientists, and foster research publication standards',
          'Deliver compelling executive briefings and build cross-disciplinary alignment with product and legal teams',
        ],
        certification: 'Executive Data Science Leadership Award',
      },
    ],
  },
}

function enhancePathway(data, currentScore, currentRole) {
  const adminThreshold = getAdminPassThreshold()
  const benchmark = adminThreshold || data.benchmarkScore || 75
  const readinessPct = Math.min(100, Math.round((currentScore / benchmark) * 100))
  const isEligible = currentScore >= benchmark
  const remainingGap = Math.max(0, benchmark - currentScore)

  return {
    ...data,
    currentRole,
    currentScore,
    benchmarkScore: benchmark,
    readinessPct,
    isEligible,
    remainingGap,
  }
}

function getPromotionPathway(roleName, currentScore = 0) {
  const currentRole = (roleName || '').trim() || 'Statistical Officer'

  // 1. Exact match in catalog
  if (rolePromotionCatalog[currentRole]) {
    return enhancePathway(rolePromotionCatalog[currentRole], currentScore, currentRole)
  }

  // 2. Case-insensitive key match
  const lower = currentRole.toLowerCase()
  for (const [key, data] of Object.entries(rolePromotionCatalog)) {
    if (lower === key.toLowerCase()) {
      return enhancePathway(data, currentScore, currentRole)
    }
  }

  // 3. Specialized domain and cadre matches
  if (lower.includes('doctor') || lower.includes('physician') || lower.includes('surgeon') || lower.includes('medical officer') || lower.includes('resident doctor') || lower.includes('clinic')) {
    return enhancePathway(rolePromotionCatalog['Doctor'], currentScore, currentRole)
  }
  if (lower.includes('senior medical') || lower.includes('cmo') || lower.includes('superintendent')) {
    return enhancePathway(rolePromotionCatalog['Senior Medical Officer'], currentScore, currentRole)
  }
  if (lower.includes('health administrator') || lower.includes('hospital admin') || lower.includes('clinical research')) {
    return enhancePathway(rolePromotionCatalog['Healthcare Administrator'], currentScore, currentRole)
  }
  if (lower.includes('biostat') || lower.includes('vital statistics')) {
    return enhancePathway(rolePromotionCatalog['Biostatistics Officer'], currentScore, currentRole)
  }
  if (lower.includes('health') && (lower.includes('analyst') || lower.includes('statist') || lower.includes('survey'))) {
    return enhancePathway(rolePromotionCatalog['Health Data Analyst'], currentScore, currentRole)
  }
  if (lower.includes('crop') || lower.includes('farm') || lower.includes('agri')) {
    return enhancePathway(rolePromotionCatalog['Agricultural Statistics Officer'], currentScore, currentRole)
  }
  if (lower.includes('teacher') || lower.includes('educat') || lower.includes('professor') || lower.includes('lecturer') || lower.includes('instructor') || lower.includes('faculty')) {
    return enhancePathway(rolePromotionCatalog['Teacher'], currentScore, currentRole)
  }
  if (lower.includes('data scientist') || lower.includes('machine learning') || lower.includes('ai engineer') || lower.includes('deep learning')) {
    return enhancePathway(rolePromotionCatalog['Data Scientist'], currentScore, currentRole)
  }
  if (lower.includes('investigator') || lower.includes('field survey') || lower.includes('field officer')) {
    return enhancePathway(rolePromotionCatalog['Statistical Investigator'], currentScore, currentRole)
  }
  if (lower.includes('senior statistical') || lower.includes('sso') || lower.includes('statistical lead')) {
    return enhancePathway(rolePromotionCatalog['Senior Statistical Officer'], currentScore, currentRole)
  }
  if (lower.includes('data analyst') || lower.includes('business analyst') || lower.includes('analytics') || lower.includes('bi analyst')) {
    return enhancePathway(rolePromotionCatalog['Data Analyst'], currentScore, currentRole)
  }
  if (lower.includes('develop') || lower.includes('engineer') || lower.includes('architect') || lower.includes('programmer') || lower.includes('software') || lower.includes('devops')) {
    return enhancePathway(rolePromotionCatalog['Software Engineer'], currentScore, currentRole)
  }
  if (lower.includes('statist') || lower.includes('survey') || lower.includes('econom') || lower.includes('census') || lower.includes('nso') || lower.includes('mospi')) {
    return enhancePathway(rolePromotionCatalog['Statistical Officer'], currentScore, currentRole)
  }

  // 4. Intelligent generic professional progression generator
  const targetRole = `Senior ${currentRole}`
  const higherTarget = `Director / Principal Lead of ${currentRole}`
  let domainCadre = 'Professional Advancement Cadre · Senior Specialist Track'
  let salaryBump = 'Next Career Tier Promotion (+20-28% Emolument & Responsibility Scale)'
  
  if (lower.includes('finance') || lower.includes('account') || lower.includes('audit') || lower.includes('tax')) {
    domainCadre = 'Financial & Economic Cadre · Fiscal Governance Track'
    salaryBump = 'Senior Finance Band / Pay Level Upgrade (+25% Emoluments)'
  } else if (lower.includes('legal') || lower.includes('law') || lower.includes('compliance')) {
    domainCadre = 'Legal, Regulatory & Compliance Cadre · Senior Council Track'
    salaryBump = 'Senior Legal Counsel Band (+25% Emoluments)'
  } else if (lower.includes('human') || lower.includes('hr') || lower.includes('recruit') || lower.includes('people')) {
    domainCadre = 'Human Capital & Personnel Governance Cadre'
    salaryBump = 'Senior HR Directorate Scale (+22% Emoluments)'
  }

  const genericData = {
    targetRole,
    higherTarget,
    cadre: domainCadre,
    benchmarkScore: 75,
    gradeIncrement: salaryBump,
    responsibilities: [
      `Lead strategic operations, quality protocols and standard setting for ${currentRole} workflows`,
      'Review and sign off on high-impact deliverables, governance audits and compliance standards',
      'Mentor intermediate team members and represent the department at organizational reviews',
      'Optimize cross-functional project execution, budget utilization, and operational KPIs',
    ],
    promotionCriteria: [
      'Attain 75%+ score on comprehensive role competency evaluations',
      'Demonstrated mastery in domain analytical tools and leadership practices',
      'Complete at least 2 verified professional capability training programs',
    ],
    courses: [
      {
        id: 'promo-gen-01',
        title: `Advanced Competency Mastery & Professional Standards in ${currentRole}`,
        provider: 'iGOT Karmayogi / National Academy',
        duration: '12 Hours',
        difficulty: 'Advanced',
        format: 'Self-Paced with Practical Lab',
        competency: 'Core Domain Excellence',
        skill: 'Problem solving',
        promotionImpact: '+30% Readiness Boost',
        impactScore: 30,
        outcomes: [
          `Master advanced domain problem-solving methodologies tailored specifically for ${currentRole}`,
          'Implement quality assurance checkpoints, documentation audits, and workflow optimization',
          'Analyze complex scenario edge-cases and apply evidence-based decision models',
        ],
        certification: `Executive Specialist Certificate in ${currentRole}`,
      },
      {
        id: 'promo-gen-02',
        title: 'Digital Tools, Data Literacy & Process Automation',
        provider: 'MeitY / Digital India',
        duration: '10 Hours',
        difficulty: 'Intermediate',
        format: 'Interactive Sandbox',
        competency: 'Digital Transformation',
        skill: 'Analytical thinking',
        promotionImpact: '+25% Readiness Boost',
        impactScore: 25,
        outcomes: [
          'Automate routine reporting, data ingestion, and status tracking using modern software tools',
          'Design executive KPI dashboards and operational metrics visualizations',
          'Enforce information security, access permissions, and data protection best practices',
        ],
        certification: 'Digital Workplace Productivity Credential',
      },
      {
        id: 'promo-gen-03',
        title: 'Strategic Leadership, Project Delivery & Stakeholder Communication',
        provider: 'Mission Karmayogi / Centre for Good Governance',
        duration: '8 Hours',
        difficulty: 'Executive',
        format: 'Interactive Case Simulations',
        competency: 'Leadership & Management',
        skill: 'Leadership',
        promotionImpact: '+20% Readiness Boost',
        impactScore: 20,
        outcomes: [
          'Lead cross-disciplinary project teams and navigate stakeholder consensus',
          'Draft executive briefings, resource allocation proposals, and risk mitigation plans',
          'Conduct transparent capability evaluations and continuous team mentorship',
        ],
        certification: 'Professional Leadership & Management Award',
      },
    ],
  }
  return enhancePathway(genericData, currentScore, currentRole)
}


function getRoleSkillCategories(role, designation) {
  const target = `${role || ''} ${designation || ''}`.toLowerCase()

  if (target.includes('health data analyst') || target.includes('health statistics')) {
    return [
      ['Health Statistics', ['Health Data Analysis', 'Health Survey Design', 'Biostatistics', 'Epidemiology', 'Health Indicators', 'Vital Statistics']],
      ['Health Data Tools', ['Python', 'R Programming', 'SQL', 'Data Visualization', 'Data Cleaning & Validation', 'Statistical Modelling']],
      ['Health Data Quality', ['Data Quality Frameworks', 'Privacy-Preserving Statistics', 'Metadata Standards', 'Quality Assurance', 'Research Reporting', 'Ethics & Integrity']],
    ]
  }

  if (target.includes('labour statistics') || target.includes('employment statistics')) {
    return [
      ['Labour Statistics', ['Labour Force Surveys', 'Employment Statistics', 'Wage Statistics', 'Workforce Indicators', 'Survey Design', 'Sampling Techniques']],
      ['Analysis & Reporting', ['Statistical Analysis', 'SQL', 'Python', 'Data Visualization', 'Data Quality Frameworks', 'Report Writing']],
      ['Official Statistics Practice', ['Metadata Standards', 'Quality Assurance', 'Open Data Standards', 'Documentation', 'Ethics & Integrity']],
    ]
  }

  if (target.includes('price statistics') || target.includes('consumer price')) {
    return [
      ['Price & Consumer Statistics', ['Consumer Price Index', 'Price Collection', 'Price Statistics', 'Market Basket Analysis', 'Inflation Measurement', 'Sampling Techniques']],
      ['Economic Analysis Tools', ['Statistical Analysis', 'SQL', 'Python', 'R Programming', 'Data Visualization', 'Time Series Analysis']],
      ['Data Quality & Reporting', ['Data Quality Frameworks', 'Metadata Standards', 'Quality Assurance', 'Report Writing', 'Official Data Dissemination']],
    ]
  }

  if (target.includes('agricultural statistics') || target.includes('agricultural economist')) {
    return [
      ['Agricultural Statistics', ['Agricultural Surveys', 'Crop Statistics', 'Yield Estimation', 'Sampling Techniques', 'Rural Statistics', 'Food Security Indicators']],
      ['Analysis & Field Data', ['Statistical Analysis', 'GIS Spatial Analysis', 'Python', 'SQL', 'Data Visualization', 'Field Data Quality']],
      ['Official Statistics Practice', ['Metadata Standards', 'Quality Assurance', 'Report Writing', 'Open Data Standards', 'Ethics & Integrity']],
    ]
  }

  if (target.includes('environmental statistics') || target.includes('climate data')) {
    return [
      ['Environment & Climate Statistics', ['Environmental Indicators', 'Climate Statistics', 'Emissions Data', 'Sustainable Development Indicators', 'Survey Design', 'GIS Spatial Analysis']],
      ['Analytical Tools', ['Python', 'R Programming', 'SQL', 'Data Visualization', 'Time Series Analysis', 'Spatial Data Analysis']],
      ['Data Quality & Governance', ['Data Quality Frameworks', 'Metadata Standards', 'Open Data Standards', 'Quality Assurance', 'Report Writing', 'Ethics & Integrity']],
    ]
  }

  if (target.includes('teacher')) {
    if (target.includes('physics')) {
      return [
        ['Physics Subject Knowledge', ['Mechanics', 'Electricity & Magnetism', 'Waves & Optics', 'Thermodynamics', 'Modern Physics', 'Numerical Problem Solving']],
        ['Teaching Practice', ['Lesson Planning', 'Concept Explanation', 'Demonstration Experiments', 'Classroom Assessment', 'Differentiated Instruction', 'Student Engagement']],
        ['Laboratory & Digital Tools', ['Laboratory Safety', 'Experimental Design', 'Scientific Measurement', 'Interactive Simulations', 'Digital Whiteboard', 'Learning Management Systems']],
      ]
    }
    if (target.includes('mathematics')) {
      return [
        ['Mathematics Subject Knowledge', ['Algebra', 'Geometry', 'Calculus', 'Statistics & Probability', 'Number Theory', 'Mathematical Reasoning']],
        ['Teaching Practice', ['Lesson Planning', 'Concept Explanation', 'Problem-Based Learning', 'Classroom Assessment', 'Differentiated Instruction', 'Student Engagement']],
        ['Digital & Classroom Tools', ['Graphing Tools', 'Spreadsheets', 'Interactive Whiteboard', 'Learning Management Systems', 'Educational Technology', 'Data Interpretation']],
      ]
    }
    if (target.includes('chemistry')) {
      return [
        ['Chemistry Subject Knowledge', ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Chemical Reactions', 'Atomic Structure', 'Stoichiometry']],
        ['Teaching Practice', ['Lesson Planning', 'Concept Explanation', 'Laboratory Demonstrations', 'Classroom Assessment', 'Differentiated Instruction', 'Student Engagement']],
        ['Laboratory & Safety', ['Laboratory Safety', 'Experimental Design', 'Scientific Measurement', 'Chemical Handling', 'Data Recording', 'Learning Management Systems']],
      ]
    }
    if (target.includes('biology')) {
      return [
        ['Biology Subject Knowledge', ['Cell Biology', 'Genetics', 'Human Physiology', 'Ecology', 'Evolution', 'Biological Classification']],
        ['Teaching Practice', ['Lesson Planning', 'Concept Explanation', 'Field Study Activities', 'Classroom Assessment', 'Differentiated Instruction', 'Student Engagement']],
        ['Laboratory & Digital Tools', ['Laboratory Safety', 'Microscopy', 'Experimental Design', 'Scientific Measurement', 'Interactive Simulations', 'Learning Management Systems']],
      ]
    }
    return [
      ['Teaching & Subject Delivery', ['Lesson Planning', 'Concept Explanation', 'Subject Knowledge', 'Classroom Assessment', 'Differentiated Instruction', 'Student Engagement']],
      ['Classroom Practice', ['Classroom Management', 'Inclusive Education', 'Learning Outcomes', 'Student Mentoring', 'Parent Communication', 'Remedial Teaching']],
      ['Digital & Professional Tools', ['Learning Management Systems', 'Digital Teaching Tools', 'Educational Technology', 'Content Creation', 'Data Interpretation', 'Continuous Learning']],
    ]
  }

  if (target.includes('architect') || target.includes('civil') || target.includes('interior') || target.includes('construction')) {
    return [
      ['Architectural & Structural Design', ['Structural Design', 'CAD / BIM Modeling', 'Building Codes & Standards', 'Sustainable Architecture', 'Urban Planning', 'System Architecture', 'Spatial Planning', 'Site Inspection']],
      ['Engineering & Construction Standards', ['Civil Engineering Principles', 'Material Specifications', 'Safety Regulations', 'Environmental Impact Assessment', 'Quality Assurance', 'Cost Estimation']],
      ['Digital & Technical Tools', ['AutoCAD', 'Revit', '3D Modeling', 'Project Planning Tools', 'GIS Mapping', 'BIM Collaboration']],
      ['Managerial & Professional', ['Project Management', 'Client Communication', 'Contract Administration', 'Team Leadership', 'Regulatory Compliance']],
    ]
  }

  if (target.includes('statist') || target.includes('economist') || target.includes('survey') || target.includes('investigator') || target.includes('census') || target.includes('agricultur') || target.includes('labour') || target.includes('health') || target.includes('industrial') || target.includes('manufactur') || target.includes('price') || target.includes('consumer') || target.includes('social') || target.includes('demograph') || target.includes('environment') || target.includes('climate') || target.includes('biostat')) {
    return [
      ['Statistical Competencies', ['Survey Design', 'Sampling Techniques', 'National Accounts', 'Price Statistics', 'Labour Statistics', 'Agricultural Statistics', 'Industrial Statistics', 'SDG Indicators', 'Data Quality Frameworks', 'Metadata Standards']],
      ['Technical & Analytical Tools', ['Python', 'R Programming', 'SQL', 'Stata', 'SPSS', 'SAS', 'Data Visualization', 'GIS Spatial Analysis', 'AI/ML for Official Statistics']],
      ['Digital Governance', ['Cybersecurity', 'Data Privacy', 'Digital Public Infrastructure', 'Open Data Standards', 'Government Cloud']],
      ['Managerial & Behavioural', ['Leadership', 'Analytical Thinking', 'Report Writing', 'Public Policy Analysis', 'Decision Making', 'Ethics & Integrity']],
    ]
  }

  if (target.includes('data governance') || target.includes('data quality') || target.includes('metadata') || target.includes('official data') || target.includes('indicators')) {
    return [
      ['Official Data Management', ['Data Governance', 'Metadata Standards', 'Data Quality Frameworks', 'Data Classification', 'Data Lineage', 'Master Data Management']],
      ['Statistical Production Tools', ['SQL', 'Python', 'R Programming', 'Data Cleaning & Validation', 'Data Integration', 'Data Visualization']],
      ['Official Statistics Practice', ['Open Data Standards', 'Statistical Disclosure Control', 'Indicator Frameworks', 'Documentation', 'Quality Assurance', 'Ethics & Integrity']],
    ]
  }

  if (target.includes('doctor') || target.includes('medic') || target.includes('nurse') || target.includes('health') || target.includes('clinic') || target.includes('pharmac') || target.includes('dental')) {
    return [
      ['Clinical & Medical Competencies', ['Clinical Diagnosis', 'Patient Care & Assessment', 'Treatment Planning', 'Emergency Response', 'Medical Documentation', 'Infection Control Protocols']],
      ['Healthcare Systems & Safety', ['Healthcare Safety Standards', 'Pharmacovigilance', 'Health Informatics', 'Epidemiology', 'Public Health Frameworks', 'Medical Equipment Operation']],
      ['Ethics & Communication', ['Patient Communication', 'Medical Ethics', 'Empathy & Active Listening', 'Crisis Management', 'Interdisciplinary Teamwork']],
    ]
  }

  if (target.includes('account') || target.includes('financ') || target.includes('audit') || target.includes('tax') || target.includes('treasur') || target.includes('controller') || target.includes('payroll')) {
    return [
      ['Financial & Accounting Competencies', ['Financial Reporting', 'Auditing Standards', 'Public Financial Management', 'Budgeting & Forecasting', 'Taxation & Compliance', 'Payroll Systems', 'Cost Accounting']],
      ['Analytical & Technical Tools', ['Financial Analysis', 'Advanced Excel', 'ERP Systems', 'Risk Management & Mitigation', 'Internal Controls', 'Treasury Management']],
      ['Governance & Compliance', ['Regulatory Compliance', 'Corporate Governance', 'Ethics & Financial Integrity', 'Decision Making', 'Report Writing']],
    ]
  }

  if (target.includes('software') || target.includes('developer') || target.includes('engineer') || target.includes('devops') || target.includes('qa') || target.includes('web') || target.includes('code') || target.includes('programmer')) {
    return [
      ['Core Software Engineering', ['System Architecture', 'Coding', 'Algorithms & Data Structures', 'APIs & Microservices', 'Database Management', 'Object-Oriented Design']],
      ['Technical Stack', ['JavaScript', 'TypeScript', 'Python', 'React', 'Node.js', 'SQL', 'Git & Version Control', 'Cloud Computing']],
      ['DevOps & Reliability', ['CI/CD Pipelines', 'Docker & Containers', 'Cybersecurity', 'Troubleshooting & Debugging', 'Performance Optimization']],
      ['Professional & Delivery', ['Agile / Scrum', 'Technical Documentation', 'Problem Solving', 'Team Collaboration', 'Code Reviews']],
    ]
  }

  if (target.includes('data analyst') || target.includes('data scientist') || target.includes('data engineer') || target.includes('database')) {
    return [
      ['Data & Analytical Competencies', ['Data Analysis', 'Statistical Analysis', 'Data Cleaning & Validation', 'Predictive Modeling', 'Machine Learning', 'A/B Testing']],
      ['Technical & Query Tools', ['Python', 'SQL', 'R Programming', 'Data Visualization (Tableau/PowerBI)', 'Database Management', 'Cloud Data Warehousing']],
      ['Governance & Reporting', ['Data Quality Frameworks', 'Data Governance', 'Executive Reporting', 'Problem Solving', 'Critical Thinking']],
    ]
  }

  if (target.includes('ui') || target.includes('ux') || target.includes('design') || target.includes('graphic') || target.includes('creative') || target.includes('art')) {
    return [
      ['Design & UX Competencies', ['UI Design', 'UX Research', 'Design Systems', 'Wireframing & Prototyping', 'User Journey Mapping', 'Visual Hierarchy']],
      ['Creative & Production Tools', ['Figma', 'Adobe Creative Suite', 'Interaction Design', 'Typography & Color Theory', 'Design Thinking']],
      ['Collaboration & Strategy', ['Design Reviews', 'Usability Testing', 'Stakeholder Communication', 'Product Strategy', 'Creative Direction']],
    ]
  }

  if (target.includes('manager') || target.includes('director') || target.includes('operations') || target.includes('project') || target.includes('human resources') || target.includes('recruiter') || target.includes('leader')) {
    return [
      ['Strategic & Operational Leadership', ['Project Management', 'Strategic Planning', 'Operations Management', 'Process Improvement', 'Risk Management', 'Stakeholder Engagement']],
      ['People & Talent Management', ['Team Leadership', 'Recruitment & Talent Acquisition', 'Performance Management', 'Conflict Resolution', 'Employee Relations', 'Mentoring']],
      ['Professional Execution', ['Budget Management', 'Effective Communication', 'Agile / Scrum Frameworks', 'Negotiation', 'Change Management']],
    ]
  }

  if (target.includes('legal') || target.includes('law') || target.includes('compliance') || target.includes('policy') || target.includes('paralegal')) {
    return [
      ['Legal & Policy Competencies', ['Legal Research', 'Regulatory Compliance', 'Contract Management & Drafting', 'Public Policy Analysis', 'Statutory Interpretation']],
      ['Governance & Risk', ['Corporate Governance', 'Risk Assessment', 'Ethics & Compliance Auditing', 'Dispute Resolution', 'Due Diligence']],
      ['Professional Skills', ['Legal Writing', 'Analytical Thinking', 'Negotiation', 'Communication', 'Case Management']],
    ]
  }

  return [
    ['Core Professional Competencies', ['Problem Solving', 'Analytical Thinking', 'Planning & Organizing', 'Critical Thinking', 'Decision Making', 'Process Improvement']],
    ['Communication & Collaboration', ['Communication', 'Teamwork', 'Stakeholder Management', 'Documentation & Reporting', 'Client Service']],
    ['Digital & Workplace Skills', ['Digital Workplace Tools', 'Data Literacy', 'Time Management', 'Continuous Learning', 'Adaptability']],
  ]
}

const text = {
  en: {
    language: 'Choose language',
    welcome: 'Welcome to Skillstat AI',
    signIn: 'Sign in to access your skills dashboard',
    email: 'Work email',
    password: 'Password',
    continue: 'Continue',
    back: 'Back',
    step1Title: 'Select your Job Role',
    step1Hint: 'Choose your current or target job role to tailor your skill journey.',
    step2Title: 'Select Your Skills',
    step2Hint: 'Showing skills specific to',
    step2Req: 'Please select at least 2 skills to continue.',
    step3Title: 'Years of Experience',
    step3Hint: 'We adjust question difficulty and benchmarks based on your experience level.',
    searchRole: 'Search job role...',
    skillsSelected: 'skills selected',
    minSkillsWarning: 'Select at least 2 skills',
    dashboard: 'Skills Dashboard',
    profile: 'Profile Overview',
    myProfile: 'My Profile',
    settings: 'Settings',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    progress: 'Overall Readiness',
    skillsBreakdown: 'Skill Competency & Gap Analysis',
    roleLabel: 'Target Role',
    experienceLabel: 'Experience',
    skillsLabel: 'Active Skills',
    takeQuiz: 'Take Skill Assessment',
    retakeQuiz: 'Retake Assessment',
    editProfile: 'Edit Skills & Role',
    logout: 'Sign Out',
    question: 'Question',
    submit: 'Submit Answer',
    next: 'Next Question',
    finish: 'Finish Assessment',
    gapTitle: 'Assessment Results & Skill Gaps',
    gapIntro: 'Here is your skill breakdown and prioritized learning insights.',
    openDashboard: 'Open Dashboard',
    exitQuiz: 'Exit to Dashboard',
    highProficiency: 'Mastered (Low Gap)',
    medProficiency: 'Developing (Moderate Gap)',
    lowProficiency: 'Priority Focus (High Gap)',
    pendingAssessment: 'Assessment Pending',
    weekendQuiz: 'Weekend Company Challenge',
    leaderboard: 'Company Leaderboard',
    notesQuiz: 'AI Quiz from Notes / PDF',
  },
  hi: {
    language: 'भाषा चुनें',
    welcome: 'Skillstat AI में आपका स्वागत है',
    signIn: 'अपने कौशल डैशबोर्ड में प्रवेश करें',
    email: 'कार्य ईमेल',
    password: 'पासवर्ड',
    continue: 'जारी रखें',
    back: 'पीछे जाएं',
    step1Title: 'अपनी नौकरी की भूमिका चुनें',
    step1Hint: 'अपने कौशल मूल्यांकन के लिए भूमिका चुनें।',
    step2Title: 'अपने कौशल चुनें',
    step2Hint: 'के लिए प्रासंगिक कौशल दिखाए जा रहे हैं',
    step2Req: 'जारी रखने के लिए कृपया कम से कम 2 कौशल चुनें।',
    step3Title: 'कार्य अनुभव',
    step3Hint: 'हम आपके अनुभव के अनुसार प्रश्नों का स्तर निर्धारित करते हैं।',
    searchRole: 'भूमिका खोजें...',
    skillsSelected: 'कौशल चुने गए',
    minSkillsWarning: 'कम से कम 2 कौशल चुनें',
    dashboard: 'कौशल डैशबोर्ड',
    profile: 'प्रोफाइल विवरण',
    myProfile: 'मेरी प्रोफाइल',
    settings: 'सेटिंग्स',
    lightMode: 'लाइट मोड',
    darkMode: 'डार्क मोड',
    saveChanges: 'परिवर्तन सहेजें',
    cancel: 'रद्द करें',
    progress: 'समग्र तैयारी',
    skillsBreakdown: 'कौशल दक्षता और गैप विश्लेषण',
    roleLabel: 'भूमिका',
    experienceLabel: 'अनुभव',
    skillsLabel: 'सक्रिय कौशल',
    takeQuiz: 'कौशल टेस्ट शुरू करें',
    retakeQuiz: 'पुनः टेस्ट दें',
    editProfile: 'भूमिका और कौशल बदलें',
    logout: 'लॉग आउट',
    question: 'प्रश्न',
    submit: 'उत्तर जमा करें',
    next: 'अगला प्रश्न',
    finish: 'टेस्ट पूरा करें',
    gapTitle: 'टेस्ट परिणाम और कौशल गैप',
    gapIntro: 'यह आपके कौशल और सुधार क्षेत्रों का विश्लेषण है।',
    openDashboard: 'डैशबोर्ड खोलें',
    exitQuiz: 'डैशबोर्ड पर लौटें',
    highProficiency: 'मजबूत पकड़ (कम गैप)',
    medProficiency: 'मध्यम (सुधार जारी)',
    lowProficiency: 'प्राथमिकता (अधिक गैप)',
    pendingAssessment: 'टेस्ट बाकी',
    weekendQuiz: 'वीकेंड कंपनी चैलेंज',
    leaderboard: 'कंपनी लीडरबोर्ड',
    notesQuiz: 'नोट्स / PDF से AI क्विज़',
  },
  ta: {
    language: 'மொழியைத் தேர்வு செய்க',
    welcome: 'Skillstat AI-க்கு வரவேற்கிறோம்',
    signIn: 'உங்கள் டாஷ்போர்டை அணுக உள்நுழையவும்',
    email: 'பணி மின்னஞ்சல்',
    password: 'கடவுச்சொல்',
    continue: 'தொடரவும்',
    back: 'பின்செல்க',
    step1Title: 'உங்கள் வேலையைத் தேர்வு செய்யவும்',
    step1Hint: 'உங்கள் திறன் தேர்வுக்கு பொருத்தமான பங்கைத் தேர்வு செய்யவும்.',
    step2Title: 'உங்கள் திறன்களைத் தேர்ந்தெடுக்கவும்',
    step2Hint: 'பங்கிற்கான திறன்கள் காட்டப்படுகின்றன',
    step2Req: 'தொடர குறைந்தபட்சம் 2 திறன்களைத் தேர்ந்தெடுக்கவும்.',
    step3Title: 'அனுபவம்',
    step3Hint: 'உங்கள் அனுபவத்திற்கு ஏற்ப வினாக்கள் உருவாக்கப்படும்.',
    searchRole: 'பங்கு தேடுங்கள்...',
    skillsSelected: 'திறன்கள் தேர்ந்தெடுக்கப்பட்டன',
    minSkillsWarning: 'குறைந்தது 2 திறன்களைத் தேர்ந்தெடுக்கவும்',
    dashboard: 'திறன் டாஷ்போர்டு',
    profile: 'சுயவிவரம்',
    myProfile: 'என் சுயவிவரம்',
    settings: 'அமைப்புகள்',
    lightMode: 'ஒளி பயன்முறை',
    darkMode: 'இருண்ட பயன்முறை',
    saveChanges: 'மாற்றங்களைச் சேமிக்கவும்',
    cancel: 'ரத்துசெய்',
    progress: 'ஒட்டுமொத்த தயார்நிலை',
    skillsBreakdown: 'திறன் மற்றும் இடைவெளி பகுப்பாய்வு',
    roleLabel: 'வேலை பங்கு',
    experienceLabel: 'அனுபவம்',
    skillsLabel: 'செயலில் உள்ள திறன்கள்',
    takeQuiz: 'தேர்வைத் தொடங்கு',
    retakeQuiz: 'மீண்டும் தேர்வு எழுது',
    editProfile: 'பங்கு மற்றும் திறன்களை மாற்றுக',
    logout: 'வெளியேறு',
    question: 'கேள்வி',
    submit: 'சமர்ப்பிக்கவும்',
    next: 'அடுத்த கேள்வி',
    finish: 'தேர்வை முடிக்கவும்',
    gapTitle: 'தேர்வு முடிவுகள் மற்றும் திறன் பகுப்பாய்வு',
    gapIntro: 'உங்கள் பதில்களின் அடிப்படையிலான பகுப்பாய்வு.',
    openDashboard: 'டாஷ்போர்டைத் திறக்கவும்',
    exitQuiz: 'டாஷ்போர்டுக்கு திரும்பு',
    highProficiency: 'சிறந்த நிலை',
    medProficiency: 'பயிற்சி தேவை',
    lowProficiency: 'முக்கிய கவனம் தேவை',
    pendingAssessment: 'மதிப்பீடு நிலுவையில் உள்ளது',
    weekendQuiz: 'வார இறுதி சவால்',
    leaderboard: 'நிறுவன தரவரிசை பட்டியல்',
    notesQuiz: 'குறிப்புகள் / PDF AI தேர்வு',
  },
  te: {
    language: 'భాషను ఎంచుకోండి',
    welcome: 'Skillstat AI కి స్వాగతం',
    signIn: 'డాష్‌బోర్డ్ కోసం సైన్ ఇన్ చేయండి',
    email: 'పని ఇమెయిల్',
    password: 'పాస్‌వర్డ్',
    continue: 'కొనసాగించండి',
    back: 'వెనుకకు',
    step1Title: 'మీ ఉద్యోగ పాత్రను ఎంచుకోండి',
    step1Hint: 'మీ వ్యక్తిగత నైపుణ్య పరీక్ష కోసం పాత్రను ఎంచుకోండి.',
    step2Title: 'మీ నైపుణ్యాలను ఎంచుకోండి',
    step2Hint: 'సంబంధిత నైపుణ్యాలు',
    step2Req: 'కొనసాగించడానికి కనీసం 2 నైపుణ్యాలను ఎంచుకోండి.',
    step3Title: 'అనుభవం',
    step3Hint: 'మీ అనుభవ స్థాయి ఆధారంగా ప్రశ్నలు ఉంటాయి.',
    searchRole: 'పాత్రను వెతకండి...',
    skillsSelected: 'నైపుణ్యాలు ఎంపికయ్యాయి',
    minSkillsWarning: 'కనీసం 2 నైపుణ్యాలను ఎంచుకోండి',
    dashboard: 'నైపుణ్య డాష్‌బోర్డ్',
    profile: 'ప్రొఫైల్ సారాంశం',
    myProfile: 'నా ప్రొఫైల్',
    settings: 'సెట్టింగ్‌లు',
    lightMode: 'లైట్ మోడ్',
    darkMode: 'డార్క్ మోడ్',
    saveChanges: 'మార్పులను సేవ్ చేయండి',
    cancel: 'రద్దు చేయండి',
    progress: 'మొత్తం సంసిద్ధత',
    skillsBreakdown: 'నైపుణ్య అంతర విశ్లేషణ',
    roleLabel: 'ఉద్యోగ పాత్ర',
    experienceLabel: 'అనుభవం',
    skillsLabel: 'నైపుణ్యాలు',
    takeQuiz: 'పరీక్ష ప్రారంభించండి',
    retakeQuiz: 'మళ్ళీ పరీక్ష రాయండి',
    editProfile: 'నైపుణ్యాలు మార్చండి',
    logout: 'లాగ్ అవుట్',
    question: 'ప్రశ్న',
    submit: 'సమర్పించండి',
    next: 'తరువాతి ప్రశ్న',
    finish: 'పూర్తి చేయండి',
    gapTitle: 'పరీక్ష ఫలితాలు మరియు విశ్లేషణ',
    gapIntro: 'మీ ప్రొఫైల్ ఆధారంగా విశ్లేషణ సిద్ధంగా ఉంది.',
    openDashboard: 'డాష్‌బోర్డ్ తెరవండి',
    exitQuiz: 'డాష్‌బోర్డ్‌కు వెళ్ళండి',
    highProficiency: 'ఉత్తమ నైపుణ్యం',
    medProficiency: 'మరింత అభ్యాసం అవసరం',
    lowProficiency: 'అధిక ప్రాధాన్యత',
    pendingAssessment: 'మూల్యాంకనం బాకీ ఉంది',
    weekendQuiz: 'వీకెండ్ ఛాలెంజ్',
    leaderboard: 'కంపెనీ లీడర్‌బోర్డ్',
    notesQuiz: 'నోట్స్ / PDF AI క్విజ్',
  },
}

const extendedText = {
  bn: { language: 'ভাষা নির্বাচন করুন', welcome: 'Skillstat AI-তে স্বাগতম', signIn: 'আপনার দক্ষতা ড্যাশবোর্ডে প্রবেশ করুন', email: 'কাজের ইমেল', password: 'পাসওয়ার্ড', continue: 'চালিয়ে যান', back: 'ফিরে যান', step1Title: 'আপনার কাজের ভূমিকা নির্বাচন করুন', step1Hint: 'আপনার দক্ষতা যাত্রা সাজাতে বর্তমান বা লক্ষ্য ভূমিকা নির্বাচন করুন।', step2Title: 'আপনার দক্ষতা নির্বাচন করুন', step2Hint: 'এর জন্য নির্দিষ্ট দক্ষতা দেখানো হচ্ছে', step3Title: 'অভিজ্ঞতার বছর', step3Hint: 'আপনার অভিজ্ঞতা অনুযায়ী প্রশ্নের কঠিনতা নির্ধারিত হবে।', searchRole: 'ভূমিকা খুঁজুন...', skillsSelected: 'টি দক্ষতা নির্বাচিত', dashboard: 'দক্ষতা ড্যাশবোর্ড', profile: 'প্রোফাইল', myProfile: 'আমার প্রোফাইল', settings: 'সেটিংস', lightMode: 'আলো মোড', darkMode: 'অন্ধকার মোড', takeQuiz: 'দক্ষতা মূল্যায়ন শুরু করুন', retakeQuiz: 'আবার মূল্যায়ন করুন', editProfile: 'প্রোফাইল সম্পাদনা করুন', logout: 'সাইন আউট', question: 'প্রশ্ন', next: 'পরের প্রশ্ন', finish: 'মূল্যায়ন শেষ করুন', gapTitle: 'মূল্যায়ন ফলাফল ও দক্ষতার ঘাটতি', openDashboard: 'ড্যাশবোর্ড খুলুন', exitQuiz: 'ড্যাশবোর্ডে ফিরুন', roleLabel: 'লক্ষ্য ভূমিকা', experienceLabel: 'অভিজ্ঞতা', skillsLabel: 'সক্রিয় দক্ষতা', progress: 'সামগ্রিক প্রস্তুতি', skillsBreakdown: 'দক্ষতা বিশ্লেষণ', pendingAssessment: 'মূল্যায়ন বাকি', highProficiency: 'দক্ষতা অর্জিত', medProficiency: 'উন্নয়নশীল', lowProficiency: 'অগ্রাধিকার', weekendQuiz: 'সাপ্তাহিক চ্যালেঞ্জ', leaderboard: 'কোম্পানি লিডারবোর্ড', notesQuiz: 'নোট / PDF থেকে AI কুইজ' },
  mr: { language: 'भाषा निवडा', welcome: 'Skillstat AI मध्ये स्वागत', signIn: 'तुमच्या कौशल्य डॅशबोर्डमध्ये प्रवेश करा', email: 'कामाचा ईमेल', password: 'पासवर्ड', continue: 'पुढे जा', back: 'मागे', step1Title: 'तुमची नोकरीची भूमिका निवडा', step1Hint: 'तुमचा कौशल्य प्रवास तयार करण्यासाठी भूमिका निवडा.', step2Title: 'तुमची कौशल्ये निवडा', step2Hint: 'यासाठी संबंधित कौशल्ये', step3Title: 'अनुभवाची वर्षे', step3Hint: 'तुमच्या अनुभवाप्रमाणे प्रश्नांची पातळी ठरेल.', searchRole: 'भूमिका शोधा...', skillsSelected: 'कौशल्ये निवडली', dashboard: 'कौशल्य डॅशबोर्ड', profile: 'प्रोफाइल', myProfile: 'माझे प्रोफाइल', settings: 'सेटिंग्ज', lightMode: 'लाइट मोड', darkMode: 'डार्क मोड', takeQuiz: 'कौशल्य मूल्यांकन सुरू करा', retakeQuiz: 'मूल्यांकन पुन्हा करा', editProfile: 'प्रोफाइल संपादित करा', logout: 'साइन आउट', question: 'प्रश्न', next: 'पुढील प्रश्न', finish: 'मूल्यांकन पूर्ण करा', gapTitle: 'मूल्यांकन निकाल आणि कौशल्यातील अंतर', openDashboard: 'डॅशबोर्ड उघडा', exitQuiz: 'डॅशबोर्डवर परत जा', roleLabel: 'लक्ष्य भूमिका', experienceLabel: 'अनुभव', skillsLabel: 'सक्रिय कौशल्ये', progress: 'एकूण तयारी', skillsBreakdown: 'कौशल्य विश्लेषण', pendingAssessment: 'मूल्यांकन बाकी', highProficiency: 'उत्कृष्ट', medProficiency: 'विकसनशील', lowProficiency: 'प्राधान्य', weekendQuiz: 'वीकेंड चॅलेंज', leaderboard: 'कंपनी लीडरबोर्ड', notesQuiz: 'नोट्स / PDF AI क्विझ' },
  gu: { language: 'ભાષા પસંદ કરો', welcome: 'Skillstat AI માં આપનું સ્વાગત છે', signIn: 'તમારા કૌશલ્ય ડેશબોર્ડમાં પ્રવેશ કરો', email: 'કામનો ઈમેલ', password: 'પાસવર્ડ', continue: 'ચાલુ રાખો', back: 'પાછળ', step1Title: 'તમારી નોકરીની ભૂમિકા પસંદ કરો', step1Hint: 'તમારી કૌશલ્ય યાત્રા માટે ભૂમિકા પસંદ કરો.', step2Title: 'તમારી કૌશલ્યો પસંદ કરો', step2Hint: 'માટે સંબંધિત કૌશલ્યો', step3Title: 'અનુભવના વર્ષો', step3Hint: 'તમારા અનુભવ પ્રમાણે પ્રશ્નોની મુશ્કેલી નક્કી થશે.', searchRole: 'ભૂમિકા શોધો...', skillsSelected: 'કૌશલ્યો પસંદ', dashboard: 'કૌશલ્ય ડેશબોર્ડ', profile: 'પ્રોફાઇલ', myProfile: 'મારી પ્રોફાઇલ', settings: 'સેટિંગ્સ', lightMode: 'લાઇટ મોડ', darkMode: 'ડાર્ક મોડ', takeQuiz: 'કૌશલ્ય મૂલ્યાંકન શરૂ કરો', retakeQuiz: 'મૂલ્યાંકન ફરી લો', editProfile: 'પ્રોફાઇલ સંપાદિત કરો', logout: 'સાઇન આઉટ', question: 'પ્રશ્ન', next: 'આગળનો પ્રશ્ન', finish: 'મૂલ્યાંકન પૂર્ણ કરો', gapTitle: 'મૂલ્યાંકન પરિણામો અને કૌશલ્ય અંતર', openDashboard: 'ડેશબોર્ડ ખોલો', exitQuiz: 'ડેશબોર્ડ પર પાછા જાઓ', roleLabel: 'લક્ષ્ય ભૂમિકા', experienceLabel: 'અનુભવ', skillsLabel: 'સક્રિય કૌશલ્યો', progress: 'એકંદર તૈયારી', skillsBreakdown: 'કૌશલ્ય વિશ્લેષણ', pendingAssessment: 'મૂલ્યાંકન બાકી', highProficiency: 'મજબૂત', medProficiency: 'વિકાસશીલ', lowProficiency: 'પ્રાથમિકતા', weekendQuiz: 'વીકએન્ડ ચેલેન્જ', leaderboard: 'કંપની લીડરબોર્ડ', notesQuiz: 'નોંધ / PDF AI ક્વિઝ' },
  kn: { language: 'ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ', welcome: 'Skillstat AI ಗೆ ಸ್ವಾಗತ', signIn: 'ನಿಮ್ಮ ಕೌಶಲ್ಯ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಪ್ರವೇಶಿಸಿ', email: 'ಕೆಲಸದ ಇಮೇಲ್', password: 'ಪಾಸ್‌ವರ್ಡ್', continue: 'ಮುಂದುವರಿಸಿ', back: 'ಹಿಂದೆ', step1Title: 'ನಿಮ್ಮ ಉದ್ಯೋಗ ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ', step1Hint: 'ನಿಮ್ಮ ಕೌಶಲ್ಯ ಪ್ರಯಾಣಕ್ಕೆ ಪಾತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ.', step2Title: 'ನಿಮ್ಮ ಕೌಶಲ್ಯಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ', step2Hint: 'ಇದಕ್ಕೆ ಸಂಬಂಧಿಸಿದ ಕೌಶಲ್ಯಗಳು', step3Title: 'ಅನುಭವದ ವರ್ಷಗಳು', step3Hint: 'ನಿಮ್ಮ ಅನುಭವದ ಆಧಾರದ ಮೇಲೆ ಪ್ರಶ್ನೆಗಳ ಮಟ್ಟ ಇರುತ್ತದೆ.', searchRole: 'ಪಾತ್ರ ಹುಡುಕಿ...', skillsSelected: 'ಕೌಶಲ್ಯಗಳು ಆಯ್ಕೆ', dashboard: 'ಕೌಶಲ್ಯ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', profile: 'ಪ್ರೊಫೈಲ್', myProfile: 'ನನ್ನ ಪ್ರೊಫೈಲ್', settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು', lightMode: 'ಲೈಟ್ ಮೋಡ್', darkMode: 'ಡಾರ್ಕ್ ಮೋಡ್', takeQuiz: 'ಕೌಶಲ್ಯ ಮೌಲ್ಯಮಾಪನ ಪ್ರಾರಂಭಿಸಿ', retakeQuiz: 'ಮೌಲ್ಯಮಾಪನ ಮರುಪ್ರಾರಂಭಿಸಿ', editProfile: 'ಪ್ರೊಫೈಲ್ ಸಂಪಾದಿಸಿ', logout: 'ಸೈನ್ ಔಟ್', question: 'ಪ್ರಶ್ನೆ', next: 'ಮುಂದಿನ ಪ್ರಶ್ನೆ', finish: 'ಮೌಲ್ಯಮಾಪನ ಮುಗಿಸಿ', gapTitle: 'ಮೌಲ್ಯಮಾಪನ ಫಲಿತಾಂಶಗಳು ಮತ್ತು ಕೌಶಲ್ಯ ಅಂತರ', openDashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಿರಿ', exitQuiz: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಹಿಂತಿರುಗಿ', roleLabel: 'ಗುರಿ ಪಾತ್ರ', experienceLabel: 'ಅನುಭವ', skillsLabel: 'ಸಕ್ರಿಯ ಕೌಶಲ್ಯಗಳು', progress: 'ಒಟ್ಟು ಸಿದ್ಧತೆ', skillsBreakdown: 'ಕೌಶಲ್ಯ ವಿಶ್ಲೇಷಣೆ', pendingAssessment: 'ಮೌಲ್ಯಮಾಪನ ಬಾಕಿ', highProficiency: 'ಉತ್ತಮ', medProficiency: 'ಅಭಿವೃದ್ಧಿಯಲ್ಲಿದೆ', lowProficiency: 'ಆದ್ಯತೆ', weekendQuiz: 'ವಾರಾಂತ್ಯ ಸವಾಲು', leaderboard: 'ಕಂಪನಿ ಲೀಡರ್‌ಬೋರ್ಡ್', notesQuiz: 'ಟಿಪ್ಪಣಿ / PDF AI ಕ್ವಿಜ್' },
  ml: { language: 'ഭാഷ തിരഞ്ഞെടുക്കുക', welcome: 'Skillstat AI-ലേക്ക് സ്വാഗതം', signIn: 'നിങ്ങളുടെ കഴിവ് ഡാഷ്ബോർഡിലേക്ക് പ്രവേശിക്കുക', email: 'ജോലി ഇമെയിൽ', password: 'പാസ്‌വേഡ്', continue: 'തുടരുക', back: 'തിരികെ', step1Title: 'നിങ്ങളുടെ ജോലി പദവി തിരഞ്ഞെടുക്കുക', step1Hint: 'നിങ്ങളുടെ കഴിവ് യാത്രയ്ക്കായി പദവി തിരഞ്ഞെടുക്കുക.', step2Title: 'നിങ്ങളുടെ കഴിവുകൾ തിരഞ്ഞെടുക്കുക', step2Hint: 'ഇതിനുള്ള ബന്ധപ്പെട്ട കഴിവുകൾ', step3Title: 'പരിചയ വർഷങ്ങൾ', step3Hint: 'നിങ്ങളുടെ പരിചയം അനുസരിച്ച് ചോദ്യങ്ങളുടെ നില മാറും.', searchRole: 'പദവി തിരയുക...', skillsSelected: 'കഴിവുകൾ തിരഞ്ഞെടുത്തു', dashboard: 'കഴിവ് ഡാഷ്ബോർഡ്', profile: 'പ്രൊഫൈൽ', myProfile: 'എന്റെ പ്രൊഫൈൽ', settings: 'ക്രമീകരണങ്ങൾ', lightMode: 'ലൈറ്റ് മോഡ്', darkMode: 'ഡാർക്ക് മോഡ്', takeQuiz: 'കഴിവ് വിലയിരുത്തൽ ആരംഭിക്കുക', retakeQuiz: 'വിലയിരുത്തൽ വീണ്ടും എടുക്കുക', editProfile: 'പ്രൊഫൈൽ തിരുത്തുക', logout: 'സൈൻ ഔട്ട്', question: 'ചോദ്യം', next: 'അടുത്ത ചോദ്യം', finish: 'വിലയിരുത്തൽ പൂർത്തിയാക്കുക', gapTitle: 'വിലയിരുത്തൽ ഫലങ്ങളും കഴിവ് വിടവും', openDashboard: 'ഡാഷ്ബോർഡ് തുറക്കുക', exitQuiz: 'ഡാഷ്ബോർഡിലേക്ക് മടങ്ങുക', roleLabel: 'ലക്ഷ്യ പദവി', experienceLabel: 'പരിചയം', skillsLabel: 'സജീവ കഴിവുകൾ', progress: 'മൊത്തം തയ്യാറെടുപ്പ്', skillsBreakdown: 'കഴിവ് വിശകലനം', pendingAssessment: 'വിലയിരുത്തൽ ബാക്കി', highProficiency: 'മികവ്', medProficiency: 'വികസിക്കുന്നു', lowProficiency: 'മുൻഗണന', weekendQuiz: 'വാരാന്ത്യ ചലഞ്ച്', leaderboard: 'കമ്പനി ലീഡർബോർഡ്', notesQuiz: 'കുറിപ്പുകൾ / PDF AI ക്വിസ്' },
}

const uiText = {
  en: {
    initializing: 'Initializing Skillstat AI Experience...', intelligentEvaluation: 'INTELLIGENT SKILL EVALUATION',
    securePlatform: 'Secure Official Statistics Platform', privacy: 'Your profile data is securely stored for your Skillstat account. Privacy notice',
    connectingSso: 'Connecting to Government SSO...', continueSso: 'Continue with Government SSO', remember: 'Remember me', forgot: 'Forgot password?',
    setupProfile: 'Set up your professional profile', profileHint: 'Use your official work details to personalize competency benchmarks and learning recommendations.',
    officialProfile: 'OFFICIAL PROFILE', fullName: 'Full Name', employeeId: 'Employee ID', department: 'Department', organization: 'Organization', designation: 'Designation', currentAssignment: 'Current Assignment', location: 'Location',
    officialStatistics: 'OFFICIAL STATISTICS', skillIntelligence: 'Skill Intelligence', secure: 'Secure platform', primaryNavigation: 'Primary navigation',
    takeAssessment: 'Take assessment', editProfile: 'Edit profile', dashboardGreeting: 'Good morning', skillDashboard: 'SKILL INTELLIGENCE DASHBOARD',
    workforceReadiness: 'Workforce Readiness', overallCompetency: 'Overall Competency', skillGaps: 'Skill Gaps', learningHours: 'Learning Hours', assessments: 'Assessments', averageScore: 'Average Assessment Score', priorityAreas: 'Priority areas', updatedProfile: 'Updated from profile',
    competencyOverview: 'COMPETENCY OVERVIEW', roleReadiness: 'Role readiness by domain', liveProfile: 'Live profile', topSkills: 'TOP SKILLS', currentStrengths: 'Current strengths', prioritySkillGaps: 'PRIORITY SKILL GAPS', developmentFocus: 'Development focus', viewAll: 'View all →', aiInsight: 'AI INSIGHT', targetedPath: 'Targeted development path', exploreRecommendations: 'Explore recommendations →', recentAssessments: 'RECENT ASSESSMENTS', assessmentActivity: 'Assessment activity', openAssessments: 'Open assessments',
    aiAnalysis: 'AI-POWERED ANALYSIS', aiGap: 'AI Skill Gap Analysis', compareCompetency: 'Compare current competency with the requirements for', current: 'Current', required: 'Required', viewRecommendation: 'View recommendation', personalized: 'PERSONALIZED FOR YOUR ROLE', aiRecommendations: 'AI Learning Recommendations', viewDetails: 'View Details', startLearning: 'Start Learning',
  },
  hi: {
    initializing: 'Skillstat AI अनुभव शुरू हो रहा है...', intelligentEvaluation: 'बुद्धिमान कौशल मूल्यांकन', securePlatform: 'सुरक्षित सरकारी प्लेटफ़ॉर्म', privacy: 'आपकी प्रोफ़ाइल जानकारी इस डेमो के लिए स्थानीय रूप से संग्रहीत है। गोपनीयता सूचना', connectingSso: 'सरकारी SSO से कनेक्ट हो रहा है...', continueSso: 'सरकारी SSO के साथ जारी रखें', remember: 'मुझे याद रखें', forgot: 'पासवर्ड भूल गए?', setupProfile: 'अपनी पेशेवर प्रोफ़ाइल बनाएं', profileHint: 'कौशल मानकों और सीखने की सिफारिशों को व्यक्तिगत बनाने के लिए अपने आधिकारिक कार्य विवरण का उपयोग करें।', officialProfile: 'आधिकारिक प्रोफ़ाइल', fullName: 'पूरा नाम', employeeId: 'कर्मचारी आईडी', department: 'विभाग', organization: 'संगठन', designation: 'पदनाम', currentAssignment: 'वर्तमान कार्य', location: 'स्थान', officialStatistics: 'आधिकारिक सांख्यिकी', skillIntelligence: 'कौशल इंटेलिजेंस', secure: 'सुरक्षित प्लेटफ़ॉर्म', primaryNavigation: 'मुख्य नेविगेशन', takeAssessment: 'मूल्यांकन लें', editProfile: 'प्रोफ़ाइल संपादित करें', dashboardGreeting: 'सुप्रभात', skillDashboard: 'कौशल इंटेलिजेंस डैशबोर्ड', workforceReadiness: 'कार्यबल तैयारी', overallCompetency: 'समग्र दक्षता', skillGaps: 'कौशल अंतर', learningHours: 'सीखने के घंटे', assessments: 'मूल्यांकन', averageScore: 'औसत मूल्यांकन स्कोर', priorityAreas: 'प्राथमिकता क्षेत्र', updatedProfile: 'प्रोफ़ाइल से अपडेट', competencyOverview: 'दक्षता अवलोकन', roleReadiness: 'डोमेन के अनुसार भूमिका तैयारी', liveProfile: 'लाइव प्रोफ़ाइल', topSkills: 'शीर्ष कौशल', currentStrengths: 'वर्तमान क्षमताएं', prioritySkillGaps: 'प्राथमिक कौशल अंतर', developmentFocus: 'विकास पर ध्यान', viewAll: 'सभी देखें →', aiInsight: 'AI अंतर्दृष्टि', targetedPath: 'लक्षित विकास पथ', exploreRecommendations: 'सिफारिशें देखें →', recentAssessments: 'हाल के मूल्यांकन', assessmentActivity: 'मूल्यांकन गतिविधि', openAssessments: 'मूल्यांकन खोलें', aiAnalysis: 'AI-संचालित विश्लेषण', aiGap: 'AI कौशल अंतर विश्लेषण', compareCompetency: 'वर्तमान दक्षता की तुलना आवश्यकताओं से करें', current: 'वर्तमान', required: 'आवश्यक', viewRecommendation: 'सिफारिश देखें', personalized: 'आपकी भूमिका के लिए व्यक्तिगत', aiRecommendations: 'AI सीखने की सिफारिशें', viewDetails: 'विवरण देखें', startLearning: 'सीखना शुरू करें',
  },
  ta: {
    initializing: 'Skillstat AI அனுபவம் தொடங்குகிறது...', intelligentEvaluation: 'புத்திசாலித்தனமான திறன் மதிப்பீடு', securePlatform: 'பாதுகாப்பான அரசு தளம்', privacy: 'உங்கள் சுயவிவரத் தரவு இந்த விளக்கத்திற்காக உள்ளூரில் சேமிக்கப்படுகிறது. தனியுரிமை அறிவிப்பு', connectingSso: 'அரசு SSO-வுடன் இணைக்கிறது...', continueSso: 'அரசு SSO மூலம் தொடரவும்', remember: 'என்னை நினைவில் வைத்துக்கொள்', forgot: 'கடவுச்சொல் மறந்துவிட்டதா?', setupProfile: 'உங்கள் தொழில்முறை சுயவிவரத்தை அமைக்கவும்', profileHint: 'திறன் அளவுகோல்கள் மற்றும் கற்றல் பரிந்துரைகளை தனிப்பயனாக்க உங்கள் அதிகாரப்பூர்வ பணித் தகவலைப் பயன்படுத்தவும்.', officialProfile: 'அதிகாரப்பூர்வ சுயவிவரம்', fullName: 'முழுப் பெயர்', employeeId: 'பணியாளர் ID', department: 'துறை', organization: 'நிறுவனம்', designation: 'பதவி', currentAssignment: 'தற்போதைய பணி', location: 'இடம்', officialStatistics: 'அதிகாரப்பூர்வ புள்ளிவிவரங்கள்', skillIntelligence: 'திறன் நுண்ணறிவு', secure: 'பாதுகாப்பான தளம்', primaryNavigation: 'முதன்மை வழிசெலுத்தல்', takeAssessment: 'மதிப்பீட்டைத் தொடங்கு', editProfile: 'சுயவிவரத்தைத் திருத்து', dashboardGreeting: 'காலை வணக்கம்', skillDashboard: 'திறன் நுண்ணறிவு டாஷ்போர்டு', workforceReadiness: 'பணியாளர் தயார்நிலை', overallCompetency: 'ஒட்டுமொத்த திறன்', skillGaps: 'திறன் இடைவெளிகள்', learningHours: 'கற்றல் நேரம்', assessments: 'மதிப்பீடுகள்', averageScore: 'சராசரி மதிப்பீட்டு மதிப்பெண்', priorityAreas: 'முன்னுரிமைப் பகுதிகள்', updatedProfile: 'சுயவிவரத்திலிருந்து புதுப்பிக்கப்பட்டது', competencyOverview: 'திறன் மேலோட்டம்', roleReadiness: 'துறையின் அடிப்படையில் பங்கு தயார்நிலை', liveProfile: 'நேரடி சுயவிவரம்', topSkills: 'முக்கிய திறன்கள்', currentStrengths: 'தற்போதைய வலிமைகள்', prioritySkillGaps: 'முன்னுரிமை திறன் இடைவெளிகள்', developmentFocus: 'வளர்ச்சி கவனம்', viewAll: 'அனைத்தையும் காண்க →', aiInsight: 'AI நுண்ணறிவு', targetedPath: 'இலக்கு வளர்ச்சிப் பாதை', exploreRecommendations: 'பரிந்துரைகளை ஆராய்க →', recentAssessments: 'சமீபத்திய மதிப்பீடுகள்', assessmentActivity: 'மதிப்பீட்டு செயல்பாடு', openAssessments: 'மதிப்பீடுகளைத் திறக்கவும்', aiAnalysis: 'AI-ஆல் இயக்கப்படும் பகுப்பாய்வு', aiGap: 'AI திறன் இடைவெளி பகுப்பாய்வு', compareCompetency: 'தற்போதைய திறனை தேவைகளுடன் ஒப்பிடுக', current: 'தற்போதைய', required: 'தேவை', viewRecommendation: 'பரிந்துரையைக் காண்க', personalized: 'உங்கள் பணிக்காக தனிப்பயனாக்கப்பட்டது', aiRecommendations: 'AI கற்றல் பரிந்துரைகள்', viewDetails: 'விவரங்களைக் காண்க', startLearning: 'கற்றலைத் தொடங்கு',
  },
  te: {
    initializing: 'Skillstat AI అనుభవం ప్రారంభమవుతోంది...', intelligentEvaluation: 'తెలివైన నైపుణ్య మూల్యాంకనం', securePlatform: 'సురక్షిత ప్రభుత్వ వేదిక', privacy: 'ఈ డెమో కోసం మీ ప్రొఫైల్ డేటా స్థానికంగా నిల్వ చేయబడుతుంది. గోప్యతా నోటీసు', connectingSso: 'ప్రభుత్వ SSOకి కనెక్ట్ అవుతోంది...', continueSso: 'ప్రభుత్వ SSOతో కొనసాగించండి', remember: 'నన్ను గుర్తుంచుకోండి', forgot: 'పాస్‌వర్డ్ మర్చిపోయారా?', setupProfile: 'మీ వృత్తిపరమైన ప్రొఫైల్‌ను ఏర్పాటు చేయండి', profileHint: 'నైపుణ్య ప్రమాణాలు మరియు అభ్యాస సిఫార్సులను వ్యక్తిగతీకరించడానికి మీ అధికారిక పని వివరాలను ఉపయోగించండి.', officialProfile: 'అధికారిక ప్రొఫైల్', fullName: 'పూర్తి పేరు', employeeId: 'ఉద్యోగి ID', department: 'విభాగం', organization: 'సంస్థ', designation: 'హోదా', currentAssignment: 'ప్రస్తుత పని', location: 'స్థానం', officialStatistics: 'అధికారిక గణాంకాలు', skillIntelligence: 'నైపుణ్య మేధస్సు', secure: 'సురక్షిత వేదిక', primaryNavigation: 'ప్రధాన నావిగేషన్', takeAssessment: 'మూల్యాంకనం ప్రారంభించండి', editProfile: 'ప్రొఫైల్‌ను సవరించండి', dashboardGreeting: 'శుభోదయం', skillDashboard: 'నైపుణ్య మేధస్సు డాష్‌బోర్డ్', workforceReadiness: 'కార్యబలం సిద్ధత', overallCompetency: 'మొత్తం సామర్థ్యం', skillGaps: 'నైపుణ్య అంతరాలు', learningHours: 'అభ్యాస గంటలు', assessments: 'మూల్యాంకనాలు', averageScore: 'సగటు మూల్యాంకన స్కోర్', priorityAreas: 'ప్రాధాన్యత ప్రాంతాలు', updatedProfile: 'ప్రొఫైల్ నుండి నవీకరించబడింది', competencyOverview: 'సామర్థ్య అవలోకనం', roleReadiness: 'డొమైన్ వారీగా పాత్ర సిద్ధత', liveProfile: 'లైవ్ ప్రొఫైల్', topSkills: 'ప్రధాన నైపుణ్యాలు', currentStrengths: 'ప్రస్తుత బలాలు', prioritySkillGaps: 'ప్రాధాన్యత నైపుణ్య అంతరాలు', developmentFocus: 'అభివృద్ధి దృష్టి', viewAll: 'అన్నీ చూడండి →', aiInsight: 'AI అంతర్దృష్టి', targetedPath: 'లక్ష్య అభివృద్ధి మార్గం', exploreRecommendations: 'సిఫార్సులను చూడండి →', recentAssessments: 'ఇటీవలి మూల్యాంకనాలు', assessmentActivity: 'మూల్యాంకన కార్యకలాపం', openAssessments: 'మూల్యాంకనాలను తెరవండి', aiAnalysis: 'AI ఆధారిత విశ్లేషణ', aiGap: 'AI నైపుణ్య అంతర విశ్లేషణ', compareCompetency: 'ప్రస్తుత సామర్థ్యాన్ని అవసరాలతో పోల్చండి', current: 'ప్రస్తుత', required: 'అవసరం', viewRecommendation: 'సిఫార్సును చూడండి', personalized: 'మీ పాత్రకు వ్యక్తిగతీకరించబడింది', aiRecommendations: 'AI అభ్యాస సిఫార్సులు', viewDetails: 'వివరాలు చూడండి', startLearning: 'అభ్యాసం ప్రారంభించండి',
  },
}

const navText = {
  en: ['Dashboard', 'Recommendations', 'Weekend Challenge', 'AI Quiz', 'Upload Documents', 'Career & Promotions'],
  hi: ['डैशबोर्ड', 'सिफारिशें', 'वीकेंड चैलेंज', 'AI क्विज़', 'प्रोफाइल विवरण', 'कैरियर और पदोन्नति'],
  ta: ['டாஷ்போர்டு', 'பரிந்துரைகள்', 'வார இறுதி சவால்', 'AI வினாடி வினா', 'சுயவிவர மேலோட்டம்', 'பணி & பதவி உயர்வு'],
  te: ['డాష్‌బోర్డ్', 'సిఫార్సులు', 'వీకెండ్ ఛాలెంజ్', 'AI క్విజ్', 'ప్రొఫైల్ అవలోకనం', 'కెరీర్ & ప్రమోషన్లు'],
  bn: ['ড্যাশবোর্ড', 'সুপারিশ', 'সাপ্তাহিক চ্যালেঞ্জ', 'AI কুইজ', 'প্রোফাইল', 'ক্যারিয়ার ও পদোন্নতি'],
  mr: ['डॅशबोर्ड', 'शिफारसी', 'वीकेंड चॅलेंज', 'AI क्विझ', 'प्रोफाइल', 'कारकीर्द आणि पदोन्नती'],
  gu: ['ડેશબોર્ડ', 'ભલામણો', 'વીકએન્ડ ચેલેન્જ', 'AI ક્વિઝ', 'પ્રોફાઇલ', 'કારકિર્દી અને પ્રમોશન'],
  kn: ['ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', 'ಶಿಫಾರಸುಗಳು', 'ವಾರಾಂತ್ಯ ಸವಾಲು', 'AI ಕ್ವಿಜ್', 'ಪ್ರೊಫೈಲ್', 'ವೃತ್ತಿಜೀವನ ಮತ್ತು ಬಡ್ತಿ'],
  ml: ['ഡാഷ്ബോർഡ്', 'ശുപാർശകൾ', 'വാരാന്ത്യ ചലഞ്ച്', 'AI ക്വിസ്', 'പ്രൊഫൈൽ', 'കരിയറും പ്രമോഷനും'],
}

function Brand() {
  return (
    <div className="brand">
      <img src="/logo.png" alt="Skillstat AI Official Logo" className="brand-logo-img" />
      <strong>Skillstat AI</strong>
    </div>
  )
}

function RotatingCoil({ logoSrc = '/logo.png' }) {
  return (
    <div className="coil-container">
      <div className="coil-ripple coil-ripple-1" />
      <div className="coil-ripple coil-ripple-2" />

      <svg className="coil-svg" viewBox="0 0 500 500">
        <defs>
          <path
            id="textPathCoil"
            d="M 250, 250 m -190, 0 a 190,190 0 1,1 380,0 a 190,190 0 1,1 -380,0"
          />
        </defs>

        {/* Orbit track ring */}
        <circle cx="250" cy="250" r="190" className="coil-track-line" />

        {/* Outer decorative ring with accent dots separated from text path */}
        <circle cx="250" cy="250" r="218" className="coil-outer-track" />
        <circle cx="250" cy="32" r="3" className="coil-dot" />
        <circle cx="250" cy="468" r="3" className="coil-dot" />
        <circle cx="32" cy="250" r="3" className="coil-dot" />
        <circle cx="468" cy="250" r="3" className="coil-dot" />

        {/* Rotating Circular Text: EMPLOYEE TRAINING MARKETPLACE (Guaranteed Zero Overlap) */}
        <g className="coil-text-group">
          <text className="coil-text" textLength="1175" lengthAdjust="spacing">
            <textPath href="#textPathCoil" startOffset="0%">
              • EMPLOYEE TRAINING MARKETPLACE • EMPLOYEE TRAINING MARKETPLACE&#160;
            </textPath>
          </text>
        </g>
      </svg>

      <div className="coil-center-content">
        <div className="coil-logo-box">
          <img src={logoSrc} alt="Skillstat AI Official Logo" className="coil-center-logo" />
        </div>
        <h1 className="coil-brand-title">Skillstat AI</h1>
        <p className="coil-brand-sub">INDIA'S OFFICIAL SKILL MARKETPLACE</p>
      </div>
    </div>
  )
}

function InteractiveBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animationFrameId
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    const particleCount = Math.min(50, Math.floor((width * height) / 22000))
    const particles = []
    const mouse = { x: null, y: null, radius: 140 }

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        radius: Math.random() * 2 + 1.5,
        color: i % 3 === 0 ? 'rgba(77, 141, 98, 0.7)' : i % 3 === 1 ? 'rgba(66, 99, 217, 0.6)' : 'rgba(56, 189, 138, 0.5)',
      })
    }

    const handleMouseMove = (e) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }

    const handleMouseLeave = () => {
      mouse.x = null
      mouse.y = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // Gradient backdrop
      const bgGrad = ctx.createLinearGradient(0, 0, width, height)
      bgGrad.addColorStop(0, '#f2f7f3')
      bgGrad.addColorStop(0.5, '#eaf1ec')
      bgGrad.addColorStop(1, '#dfebe2')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // Connect particles
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i]
        p1.x += p1.vx
        p1.y += p1.vy

        if (p1.x < 0 || p1.x > width) p1.vx *= -1
        if (p1.y < 0 || p1.y > height) p1.vy *= -1

        // Mouse interaction
        if (mouse.x !== null && mouse.y !== null) {
          const dxMouse = mouse.x - p1.x
          const dyMouse = mouse.y - p1.y
          const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse)
          if (distMouse < mouse.radius) {
            const force = (mouse.radius - distMouse) / mouse.radius
            p1.x -= (dxMouse / distMouse) * force * 1.5
            p1.y -= (dyMouse / distMouse) * force * 1.5

            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(mouse.x, mouse.y)
            ctx.strokeStyle = `rgba(77, 141, 98, ${0.4 * force})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }

        // Draw particle
        ctx.beginPath()
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2)
        ctx.fillStyle = p1.color
        ctx.fill()

        // Connect near particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 110) {
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(140, 185, 154, ${0.35 * (1 - dist / 110)})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className="login-canvas-bg" />
}

function validateCode(code, challenge) {
  if (!code.trim()) return { state: 'empty', message: 'Start typing your solution.' }
  const checks = challenge.checks || []
  if (!checks.length) return { state: 'valid', message: 'Code submitted for evaluation.' }
  const passed = checks.filter((check) => check.test(code)).length
  if (passed >= 2) return { state: 'valid', message: `${passed} of ${checks.length} implementation checks passed. Solution acceptable.` }
  return { state: 'working', message: `${passed} of ${checks.length} implementation checks passed. Pass at least 2 checks to continue.` }
}

function ensureCodeChecks(checks = []) {
  const normalized = [...checks]
  const implementationCheck = /\b(return|throw|=>|if|for|while|const|let|var|def|SELECT|class|<form)\b/i
  const structureCheck = /[{}()[\];]/
  if (!normalized.some((check) => String(check) === String(implementationCheck))) normalized.push(implementationCheck)
  if (!normalized.some((check) => String(check) === String(structureCheck))) normalized.push(structureCheck)
  return normalized.slice(0, 4)
}

const codingCodeChallenges = {
  JavaScript: [
    {
      prompt: 'Implement a function `firstUniqueChar(str)` that returns the first non-repeating character in a string, or null if none exists.',
      language: 'JavaScript',
      starter: 'function firstUniqueChar(str) {\n  // Your solution\n}',
      checks: [/function\s+firstUniqueChar/, /return\s+/, /\[|for|indexOf|Map|filter/],
    },
    {
      prompt: 'Implement `mergeIntervals(intervals)` that merges all overlapping range pairs (e.g., [[1,3],[2,6],[8,10]] -> [[1,6],[8,10]]).',
      language: 'JavaScript',
      starter: 'function mergeIntervals(intervals) {\n  // Your solution\n}',
      checks: [/function\s+mergeIntervals/, /sort\s*\(/, /push\s*\(/, /return\s+/],
    },
    {
      prompt: 'Write a `debounce(fn, delay)` utility function in JavaScript that prevents multiple rapid calls.',
      language: 'JavaScript',
      starter: 'function debounce(fn, delay) {\n  // Your solution\n}',
      checks: [/function\s+debounce/, /setTimeout/, /clearTimeout/, /return\s+function/],
    },
  ],
  Python: [
    {
      prompt: 'Implement `first_unique_char(s)` in Python that returns the first unique character or None.',
      language: 'Python',
      starter: 'def first_unique_char(s: str):\n    # Your solution\n    pass',
      checks: [/def\s+first_unique_char/, /return\s+/, /None|dict|Counter|for/],
    },
    {
      prompt: 'Implement `merge_intervals(intervals)` in Python to merge overlapping ranges.',
      language: 'Python',
      starter: 'def merge_intervals(intervals):\n    # Your solution\n    pass',
      checks: [/def\s+merge_intervals/, /sort|sorted/, /append\s*\(/, /return\s+/],
    },
    {
      prompt: 'Write a `memoize(func)` decorator in Python caching function outputs based on input arguments.',
      language: 'Python',
      starter: 'def memoize(func):\n    # Your solution\n    pass',
      checks: [/def\s+memoize/, /cache|dict/, /def\s+wrapper/, /return\s+/],
    },
  ],
  'C++': [
    {
      prompt: 'Implement `firstUniqueChar` in C++ returning the first non-repeating character in a string or null character.',
      language: 'C++',
      starter: '#include <string>\nchar firstUniqueChar(const std::string& s) {\n  // Your solution\n}',
      checks: [/firstUniqueChar/, /std::string/, /return\s+/],
    },
    {
      prompt: 'Implement `mergeIntervals` in C++ for `std::vector<std::vector<int>>`.',
      language: 'C++',
      starter: '#include <vector>\nstd::vector<std::vector<int>> mergeIntervals(std::vector<std::vector<int>> intervals) {\n  // Your solution\n}',
      checks: [/mergeIntervals/, /std::vector/, /sort\s*\(/, /return\s+/],
    },
  ],
}

const additionalCodingChallenges = {
  C: { prompt: 'Implement `first_unique_char` in C and return the first non-repeating character, or `\\0` when none exists.', starter: '#include <stddef.h>\nchar first_unique_char(const char *text) {\n  /* Your solution */\n}', checks: [/first_unique_char/, /return/] },
  'C#': { prompt: 'Implement `FirstUniqueChar` in C# and return the first non-repeating character, or null when none exists.', starter: 'public static char? FirstUniqueChar(string text)\n{\n    // Your solution\n}', checks: [/FirstUniqueChar/, /return/] },
  Java: { prompt: 'Implement `firstUniqueChar` in Java and return the first non-repeating character, or null when none exists.', starter: 'static Character firstUniqueChar(String text) {\n    // Your solution\n}', checks: [/firstUniqueChar/, /return/] },
  TypeScript: { prompt: 'Implement `firstUniqueChar` in TypeScript and return the first non-repeating character, or null when none exists.', starter: 'function firstUniqueChar(text: string): string | null {\n  // Your solution\n}', checks: [/firstUniqueChar/, /return/, /string/] },
  Ruby: { prompt: 'Implement `first_unique_char` in Ruby and return the first non-repeating character, or nil when none exists.', starter: 'def first_unique_char(text)\n  # Your solution\nend', checks: [/first_unique_char/, /end/] },
  Kotlin: { prompt: 'Implement `firstUniqueChar` in Kotlin and return the first non-repeating character, or null when none exists.', starter: 'fun firstUniqueChar(text: String): Char? {\n    // Your solution\n}', checks: [/firstUniqueChar/, /return/] },
  SQL: { prompt: 'Write a SQL query that returns the first value appearing exactly once in an ordered `events` table.', starter: 'SELECT value\nFROM events\nGROUP BY value\nHAVING COUNT(*) = 1\nORDER BY MIN(id)\nLIMIT 1;', checks: [/SELECT/i, /GROUP BY/i, /HAVING/i] },
  HTML: { prompt: 'Create accessible HTML for a labelled employee search field and submit button.', starter: '<form>\n  <!-- Your solution -->\n</form>', checks: [/<form/i, /label/i, /button/i] },
  CSS: { prompt: 'Write CSS that makes a card responsive, readable, and stack its content below 640px.', starter: '.card {\n  /* Your solution */\n}', checks: [/\.card/, /@media|display|flex|grid/] },
  'Node.js': { prompt: 'Write a Node.js function that reads JSON input safely and returns a clear error for invalid JSON.', starter: 'function parseInput(input) {\n  // Your solution\n}', checks: [/parseInput/, /JSON\.parse/, /return/] },
  React: { prompt: 'Create a React component that renders a labelled list of skills from a `skills` prop.', starter: 'function SkillsList({ skills }) {\n  // Your solution\n}', checks: [/SkillsList/, /skills/, /return/] },
  Coding: { prompt: 'Describe and implement a language-agnostic function that returns the first non-repeating character.', starter: '// State the language and implement the function here', checks: [/function|def|class|return/i, /algorithm|loop|map|count|frequency/i] },
  'C programming': { prompt: 'Implement a C function that returns the first non-repeating character in a string.', starter: 'char first_unique_char(const char *text) {\n  /* Your solution */\n}', checks: [/first_unique_char/, /return/] },
}

function getQuestionDifficulty(index, total = 10) {
  const ratio = (index + 1) / Math.max(1, total)
  if (ratio <= 0.3) {
    return { level: 1, name: 'Foundational', label: 'Level 1: Foundational', badgeClass: 'diff-foundational', icon: '🟢' }
  }
  if (ratio <= 0.6) {
    return { level: 2, name: 'Intermediate', label: 'Level 2: Intermediate', badgeClass: 'diff-intermediate', icon: '🟡' }
  }
  if (ratio <= 0.85) {
    return { level: 3, name: 'Advanced', label: 'Level 3: Advanced', badgeClass: 'diff-advanced', icon: '🟠' }
  }
  return { level: 4, name: 'Expert', label: 'Level 4: Expert Challenge', badgeClass: 'diff-expert', icon: '🔴' }
}

function buildScenarioQuestions(profile, t, userSkills, quizMode = 'standard', notesContent = '', targetSkill = '') {
  const profileSkills = profile?.skills
    ? (Array.isArray(profile.skills) ? profile.skills : String(profile.skills).split(',')).map((s) => String(s).trim()).filter(Boolean)
    : []
  const defaultSkills = profileSkills.length > 0
    ? profileSkills
    : ['Official Statistics & Survey Methodology', 'Public Sector Data Governance']
  const skills = targetSkill ? [targetSkill] : (userSkills && userSkills.length ? userSkills : defaultSkills)
  const exp = profile.experience || '1–2 years'
  const _targetRole = profile.role || profile.designation || 'the selected target role'

  // If quiz from notes / uploaded document
  if (quizMode === 'notes' && notesContent.trim()) {
    const cleanNotes = cleanExtractedText(notesContent)
    const val = validateDocumentText(cleanNotes)
    if (!val.isValid) {
      return []
    }
    const rawItems = extractDocumentQuizItems(cleanNotes, 10)
    if (rawItems && rawItems.length > 0) {
      const validated = validateAndCleanQuiz(rawItems, 'Document Concept')
      if (validated && validated.length >= 4) {
        return validated.map((q, idx) => shuffleQuestionOptions(q, idx))
      }
    }

    // Fallback for short notes text: extract concepts and build contextual comprehension questions
    const concepts = extractConceptsFromText(cleanNotes, 5)
    const questions = []
    const count = 10

    for (let i = 0; i < count; i++) {
      const diff = getQuestionDifficulty(i, count)
      const concept = concepts[i % concepts.length]
      const conceptTitle = concept?.title || `Concept ${i + 1}`
      const contextSnippet = concept?.context ? ` (Context: "${concept.context.slice(0, 140)}...")` : ''

      const promptTypes = [
        `According to the uploaded material, what is the primary operational guideline governing "${conceptTitle}"?`,
        `Based on the provided documentation, which statement accurately reflects the required procedure for "${conceptTitle}"?`,
        `In the context of the uploaded notes, what standard or directive is mandated regarding "${conceptTitle}"?`,
        `Which quality verification or governance requirement is outlined in the text for "${conceptTitle}"?`,
      ]

      const prompt = `${promptTypes[i % promptTypes.length]}${contextSnippet}`
      const correctText = concept?.context
        ? `Adhere strictly to the documented findings: ${concept.context.slice(0, 120)}.`
        : `Enforce established operational standards, verify audit evidence, and follow statutory protocols for ${conceptTitle}.`

      const rawOptions = [
        correctText,
        `Bypass ${conceptTitle} protocols to expedite reporting schedules without supervisory clearance.`,
        `Disregard documented exceptions in ${conceptTitle} and rely on unverified verbal estimates.`,
        `Defer quality verification of ${conceptTitle} indefinitely until external audits mandate corrections.`,
      ]

      questions.push(shuffleQuestionOptions({
        type: 'choice',
        skill: conceptTitle,
        label: `Notes Question ${i + 1}`,
        sourceBadge: `Notes • ${conceptTitle}`,
        difficulty: diff.name,
        difficultyLevel: diff.level,
        difficultyLabel: diff.label,
        difficultyBadgeClass: diff.badgeClass,
        prompt: `Question ${i + 1}: ${prompt}`,
        options: rawOptions,
        correctIndex: 0,
      }, i))
    }
    return validateAndCleanQuiz(questions, 'Notes Concept')
  }

  // Weekend company-wide challenge questions
  if (quizMode === 'weekend') {
    const weekendTieredScenarios = {
      1: [ // Foundational Sprint (Q1 - Q3)
        {
          prompt: `When establishing baseline operational standards in ${skills[0] || 'your role'}, which practice ensures sustainable delivery and verifiable quality?`,
          options: [
            'Maintain documented standard operating procedures (SOPs), enforce peer review checkpoints, and log execution metrics',
            'Rely exclusively on informal tribal knowledge without documenting baseline workflows',
            'Bypass compliance audits to artificially maximize immediate task output',
            'Eliminate error-tracking logs to reduce operational reporting overhead',
          ],
        },
        {
          prompt: `When collaborating across cross-functional teams with product and engineering leads, what is the best protocol for SLA alignment?`,
          options: [
            'Establish shared transparent milestones, mutual dependency tracking, and proactive status cadence',
            'Commit to conflicting timelines without validating team capacity or resource dependencies',
            'Withhold delivery roadmaps until final deliverables are completed',
            'Delegate cross-team communication entirely to junior coordinators without guidance',
          ],
        },
        {
          prompt: `When onboarding a new data asset or analytical model in ${skills[1] || 'your domain'}, which validation step is mandatory?`,
          options: [
            'Verify data provenance, run schema integrity assertions, and document source constraints',
            'Ingest raw unstructured data directly into production systems without validation',
            'Assume legacy schema compatibility without inspecting field mapping distributions',
            'Disable input sanitization to accelerate pipeline processing throughput',
          ],
        },
      ],
      2: [ // Intermediate Triage (Q4 - Q6)
        {
          prompt: `In a critical initiative between ${profile.role || 'your department'} and key stakeholders, a dependency delay creates a 48-hour delivery blocker. What is the optimal executive action?`,
          options: [
            'Run critical-path root cause triage, align stakeholders on trade-off priorities, and communicate revised SLAs proactively',
            'Conceal the delay and attempt unvetted shortcuts without testing',
            'Reassign entire department responsibilities without notice or transition plan',
            'Halt all communications and wait until the next weekly review meeting',
          ],
        },
        {
          prompt: `When measuring operational efficiency in ${skills[0] || 'your role'}, which leading metric demonstrates sustainable improvement?`,
          options: [
            'High throughput accuracy with reduced rework cycles, documented compliance, and defect containment',
            'Maximum raw activity volume regardless of error and defect rates',
            'Eliminating all peer reviews and compliance checkpoints to shorten cycle time',
            'Lowering test coverage criteria to accelerate deployment releases',
          ],
        },
      ],
      3: [ // Advanced Optimization (Q7 - Q8)
        {
          prompt: `Under sudden resource constraints or system degradation, how should a senior team lead in ${skills[0] || 'your role'} prioritize competing deliverables?`,
          options: [
            'Apply risk-weighted value triage, protect core compliance and security baselines, and renegotiate secondary milestones',
            'Cancel ongoing quality audits to free up developer bandwidth',
            'Deploy untested emergency hotfixes directly to production environments',
            'Cease all logging and diagnostic telemetry to save server CPU cycles',
          ],
        },
      ],
      4: [ // Expert Crisis Leadership (Q9 - Q10)
        {
          prompt: `When presenting an architectural modernization roadmap to senior executive leadership for ${skills[0] || 'your department'}, which strategy secures governance approval?`,
          options: [
            'Quantify risk-adjusted ROI, model phased zero-downtime migration milestones, and establish clear rollback gates',
            'Demand immediate complete system rewrite without transitional coexistence or legacy backward compatibility',
            'Hide potential modernization risks and downplay budget contingency requirements',
            'Focus exclusively on technical preferences while ignoring business objectives and regulatory compliance',
          ],
        },
      ],
    }

    const questions = []
    for (let i = 0; i < 10; i++) {
      const diff = getQuestionDifficulty(i, 10)
      const tierList = weekendTieredScenarios[diff.level] || weekendTieredScenarios[1]
      const template = tierList[i % tierList.length]
      const curSkill = skills[i % skills.length]

      questions.push(shuffleQuestionOptions({
        type: 'choice',
        skill: curSkill,
        label: `Weekend Challenge Q${i + 1}`,
        difficulty: diff.name,
        difficultyLevel: diff.level,
        difficultyLabel: diff.label,
        difficultyBadgeClass: diff.badgeClass,
        prompt: `Scenario ${i + 1}: ${template.prompt}`,
        options: [...template.options],
        correctIndex: 0,
      }, i))
    }
    return questions
  }

  // Standard skill assessment: Extensive, authentic real-world public administration & domain scenario bank
  const scenarioBank = {
    // HEALTH & BIOSTATISTICS
    'Biostatistics': [
      { prompt: `In a Phase-III clinical trial evaluating a new public health intervention, what is the primary purpose of an Intent-to-Treat (ITT) analysis?`, options: ['Preserves prognostic balance established by randomization and prevents bias from subject attrition or non-compliance', 'Excludes non-compliant participants to artificially inflate treatment effect size', 'Permits investigators to reassign subjects to alternative cohorts after unblinding', 'Eliminates the requirement for calculating statistical power or p-values'], correct: 0 },
      { prompt: `When analyzing patient survival times subject to right-censoring in hospital registries, which statistical methodology is mandatory?`, options: ['Kaplan-Meier product-limit estimation combined with Cox proportional hazards regression', 'Standard ordinary least squares (OLS) linear regression without censoring adjustment', 'Assigning zero survival time to all censored patients and running ANOVA', 'Excluding all censored records from the research cohort entirely'], correct: 0 },
      { prompt: `When estimating sample size for a multi-center randomized controlled trial, how does cluster randomization affect the required sample size?`, options: ['Increases sample size by the design effect (DEFF = 1 + (m - 1) * ICC) due to intra-cluster correlation', 'Reduces required sample size because clusters are assumed homogeneous', 'Has zero effect on statistical power or variance estimation', 'Permits testing with a single control patient per hospital'], correct: 0 },
    ],
    'Epidemiology': [
      { prompt: `During an emerging infectious disease outbreak, what does a basic reproduction number (R0) greater than 1 indicate?`, options: ['Each primary infected case transmits to more than one susceptible person, signaling epidemic expansion potential', 'The disease is guaranteed to reach self-extinction within two weeks', '100% of the population has acquired natural humoral immunity', 'Vaccination coverage thresholds can be safely reduced to under 10%'], correct: 0 },
      { prompt: `Under the Integrated Disease Surveillance Programme (IDSP), how do Presumptive (P-form) and Laboratory (L-form) surveillance data differ?`, options: ['P-data captures clinical syndrome diagnoses by medical officers; L-data requires confirmed laboratory diagnostic assays', 'P-data is collected only in private facilities; L-data strictly in rural dispensaries', 'P-data is classified confidential; L-data is published openly without validation', 'P-data is reported once per census decade; L-data is collected hourly'], correct: 0 },
      { prompt: `When estimating Maternal Mortality Ratio (MMR) from civil registration system (CRS) data with known under-registration, what adjustment is required?`, options: ['Apply dual-record system estimation and brass-type indirect sibling survivorship correction weights', 'Report unadjusted raw sample counts directly as official national statistics', 'Discard all rural mortality records to improve reported national ratios', 'Assume zero maternal deaths occurred in non-reporting district health centers'], correct: 0 },
    ],
    // AGRICULTURE & RURAL
    'Agricultural Statistics': [
      { prompt: `Under the General Crop Estimation Survey (GCES) methodology, what constitutes the primary sampling unit (PSU)?`, options: ['Revenue village selected through stratified random sampling within an agro-climatic taluk/tehsil', 'Individual farmer holding chosen arbitrarily near state highway access', 'State agricultural university research farm experimental plots', 'Commercial grain warehousing terminal silos'], correct: 0 },
      { prompt: `When conducting a field crop-cutting experiment (CCE), how are fresh-to-dry weight ratios determined for official yield estimation?`, options: ['Harvested plot produce is weighed fresh, dried under standardized moisture controls, and re-weighed to determine the driage factor', 'Fresh weight is multiplied by an uncalibrated constant of 2.5 without testing', 'Crop moisture content is assumed to be 0% at harvest across all districts', 'Only unharvested standing crops are measured visually without physical harvesting'], correct: 0 },
    ],
    'Crop Yield Modeling': [
      { prompt: `When utilizing Sentinel-2 satellite imagery for pre-harvest crop acreage estimation, how is Normalized Difference Vegetation Index (NDVI) applied?`, options: ['Contrasting red and near-infrared spectral reflectance bands identifies vegetative chlorophyll vigor and crop phenology', 'Thermal infrared channels measure topsoil depth directly in centimeters', 'Satellite imagery completely eliminates the requirement for ground-truth crop-cutting validation', 'NDVI values exceeding 0.6 are discarded as agricultural noise'], correct: 0 },
      { prompt: `When modeling crop yield vulnerability under erratic monsoon rainfall patterns, which agro-meteorological index provides leading drought indication?`, options: ['Standardized Precipitation-Evapotranspiration Index (SPEI) evaluated across critical flowering and grain-filling windows', 'Gross cumulative seasonal rainfall without temporal distribution modeling', 'Single-day peak temperature records during winter dormancy', 'Total commercial tractor sales recorded across regional transport offices'], correct: 0 },
    ],
    // PRICE & CONSUMER STATISTICS
    'Price Statistics': [
      { prompt: `In compiling the Consumer Price Index (CPI) using the modified Laspeyres formula, what is the primary cause of commodity substitution bias?`, options: ['The fixed base-year consumption basket fails to account for consumers substituting towards relatively cheaper goods when prices rise', 'The index updates commodity weights dynamically every month, exaggerating volatility', 'Laspeyres formulas systematically exclude all urban service and housing expenditures', 'Seasonal fruit and vegetable prices are given 100% basket weighting during winter'], correct: 0 },
      { prompt: `When an essential commodity quotation cannot be collected in a designated market due to temporary stock-out, what is standard official protocol?`, options: ['Impute price change using the trend of that commodity in comparable adjacent markets or sub-group price relatives', 'Record a price of zero for that month, artificially reducing the district index', 'Permanently drop the commodity from the national inflation basket', 'Carry forward the last recorded price indefinitely for over 24 months without review'], correct: 0 },
    ],
    // LABOUR & EMPLOYMENT
    'Labour Statistics': [
      { prompt: `Under the Periodic Labour Force Survey (PLFS), how is a person categorized as employed according to Usual Principal Status (UPS)?`, options: ['Engaged in economic activity for a relatively long period (183 days or more) during the 365 days preceding the survey date', 'Worked for at least 1 hour on any single day during the 7 days preceding the survey date', 'Enrolled in an educational degree program regardless of economic participation', 'Registered with an employment exchange without earning wages or conducting economic work'], correct: 0 },
      { prompt: `How is the Worker Population Ratio (WPR) formally calculated in national employment publications?`, options: ['(Total number of employed persons / Total estimated population) * 100', '(Total unemployed persons / Total active labour force) * 100', '(Total labour force / Working-age population aged 15-59) * 100', '(Formal sector salaried workers / Informal unorganized workers) * 100'], correct: 0 },
    ],
    // OFFICIAL STATISTICS & QUALITY AUDITING
    'Official Statistics': [
      { prompt: `Under the National Quality Assurance Framework (NQAF), which institutional safeguard guarantees public trust and statistical integrity?`, options: ['Pre-announced dissemination calendar, equal simultaneous public access, and strict firewalling from political clearance', 'Allowing ministerial departments to inspect and adjust preliminary survey tables 30 days before release', 'Restricting raw microdata tables strictly to registered internal ministry staff', 'Publishing survey estimates only when policy targets have been favorably achieved'], correct: 0 },
      { prompt: `When survey data contains substantial item non-response, why is hot-deck imputation preferred over mean substitution?`, options: ['Preserves the underlying distribution and variable covariance by matching on demographic and geographic auxiliary strata', 'Reduces all survey variances to zero, guaranteeing statistical significance', 'Generates completely synthetic data points using uncalibrated random number seeds', 'Allows data officers to overwrite respondent entries with target policy benchmarks'], correct: 0 },
    ],
    'Sampling': [
      { prompt: `When calculating standard errors in a multi-stage stratified cluster sample for nationwide surveys, which factor must be accounted for?`, options: ['Design effect (DEFF) and intra-cluster correlation to prevent underestimating sampling variance', 'Assuming simple random sampling (SRS) with equal variance across all primary sampling units', 'Disregarding sampling weights in aggregate national estimations', 'Eliminating second-stage sampling units that require remote rural travel'], correct: 0 },
      { prompt: `If survey attrition disproportionately affects mobile urban youth strata, how should population representations be adjusted?`, options: ['Apply post-stratification non-response weight calibration based on known census demographic marginals', 'Remove the entire demographic stratum from public survey dissemination', 'Assume non-respondents have the exact same distribution as overall elderly respondents', 'Fabricate synthetic respondents without statistical weighting matrices'], correct: 0 },
    ],
    // TECHNOLOGY & DATA SCIENCE
    'Data analysis': [
      { prompt: `When comparing district-level social welfare coverage across heterogeneous population sizes, what metric best controls for population scale?`, options: ['Per-capita coverage rate with standardized 95% Wilson score confidence intervals', 'Raw total recipient headcounts without population normalization', 'District geographic square-kilometer area divided by total budget spent', 'Multiplying small district counts by arbitrary scaling constants to match metropolitan totals'], correct: 0 },
      { prompt: `In an observational evaluation of a public policy reform, why is a Difference-in-Differences (DiD) design superior to simple pre-post comparison?`, options: ['Accounts for common counterfactual time trends by benchmarking against an unaffected control population', 'Guarantees that all regression coefficients have p-values under 0.001', 'Eliminates the requirement for collecting baseline data prior to reform rollout', 'Proves mathematical causation without testing parallel trend assumptions'], correct: 0 },
    ],
    'AI/ML': [
      { prompt: `When evaluating an AI model deployed on official registration records, you notice performance degrades on new rural demographics (covariate shift). What is the standard protocol?`, options: ['Perform stratified re-sampling, monitor feature distribution drift, and re-calibrate decision thresholds', 'Ignore the distribution shift and continue inference with legacy model weights', 'Immediately remove rural demographic data from processing pipelines', 'Increase model learning rate arbitrarily without testing validation loss'], correct: 0 },
      { prompt: `In an automated benefit eligibility prediction pipeline, why is feature attribution (SHAP/LIME) legally essential under DPDP and administrative law?`, options: ['Provides auditable, transparent explanations for adverse administrative decisions and enables algorithmic fairness audits', 'Allows backend engineers to hardcode decisions for preferred applicants', 'Reduces deep neural network training latency by 90%', 'Guarantees 100% classification accuracy without testing on holdout validation datasets'], correct: 0 },
    ],
    'SQL': [
      { prompt: `A query joining a 50-million-row official register with district lookup tables runs sluggishly. What optimization should be examined first?`, options: ['Inspect the execution plan, verify composite indexing on join keys, and eliminate full-table sequential scans', 'Add SELECT * to retrieve all table columns', 'Remove WHERE clauses to allow faster data retrieval', 'Restart the database instance during peak transaction hours'], correct: 0 },
      { prompt: `When aggregating survey averages where some respondents left optional income fields blank (NULL), how does standard SQL behave?`, options: ['AVG() automatically ignores NULL values; COALESCE should be applied if null defaults are needed', 'AVG() automatically treats NULLs as 0.0, distorting true averages', 'The query immediately throws a runtime fatal syntax error', 'NULL values are converted into maximum possible integer values'], correct: 0 },
    ],
    'Python': [
      { prompt: `When processing a 20GB administrative census file on a 16GB RAM server in Python, which data engineering approach prevents Out-Of-Memory (OOM) crashes?`, options: ['Process the file in chunked streams using Pandas/Polars chunksize or DuckDB out-of-core memory mapping', 'Read the entire file into a single Pandas DataFrame with df = pd.read_csv()', 'Increase Python recursion limits using sys.setrecursionlimit(100000)', 'Convert all numerical columns to Python string objects'], correct: 0 },
      { prompt: `In a production data pipeline, why should vectorization (NumPy/Pandas) be used instead of standard Python 'for' loops across rows?`, options: ['Leverages low-level compiled C-level contiguous memory operations and SIMD CPU instructions for orders-of-magnitude speedup', 'Vectorization eliminates the requirement for data cleaning or null checks', 'Python loops are syntactically prohibited in official statistical scripts', 'Vectorization automatically formats numbers as currency strings'], correct: 0 },
    ],
    'GIS': [
      { prompt: `When merging field survey census blocks with national satellite shapefiles, spatial misalignment occurs. What is the standard geodetic remediation?`, options: ['Standardize coordinate reference systems (CRS) using EPSG transformations to WGS84', 'Manually drag polygons visually without verifying datum projection', 'Delete survey blocks that do not immediately align', 'Switch from vector shapefiles to low-resolution unreferenced images'], correct: 0 },
      { prompt: `In spatial analytics for public health data, why are choropleth maps normalized by population density rather than raw case counts?`, options: ['To prevent geographic area size from misleadingly dominating relative incidence rates', 'To reduce the number of colors required in the map legend', 'Because raw counts are prohibited by GIS software', 'To remove all municipal boundaries from the map display'], correct: 0 },
    ],
    'Data Quality Frameworks': [
      { prompt: `Under the National Quality Assurance Framework (NQAF), how should extensive item non-response in economic surveys be addressed?`, options: ['Apply validated donor imputation or regression imputation with explicit imputation flags', 'Silently replace missing entries with zeros without documentation', 'Discard all incomplete questionnaires, biasing the sampling frame', 'Duplicate adjacent records without statistical validation'], correct: 0 },
      { prompt: `When performing automated data reconciliation across decentralized departmental registers, what is the best practice for duplicate resolution?`, options: ['Utilize deterministic and probabilistic record linkage with defined confidence thresholds and audit logs', 'Randomly delete one of the conflicting records', 'Average all disparate numerical fields together without inspection', 'Halt all database operations until manual paper audits occur'], correct: 0 },
    ],
    'Financial analysis': [
      { prompt: `In a quarterly financial model for ${profile.role}, an unexpected 14% variance appears between forecasted and actual operating costs. What is the standard first step?`, options: ['Perform a line-item variance audit to isolate fixed vs variable cost drivers', 'Adjust the target forecast retroactively to mask the gap', 'Immediately cut project headcount without analyzing the category', 'Ignore the variance until year-end reporting'], correct: 0 },
      { prompt: `When assessing project capital expenditure ROI under ${exp} constraints, how should you factor inflation risks?`, options: ['Apply discounted cash flow with an adjusted hurdle rate and sensitivity analysis', 'Assume historical interest rates remain completely static', 'Only evaluate the nominal gross return of year 1', 'Exclude tax amortization and salvage value'], correct: 0 },
    ],
    'Excel': [
      { prompt: `To combine dynamic transactional datasets across multiple tabs without breaking on column shifts, which formula is recommended in modern Excel?`, options: ['XLOOKUP or INDEX(MATCH) combined with dynamic spill ranges', 'Hardcoded static VLOOKUP with fixed index numbers', 'Manual copy-paste across sheets', 'CONCATENATE all cell rows into text strings'], correct: 0 },
      { prompt: `When designing an audit-proof financial tracker in Excel, what is the best practice for raw data integrity?`, options: ['Separate raw data tabs from calculation models and summary dashboards', 'Mix calculation formulas directly inside raw input rows', 'Color code cells manually without validation rules', 'Avoid using structured Excel tables or named ranges'], correct: 0 },
    ],
    'Leadership': [
      { prompt: `Two senior team members disagree fundamentally on the technical approach for a new initiative. As a leader, how do you steer alignment?`, options: ['Facilitate an objective decision matrix evaluating alignment with business goals, constraints, and risk mitigation', 'Choose one approach arbitrarily without explaining the reasoning', 'Let them argue indefinitely without resolution', 'Reassign both team members to unrelated individual tasks'], correct: 0 },
    ],
    'Communication': [
      { prompt: `When presenting complex technical or financial findings to executive leadership, what is the most persuasive structure?`, options: ['Start with the bottom-line recommendation (BLUF), followed by supporting evidence and risk trade-offs', 'Walk through 80 slides of raw unformatted logs and calculations in chronological order', 'Avoid mentioning risks or limitations entirely', 'Use unexplained technical jargon without executive context'], correct: 0 },
    ],
    'Problem solving': [
      { prompt: `An intermittent production bottleneck occurs only during peak hours. How should you systematically isolate the root cause?`, options: ['Collect telemetry logs, map system throughput bottlenecks under load, and formulate falsifiable hypotheses', 'Make 5 random architectural changes simultaneously to see if one helps', 'Assume the issue is a user mistake and close the ticket', 'Restart servers repeatedly without gathering trace telemetry'], correct: 0 },
    ],
  }

  // Real-world dynamic question generator for custom skills or when additional questions are needed:
  // Generates 10 distinct, non-repeating scenario questions with 4 unique, domain-relevant options per question!
  function generateDynamicRealWorldQuestions(skillName, neededCount) {
    const cleanSkill = (skillName || 'Official Statistics').trim()
    const scenarioArchetypes = [
      {
        prompt: `In an official review of departmental workflows, an audit reveals inconsistent field standards in ${cleanSkill}. What is the primary corrective protocol?`,
        options: [
          `Establish a harmonized standard operating procedure (SOP), mandate peer-review checklists, and maintain an immutable decision log for ${cleanSkill}`,
          `Instruct field officers to bypass documentation and resolve discrepancies informally`,
          `Delete discrepant historical records from the database to present a clean compliance audit`,
          `Suspend all operational activities indefinitely without root-cause assessment`,
        ],
        correct: 0,
      },
      {
        prompt: `When integrating administrative register feeds from multiple decentralized jurisdictions under ${cleanSkill}, what validation step is mandatory before synthesis?`,
        options: [
          `Execute automated schema harmonization, verify primary key integrity, and apply probabilistic linkage rules for ${cleanSkill}`,
          `Concatenate raw feeds directly into production registers without checking variable definitions`,
          `Manually overwrite conflicting regional values with arbitrary central averages`,
          `Omit rural administrative feeds to prevent column misalignment in tabular outputs`,
        ],
        correct: 0,
      },
      {
        prompt: `Under statutory compliance guidelines (such as DPDP Act and official statistics norms), how must sensitive microdata records be handled in ${cleanSkill}?`,
        options: [
          `Apply cryptographic pseudonymization, k-anonymity masking thresholds, and role-based access control (RBAC) to protect respondent confidentiality in ${cleanSkill}`,
          `Distribute unmasked microdata spreadsheets freely via unencrypted public messaging groups`,
          `Permanently delete all master data records immediately after survey completion`,
          `Disable access controls so that all internal contractors have unrestricted root permissions`,
        ],
        correct: 0,
      },
      {
        prompt: `During seasonal peak operations in ${cleanSkill}, anomalous variance spikes by over 25% in quarterly indicator trends. What is the standard diagnostic procedure?`,
        options: [
          `Perform decomposed variance analysis to isolate genuine seasonal shifts from non-sampling measurement errors in ${cleanSkill}`,
          `Retroactively adjust benchmark formulas until quarterly volatility appears smooth`,
          `Conceal the variance spike from leadership to avoid scrutiny`,
          `Discard the latest quarter's survey wave and republish the prior year's numbers`,
        ],
        correct: 0,
      },
      {
        prompt: `When presenting complex technical findings and policy implications derived from ${cleanSkill} to ministry leadership, what is the best reporting structure?`,
        options: [
          `Lead with the Bottom-Line Up Front (BLUF), executive summary of trade-offs, confidence bounds, and actionable policy options for ${cleanSkill}`,
          `Present 120 unformatted raw data tables in chronological order without narrative interpretation`,
          `Exclude all uncertainty ranges and methodology limitations to present an oversimplified picture`,
          `Use highly esoteric jargon and withhold underlying data sources from leadership`,
        ],
        correct: 0,
      },
      {
        prompt: `When upgrading legacy computing scripts or database tables supporting ${cleanSkill}, what rollout strategy guarantees zero disruption?`,
        options: [
          `Implement dual-run parallel execution, compare regression outputs across both environments, and execute staged migration with rollback capability for ${cleanSkill}`,
          `Terminate legacy systems immediately on a weekday morning and launch unvalidated scripts directly in production`,
          `Disable system backup routines to accelerate database migration speeds`,
          `Delegate deployment verification entirely to untrained end users after launch`,
        ],
        correct: 0,
      },
      {
        prompt: `In an evaluation of statistical quality dimensions under National Quality Assurance Frameworks (NQAF), how is accuracy measured in ${cleanSkill}?`,
        options: [
          `Assessing proximity between calculated estimates and true population values via sampling error and non-sampling error audits in ${cleanSkill}`,
          `Measuring how quickly survey reports are printed regardless of data verification`,
          `Surveying internal office staff opinions on whether the results feel plausible`,
          `Counting the total page length of published statistical bulletins`,
        ],
        correct: 0,
      },
      {
        prompt: `When field enumerators report non-response in high-density strata for ${cleanSkill}, what is the approved statistical remedy?`,
        options: [
          `Apply calibrated post-stratification non-response adjustments using verified census baseline auxiliary data for ${cleanSkill}`,
          `Fabricate responses using intuition to meet target sample size quotas`,
          `Drop the high-density stratum completely from regional estimations`,
          `Multiply existing respondent values by arbitrary integer multipliers`,
        ],
        correct: 0,
      },
      {
        prompt: `What is the most effective approach to cross-cadre coordination between field teams and central analytics officers in ${cleanSkill}?`,
        options: [
          `Establish standardized data-dictionary definitions, bi-weekly calibration syncs, and real-time validation error alerts for ${cleanSkill}`,
          `Restrict all communication to annual official gazette circulars without interactive feedback`,
          `Allow each cadre to define its own variable nomenclature independently`,
          `Prevent field teams from reviewing analytical findings derived from their data`,
        ],
        correct: 0,
      },
      {
        prompt: `Before final publication of national and state indicators in ${cleanSkill}, which clearance milestone must be satisfied?`,
        options: [
          `Complete multi-tier quality sign-off, verify reproducible compilation scripts, and confirm adherence to the pre-announced release calendar for ${cleanSkill}`,
          `Publish immediately on social media prior to formal departmental verification`,
          `Alter indicator methodologies without publishing revision policy notices`,
          `Release contradictory preliminary tables to different agencies simultaneously`,
        ],
        correct: 0,
      },
    ]

    return scenarioArchetypes.slice(0, neededCount)
  }

  const generatedQuestions = []
  const questionCount = skills.length * 10
  const questionPlan = skills.flatMap((skill) => Array.from({ length: 10 }, () => skill))

  // Shuffle question plan order
  for (let i = questionPlan.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1))
    ;[questionPlan[i], questionPlan[randomIndex]] = [questionPlan[randomIndex], questionPlan[i]]
  }

  const skillQuestionCounts = {}

  for (let i = 0; i < questionCount; i++) {
    const currentSkill = questionPlan[i]
    const isCodingQuestion = isCodingSkill(currentSkill)
    const skillQuestionIndex = skillQuestionCounts[currentSkill] || 0
    skillQuestionCounts[currentSkill] = skillQuestionIndex + 1

    if (isCodingQuestion) {
      const lang = currentSkill
      const challenges = codingCodeChallenges[lang] || [additionalCodingChallenges[lang]]
      const challenge = challenges[skillQuestionIndex % challenges.length]
      generatedQuestions.push({
        type: 'code',
        skill: currentSkill,
        label: `${t.question} ${i + 1}`,
        experienceLevel: exp,
        prompt: `Challenge ${skillQuestionIndex + 1}: ${challenge.prompt} Include a production-ready edge-case check for scenario ${skillQuestionIndex + 1}.`,
        language: challenge.language || lang,
        starter: challenge.starter,
        checks: ensureCodeChecks(challenge.checks),
      })
    } else {
      const diff = getQuestionDifficulty(skillQuestionIndex, 10)

      // Find matching bank items using flexible keyword matching
      const normSkill = currentSkill.toLowerCase()
      let bankKey = Object.keys(scenarioBank).find((k) => k.toLowerCase() === normSkill)
      if (!bankKey) {
        bankKey = Object.keys(scenarioBank).find((k) => normSkill.includes(k.toLowerCase()) || k.toLowerCase().includes(normSkill))
      }

      const bankItems = bankKey ? scenarioBank[bankKey] : null
      let item = null

      if (bankItems && skillQuestionIndex < bankItems.length) {
        item = bankItems[skillQuestionIndex]
      } else {
        // Generate a rich, non-repeating real-world scenario
        const dynamicList = generateDynamicRealWorldQuestions(currentSkill, 10)
        item = dynamicList[skillQuestionIndex % dynamicList.length]
      }

      const rawOptions = (item.options && item.options.length >= 4)
        ? [...item.options]
        : getDistinctChoiceOptions(currentSkill, skillQuestionIndex + 1)

      generatedQuestions.push(shuffleQuestionOptions({
        type: 'choice',
        skill: currentSkill,
        label: `${t.question} ${i + 1}`,
        difficulty: diff.name,
        difficultyLevel: diff.level,
        difficultyLabel: diff.label,
        difficultyBadgeClass: diff.badgeClass,
        experienceLevel: exp,
        prompt: `Question ${skillQuestionIndex + 1}: ${item.prompt}`,
        options: rawOptions,
        correctIndex: item.correct ?? 0,
      }, i))
    }
  }

  return generatedQuestions
}

function getSkillSpecificQuestions(profile, t, skillList) {
  const questions = buildScenarioQuestions(profile, t, skillList, 'standard')
  const normSkills = new Set((skillList || []).map((s) => String(s || '').toLowerCase().trim()))
  const filtered = questions.filter((question) => normSkills.has(String(question.skill || '').toLowerCase().trim()))
  return filtered.length > 0 ? filtered : questions
}

const choiceOptionVariants = [
  ['Establish a documented validation checkpoint, verify evidence, and record the decision', 'Skip review because the task appears routine', 'Use an unverified shortcut and remove the audit trail', 'Wait for an error before checking the work'],
  ['Compare the source data with approved standards and investigate exceptions before publishing', 'Accept the first result without checking the source', 'Change the result until it matches an expected outcome', 'Publish immediately and document issues only if challenged'],
  ['Define the risk owner, measurable control, review date, and escalation path', 'Treat the risk as irrelevant without a complaint', 'Transfer the risk without recording accountability', 'Remove the data so the risk cannot be measured'],
  ['Use a reproducible method with clear assumptions, evidence, and independent review', 'Rely on memory instead of recording the method', 'Use a faster method with no quality check', 'Keep the calculation private so it cannot be questioned'],
  ['Assess accuracy, bias, timeliness, and operational impact before deciding', 'Choose the cheapest option without measuring quality', 'Ask one person to decide without criteria', 'Ignore conflicting evidence and proceed'],
  ['Create a versioned workflow, test representative cases, and monitor the result', 'Deploy the change without testing because it is small', 'Remove monitoring to reduce operational work', 'Accept failures as unavoidable'],
  ['Communicate the finding with the source, limitation, confidence, and recommended action', 'Report only the positive result', 'Hide uncertainty to make the result simpler', 'Send raw data without interpretation'],
  ['Reconcile against authoritative records, preserve the original values, and log corrections', 'Overwrite the original values without explanation', 'Delete conflicting records immediately', 'Average conflicting values without investigating'],
  ['Apply the approved definition consistently and document any justified exception', 'Change the definition for each team', 'Use informal terminology without recording it', 'Ignore the definition when the deadline is close'],
  ['Review stakeholder impact, privacy, quality, and compliance before release', 'Release first and ask for approval later', 'Share restricted data to speed up feedback', 'Avoid stakeholders to prevent disagreement'],
]

function getDistinctChoiceOptions(skill, questionNumber) {
  const options = choiceOptionVariants[(questionNumber - 1) % choiceOptionVariants.length]
  return options.map((option, index) => index === 0
    ? `${option} for ${skill}.`
    : option)
}

function shuffleQuestionOptions(question, questionNumber = 0) {
  if (!question || question.type === 'code' || !Array.isArray(question.options) || question.options.length <= 1) {
    return question
  }

  const rawCorrect = typeof question.correctIndex === 'number'
    ? question.correctIndex
    : typeof question.correct === 'number'
    ? question.correct
    : 0

  const safeCorrect = (rawCorrect >= 0 && rawCorrect < question.options.length) ? rawCorrect : 0
  const items = question.options.map((opt, idx) => ({ text: opt, isCorrect: idx === safeCorrect }))

  // Fisher-Yates shuffle
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }

  let newCorrect = items.findIndex((it) => it.isCorrect)

  // Avoid having Option A (index 0) be the correct answer on every question.
  // Rotate / swap across non-zero slots (B = 1, C = 2, D = 3) if it landed on 0:
  const nonZeroPositions = [1, 2, 3]
  if (newCorrect === 0) {
    const swapTarget = nonZeroPositions[questionNumber % nonZeroPositions.length]
    if (swapTarget < items.length) {
      ;[items[0], items[swapTarget]] = [items[swapTarget], items[0]]
      newCorrect = swapTarget
    }
  }

  return {
    ...question,
    options: items.map((it) => it.text),
    correctIndex: newCorrect,
    answerIndex: newCorrect,
  }
}

function ensureQuestionOptionsAreDistinct(questions) {
  const alternativeDistractors = [
    'Execute post-stratification weighting against benchmark administrative records',
    'Perform dual-pass consistency audit and outlier winsorization before tabulation',
    'Enforce differential privacy boundaries and cell-suppression threshold protocols',
    'Adopt multistage probability proportional to size (PPS) sampling allocation',
    'Establish automated ingestion schema validation with rollback checkpoints',
    'Apply seasonal ARIMA decomposition with calendar trading-day adjustments',
    'Implement dual-key cryptographic access controls and audit logging',
    'Calculate design effect (DEFF) and recalibrate confidence intervals accordingly',
    'Mandate independent supervisory sign-off and methodology disclosure report',
    'Conduct split-sample cross-validation to prevent model overfitting'
  ]

  const seenSignatures = new Set()

  return questions.map((question, qIdx) => {
    if (question.type === 'code' || !Array.isArray(question.options)) return question

    const correctIdx = typeof question.correctIndex === 'number'
      ? question.correctIndex
      : typeof question.answerIndex === 'number'
      ? question.answerIndex
      : 0
    const correctText = question.options[correctIdx] || question.options[0]

    // 1. Ensure all 4 options within THIS question are completely distinct
    const uniqueOptions = []
    const seenInQuestion = new Set()

    question.options.forEach((opt) => {
      const trimmed = String(opt || '').trim()
      const key = trimmed.toLowerCase()
      if (!seenInQuestion.has(key) && trimmed.length > 0) {
        seenInQuestion.add(key)
        uniqueOptions.push(trimmed)
      } else {
        // Find an alternative distractor that isn't yet in this question
        const alt = alternativeDistractors.find(
          (cand) => !seenInQuestion.has(cand.toLowerCase())
        ) || `${trimmed} (Secondary validation protocol)`
        seenInQuestion.add(alt.toLowerCase())
        uniqueOptions.push(alt)
      }
    })

    // Ensure question has at least 4 options
    while (uniqueOptions.length < 4) {
      const fallback = alternativeDistractors[uniqueOptions.length % alternativeDistractors.length]
      uniqueOptions.push(fallback)
    }

    // Preserve the correct answer's exact index
    let newCorrectIdx = uniqueOptions.findIndex((opt) => opt.toLowerCase() === String(correctText).trim().toLowerCase())
    if (newCorrectIdx === -1) {
      newCorrectIdx = Math.min(correctIdx, uniqueOptions.length - 1)
      uniqueOptions[newCorrectIdx] = correctText
    }

    // 2. Ensure option set across questions is not identical
    const signature = uniqueOptions.map((o) => o.toLowerCase()).sort().join('|')
    if (seenSignatures.has(signature)) {
      // Swap out one distractor (non-correct) with an alternative
      const distractorIdx = (newCorrectIdx + 1) % uniqueOptions.length
      const replacement = alternativeDistractors[(qIdx + 3) % alternativeDistractors.length]
      uniqueOptions[distractorIdx] = replacement
      const newSignature = uniqueOptions.map((o) => o.toLowerCase()).sort().join('|')
      seenSignatures.add(newSignature)
    } else {
      seenSignatures.add(signature)
    }

    return {
      ...question,
      options: uniqueOptions,
      correctIndex: newCorrectIdx,
      answerIndex: newCorrectIdx,
    }
  })
}

function ensureQuestionPromptsAreDistinct(questions) {
  const seen = new Set()
  const variations = [
    'In a high-scrutiny national statutory audit, which standard governs the decision?',
    'Under strict regulatory reporting deadlines, which procedure takes precedence?',
    'When integrating heterogeneous administrative data across ministries, what protocol is required?',
    'To eliminate non-sampling error and bias in this evaluation, what is the mandatory action?'
  ]

  return questions.map((question, index) => {
    const basePrompt = String(question.prompt || '').trim().replace(/\s+/g, ' ')
    const promptKey = basePrompt.toLowerCase()
    if (!seen.has(promptKey)) {
      seen.add(promptKey)
      return question
    }
    const varText = variations[index % variations.length]
    const prompt = `${basePrompt} (${varText})`
    seen.add(prompt.toLowerCase())
    return { ...question, prompt }
  })
}

function createAdaptiveQuestion(profile, t, skill, questionNumber, targetLevel = 3) {
  const diff = targetLevel === 4
    ? { level: 4, name: 'Expert', label: 'Level 4: Expert Challenge', badgeClass: 'diff-expert' }
    : targetLevel === 3
    ? { level: 3, name: 'Advanced', label: 'Level 3: Advanced', badgeClass: 'diff-advanced' }
    : targetLevel === 2
    ? { level: 2, name: 'Intermediate', label: 'Level 2: Intermediate', badgeClass: 'diff-intermediate' }
    : { level: 1, name: 'Foundational', label: 'Level 1: Foundational', badgeClass: 'diff-foundational' }

  const templates = {
    4: [
      `[Expert Challenge] In a mission-critical failure scenario involving ${skill}, which recovery protocol guarantees zero data loss and compliance?`,
      `[Expert Challenge] When re-architecting ${skill} for multi-region enterprise scale, which architectural decoupling pattern must be enforced?`,
    ],
    3: [
      `[Advanced] A high-concurrency race condition or memory degradation is detected in ${skill}. Which defensive mitigation isolates the bottleneck?`,
      `[Advanced] When throughput spikes by 300% in ${skill}, which mitigation isolates resource bottlenecks and maintains SLA reliability?`,
    ],
    2: [
      `[Intermediate] How should a team validate a new ${skill} workflow and handle parameter boundaries before deploying it to production?`,
      `[Intermediate] Which KPI and monitoring control best demonstrates reliable daily application of ${skill}?`,
    ],
    1: [
      `[Foundational] What is the core baseline principle and syntax standard governing effective execution of ${skill}?`,
      `[Foundational] When establishing an initial baseline workflow in ${skill}, which prerequisite check is mandatory?`,
    ],
  }

  const optionsByLevel = {
    4: [
      `Enforce transactional rollback boundaries, write-ahead event journaling, and automated circuit-breaking failover for ${skill}.`,
      `Force uncoordinated process restarts without checkpointing in-flight state mutations.`,
      `Bypass transactional integrity checks to artificially accelerate throughput during failover.`,
      `Hardcode recovery parameters and truncate corrupted audit ledgers to restore service.`,
    ],
    3: [
      `Deploy bounded worker buffers with backpressure mitigation, idempotent caching, and explicit memory teardown for ${skill}.`,
      `Scale thread concurrency unboundedly without measuring heap allocation thresholds.`,
      `Disable garbage collection hooks and retain persistent object references across component unmounts.`,
      `Suppress diagnostic logging and drop failing packets without dead-letter audit records.`,
    ],
    2: [
      `Implement thread-safe state synchronization, enforce defensive boundary checks, and validate inputs for ${skill}.`,
      `Execute asynchronous state mutations directly on UI threads without synchronization locks.`,
      `Rely solely on broad try-catch blocks while swallowing underlying component exceptions.`,
      `Share unpersisted mutable buffers across concurrent thread pools without locks.`,
    ],
    1: [
      `Establish standard initialization, adhere to baseline conventions, and verify data contracts for ${skill}.`,
      `Proceed with unverified parameter bindings and bypass baseline type checking.`,
      `Assume default runtime state without inspecting environment prerequisites.`,
      `Instantiate global mutable variables without encapsulation or lifecycle management.`,
    ],
  }

  const tList = templates[diff.level] || templates[3]
  const prompt = `${t.question} ${questionNumber}: ${tList[(questionNumber - 1) % tList.length]}`
  const rawOptions = optionsByLevel[diff.level] || optionsByLevel[3]

  return shuffleQuestionOptions({
    type: 'choice',
    skill,
    label: `${t.question} ${questionNumber}`,
    difficulty: diff.name,
    difficultyLevel: diff.level,
    difficultyLabel: diff.label,
    difficultyBadgeClass: diff.badgeClass,
    experienceLevel: profile.experience || '1–2 years',
    prompt,
    options: rawOptions,
    correctIndex: 0,
  }, questionNumber)
}

function isSkillRelatedToRole(skill, role, designation) {
  const normalizedSkill = skill.trim().toLowerCase()
  if (!normalizedSkill) return false

  const catalogSkills = getRoleSkillCategories(role, designation)
    .flatMap(([, skills]) => skills)
    .map((item) => item.toLowerCase())
  if (catalogSkills.includes(normalizedSkill)) return true

  const target = `${role || ''} ${designation || ''}`.toLowerCase()
  const matchingDomain = roleSkillDomains.find((domain) =>
    domain.matches.some((keyword) => target.includes(keyword))
  )
  return Boolean(matchingDomain?.skills.some((item) => item.toLowerCase() === normalizedSkill))
}

const DOMAIN_VIDEO_LIBRARIES = {
  health: [
    'https://www.youtube-nocookie.com/embed/8b51Bf7hU8M', // Epidemiology, Clinical Registries & Health Information Systems
    'https://www.youtube-nocookie.com/embed/Q4Q-vC-7cK4', // Clinical Biostatistics, Trial Protocols & Public Health Survey Design
    'https://www.youtube-nocookie.com/embed/3y_K_fJ9c-8', // Public Health Data Systems & Field Registries
    'https://www.youtube-nocookie.com/embed/rfscVS0vtbw', // Health Informatics & Data Processing
    'https://www.youtube-nocookie.com/embed/z1Xo3s8y1vU', // Health Quality Assurance & Metrics
  ],
  agri: [
    'https://www.youtube-nocookie.com/embed/3y_K_fJ9c-8', // Crop Yield Modeling, Sampling & Agro-Statistics
    'https://www.youtube-nocookie.com/embed/5kL_6Fp3z9s', // Geospatial Remote Sensing in Agricultural Enumeration
    'https://www.youtube-nocookie.com/embed/rfscVS0vtbw', // Automated Agri-Data Pipelines
    'https://www.youtube-nocookie.com/embed/L13_9z9K438', // Field Enumeration & Sample Surveys
    'https://www.youtube-nocookie.com/embed/z1Xo3s8y1vU', // Agricultural Statistics Verification
  ],
  tech: [
    'https://www.youtube-nocookie.com/embed/rfscVS0vtbw', // Python & Automated Data Engineering for Civil Services
    'https://www.youtube-nocookie.com/embed/GwIo3gDZCVQ', // Machine Learning & Predictive Modeling for Public Policy
    'https://www.youtube-nocookie.com/embed/5kL_6Fp3z9s', // Geospatial Analytics & Big Data Systems
    'https://www.youtube-nocookie.com/embed/z1Xo3s8y1vU', // Data Pipeline Validation & Testing
    'https://www.youtube-nocookie.com/embed/8b51Bf7hU8M', // System Architecture & Cloud Engineering
  ],
  price: [
    'https://www.youtube-nocookie.com/embed/4UCX3D26y3M', // Consumer Price Index (CPI) Compilation & Laspeyres Indexation
    'https://www.youtube-nocookie.com/embed/jZ8uQfC435U', // Macroeconomic Indicators & National Accounts Statistics (NAS)
    'https://www.youtube-nocookie.com/embed/z1Xo3s8y1vU', // Price Index Quality Auditing
    'https://www.youtube-nocookie.com/embed/L13_9z9K438', // Market Price Enumeration & Field Validation
    'https://www.youtube-nocookie.com/embed/rfscVS0vtbw', // Automated Price Aggregation Pipelines
  ],
  labour: [
    'https://www.youtube-nocookie.com/embed/fW4oRj1_5m4', // Periodic Labour Force Survey (PLFS) Methodology & Sampling Design
    'https://www.youtube-nocookie.com/embed/e_p3a_pYx3M', // Informal Sector Employment & Wage Index Estimation
    'https://www.youtube-nocookie.com/embed/L13_9z9K438', // Workforce Field Survey Operations
    'https://www.youtube-nocookie.com/embed/z1Xo3s8y1vU', // Labour Statistics Reconciliation
    'https://www.youtube-nocookie.com/embed/4UCX3D26y3M', // Wage & Cost-of-Living Indexing
  ],
  nso: [
    'https://www.youtube-nocookie.com/embed/z1Xo3s8y1vU', // National Quality Assurance Framework (NQAF) & Statistical Audit
    'https://www.youtube-nocookie.com/embed/L13_9z9K438', // Survey Operations, Field Enumeration & Tabulation Standards
    'https://www.youtube-nocookie.com/embed/4UCX3D26y3M', // Statistical Compilation & Data Analysis
    'https://www.youtube-nocookie.com/embed/rfscVS0vtbw', // Automated Data Processing
    'https://www.youtube-nocookie.com/embed/GwIo3gDZCVQ', // Decision Analytics & Public Reporting
  ],
}

function normalizeEmbedUrl(url) {
  if (!url) return ''
  const trimmed = String(url).trim()
  if (trimmed.includes('youtube-nocookie.com/embed/') || trimmed.includes('youtube.com/embed/')) {
    return trimmed
  }
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)
  if (match && match[1]) {
    return `https://www.youtube-nocookie.com/embed/${match[1]}`
  }
  return trimmed
}

function getCourseCurriculum(course, userProfile = null) {
  const courseId = course?.id || 'crs-default'
  const title = course?.title || course?.name || 'Domain Competency'
  const competency = course?.competency || 'Official Statistics'
  const department = course?.department || userProfile?.department || 'Official Statistics'
  const roleName = course?.role || userProfile?.role || userProfile?.designation || 'Statistical Officer'

  // Determine domain category
  const textBlob = `${department} ${competency} ${title} ${roleName}`.toLowerCase()
  let domainKey = 'nso'
  if (textBlob.includes('health') || textBlob.includes('medic') || textBlob.includes('biostat') || textBlob.includes('clinic') || textBlob.includes('epidemiolog')) {
    domainKey = 'health'
  } else if (textBlob.includes('agri') || textBlob.includes('crop') || textBlob.includes('farmer') || textBlob.includes('yield') || textBlob.includes('soil')) {
    domainKey = 'agri'
  } else if (textBlob.includes('tech') || textBlob.includes('ai') || textBlob.includes('data science') || textBlob.includes('python') || textBlob.includes('machine learning') || textBlob.includes('programming')) {
    domainKey = 'tech'
  } else if (textBlob.includes('price') || textBlob.includes('consumer') || textBlob.includes('cpi') || textBlob.includes('inflation') || textBlob.includes('wpi') || textBlob.includes('economic')) {
    domainKey = 'price'
  } else if (textBlob.includes('labour') || textBlob.includes('labor') || textBlob.includes('employ') || textBlob.includes('workforce') || textBlob.includes('plfs')) {
    domainKey = 'labour'
  }

  const domainVideos = DOMAIN_VIDEO_LIBRARIES[domainKey] || DOMAIN_VIDEO_LIBRARIES.nso
  const rawVideo = course?.videoUrl ? normalizeEmbedUrl(course.videoUrl) : ''
  const validCourseVideo = rawVideo && !rawVideo.includes('dQw4w9WgXcQ') ? rawVideo : null

  const getVideoForTopic = (mIndex, tIndex) => {
    if (mIndex === 1 && tIndex === 1 && validCourseVideo) {
      return validCourseVideo
    }
    const idx = (mIndex * 5 + tIndex - 6) % domainVideos.length
    return domainVideos[Math.abs(idx)] || domainVideos[0]
  }

  return [
    {
      index: 1,
      title: `Core Principles & Statutory Architecture (${competency})`,
      desc: `Foundational statutory principles, legislative frameworks, and institutional mandates governing ${title} in public administration.`,
      topics: [
        {
          id: `${courseId}-m1-t1`,
          index: 1,
          title: `Statutory Mandates, Legal Directives & Hierarchy for ${competency}`,
          duration: '10 min',
          format: 'Video',
          videoUrl: getVideoForTopic(1, 1),
          description: `Orientation on statutory rules, legislative frameworks, and institutional hierarchy governing ${competency} under ${department}.`,
        },
        {
          id: `${courseId}-m1-t2`,
          index: 2,
          title: `National Classifications, Coding Standards & ${competency} Taxonomy`,
          duration: '12 min',
          format: 'Video',
          videoUrl: getVideoForTopic(1, 2),
          description: `Standardized nomenclature, metadata protocols, and harmonized categorization codes applied across official registries.`,
        },
        {
          id: `${courseId}-m1-t3`,
          index: 3,
          title: `Administrative Sourcing, Field Protocols & Inter-Agency Coordination`,
          duration: '9 min',
          format: 'Video',
          videoUrl: getVideoForTopic(1, 3),
          description: `Procedures for secure inter-departmental data exchanges, field memoranda, and cross-cadre synchronization standards for ${roleName}.`,
        },
        {
          id: `${courseId}-m1-t4`,
          index: 4,
          title: `Data Governance Norms, Anonymization & DPDP Compliance`,
          duration: '11 min',
          format: 'Video',
          videoUrl: getVideoForTopic(1, 4),
          description: `Statutory guidelines under DPDP Act and official frameworks for respondent privacy, cryptographic masking, and disclosure risk control.`,
        },
        {
          id: `${courseId}-m1-t5`,
          index: 5,
          title: `Foundational Review & Operational Concept Evaluation`,
          duration: '10 min',
          format: 'Video',
          videoUrl: getVideoForTopic(1, 5),
          description: `Formative evaluation covering governance mandates, procedural milestones, and institutional risk mitigation strategies.`,
        },
      ],
    },
    {
      index: 2,
      title: `Applied Methodologies & Technical Pipelines (${competency})`,
      desc: `Hands-on implementation pipelines, automated data transformations, and domain-specific analytical models.`,
      topics: [
        {
          id: `${courseId}-m2-t1`,
          index: 1,
          title: `Data Ingestion Architecture & Initial Register Validation`,
          duration: '12 min',
          format: 'Video',
          videoUrl: getVideoForTopic(2, 1),
          description: `Setup of automated ingestion scripts, schema validation checks, and integrity verification on administrative feeds.`,
        },
        {
          id: `${courseId}-m2-t2`,
          index: 2,
          title: `Standardized Cleaning Protocols, Algorithmic Filters & Outlier Detection`,
          duration: '14 min',
          format: 'Video',
          videoUrl: getVideoForTopic(2, 2),
          description: `Practical application of rule-based outlier detectors, duplicate suppression routines, and format normalization rules for ${competency}.`,
        },
        {
          id: `${courseId}-m2-t3`,
          index: 3,
          title: `Computational Transformations & Aggregation Formulas for ${roleName}`,
          duration: '15 min',
          format: 'Video',
          videoUrl: getVideoForTopic(2, 3),
          description: `Advanced derivation of composite indices, weighted domain aggregates, and time-series normalization techniques.`,
        },
        {
          id: `${courseId}-m2-t4`,
          index: 4,
          title: `Analytical Modeling & Domain-Specific Estimation Workflows`,
          duration: '13 min',
          format: 'Video',
          videoUrl: getVideoForTopic(2, 4),
          description: `Execution of econometric, spatial, or sampling estimation models directly tied to ${title} workflows.`,
        },
        {
          id: `${courseId}-m2-t5`,
          index: 5,
          title: `Automated Output Generation, Artefact Logs & Reproducibility`,
          duration: '10 min',
          format: 'Video',
          videoUrl: getVideoForTopic(2, 5),
          description: `Compilation of reproducible execution logs, output data cubes, and version-controlled analytical artifacts.`,
        },
      ],
    },
    {
      index: 3,
      title: `Quality Assurance, Reconciliation & Audit (${competency})`,
      desc: `Field-tested quality frameworks, statistical reconciliation, and compliance checklists.`,
      topics: [
        {
          id: `${courseId}-m3-t1`,
          index: 1,
          title: `National Quality Assurance Framework (NQAF) Standards Alignment`,
          duration: '11 min',
          format: 'Video',
          videoUrl: getVideoForTopic(3, 1),
          description: `Benchmarking procedures against national and international quality dimensions including accuracy, timeliness, and coherence.`,
        },
        {
          id: `${courseId}-m3-t2`,
          index: 2,
          title: `Error Detection, Non-Sampling Variance & Imputation Methods`,
          duration: '14 min',
          format: 'Video',
          videoUrl: getVideoForTopic(3, 2),
          description: `Scientific methodologies for identifying non-sampling errors, hot/cold deck imputations, and variance adjustments.`,
        },
        {
          id: `${courseId}-m3-t3`,
          index: 3,
          title: `Audit Trails, Metadata Tracking & Provenance Registers`,
          duration: '9 min',
          format: 'Video',
          videoUrl: getVideoForTopic(3, 3),
          description: `Establishment of immutable audit logs, transformation histories, and standardized metadata registers for public accountability.`,
        },
        {
          id: `${courseId}-m3-t4`,
          index: 4,
          title: `Cross-Departmental Discrepancy Reconciliation & Quality Checklists`,
          duration: '12 min',
          format: 'Video',
          videoUrl: getVideoForTopic(3, 4),
          description: `Practical resolution workflows when reconciling central, state, and subordinate agency variances.`,
        },
        {
          id: `${courseId}-m3-t5`,
          index: 5,
          title: `Quality Assurance Sign-Off & Verification Protocols`,
          duration: '10 min',
          format: 'Video',
          videoUrl: getVideoForTopic(3, 5),
          description: `Official sign-off protocols, pre-publication validation matrices, and senior officer clearance checklists.`,
        },
      ],
    },
    {
      index: 4,
      title: `Competency Benchmark & Applied Scenario Evaluation (${roleName})`,
      desc: `Hands-on scenario evaluations, applied case studies, and certification readiness for ${roleName}.`,
      topics: [
        {
          id: `${courseId}-m4-t1`,
          index: 1,
          title: `Applied Public Sector Case Scenario: ${title}`,
          duration: '15 min',
          format: 'Video',
          videoUrl: getVideoForTopic(4, 1),
          description: `Deep-dive case study replicating a major ministry dataset challenge with real-world complexities and operational constraints.`,
        },
        {
          id: `${courseId}-m4-t2`,
          index: 2,
          title: `Diagnostic Problem Solving & Operational Edge Case Remediation`,
          duration: '12 min',
          format: 'Video',
          videoUrl: getVideoForTopic(4, 2),
          description: `Walkthrough of unexpected survey anomalies, system outages, and sudden policy indicator recalibrations.`,
        },
        {
          id: `${courseId}-m4-t3`,
          index: 3,
          title: `Synthesizing Executive Policy Briefs & Decision Dashboards`,
          duration: '14 min',
          format: 'Video',
          videoUrl: getVideoForTopic(4, 3),
          description: `Translating complex technical indicators into high-impact executive summaries, dashboards, and decision memos for ${department} leadership.`,
        },
        {
          id: `${courseId}-m4-t4`,
          index: 4,
          title: `Pre-Assessment Practical Simulation & Question Rubrics`,
          duration: '10 min',
          format: 'Video',
          videoUrl: getVideoForTopic(4, 4),
          description: `Detailed examination of benchmark assessment rubrics, scoring criteria, and simulated exam questions.`,
        },
        {
          id: `${courseId}-m4-t5`,
          index: 5,
          title: `Capstone Competency Evaluation & Role Certification Readiness`,
          duration: '15 min',
          format: 'Video',
          videoUrl: getVideoForTopic(4, 5),
          description: `Final synthesis capstone qualifying you for verified certification and official promotion screening eligibility.`,
        },
      ],
    },
  ]
}

function App() {
  const [language, setLanguage] = useState('en')
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [step, setStep] = useState('loading')
  const [dashboardView, setDashboardView] = useState(() => {
    return new URLSearchParams(window.location.search).get('view') || 'dashboard';
  })
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [ssoLoading, setSsoLoading] = useState(false)
  const [isSsoRegistrationOpen, setIsSsoRegistrationOpen] = useState(false)
  const [signupError, setSignupError] = useState('')
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState('')
  const [verifyEmail, setVerifyEmail] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [verificationError, setVerificationError] = useState('')
  const [verificationSuccess, setVerificationSuccess] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])
  const [roleSearch, setRoleSearch] = useState('')
  const [departmentSearch, setDepartmentSearch] = useState('')
  const [isDepartmentMenuOpen, setIsDepartmentMenuOpen] = useState(false)
  const [profile, setProfile] = useState({
    name: '', email: '', employeeId: '', department: '',
    organization: '', designation: '',
    assignment: '', currentAssignment: '', educationalQualifications: '', role: '', skills: '', experience: '',
    previousIGOT: '', previousNSSTA: '', externalTraining: '', certifications: '',
  })
  const [profileDraft, setProfileDraft] = useState({})
  const [adminSyncTick, setAdminSyncTick] = useState(0)

  useEffect(() => {
    const handleAdminUpdate = () => {
      setAdminSyncTick((prev) => prev + 1)
    }
    window.addEventListener('skillstat_admin_update', handleAdminUpdate)
    window.addEventListener('storage', handleAdminUpdate)
    return () => {
      window.removeEventListener('skillstat_admin_update', handleAdminUpdate)
      window.removeEventListener('storage', handleAdminUpdate)
    }
  }, [])

  const isAdmin = isAllowedAdmin(profile?.email)

  // (Admin redirect logic moved down to wait for state load)
  const [isProfileEditing, setIsProfileEditing] = useState(false)
  const [customRole, setCustomRole] = useState('')
  const [customSkill, setCustomSkill] = useState('')
  const [skillError, setSkillError] = useState('')
  const [selectedSkillList, setSelectedSkillList] = useState([])
  const [answer, setAnswer] = useState('')
  const [codeAnswer, setCodeAnswer] = useState('')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [questions, setQuestions] = useState([])
  const [questionResults, setQuestionResults] = useState([])
  const [activeQuizType, setActiveQuizType] = useState('standard') // 'standard' | 'weekend' | 'notes'
  const [skillGapData, setSkillGapData] = useState({})
  const [quizzesCompleted, setQuizzesCompleted] = useState(0)
  const [overallScore, setOverallScore] = useState(0)
  const [ssoDetails, setSsoDetails] = useState({
    name: '', email: '', mobile: '', designation: '', department: '', officialIdProof: '', nodalApproval: false,
  })

  // Official Skill Gaps & Combined Recommendation Engine State
  const [competencyGaps, setCompetencyGaps] = useState(initialCompetencyGaps)
  const [selectedSkillForRec, setSelectedSkillForRec] = useState(null)
  const [recommendationData, setRecommendationData] = useState(null)
  const [recommendationsBySkill, setRecommendationsBySkill] = useState({})
  const [isRecLoading, setIsRecLoading] = useState(false)
  const [currentQuizSkill, setCurrentQuizSkill] = useState('')
  const [gapFilter, setGapFilter] = useState('All')

  // Weekend Challenge & Leaderboard State (Clean Live State)
  const [weekendCompleted, setWeekendCompleted] = useState(() => localStorage.getItem('skillstat_weekend_completed') === 'true')
  const [weekendScore, setWeekendScore] = useState(() => Number(localStorage.getItem('skillstat_weekend_score')) || 0)
  const [userRank, setUserRank] = useState(() => {
    const saved = localStorage.getItem('skillstat_user_rank')
    return saved ? Number(saved) : null
  })
  const [leaderboard, setLeaderboard] = useState(() => {
    try {
      const saved = localStorage.getItem('skillstat_leaderboard')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Notes & PDF Upload State (Robust Document Extraction)
  const [notesFileName, setNotesFileName] = useState('')
  const [uploadedNotesText, setUploadedNotesText] = useState('')
  const [isParsingDoc, setIsParsingDoc] = useState(false)
  const [docExtractionError, setDocExtractionError] = useState('')
  const [docExtractionSuccess, setDocExtractionSuccess] = useState('')
  const [docExtractedConcepts, setDocExtractedConcepts] = useState([])
  const [activeCourseModal, setActiveCourseModal] = useState(null)
  const [activeLessonView, setActiveLessonView] = useState(null)
  const [completedTopics, setCompletedTopics] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('skillstat_completed_topics') || '{}')
    } catch {
      return {}
    }
  })
  const [expandedModule, setExpandedModule] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Save completed topics to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('skillstat_completed_topics', JSON.stringify(completedTopics))
    } catch {
      // ignore
    }
  }, [completedTopics])

  // Lock body scroll when course modal or video lesson view is open
  useEffect(() => {
    if (activeCourseModal || activeLessonView) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [activeCourseModal, activeLessonView])

  const handleMarkCompleteAndContinue = () => {
    if (!activeLessonView?.topic) return
    const currentKey = activeLessonView.topic.id
    setCompletedTopics((prev) => ({ ...prev, [currentKey]: true }))

    const curriculum = getCourseCurriculum(activeLessonView.course, profile)
    const mIdx = activeLessonView.moduleIndex
    const tIdx = activeLessonView.topicIndex

    if (tIdx < 4) {
      setActiveLessonView({
        ...activeLessonView,
        topicIndex: tIdx + 1,
        topic: curriculum[mIdx].topics[tIdx + 1],
      })
    } else if (mIdx < 3) {
      setActiveLessonView({
        ...activeLessonView,
        moduleIndex: mIdx + 1,
        topicIndex: 0,
        topic: curriculum[mIdx + 1].topics[0],
      })
      setExpandedModule(mIdx + 1)
    } else {
      setActiveLessonView(null)
    }
  }

  const handlePreviousTopic = () => {
    if (!activeLessonView?.topic) return
    const curriculum = getCourseCurriculum(activeLessonView.course, profile)
    const mIdx = activeLessonView.moduleIndex
    const tIdx = activeLessonView.topicIndex

    if (tIdx > 0) {
      setActiveLessonView({
        ...activeLessonView,
        topicIndex: tIdx - 1,
        topic: curriculum[mIdx].topics[tIdx - 1],
      })
    } else if (mIdx > 0) {
      setActiveLessonView({
        ...activeLessonView,
        moduleIndex: mIdx - 1,
        topicIndex: 4,
        topic: curriculum[mIdx - 1].topics[4],
      })
      setExpandedModule(mIdx - 1)
    }
  }

  const handleSkipForNow = () => {
    if (!activeLessonView?.topic) return
    const curriculum = getCourseCurriculum(activeLessonView.course, profile)
    const mIdx = activeLessonView.moduleIndex
    const tIdx = activeLessonView.topicIndex

    if (tIdx < 4) {
      setActiveLessonView({
        ...activeLessonView,
        topicIndex: tIdx + 1,
        topic: curriculum[mIdx].topics[tIdx + 1],
      })
    } else if (mIdx < 3) {
      setActiveLessonView({
        ...activeLessonView,
        moduleIndex: mIdx + 1,
        topicIndex: 0,
        topic: curriculum[mIdx + 1].topics[0],
      })
      setExpandedModule(mIdx + 1)
    } else {
      setActiveLessonView(null)
    }
  }

  const handleUndoCompletion = () => {
    if (!activeLessonView?.topic) return
    const currentKey = activeLessonView.topic.id
    setCompletedTopics((prev) => {
      const updated = { ...prev }
      delete updated[currentKey]
      return updated
    })
  }

  const [authModal, setAuthModal] = useState(null) // null | 'login' | 'signup' | 'sso'
  const [minLandingElapsed, setMinLandingElapsed] = useState(false)
  const minLandingElapsedRef = useRef(false)
  const pendingDashboardRef = useRef(false)
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('skillstat_session') || '')
  const [isStateLoaded, setIsStateLoaded] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const onboardingSessionRef = useRef(localStorage.getItem('skillstat_onboarding') === '1')

  useEffect(() => {
    if (dashboardView === 'admin' && !isAdmin && isStateLoaded) {
      const timer = setTimeout(() => {
        setDashboardView('dashboard')
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [dashboardView, isAdmin, isStateLoaded])

  const t = text[language] || extendedText[language] || text.en
  const tx = (key) => uiText[language]?.[key] || uiText.en[key] || key

  useEffect(() => {
    if (!sessionToken) {
      return
    }
    apiRequest('/api/state')
      .then(({ state }) => {
        if (state.profile) {
          const migratedProfile = state.profile.department === "India's Official Statistical System"
            ? { ...state.profile, department: 'National Statistical Office (NSO)' }
            : state.profile
          setProfile((current) => ({ ...current, ...migratedProfile }))
        }
        if (Array.isArray(state.selectedSkillList)) {
          const hydratedProfile = state.profile || {}
          const allowedSkills = new Set(getRoleSkillCategories(hydratedProfile.role, hydratedProfile.designation).flatMap(([, skills]) => skills))
          setSelectedSkillList(state.selectedSkillList.filter((skill) => allowedSkills.has(skill)))
        }
        if (state.skillGapData) setSkillGapData(state.skillGapData)
        if (Array.isArray(state.competencyGaps)) {
          const cleanedGaps = state.competencyGaps.map((g) => {
            const gapData = state.skillGapData?.[g.skill] || {}
            const isAssessed = gapData.totalQuestions > 0
            if (!isAssessed) {
              return { ...g, current: 0, priority: 'Pending', isAssessed: false }
            }
            return { ...g, isAssessed: true }
          })
          setCompetencyGaps(cleanedGaps)
        }
        if (state.recommendationData) setRecommendationData(state.recommendationData)
        if (state.recommendationsBySkill) setRecommendationsBySkill(state.recommendationsBySkill)
        if (Number.isFinite(state.quizzesCompleted)) setQuizzesCompleted(state.quizzesCompleted)
        if (Number.isFinite(state.overallScore)) setOverallScore(state.overallScore)
        if (Array.isArray(state.questionResults)) setQuestionResults(state.questionResults)
        if (Array.isArray(state.questions)) setQuestions(restoreQuestions(state.questions))
        if (Array.isArray(state.chatHistory)) setChatHistory(state.chatHistory)
        if (!onboardingSessionRef.current) {
          if (minLandingElapsedRef.current) {
            setStep('dashboard')
          } else {
            pendingDashboardRef.current = true
          }
        }
      })
      .catch(() => {
        localStorage.removeItem('skillstat_session')
        setSessionToken('')
      })
      .finally(() => setIsStateLoaded(true))
  }, [sessionToken])

  useEffect(() => {
    if (!sessionToken || !isStateLoaded) return
    const state = {
      profile,
      selectedSkillList,
      skillGapData,
      competencyGaps,
      recommendationData,
      recommendationsBySkill,
      quizzesCompleted,
      overallScore,
      questionResults,
      questions: serializeQuestions(questions),
      chatHistory,
    }
    const saveTimer = setTimeout(() => {
      apiRequest('/api/state', { method: 'POST', body: JSON.stringify(state) }).catch(() => {})
    }, 350)
    return () => clearTimeout(saveTimer)
  }, [sessionToken, isStateLoaded, profile, selectedSkillList, skillGapData, competencyGaps, recommendationData, recommendationsBySkill, quizzesCompleted, overallScore, questionResults, questions, chatHistory])

  const updateProfile = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }

  const clearSession = () => {
    onboardingSessionRef.current = false
    localStorage.removeItem('skillstat_onboarding')
    apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('skillstat_session')
    setSessionToken('')
    setIsStateLoaded(false)
    setProfile({
      name: '', email: '', employeeId: '', department: '', organization: '', designation: '',
      assignment: '', currentAssignment: '', educationalQualifications: '', role: '', skills: '', experience: '', previousIGOT: '',
      previousNSSTA: '', externalTraining: '', certifications: '',
    })
    setSelectedSkillList([])
    setQuizzesCompleted(0)
    setOverallScore(0)
    setQuestionResults([])
    setQuestions([])
    setIsProfileMenuOpen(false)
    setStep('login')
  }

  const selectDepartment = (departmentName) => {
    updateProfile('department', departmentName)
    updateProfile('designation', '')
    updateProfile('role', '')
    updateProfile('skills', '')
    setSelectedSkillList([])
    setDepartmentSearch(departmentName)
    setIsDepartmentMenuOpen(false)
  }

  const toggleSkill = (skill) => {
    const clean = skill.trim()
    if (!clean) return
    let updated
    if (selectedSkillList.includes(clean)) {
      updated = selectedSkillList.filter((s) => s !== clean)
    } else {
      updated = [...selectedSkillList, clean]
    }
    setSelectedSkillList(updated)
    updateProfile('skills', updated.join(', '))
  }

  const addCustomSkill = () => {
    const clean = customSkill.trim()
    if (!clean || selectedSkillList.includes(clean)) return
    if (!isSkillRelatedToRole(clean, profile.role, profile.designation)) {
      setSkillError(`Your skill "${clean}" is not related to your selected role or designation.`)
      return
    }
    const updated = [...selectedSkillList, clean]
    setSelectedSkillList(updated)
    updateProfile('skills', updated.join(', '))
    setCustomSkill('')
    setSkillError('')
  }

  const skillCategories = getRoleSkillCategories(profile.role, profile.designation)

  // Load initial recommendation data
  useEffect(() => {
    if (selectedSkillForRec) {
      getRecommendations(profile, selectedSkillForRec).then(setRecommendationData)
    }
  }, [profile, selectedSkillForRec, adminSyncTick])

  useEffect(() => {
    if (!profile.role || selectedSkillList.length === 0) return
    let cancelled = false
    const skillGaps = new Map(competencyGaps.map((gap) => [gap.skill, gap]))
    Promise.all(selectedSkillList.map((skill) => getRecommendations(profile, skillGaps.get(skill) || { skill })))
      .then((results) => {
        if (!cancelled) {
          setRecommendationsBySkill(Object.fromEntries(results.map((result) => [result.skill, result])))
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [profile, selectedSkillList, competencyGaps, adminSyncTick])

  // Handler for viewing recommendation for a specific competency gap
  const handleViewRecommendation = useCallback(async (gapItem) => {
    setSelectedSkillForRec(gapItem)
    setIsRecLoading(true)
    setDashboardView('recommendations')
    try {
      const rec = await getRecommendations(profile, gapItem)
      setRecommendationData(rec)
    } catch (err) {
      console.error('Failed to load recommendations:', err)
    } finally {
      setIsRecLoading(false)
    }
  }, [profile])

  useEffect(() => {
    document.body.classList.toggle('theme-dark', isDarkMode)
    return () => document.body.classList.remove('theme-dark')
  }, [isDarkMode])

  // Enforce Minimum 5 Seconds Landing Page Time
  useEffect(() => {
    const timer = setTimeout(() => {
      minLandingElapsedRef.current = true
      setMinLandingElapsed(true)
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!minLandingElapsed) return
    if (pendingDashboardRef.current) {
      setStep('dashboard')
      pendingDashboardRef.current = false
    } else if (step === 'loading') {
      if (sessionToken && !onboardingSessionRef.current) {
        setStep('dashboard')
      } else {
        setStep('login')
      }
    }
  }, [minLandingElapsed, sessionToken, step])

  // Handle PDF / Notes File Upload with Validation and Unicode Cleaning
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setNotesFileName(file.name)
    setIsParsingDoc(true)
    setDocExtractionError('')
    setDocExtractionSuccess('')
    setDocExtractedConcepts([])

    try {
      const result = await extractTextFromFile(file)
      setIsParsingDoc(false)
      if (!result.isValid) {
        setUploadedNotesText('')
        setDocExtractionError(result.error || 'Unable to read the uploaded material correctly. Please upload the document again or use a text-readable PDF.')
      } else {
        setUploadedNotesText(result.text)
        const concepts = extractConceptsFromText(result.text, 5)
        setDocExtractedConcepts(concepts)
        setDocExtractionSuccess(`Successfully extracted ${result.wordCount} words and identified ${concepts.length} key competency concepts.`)
      }
    } catch (err) {
      console.warn('Upload error:', err)
      setIsParsingDoc(false)
      setUploadedNotesText('')
      setDocExtractionError('Unable to read the uploaded material correctly. Please upload the document again or use a text-readable PDF.')
    }
  }

  // Start Quiz Function for All Modes with Validation
  const startQuiz = (quizMode = 'standard', specificSkill = '') => {
    setActiveQuizType(quizMode)
    setCurrentQuizSkill(specificSkill)

    // Mode 1: Document Studio AI Notes Quiz (does not require skillList)
    if (quizMode === 'notes') {
      const clean = cleanExtractedText(uploadedNotesText)
      const val = validateDocumentText(clean)
      if (!val.isValid) {
        setDocExtractionError(val.error || 'Unable to read the uploaded material correctly. Please upload the document again or use a text-readable PDF.')
        return
      }

      fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: profile.role || profile.designation,
          quizMode: 'notes',
          notesContent: clean,
          uiLanguage: language,
        }),
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error('AI fallback'))))
        .then((data) => {
          if (Array.isArray(data.questions) && data.questions.length >= 5) {
            const validated = validateAndCleanQuiz(data.questions, 'Document Notes')
            const distinct = ensureQuestionPromptsAreDistinct(ensureQuestionOptionsAreDistinct(validated))
            setQuestions(distinct.map((q, idx) => shuffleQuestionOptions(q, idx)))
          } else {
            throw new Error('Local extraction fallback')
          }
        })
        .catch(() => {
          const noteQs = buildScenarioQuestions(profile, t, [], 'notes', clean)
          if (!noteQs || noteQs.length === 0) {
            setDocExtractionError('Unable to extract sufficient quiz questions from this document. Please ensure the document contains descriptive paragraphs or procedures.')
            return
          }
          const distinct = ensureQuestionPromptsAreDistinct(ensureQuestionOptionsAreDistinct(noteQs))
          setQuestions(distinct.map((q, idx) => shuffleQuestionOptions(q, idx)))
        })
        .finally(() => {
          setQuestionIndex(0)
          setAnswer('')
          setCodeAnswer('')
          setQuestionResults([])
          setStep('test')
        })
      return
    }

    // Auto-resolve skills if selectedSkillList is empty
    let skillList = specificSkill ? [specificSkill] : [...selectedSkillList]
    if (skillList.length === 0) {
      if (profile.skills) {
        const fromProfile = (Array.isArray(profile.skills) ? profile.skills : String(profile.skills).split(',')).map((s) => String(s).trim()).filter(Boolean)
        if (fromProfile.length > 0) skillList = fromProfile
      }
      if (skillList.length === 0 && competencyGaps && competencyGaps.length > 0) {
        const fromGaps = competencyGaps.map((g) => g.skill || g.name).filter(Boolean)
        if (fromGaps.length > 0) skillList = fromGaps.slice(0, 3)
      }
      if (skillList.length === 0) {
        const roleSkills = getRoleSkillCategories(profile.role, profile.designation)
        if (Array.isArray(roleSkills) && roleSkills.length > 0) {
          skillList = roleSkills.reduce((acc, [, skills]) => acc.concat(skills), []).slice(0, 3)
        } else {
          skillList = ['Official Statistics & Survey Methodology', 'Public Sector Data Governance', 'Statistical Data Analysis']
        }
      }
      setSelectedSkillList(skillList)
    }

    const hasCoding = skillList.some((s) => codingLanguages.includes(s))
    const chosenLang = hasCoding ? skillList.filter(isCodingSkill).join(', ') : ''

    // Mode 2: Weekend Challenge
    if (quizMode === 'weekend') {
      const weekendQs = buildScenarioQuestions(profile, t, skillList, 'weekend')
      const distinct = ensureQuestionPromptsAreDistinct(ensureQuestionOptionsAreDistinct(weekendQs))
      setQuestions(distinct.map((q, idx) => shuffleQuestionOptions(q, idx)))
      setQuestionIndex(0)
      setAnswer('')
      setCodeAnswer('')
      setQuestionResults([])
      setStep('test')
      return
    }

    // Mode 3: Specific Single Skill (from course recommendation or competency modal)
    if (specificSkill) {
      const targetedQs = buildScenarioQuestions(profile, t, [specificSkill], 'standard', '', specificSkill)
      const distinct = ensureQuestionPromptsAreDistinct(ensureQuestionOptionsAreDistinct(targetedQs))
      setQuestions(distinct.map((q, idx) => shuffleQuestionOptions(q, idx)))
      setQuestionIndex(0)
      setAnswer('')
      setCodeAnswer('')
      setQuestionResults([])
      setStep('test')
      return
    }

    // Mode 4: Standard Skill Assessment
    setIsParsingDoc(true) // Reuse this generic loading state for standard quiz too
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500) // Fast fallback if server hangs

    fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        role: profile.role,
        skills: skillList.join(', '),
        experience: profile.experience,
        codingLanguage: chosenLang,
        uiLanguage: language,
      }),
    })
      .then((res) => {
        clearTimeout(timeoutId)
        return res.ok ? res.json() : Promise.reject(new Error('AI fallback'))
      })
      .then((data) => {
        const expectedQuestionCount = skillList.length * 10
        if (Array.isArray(data.questions) && data.questions.length >= expectedQuestionCount) {
          const validated = validateAndCleanQuiz(data.questions, skillList[0])
          const normalizedQuestions = validated.map((question) => (
            question.type === 'code'
              ? { ...question, checks: ensureCodeChecks(question.checks) }
              : question
          ))
          const distinctQuestions = ensureQuestionPromptsAreDistinct(ensureQuestionOptionsAreDistinct(normalizedQuestions))
          const selectedSkillNames = new Set(skillList.map((skill) => skill.toLowerCase()))
          const selectedQuestions = distinctQuestions.filter((question) => selectedSkillNames.has(String(question.skill || '').toLowerCase()))
          const questionCountBySkill = Object.fromEntries(skillList.map((skill) => [skill.toLowerCase(), 0]))
          selectedQuestions.forEach((question) => {
            const key = String(question.skill || '').toLowerCase()
            if (key in questionCountBySkill) questionCountBySkill[key] += 1
          })
          const hasTenPerSkill = skillList.every((skill) => questionCountBySkill[skill.toLowerCase()] >= 10)
          const requiredCodingQuestions = hasCoding ? selectedQuestions.filter((question) => question.type === 'code').length >= skillList.filter(isCodingSkill).length * 10 : true
          if (hasTenPerSkill && requiredCodingQuestions) {
            const mixedQuestions = selectedQuestions.slice(0, expectedQuestionCount)
            for (let i = mixedQuestions.length - 1; i > 0; i--) {
              const randomIndex = Math.floor(Math.random() * (i + 1))
              ;[mixedQuestions[i], mixedQuestions[randomIndex]] = [mixedQuestions[randomIndex], mixedQuestions[i]]
            }
            setQuestions(mixedQuestions.map((q, idx) => shuffleQuestionOptions(q, idx)))
            return
          }
        }
        const fallbackQs = getSkillSpecificQuestions(profile, t, skillList)
        const distinct = ensureQuestionPromptsAreDistinct(ensureQuestionOptionsAreDistinct(fallbackQs))
        setQuestions(distinct.map((q, idx) => shuffleQuestionOptions(q, idx)))
      })
      .catch(() => {
        const fallbackQs = getSkillSpecificQuestions(profile, t, skillList)
        const distinct = ensureQuestionPromptsAreDistinct(ensureQuestionOptionsAreDistinct(fallbackQs))
        setQuestions(distinct.map((q, idx) => shuffleQuestionOptions(q, idx)))
      })
      .finally(() => {
        setIsParsingDoc(false)
        setQuestionIndex(0)
        setAnswer('')
        setCodeAnswer('')
        setQuestionResults([])
        setStep('test')
      })
  }

  // Answer Submission & Verified Competency Update
  const handleAnswerSubmit = () => {
    const currentQ = questions[questionIndex]
    if (!currentQ) return

    let isCorrect = false
    if (currentQ.type === 'code') {
      const codeVal = validateCode(codeAnswer, currentQ)
      isCorrect = codeVal.state === 'valid'
    } else {
      const expectedCorrect = typeof currentQ.correctIndex === 'number'
        ? currentQ.correctIndex
        : typeof currentQ.answerIndex === 'number'
        ? currentQ.answerIndex
        : 0
      isCorrect = parseInt(answer, 10) === expectedCorrect
    }

    const currentResult = {
      questionIndex,
      skill: currentQ.skill,
      isCorrect,
      type: currentQ.type,
    }

    const updatedResults = [...questionResults, currentResult]
    setQuestionResults(updatedResults)

    // In-place Progressive Difficulty Adaptation:
    // If user answers correctly and there are upcoming questions,
    // escalate the difficulty of the next question in-place without increasing total questions!
    if (isCorrect && questionIndex + 1 < questions.length) {
      const nextQ = questions[questionIndex + 1]
      if (nextQ && nextQ.type !== 'code') {
        const currentDiffLevel = currentQ.difficultyLevel || 2
        const targetLevel = Math.min(4, Math.max(currentDiffLevel + 1, 3))
        if ((nextQ.difficultyLevel || 1) < targetLevel) {
          const elevatedQ = createAdaptiveQuestion(
            profile,
            t,
            nextQ.skill || currentQ.skill || 'Core Capability',
            questionIndex + 2,
            targetLevel
          )
          setQuestions((prevQuestions) => {
            const copy = [...prevQuestions]
            copy[questionIndex + 1] = elevatedQ
            return copy
          })
        }
      }
    }

    if (questionIndex === questions.length - 1) {
      const totalCorrect = updatedResults.filter((r) => r.isCorrect).length
      const calculatedScore = Math.round((totalCorrect / updatedResults.length) * 100)

      if (activeQuizType === 'weekend') {
        // Compute weekend rank on leaderboard
        setWeekendCompleted(true)
        setWeekendScore(calculatedScore)
        localStorage.setItem('skillstat_weekend_completed', 'true')
        localStorage.setItem('skillstat_weekend_score', String(calculatedScore))

        const newRank = 1
        setUserRank(newRank)
        localStorage.setItem('skillstat_user_rank', String(newRank))

        const userInitial = getUserInitial(profile.name)
        const userEntry = {
          id: Date.now(),
          name: profile.name ? `${profile.name} (You)` : 'You',
          role: (profile.role && profile.role.trim()) || (profile.designation && profile.designation.trim()) || 'Professional',
          score: calculatedScore,
          accuracy: `${calculatedScore}%`,
          rank: 1,
          badge: calculatedScore >= 90 ? '🥇 Champion' : calculatedScore >= 75 ? '🥈 Top Performer' : '⭐ Certified',
          avatar: userInitial || 'U',
          isUser: true,
        }

        const updatedBoard = [userEntry]
        setLeaderboard(updatedBoard)
        localStorage.setItem('skillstat_leaderboard', JSON.stringify(updatedBoard))
      } else {
        // Formal competency update: Only after assessment evaluation
        const assessedSkill = currentQuizSkill || (currentQ.skill && !currentQ.skill.startsWith('Notes') ? currentQ.skill : selectedSkillList[0] || 'AI/ML')

        setCompetencyGaps((prevGaps) => {
          return prevGaps.map((item) => {
            if (item.skill.toLowerCase() === assessedSkill.toLowerCase() || (activeQuizType === 'standard' && updatedResults.some((r) => r.skill === item.skill))) {
              const skillResults = updatedResults.filter((r) => r.skill === item.skill)
              const skillScore = skillResults.length > 0
                ? Math.round((skillResults.filter((r) => r.isCorrect).length / skillResults.length) * 100)
                : calculatedScore

              const newCurrent = skillScore
              const newGap = Math.max(0, item.required - newCurrent)
              const newPriority = newGap >= 30 ? 'Critical' : newGap >= 15 ? 'Moderate' : 'Low'

              const updatedItem = {
                ...item,
                current: newCurrent,
                gap: newGap,
                priority: newPriority,
              }

              // Update recommendation engine with recalculated gap
              if (selectedSkillForRec?.skill.toLowerCase() === item.skill.toLowerCase()) {
                setSelectedSkillForRec(updatedItem)
                getRecommendations(profile, updatedItem).then(setRecommendationData)
              }

              return updatedItem
            }
            return item
          })
        })

        const skillMap = { ...skillGapData }
        const activeSkills = selectedSkillList.length ? selectedSkillList : ['Problem solving', 'Communication']

        activeSkills.forEach((sk) => {
          if (!skillMap[sk]) {
            skillMap[sk] = { totalQuestions: 0, correctQuestions: 0, proficiency: 0 }
          }
        })

        updatedResults.forEach((res) => {
          const sk = res.skill || activeSkills[0]
          if (!skillMap[sk]) {
            skillMap[sk] = { totalQuestions: 0, correctQuestions: 0, proficiency: 0 }
          }
          skillMap[sk].totalQuestions += 1
          if (res.isCorrect) {
            skillMap[sk].correctQuestions += 1
          }
          skillMap[sk].proficiency = Math.round(
            (skillMap[sk].correctQuestions / skillMap[sk].totalQuestions) * 100
          )
        })

        setSkillGapData(skillMap)
        setOverallScore(calculatedScore)
      }

      setQuizzesCompleted((prev) => prev + 1)
      setStep('gap')
    } else {
      setQuestionIndex((prev) => prev + 1)
      setAnswer('')
      setCodeAnswer('')
    }
  }

  const recommendedRoles = getRecommendedRoles(profile)
  const baseRoles = recommendedRoles

  const filteredRoles = baseRoles.filter((r) =>
    r.toLowerCase().includes(roleSearch.toLowerCase())
  )

  // -------------------------------------------------------------
  // VIEW: Loading Screen (Rotating Circular Coil Splash)
  // -------------------------------------------------------------
  if (step === 'loading') {
    return (
      <div className="landing-viewport">
        <header className="landing-top-bar" style={{ opacity: 0.7 }}>
          <Brand />
        </header>

        <main className="landing-hero-center">
          <RotatingCoil logoSrc="/logo.png" />
          <div className="landing-progress-wrap">
            <div className="landing-progress-bar">
              <div className="landing-progress-fill" />
            </div>
            <div className="landing-init-text">
              {tx('initializing')}
            </div>
          </div>
        </main>

        <footer className="landing-footer" style={{ opacity: 0.7 }}>
          <div>🔒 {tx('securePlatform')} • Official Government of India Competency Portal</div>
          <div>MoSPI & Civil Services Digital Dossier</div>
        </footer>
      </div>
    )
  }

  // -------------------------------------------------------------
  // VIEW: Landing Page (2nd Screenshot Aesthetic + Rotating Circular Coil + 1st SS Logo)
  // -------------------------------------------------------------
  if (step === 'login') {
    return (
      <div className="landing-viewport">
        {/* Top Navigation Bar */}
        <header className="landing-top-bar">
          <Brand />

          <div className="landing-nav-right">
            <div className="language-badge">
              <span className="lang-icon">🌐</span>
              <select
                className="lang-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                aria-label="Select Language"
              >
                {supportedLanguages.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="theme-toggle"
              onClick={() => setIsDarkMode((value) => !value)}
              title="Toggle Theme"
            >
              {isDarkMode ? '☀ Light' : '◐ Dark'}
            </button>

            <button
              type="button"
              className="landing-secondary-btn"
              onClick={() => setAuthModal('login')}
            >
              {t.signIn || 'Sign In'}
            </button>
          </div>
        </header>

        {/* Center Hero: 2nd Screenshot Aesthetic with 1st SS Logo & Rotating Circular Coil */}
        <main className="landing-hero-center">
          <RotatingCoil logoSrc="/logo.png" />

          {/* Action Buttons */}
          <div className="landing-actions-group">
            {sessionToken ? (
              <button
                type="button"
                className="landing-primary-btn"
                onClick={() => setStep('dashboard')}
              >
                <span>{t.openDashboard || 'Go to Dashboard'}</span>
                <span className="btn-arrow">→</span>
              </button>
            ) : (
              <button
                type="button"
                className="landing-primary-btn"
                onClick={() => {
                  setSignupError('')
                  setStep('signup')
                }}
              >
                <span>Create Account</span>
                <span className="btn-arrow">→</span>
              </button>
            )}

            <button
              type="button"
              className="landing-secondary-btn"
              onClick={() => setAuthModal('login')}
            >
              <span>{t.signIn || 'Sign In'}</span>
            </button>

            <button
              type="button"
              className="landing-sso-btn"
              onClick={() => {
                setSignupError('')
                setIsSsoRegistrationOpen(true)
                setAuthModal('sso')
              }}
            >
              <span className="sso-flag">🇮🇳</span>
              <span>{tx('continueSso')}</span>
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="landing-footer">
          <div>🔒 {tx('securePlatform')} • Official Government of India Competency Portal</div>
          <div>MoSPI & Civil Services Digital Dossier</div>
        </footer>

        {/* Sign In Modal */}
        {authModal === 'login' && (
          <div className="auth-modal-backdrop" onClick={() => setAuthModal(null)} role="dialog" aria-modal="true">
            <div className="auth-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="auth-modal-close"
                onClick={() => setAuthModal(null)}
                aria-label="Close"
              >
                ✕
              </button>
              <Brand />
              <p className="kicker" style={{ marginTop: '12px' }}>{tx('intelligentEvaluation')}</p>
              <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0 6px' }}>{t.welcome}</h2>
              <p className="helper">{t.signIn}</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setSignupError('')
                  const identity = e.currentTarget.elements.identity.value.trim()
                  const password = e.currentTarget.elements.password.value
                  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity)
                  if (!isEmail && !/^[A-Za-z0-9][A-Za-z0-9-]{2,}$/.test(identity)) {
                    setSignupError('Enter a valid work email or employee ID.')
                    return
                  }
                  apiRequest('/api/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ email: isEmail ? identity : '', employeeId: isEmail ? '' : identity, password }),
                  }).then(({ token, state }) => {
                    onboardingSessionRef.current = false
                    localStorage.removeItem('skillstat_onboarding')
                    localStorage.setItem('skillstat_session', token)
                    setSessionToken(token)
                    if (state?.profile) setProfile((current) => ({ ...current, ...state.profile }))
                    setAuthModal(null)
                    setStep('dashboard')
                  }).catch((error) => {
                    setSignupError(error.message)
                    if (error.emailUnverified || error.message?.toLowerCase().includes('verify your email')) {
                      setUnverifiedEmail(error.email || (isEmail ? identity : ''))
                    } else {
                      setUnverifiedEmail('')
                    }
                  })
                }}
              >
                <label className="auth-form-field">
                  <span>Work email or employee ID</span>
                  <input name="identity" type="text" placeholder="you@company.com or EMP-24018" autoComplete="username" required />
                </label>
                <label className="auth-form-field">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t.password}</span>
                    <button type="button" className="text-button" style={{ fontSize: '13px', color: 'var(--primary, var(--green))', padding: 0 }} onClick={() => setAuthModal('forgot-password')}>
                      Forgot password?
                    </button>
                  </div>
                  <input name="password" type="password" placeholder="••••••••" required />
                </label>
                {signupError && <p className="form-error" role="alert">{signupError}</p>}
                {unverifiedEmail && (
                  <div className="unverified-action-box">
                    <span>Account requires email verification.</span>
                    <button
                      type="button"
                      className="unverified-verify-btn"
                      onClick={() => {
                        setVerifyEmail(unverifiedEmail)
                        setOtpDigits(['', '', '', '', '', ''])
                        setVerificationError('')
                        setVerificationSuccess('')
                        setAuthModal(null)
                        setStep('verify-email')
                      }}
                    >
                      Enter verification code →
                    </button>
                  </div>
                )}

                <button type="submit" className="primary-action" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
                  {t.continue} <span>→</span>
                </button>
              </form>

              <div className="login-divider"><span>OR</span></div>

              <button
                className="sso-demo-button"
                type="button"
                disabled={ssoLoading}
                onClick={() => {
                  setSignupError('')
                  setIsSsoRegistrationOpen(true)
                  setAuthModal('sso')
                }}
              >
                {tx('continueSso')}
              </button>

              <p className="signup-prompt" style={{ marginTop: '16px' }}>
                New to Skillstat AI?{' '}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setSignupError('')
                    setAuthModal(null)
                    setStep('signup')
                  }}
                >
                  Create an account
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Forgot Password Modal */}
        {authModal === 'forgot-password' && (
          <div className="auth-modal-backdrop" onClick={() => setAuthModal('login')} role="dialog" aria-modal="true">
            <div className="auth-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="auth-modal-close"
                onClick={() => setAuthModal('login')}
                aria-label="Close"
              >
                ✕
              </button>
              <Brand />
              <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '16px 0 6px' }}>Reset password</h2>
              <p className="helper">Enter your email and we will send you a reset link.</p>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setSignupError('')
                  const email = e.currentTarget.elements.email.value.trim()
                  apiRequest('/api/auth/forgot-password', {
                    method: 'POST',
                    body: JSON.stringify({ email }),
                  }).then((res) => {
                    setSignupError('If an account matches, a reset link has been sent.')
                  }).catch((error) => {
                    setSignupError(error.message)
                  })
                }}
              >
                <label className="auth-form-field" style={{ marginTop: '16px' }}>
                  <span>Work email</span>
                  <input name="email" type="email" placeholder="you@company.com" required />
                </label>
                {signupError && <p className={signupError.includes('sent') ? 'form-success' : 'form-error'} role="alert" style={{ marginTop: '8px', color: signupError.includes('sent') ? 'var(--primary, var(--green))' : 'var(--red)' }}>{signupError}</p>}

                <button type="submit" className="primary-action" style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}>
                  Send reset link <span>→</span>
                </button>
              </form>

              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setSignupError('')
                    setAuthModal('login')
                  }}
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SSO Modal */}
        {authModal === 'sso' && isSsoRegistrationOpen && (
          <div className="auth-modal-backdrop" onClick={() => setAuthModal(null)} role="dialog" aria-modal="true">
            <div className="auth-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="auth-modal-close"
                onClick={() => {
                  setAuthModal(null)
                  setIsSsoRegistrationOpen(false)
                }}
                aria-label="Close"
              >
                ✕
              </button>
              <Brand />
              <p className="sso-form-heading" style={{ marginTop: '12px' }}>Parichay account details</p>
              <p className="sso-form-hint">One-time registration is completed by your government department.</p>

              <form
                className="sso-registration-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  const formData = new FormData(event.currentTarget)
                  const details = {
                    name: String(formData.get('name') || '').trim(),
                    email: String(formData.get('email') || '').trim().toLowerCase(),
                    mobile: String(formData.get('mobile') || '').trim(),
                    designation: String(formData.get('designation') || '').trim(),
                    department: String(formData.get('department') || '').trim(),
                    officialIdProof: String(formData.get('officialIdProof') || '').trim(),
                    nodalApproval: formData.get('nodalApproval') === 'on',
                  }
                  if (!/@(?:nic\.in|gov\.in)$/i.test(details.email)) {
                    setSignupError('Use your government email ending in @nic.in or @gov.in.')
                    return
                  }
                  if (!/^\+?[0-9\s-]{10,15}$/.test(details.mobile)) {
                    setSignupError('Enter a valid mobile number.')
                    return
                  }
                  if (!details.officialIdProof || !details.nodalApproval) {
                    setSignupError('Official ID proof and Nodal Officer / Reporting Officer approval are required.')
                    return
                  }
                  setSsoLoading(true)
                  apiRequest('/api/auth/parichay', { method: 'POST', body: JSON.stringify(details) })
                    .then(({ token, state }) => {
                      localStorage.setItem('skillstat_session', token)
                      setSessionToken(token)
                      setProfile((current) => ({ ...current, ...(state?.profile || {}), ...details, employeeId: state?.profile?.employeeId || '' }))
                      setSsoDetails(details)
                      setIsSsoRegistrationOpen(false)
                      setAuthModal(null)
                      setSignupError('')
                      setStep('profile')
                    })
                    .catch((error) => setSignupError(error.message || 'Unable to connect to Government SSO.'))
                    .finally(() => setSsoLoading(false))
                }}
              >
                <label className="auth-form-field"><span>Full name</span><input name="name" value={ssoDetails.name} onChange={(event) => setSsoDetails((current) => ({ ...current, name: event.target.value }))} required /></label>
                <label className="auth-form-field"><span>Government email</span><input name="email" type="email" placeholder="name@nic.in" value={ssoDetails.email} onChange={(event) => setSsoDetails((current) => ({ ...current, email: event.target.value }))} required /></label>
                <label className="auth-form-field"><span>Mobile number</span><input name="mobile" type="tel" placeholder="+91 9876543210" value={ssoDetails.mobile} onChange={(event) => setSsoDetails((current) => ({ ...current, mobile: event.target.value }))} required /></label>
                <label className="auth-form-field"><span>Designation</span><input name="designation" value={ssoDetails.designation} onChange={(event) => setSsoDetails((current) => ({ ...current, designation: event.target.value }))} required /></label>
                <label className="auth-form-field"><span>Department / organisation</span><input name="department" value={ssoDetails.department} onChange={(event) => setSsoDetails((current) => ({ ...current, department: event.target.value }))} required /></label>
                <label className="auth-form-field"><span>Official ID proof reference</span><input name="officialIdProof" placeholder="ID / document reference" value={ssoDetails.officialIdProof} onChange={(event) => setSsoDetails((current) => ({ ...current, officialIdProof: event.target.value }))} required /></label>
                <label className="sso-approval-control"><input name="nodalApproval" type="checkbox" required /> <span>Nodal Officer / Reporting Officer approval confirmed</span></label>
                {signupError && <p className="form-error" role="alert">{signupError}</p>}
                <button type="submit" className="primary-action" disabled={ssoLoading} style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>
                  {ssoLoading ? tx('connectingSso') : 'Verify with Parichay'} <span>→</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (step === 'signup') {
    return (
      <div className="login-screen-container">
        <InteractiveBackground />

        <div className="top-right-bar">
          <div className="language-badge">
            <span className="lang-icon">🌐</span>
            <select
              className="lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Select Language"
            >
              {supportedLanguages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>

        <section className="login-card signup-card">
          <Brand />
          <p className="kicker">GET STARTED</p>
          <h1>Create your account</h1>
          <p className="helper">Set up your Skillstat AI account to begin your competency journey.</p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (isSigningUp) return
              const formData = new FormData(e.currentTarget)
              const password = formData.get('password')
              const confirmPassword = formData.get('confirmPassword')
              if (password !== confirmPassword) {
                setSignupError('Passwords do not match.')
                return
              }

              const name = formData.get('name')?.toString().trim() || ''
              const email = formData.get('email')?.toString().trim().toLowerCase() || ''
              setIsSigningUp(true)
              setSignupError('')
              apiRequest('/api/auth/signup', {
                method: 'POST',
                body: JSON.stringify({ name, email, password }),
              }).then((data) => {
                if (data.requiresVerification) {
                  setVerifyEmail(email)
                  setOtpDigits(['', '', '', '', '', ''])
                  setVerificationError('')
                  setVerificationSuccess('')
                  setResendCooldown(30)
                  setStep('verify-email')
                } else if (data.token) {
                  onboardingSessionRef.current = true
                  localStorage.setItem('skillstat_onboarding', '1')
                  localStorage.setItem('skillstat_session', data.token)
                  setSessionToken(data.token)
                  setSignupError('')
                  setProfile((previous) => ({ ...previous, ...(data.state?.profile || {}), name, email }))
                  setDepartmentSearch('')
                  setIsDepartmentMenuOpen(false)
                  setSelectedSkillList([])
                  setQuizzesCompleted(0)
                  setOverallScore(0)
                  setStep('profile')
                }
              }).catch((error) => {
                setSignupError(error.message || 'Unable to sign in. Start the backend server and try again.')
              }).finally(() => {
                setIsSigningUp(false)
              })
            }}
          >
            <label>
              Full name
              <input name="name" type="text" placeholder="Your full name" autoComplete="name" required />
            </label>
            <label>
              Work email
              <input name="email" type="email" placeholder="your@company.com" autoComplete="email" required />
            </label>
            <label>
              Password
              <input name="password" type="password" placeholder="At least 8 characters" minLength="8" autoComplete="new-password" required />
            </label>
            <label>
              Confirm password
              <input name="confirmPassword" type="password" placeholder="Re-enter your password" minLength="8" autoComplete="new-password" required />
            </label>
            {signupError && <p className="form-error" role="alert">{signupError}</p>}
            <button type="submit" className="primary-action" disabled={isSigningUp}>
              {isSigningUp ? 'Creating account & sending code...' : <>Create account <span>→</span></>}
            </button>
          </form>
          <p className="signup-prompt">Already have an account? <button type="button" className="text-button" onClick={() => { setSignupError(''); setStep('login') }}>Sign in</button></p>
          <button type="button" className="theme-toggle" onClick={() => setIsDarkMode((value) => !value)}>
            {isDarkMode ? '☀ Light theme' : '◐ Dark theme'}
          </button>
        </section>
      </div>
    )
  }

  if (step === 'verify-email') {
    const handleOtpChange = (index, value) => {
      const clean = value.replace(/\D/g, '')
      if (clean.length > 1) {
        const digits = clean.slice(0, 6).split('')
        const next = [...otpDigits]
        digits.forEach((d, i) => {
          if (index + i < 6) next[index + i] = d
        })
        setOtpDigits(next)
        const nextIdx = Math.min(5, index + digits.length)
        document.getElementById(`otp-digit-${nextIdx}`)?.focus()
        return
      }

      const next = [...otpDigits]
      next[index] = clean.slice(-1)
      setOtpDigits(next)

      if (clean && index < 5) {
        document.getElementById(`otp-digit-${index + 1}`)?.focus()
      }
    }

    const handleOtpKeyDown = (index, e) => {
      if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
        document.getElementById(`otp-digit-${index - 1}`)?.focus()
      }
    }

    const handleVerifySubmit = (e) => {
      if (e) e.preventDefault()
      const code = otpDigits.join('')
      if (code.length < 6) {
        setVerificationError('Please enter all 6 digits of the verification code.')
        return
      }

      setIsVerifying(true)
      setVerificationError('')
      setVerificationSuccess('')

      apiRequest('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: verifyEmail, code }),
      })
        .then(({ token, state, user }) => {
          onboardingSessionRef.current = true
          localStorage.setItem('skillstat_onboarding', '1')
          localStorage.setItem('skillstat_session', token)
          setSessionToken(token)
          setProfile((previous) => ({
            ...previous,
            ...(state?.profile || {}),
            email: verifyEmail,
            name: user?.profile?.name || previous.name,
          }))
          setDepartmentSearch('')
          setIsDepartmentMenuOpen(false)
          setSelectedSkillList([])
          setQuizzesCompleted(0)
          setOverallScore(0)
          setStep('profile')
        })
        .catch((err) => {
          setVerificationError(err.message || 'Verification failed. Please check the code and try again.')
        })
        .finally(() => {
          setIsVerifying(false)
        })
    }

    const handleResend = () => {
      if (resendCooldown > 0) return
      setVerificationError('')
      setVerificationSuccess('')
      apiRequest('/api/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: verifyEmail }),
      })
        .then(() => {
          setResendCooldown(30)
          setVerificationSuccess('A new verification code has been dispatched to your email.')
        })
        .catch((err) => {
          setVerificationError(err.message || 'Unable to resend verification code.')
        })
    }

    return (
      <div className="login-screen-container">
        <InteractiveBackground />

        <div className="top-right-bar">
          <div className="language-badge">
            <span className="lang-icon">🌐</span>
            <select
              className="lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Select Language"
            >
              {supportedLanguages.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <section className="login-card verify-card">
          <Brand />
          <div className="verify-icon-container">
            <span className="verify-mail-icon" aria-hidden="true">✉</span>
          </div>
          <p className="kicker">EMAIL VERIFICATION</p>
          <h1>Verify your email</h1>
          <p className="helper">
            We sent a 6-digit verification code to<br />
            <strong className="verify-target-email">{verifyEmail}</strong>
          </p>

          <form onSubmit={handleVerifySubmit} className="verify-form">
            <div className="otp-digit-grid">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-digit-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  autoComplete="one-time-code"
                  autoFocus={idx === 0}
                  className={`otp-digit-box ${digit ? 'is-filled' : ''}`}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onPaste={(e) => {
                    e.preventDefault()
                    const pasteData = e.clipboardData.getData('text')
                    handleOtpChange(idx, pasteData)
                  }}
                />
              ))}
            </div>

            {verificationError && <p className="form-error" role="alert">{verificationError}</p>}
            {verificationSuccess && <p className="form-success" role="status">{verificationSuccess}</p>}

            <button
              type="submit"
              className="primary-action"
              disabled={isVerifying || otpDigits.join('').length < 6}
            >
              {isVerifying ? 'Verifying...' : 'Verify & Complete'} <span>→</span>
            </button>
          </form>

          <div className="resend-control-row">
            <span className="resend-label">Didn't receive the email?</span>
            <button
              type="button"
              className="text-button resend-action-btn"
              disabled={resendCooldown > 0}
              onClick={handleResend}
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
            </button>
          </div>

          <div className="verify-nav-links">
            <button
              type="button"
              className="text-button inline-link"
              onClick={() => {
                setVerificationError('')
                setVerificationSuccess('')
                setStep('signup')
              }}
            >
              ← Edit details / Back to sign up
            </button>
            <span className="divider-dot">•</span>
            <button
              type="button"
              className="text-button inline-link"
              onClick={() => {
                setVerificationError('')
                setVerificationSuccess('')
                setStep('login')
              }}
            >
              Sign in
            </button>
          </div>

          <button type="button" className="theme-toggle" onClick={() => setIsDarkMode((value) => !value)}>
            {isDarkMode ? '☀ Light theme' : '◐ Dark theme'}
          </button>
        </section>
      </div>
    )
  }

  if (step === 'profile') {
    const selectedDepartment = getDepartmentDetails(profile.department)
    const filteredDepartments = getEffectiveDepartments().filter(({ name }) => name.toLowerCase().includes(departmentSearch.toLowerCase()))
    return (
      <div className="simple-page">
        <div className="page-centered-container selection-page">
          <div className="top-nav-bar">
            <button className="back-nav-btn" onClick={() => setStep(sessionToken ? 'dashboard' : 'login')}>← {sessionToken ? 'Back to Dashboard' : t.back}</button>
            <div className="nav-brand"><Brand /></div>
          </div>
          <section className="selection-card profile-onboarding-card">
            <div className="step-heading">
              <p className="kicker">STEP 1 OF 4 · {tx('officialProfile')}</p>
              <h1>{tx('setupProfile')}</h1>
              <p className="helper">{tx('profileHint')}</p>
            </div>
            <div className="profile-form-grid">
              <label className="profile-field">{tx('fullName')}
                <input value={profile.name} placeholder="Your full name" onChange={(e) => updateProfile('name', e.target.value)} />
              </label>
              <label className="profile-field">{tx('employeeId')}
                <input value={profile.employeeId} placeholder="e.g. EMP-24018" onChange={(e) => updateProfile('employeeId', e.target.value)} />
              </label>
              <label className="profile-field">Current assignment
                <input value={profile.currentAssignment || profile.assignment} placeholder="e.g. Consumer Price Index compilation" onChange={(e) => { updateProfile('currentAssignment', e.target.value); updateProfile('assignment', e.target.value) }} />
              </label>
              <label className="profile-field">Educational qualifications
                <input value={profile.educationalQualifications} placeholder="e.g. M.Stat, Economics, Mathematics, Data Science" onChange={(e) => updateProfile('educationalQualifications', e.target.value)} />
              </label>
              <label className="profile-field department-combobox">Departments
                <div className="department-input-wrap">
                  <input
                    value={departmentSearch}
                    placeholder="India's Official Statistical System"
                    onFocus={() => setIsDepartmentMenuOpen(true)}
                    onChange={(e) => {
                      setDepartmentSearch(e.target.value)
                      setIsDepartmentMenuOpen(true)
                      if (profile.department && e.target.value !== profile.department) updateProfile('department', '')
                    }}
                    aria-label="Select India's Official Statistical System"
                    role="combobox"
                    aria-expanded={isDepartmentMenuOpen}
                  />
                  <span className="select-chevron">⌄</span>
                </div>
                {isDepartmentMenuOpen && (
                  <div className="department-options" role="listbox">
                    {filteredDepartments.length > 0 ? filteredDepartments.map(({ name }) => (
                      <button key={name} type="button" role="option" aria-selected={profile.department === name} onMouseDown={(e) => e.preventDefault()} onClick={() => selectDepartment(name)}>
                        {name}
                      </button>
                    )) : <span className="department-empty">No department matches that search.</span>}
                  </div>
                )}
              </label>
              <label className="profile-field">Statistical designation
                <select
                  value={profile.designation}
                  disabled={!selectedDepartment}
                  onChange={(e) => {
                    updateProfile('designation', e.target.value)
                    updateProfile('role', '')
                    setSelectedSkillList([])
                    updateProfile('skills', '')
                  }}
                >
                  <option value="">{selectedDepartment ? 'Select your statistical designation' : 'Select the statistical system first'}</option>
                  {(selectedDepartment?.designations || []).map((designation) => <option key={designation} value={designation}>{designation}</option>)}
                </select>
              </label>
            </div>
            <div className="selection-actions">
              <button className="secondary-action btn-back" onClick={() => setStep(sessionToken ? 'dashboard' : 'login')}>← {sessionToken ? 'Cancel & Return to Dashboard' : t.back}</button>
              {sessionToken && (
                <button className="secondary-action" disabled={!profile.department || !profile.designation} onClick={() => setStep('dashboard')}>
                  Save & Return to Dashboard <span>✓</span>
                </button>
              )}
              <button className="primary-action btn-next" disabled={!profile.department || !profile.designation} onClick={() => setStep('role')}>Continue to Role <span>→</span></button>
            </div>
          </section>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // VIEW: Step 1 - Choose Job Role (Centered & No Viewport Overflow)
  // -------------------------------------------------------------
  if (step === 'role') {
    return (
      <div className="simple-page">
        <div className="page-centered-container selection-page">
          <div className="top-nav-bar">
            <button className="back-nav-btn" onClick={() => setStep('profile')}>
              ← {t.back}
            </button>
            <div className="nav-brand">
              <Brand />
            </div>
          </div>

          <section className="selection-card">
            <div className="step-heading">
              <p className="kicker">STEP 1 OF 3</p>
              <h1>{t.step1Title}</h1>
              <p className="helper">{t.step1Hint}</p>
            </div>

            <div className="search-box-wrapper">
              <span className="search-icon">🔍</span>
              <input
                className="role-search-input"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder={t.searchRole}
              />
              {roleSearch && (
                <button className="clear-search" onClick={() => setRoleSearch('')}>
                  ×
                </button>
              )}
            </div>

            <div className="role-recommendation-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px', padding: '10px 14px', background: 'var(--paper)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line-light)' }}>
              <div style={{ fontSize: '13px', color: 'var(--ink)' }}>
                {profile.designation ? (
                  <>Recommended for designation: <strong style={{ color: 'var(--green)' }}>{profile.designation}</strong>{profile.department ? <> • {profile.department}</> : null}</>
                ) : (
                  <>Showing recommended roles based on your profile inputs</>
                )}
              </div>
            </div>

            {profile.role && (
              <div className="role-detail-preview">
                <strong>{profile.role.toUpperCase()}</strong>
                <p>{officialRoleDetails[profile.role]?.description || `Verified competency framework and assessment curriculum tailored for ${profile.role}.`}</p>
                <div>
                  {(officialRoleDetails[profile.role]?.domains || getRoleSkillCategories(profile.role, profile.designation).map(([d]) => d)).map((domain) => (
                    <span key={domain} className="status-pill green">{domain}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="choice-grid role-grid">
              {filteredRoles.map((role) => (
                <button
                  type="button"
                  className={profile.role === role ? 'choice-card selected' : 'choice-card'}
                  key={role}
                  onClick={() => {
                    updateProfile('role', role)
                    setSelectedSkillList([])
                    updateProfile('skills', '')
                    if (!profile.designation || !profile.designation.trim()) {
                      updateProfile('designation', role)
                    }
                  }}
                >
                  <span className="role-icon">💼</span>
                  <span className="role-name">{role}</span>
                  <span className="choice-check">✓</span>
                </button>
              ))}
            </div>

            {profile.role === 'Other role' && (
              <div className="custom-entry-box">
                <label htmlFor="custom-role-input">Specify Your Job Role</label>
                <div className="input-group">
                  <input
                    id="custom-role-input"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="e.g. AI Prompt Engineer, Sustainability Analyst"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customRole.trim()) {
                        updateProfile('role', customRole.trim())
                        if (!profile.designation || !profile.designation.trim()) {
                          updateProfile('designation', customRole.trim())
                        }
                      }
                    }}
                    disabled={!customRole.trim()}
                  >
                    Set Role
                  </button>
                </div>
              </div>
            )}

            <div className="selection-actions">
              <button className="secondary-action btn-back" onClick={() => setStep('profile')}>
                ← {t.back}
              </button>
              <button
                className="primary-action btn-next"
                disabled={!profile.role || profile.role === 'Other role'}
                onClick={() => setStep('skills')}
              >
                {t.continue} <span>→</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // VIEW: Step 2 - Choose Skills (Filtered to Role & Min 2 Required)
  // -------------------------------------------------------------
  if (step === 'skills') {
    const isMinSkillsMet = selectedSkillList.length >= 1
    const availableSkills = [...new Set(skillCategories.flatMap(([, domainSkills]) => domainSkills))]

    return (
      <div className="simple-page">
        <div className="page-centered-container selection-page">
          <div className="top-nav-bar">
            <button className="back-nav-btn" onClick={() => setStep('role')}>
              ← {t.back}
            </button>
            <div className="nav-brand">
              <Brand />
            </div>
          </div>

          <section className="selection-card">
            <div className="step-heading">
              <p className="kicker">STEP 2 OF 3</p>
              <h1>{t.step2Title}</h1>
              <p className="helper">
                {t.step2Hint} <strong>{profile.role || 'your role'}</strong>. Select the skills you actively use.
              </p>
            </div>

            <div className={`skill-requirement-banner ${isMinSkillsMet ? 'met' : 'needed'}`}>
              <span className="banner-icon">{isMinSkillsMet ? '✓' : 'ℹ'}</span>
              <span>
                {selectedSkillList.length} {t.skillsSelected} (
                {!isMinSkillsMet
                  ? 'Select at least 1 skill to continue'
                  : 'Coding and non-coding skills can be selected in any combination'}
                )
              </span>
            </div>

            <div className="flat-skills-grid">
              {availableSkills.map((skill) => {
                const isSelected = selectedSkillList.includes(skill)
                return <button type="button" className={isSelected ? 'choice-card selected' : 'choice-card'} key={skill} onClick={() => toggleSkill(skill)}><span className="skill-dot" /><span className="skill-name">{skill}</span><span className="choice-check">✓</span></button>
              })}
            </div>

            <div className="custom-entry-box custom-skill-box">
              <label htmlFor="custom-skill-input">+ Add another skill specific to your work</label>
              <div className="input-group">
                <input
                  id="custom-skill-input"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  placeholder="e.g. Figma, QuickBooks, Tableau, PyTorch"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCustomSkill()
                    }
                  }}
                />
                <button type="button" onClick={addCustomSkill} disabled={!customSkill.trim()}>
                  Add Skill
                </button>
              </div>
              {skillError && <p className="skill-entry-error" role="alert">{skillError}</p>}
            </div>

            {selectedSkillList.length > 0 && (
              <div className="selected-chips-container">
                <span className="chips-title">Selected Skills:</span>
                <div className="chips-list">
                  {selectedSkillList.map((skill) => (
                    <span key={skill} className="skill-badge-chip">
                      {skill}
                      <button type="button" onClick={() => toggleSkill(skill)} title="Remove">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="selection-actions">
              <button className="secondary-action btn-back" onClick={() => setStep('role')}>
                ← {t.back}
              </button>
              <button
                className="primary-action btn-next"
                disabled={!isMinSkillsMet}
                onClick={() => setStep('experience')}
              >
                {t.continue} <span>→</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // VIEW: Step 3 - Choose Experience
  // -------------------------------------------------------------
  if (step === 'experience') {
    const experienceOptions = [
      { value: 'Less than 1 year', detail: 'Entry Level & Foundational Knowledge' },
      { value: '1–2 years', detail: 'Early hands-on execution & core workflow' },
      { value: '2–4 years', detail: 'Independent delivery & applied problem solving' },
      { value: '4–7 years', detail: 'Complex analysis, ownership & delivery' },
      { value: '7–10 years', detail: 'Senior specialist, mentoring & strategy' },
      { value: '10–15 years', detail: 'Principal expertise, leadership & governance' },
      { value: '15+ years', detail: 'Executive experience, institutional knowledge & coaching' },
    ]

    return (
      <div className="simple-page">
        <div className="page-centered-container selection-page">
          <div className="top-nav-bar">
            <button className="back-nav-btn" onClick={() => setStep('skills')}>
              ← {t.back}
            </button>
            <div className="nav-brand">
              <Brand />
            </div>
          </div>

          <section className="selection-card experience-card">
            <div className="step-heading">
              <p className="kicker">STEP 3 OF 3</p>
              <h1>{t.step3Title}</h1>
              <p className="helper">{t.step3Hint}</p>
            </div>

            <div className="experience-grid">
              {experienceOptions.map((opt) => (
                <button
                  type="button"
                  className={profile.experience === opt.value ? 'experience-option selected' : 'experience-option'}
                  key={opt.value}
                  onClick={() => updateProfile('experience', opt.value)}
                >
                  <span className="experience-dot" />
                  <div className="experience-text">
                    <strong>{opt.value}</strong>
                    <small>{opt.detail}</small>
                  </div>
                  <span className="choice-check">✓</span>
                </button>
              ))}
            </div>

            <div className="training-section">
              <div className="training-section-heading">
                <strong>Previous Training & Certifications</strong>
                <span>Optional profile information</span>
              </div>
              <div className="profile-form-grid">
                {[
                  ['previousIGOT', 'Previous iGOT training', ['Completed', 'In progress', 'Not yet attended']],
                  ['previousNSSTA', 'Previous NSSTA training', ['Completed', 'In progress', 'Not yet attended']],
                  ['externalTraining', 'External training', ['Data Analytics Foundation', 'Statistical Methods', 'None']],
                  ['certifications', 'Certifications', ['None', 'Python / SQL certification', 'Government data certification']],
                ].map(([key, label, options]) => (
                  <label className="profile-field" key={key}>{label}
                    <select value={profile[key]} onChange={(e) => updateProfile(key, e.target.value)}>
                      {options.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            </div>

            <div className="selection-actions">
              <button className="secondary-action btn-back" onClick={() => setStep('skills')}>
                ← {t.back}
              </button>
              <button
                className="primary-action btn-next"
                disabled={!profile.experience}
                onClick={() => {
                  const initialGaps = {}
                  const dynamicGaps = selectedSkillList.map((sk, index) => {
                    initialGaps[sk] = {
                      totalQuestions: 0,
                      correctQuestions: 0,
                      proficiency: 0,
                    }
                    const cats = getRoleSkillCategories(profile.role, profile.designation)
                    let foundDomain = 'Domain Competencies'
                    for (const [dom, skl] of cats) {
                      if (skl.includes(sk)) {
                        foundDomain = dom
                        break
                      }
                    }
                    const cur = 0
                    const req = 75
                    const gap = req - cur
                    return {
                      skill: sk,
                      current: cur,
                      required: req,
                      priority: 'Pending',
                      domain: foundDomain,
                      isAssessed: false,
                    }
                  })
                  setSkillGapData(initialGaps)
                  if (dynamicGaps.length > 0) {
                    setCompetencyGaps(dynamicGaps)
                    setSelectedSkillForRec(dynamicGaps[0])
                  }
                  onboardingSessionRef.current = false
                  localStorage.removeItem('skillstat_onboarding')
                  setDashboardView('dashboard')
                  setStep('dashboard')
                }}
              >
                {t.openDashboard} <span>→</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // VIEW: Quiz Screen (Supports Standard, Weekend & Notes Quiz)
  // -------------------------------------------------------------
  if (step === 'test') {
    const currentQuestion = questions[questionIndex] || {
      label: 'Question',
      prompt: 'Loading question...',
      type: 'choice',
      options: ['Option A', 'Option B', 'Option C'],
      skill: 'General',
    }

    const isCodeQ = currentQuestion.type === 'code'
    const codeValidation = isCodeQ ? validateCode(codeAnswer, currentQuestion) : null

    return (
      <div className="simple-page">
        <div className="page-centered-container test-page-layout">
          <div className="top-nav-bar test-top-bar">
            <button className="back-nav-btn" onClick={() => setStep('dashboard')}>
              ← {t.exitQuiz}
            </button>
            <div className="nav-brand">
              <Brand />
            </div>
            <div className="quiz-skill-tag">
              <span>{activeQuizType === 'weekend' ? '🏆 Weekend Challenge' : activeQuizType === 'notes' ? '📄 Notes AI Quiz' : 'Skill Assessment'}</span>
            </div>
          </div>

          <section className="simple-card test-card-box">
            <div className="quiz-header-strip">
              <div>
                <small>{t.roleLabel}</small>
                <strong>{profile.role || 'Professional'}</strong>
              </div>
              <div>
                <small>Quiz Focus</small>
                  <strong className="active-skill-highlight">
                  {activeQuizType === 'weekend' ? 'Weekend Company Challenge' : activeQuizType === 'notes' ? (currentQuestion.sourceBadge || 'Uploaded Notes / PDF') : 'Mixed selected skills'}
                </strong>
              </div>
              <div>
                <small>{t.experienceLabel}</small>
                <strong>{profile.experience || '1–2 years'}</strong>
              </div>
            </div>

            <div className="question-progress-bar-wrap">
              <div className="progress-labels">
                <span>
                  {t.question} {questionIndex + 1} of {questions.length}
                </span>
                <span>{Math.round((questionIndex / questions.length) * 100)}% Complete</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${(questionIndex / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="question-card-inner">
              <div className="question-badge-row">
                <span className="question-badge">{currentQuestion.label}</span>
                {(() => {
                  const diff = currentQuestion.difficultyLabel
                    ? {
                        label: currentQuestion.difficultyLabel,
                        cls: currentQuestion.difficultyBadgeClass || `diff-${(currentQuestion.difficulty || 'intermediate').toLowerCase()}`
                      }
                    : getQuestionDifficulty(questionIndex, questions.length)
                  return (
                    <span className={`difficulty-badge ${diff.badgeClass || diff.cls || 'diff-intermediate'}`}>
                      <span className="diff-dot">●</span>
                      <span>{diff.label || currentQuestion.difficulty || 'Level: Intermediate'}</span>
                    </span>
                  )
                })()}
                {currentQuestion.sourceBadge && (
                  <span className="source-concept-badge">
                    <strong>Source:</strong> {currentQuestion.sourceBadge}
                  </span>
                )}
              </div>
              <h2 className="question-prompt-text">{currentQuestion.prompt}</h2>

              {isCodeQ ? (
                <div className="code-challenge-block">
                  <div className="code-toolbar">
                    <span>Language: {currentQuestion.language || 'Code'}</span>
                    <span>Interactive Editor</span>
                  </div>
                  <textarea
                    className="code-editor-area"
                    value={codeAnswer}
                    onChange={(e) => setCodeAnswer(e.target.value)}
                    placeholder={currentQuestion.starter}
                    spellCheck="false"
                    rows={8}
                  />
                  <p className="code-check-requirement">4 implementation checks · pass at least 2 to continue</p>
                  <p className={`code-feedback ${codeValidation?.state || 'empty'}`}>
                    {codeValidation?.message}
                  </p>
                </div>
              ) : (
                <div className="choices-vertical-list">
                  {currentQuestion.options?.slice(0, 4).map((optText, optIdx) => {
                    const isSelected = answer === String(optIdx)
                    return (
                      <label
                        key={optIdx + '-' + optText}
                        className={`choice-option-row ${isSelected ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="quiz_choice"
                          value={optIdx}
                          checked={isSelected}
                          onChange={() => setAnswer(String(optIdx))}
                        />
                        <span className="opt-letter">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="opt-text">{optText}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              <div className="quiz-action-footer">
                <button
                  className="primary-action submit-btn"
                  disabled={isCodeQ ? codeValidation?.state !== 'valid' : answer === ''}
                  onClick={handleAnswerSubmit}
                >
                  {questionIndex === questions.length - 1 ? t.finish : t.next} <span>→</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // VIEW: Results & Skill Gap Screen
  // -------------------------------------------------------------
  if (step === 'gap') {
    const totalQ = questionResults.length || 15
    const totalCorrect = questionResults.filter((q) => q.isCorrect).length
    const pct = Math.round((totalCorrect / totalQ) * 100)

    return (
      <div className="simple-page">
        <div className="page-centered-container">
          <div className="top-nav-bar">
            <button className="back-nav-btn" onClick={() => setStep('dashboard')}>
              ← {t.openDashboard}
            </button>
            <div className="nav-brand">
              <Brand />
            </div>
          </div>

          <section className="simple-card gap-results-card">
            <Brand />
            <p className="kicker">
              {activeQuizType === 'weekend' ? 'WEEKEND SPRINT RESULTS' : activeQuizType === 'notes' ? 'NOTES QUIZ RESULTS' : 'EVALUATION SUMMARY'}
            </p>
            <h1>
              {activeQuizType === 'weekend' ? 'Weekend Company Rank Update' : activeQuizType === 'notes' ? 'Notes Mastery Assessment' : t.gapTitle}
            </h1>
            <p className="helper">{t.gapIntro}</p>

            <div className="score-hero-box">
              <div className="score-circle">
                <span className="score-num">{pct}%</span>
                <span className="score-lbl">Score</span>
              </div>
              <div className="score-summary">
                {activeQuizType === 'weekend' ? (
                  <>
                    <h3>Company Rank: #{userRank || 1}</h3>
                    <p>
                      Your weekend assessment placed you in the <strong>Top Tier</strong> of active participants!
                    </p>
                  </>
                ) : (
                  <>
                    <h3>{pct >= 75 ? 'Strong Proficiency' : pct >= 50 ? 'Moderate Foundation' : 'Skill Gap Identified'}</h3>
                    <p>
                      Answered <strong>{totalCorrect}</strong> out of <strong>{totalQ}</strong> practical scenarios accurately across your selected skills.
                    </p>
                  </>
                )}
              </div>
            </div>

            {activeQuizType !== 'weekend' && activeQuizType !== 'notes' && (
              <div className="skill-results-grid">
                {selectedSkillList.map((skill) => {
                  const stat = skillGapData[skill] || { proficiency: 0, totalQuestions: 0 }
                  const isHigh = stat.proficiency >= 75
                  const isMed = stat.proficiency >= 50 && stat.proficiency < 75

                  return (
                    <div key={skill} className="skill-stat-card">
                      <div className="skill-stat-header">
                        <strong>{skill}</strong>
                        <span className={`status-pill ${isHigh ? 'green' : isMed ? 'amber' : 'red'}`}>
                          {stat.totalQuestions === 0
                            ? t.pendingAssessment
                            : isHigh
                            ? t.highProficiency
                            : isMed
                            ? t.medProficiency
                            : t.lowProficiency}
                        </span>
                      </div>
                      <div className="mini-progress-bar">
                        <div
                          className={`mini-progress-fill ${isHigh ? 'green' : isMed ? 'amber' : 'red'}`}
                          style={{ width: `${stat.proficiency}%` }}
                        />
                      </div>
                      <div className="skill-stat-footer">
                        <span>Proficiency: {stat.proficiency}%</span>
                        <span>Gap: {Math.max(0, 100 - stat.proficiency)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="gap-actions-row">
              <button className="secondary-action" onClick={() => startQuiz(activeQuizType)}>
                {t.retakeQuiz}
              </button>
              <button className="primary-action" onClick={() => setStep('dashboard')}>
                {t.openDashboard} <span>→</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // VIEW: Complete User Dashboard with Weekend Quiz & PDF Notes
  // -------------------------------------------------------------
  return (
    <div className={`dashboard-app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="dashboard-sidebar-backdrop"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Modern Left Navigation Sidebar */}
      <aside className="dashboard-sidebar" aria-label="Sidebar Navigation" onWheel={(e) => e.stopPropagation()}>
        <div className="sidebar-header">
          <Brand />
          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar width"
          >
            {isSidebarCollapsed ? '»' : '«'}
          </button>
        </div>

        <div className="sidebar-nav-container">
          <div className="sidebar-section-label">LEARNING HUB</div>
          <nav className="sidebar-nav-group" aria-label="Learning Hub">
            <button
              type="button"
              className={`sidebar-nav-item ${dashboardView === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setDashboardView('dashboard'); setIsMobileSidebarOpen(false) }}
            >
              <span className="nav-icon">▦</span>
              <span className="nav-label">{navText[language]?.[0] || navText.en[0]}</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${dashboardView === 'recommendations' ? 'active' : ''}`}
              onClick={() => { setDashboardView('recommendations'); setIsMobileSidebarOpen(false) }}
            >
              <span className="nav-icon">✦</span>
              <span className="nav-label">{navText[language]?.[1] || navText.en[1]}</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${dashboardView === 'promotions' ? 'active' : ''}`}
              onClick={() => { setDashboardView('promotions'); setIsMobileSidebarOpen(false) }}
            >
              <span className="nav-icon">🎖️</span>
              <span className="nav-label">{navText[language]?.[5] || navText.en[5]}</span>
            </button>
          </nav>

          <div className="sidebar-section-label">ASSESSMENTS & LABS</div>
          <nav className="sidebar-nav-group" aria-label="Assessments">
            <button
              type="button"
              className="sidebar-nav-item sidebar-quiz-action"
              disabled={isParsingDoc}
              onClick={() => { startQuiz('standard'); setIsMobileSidebarOpen(false) }}
            >
              <span className="nav-icon">⚡</span>
              <span className="nav-label">{isParsingDoc ? 'Loading...' : (navText[language]?.[3] || navText.en[3])}</span>
              <span className="sidebar-pill-badge">Quiz</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${dashboardView === 'weekend' ? 'active' : ''}`}
              onClick={() => { setDashboardView('weekend'); setIsMobileSidebarOpen(false) }}
            >
              <span className="nav-icon">🏆</span>
              <span className="nav-label">{navText[language]?.[2] || navText.en[2]}</span>
            </button>

            <button
              type="button"
              className={`sidebar-nav-item ${dashboardView === 'notes' ? 'active' : ''}`}
              onClick={() => { setDashboardView('notes'); setIsMobileSidebarOpen(false) }}
            >
              <span className="nav-icon">📄</span>
              <span className="nav-label">{navText[language]?.[4] || navText.en[4]}</span>
            </button>
          </nav>
        </div>

        {/* Fixed Bottom: Management & User Footer */}
        <div className="sidebar-fixed-bottom">
          {isAdmin && (
            <div className="sidebar-management-wrap">
              <div className="sidebar-section-label">MANAGEMENT</div>
              <nav className="sidebar-nav-group" aria-label="Management">
                <button
                  type="button"
                  className={`sidebar-nav-item admin-portal-btn ${dashboardView === 'admin' ? 'active' : ''}`}
                  onClick={() => { 
                    window.open('?view=admin', '_blank');
                    setIsMobileSidebarOpen(false);
                  }}
                >
                  <span className="nav-icon">🛡️</span>
                  <span className="nav-label">Admin Portal</span>
                  <span className="sidebar-pill-badge admin">Portal</span>
                </button>
              </nav>
            </div>
          )}

          {/* Sidebar Footer User Card */}
          <div className="sidebar-user-footer">
            <div
              className="sidebar-user-card"
              onClick={() => { setDashboardView('profile'); setIsMobileSidebarOpen(false) }}
              role="button"
              tabIndex={0}
              title="View Profile"
            >
              <div className="sidebar-user-avatar">
                {getUserInitial(profile.name)}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">
                  {profile.name ? profile.name.split(' ')[0] : 'User'}
                </span>
                <span className="sidebar-user-role">
                  {(profile.role && profile.role.trim()) || (profile.designation && profile.designation.trim()) || 'Employee'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="dashboard-main-viewport">
        {/* Streamlined Executive Header */}
        <header className="dashboard-top-nav">
          <div className="top-nav-left">
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => setIsMobileSidebarOpen((open) => !open)}
              aria-label="Open sidebar navigation"
            >
              ☰
            </button>
            <div className="header-breadcrumbs">
              <span className="crumb-kicker">Skillstat AI</span>
              <span className="crumb-divider">/</span>
              <h1 className="crumb-title">
                {dashboardView === 'dashboard' && (navText[language]?.[0] || 'Dashboard')}
                {dashboardView === 'recommendations' && (navText[language]?.[1] || 'Recommendations')}
                {dashboardView === 'weekend' && (navText[language]?.[2] || 'Weekend Challenge')}
                {dashboardView === 'notes' && (navText[language]?.[4] || 'Document Studio')}
                {dashboardView === 'promotions' && (navText[language]?.[5] || 'Career & Promotions')}
                {dashboardView === 'profile' && 'My Profile'}
                {dashboardView === 'admin' && isAdmin && 'Admin Portal'}
              </h1>
            </div>
          </div>

          <div className="nav-right">
            <button
              type="button"
              className="quick-quiz-header-cta"
              disabled={isParsingDoc}
              onClick={() => startQuiz('standard')}
            >
              <span>⚡</span> {isParsingDoc ? 'Loading...' : (quizzesCompleted > 0 ? t.retakeQuiz : t.takeQuiz)}
            </button>

            <div className="language-badge">
              <span className="lang-icon">🌐</span>
              <select
                className="lang-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {supportedLanguages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>

            <div className="profile-menu-wrapper">
              <button
                className="profile-menu-trigger"
                type="button"
                aria-expanded={isProfileMenuOpen}
                onClick={() => setIsProfileMenuOpen((open) => !open)}
              >
                <span className="profile-menu-avatar">
                  {getUserInitial(profile.name)}
                </span>
                <span>{(profile.name ? profile.name.split(' ')[0] : ((profile.role && profile.role.trim()) || (profile.designation && profile.designation.trim()) || 'User'))}</span>
                <span className="profile-menu-chevron">⌄</span>
              </button>
              {isProfileMenuOpen && (
                <div className="profile-menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => { setDashboardView('profile'); setIsProfileMenuOpen(false) }}>{t.myProfile}</button>
                  <button type="button" role="menuitem" onClick={() => {
                    setDashboardView('promotions')
                    setIsProfileMenuOpen(false)
                  }}>🎖️ {navText[language]?.[5] || navText.en[5]}</button>
                  <button type="button" role="menuitem" onClick={() => setIsSettingsOpen((open) => !open)}>{t.settings}</button>
                  {isSettingsOpen && (
                    <div className="theme-settings" role="group" aria-label={t.settings}>
                      <button type="button" className={!isDarkMode ? 'theme-choice active' : 'theme-choice'} onClick={() => setIsDarkMode(false)}>{t.lightMode}</button>
                      <button type="button" className={isDarkMode ? 'theme-choice active' : 'theme-choice'} onClick={() => setIsDarkMode(true)}>{t.darkMode}</button>
                    </div>
                  )}
                  <button type="button" role="menuitem" onClick={clearSession}>{t.logout}</button>
                </div>
              )}
            </div>
          </div>
        </header>

      {/* Main Body */}
      <main className="dashboard-body">
        {dashboardView === 'admin' && isAdmin && (
          <AdminPortal
            onReturnToLearner={() => {
              setDashboardView('dashboard')
              setAdminSyncTick((prev) => prev + 1)
            }}
            adminUser={profile}
          />
        )}
        {dashboardView === 'profile' && (
          <section className="dashboard-panel official-profile-view">
            <div className="panel-head">
              <div>
                <p className="kicker">{tx('officialProfile')}</p>
                <h2>{t.profile}</h2>
              </div>
              <button className="secondary-action" onClick={() => { setProfileDraft({ ...profile }); setIsProfileEditing(true) }}>
                {tx('editProfile')}
              </button>
            </div>
            {isProfileEditing ? (
              <div className="profile-form-grid profile-edit-grid">
                {[['name', tx('fullName')], ['employeeId', tx('employeeId')], ['department', 'Department'], ['designation', 'Designation'], ['currentAssignment', 'Current assignment'], ['educationalQualifications', 'Educational qualifications']].map(([key, label]) => (
                  <label className="profile-field" key={key}>
                    {label}
                    <input value={profileDraft[key] || ''} onChange={(event) => setProfileDraft((draft) => ({ ...draft, [key]: event.target.value }))} />
                  </label>
                ))}
                <div className="profile-edit-actions">
                  <button className="secondary-action" onClick={() => setIsProfileEditing(false)}>{t.cancel}</button>
                  <button className="primary-action" onClick={() => { setProfile((current) => ({ ...current, ...profileDraft })); setIsProfileEditing(false) }}>{t.saveChanges}</button>
                </div>
              </div>
            ) : (
              <div className="profile-form-grid profile-summary-grid">
                {[[tx('fullName'), profile.name || 'Not provided'], [tx('employeeId'), profile.employeeId || 'Not provided'], ['Department', profile.department || 'Not provided'], ['Designation', profile.designation || 'Not provided'], ['Current assignment', profile.currentAssignment || profile.assignment || 'Not provided'], ['Educational qualifications', profile.educationalQualifications || 'Not provided'], [t.roleLabel, profile.role || 'Not selected'], [t.experienceLabel, profile.experience || 'Not selected']].map(([label, value]) => (
                  <div className="profile-summary-item" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {dashboardView === 'gaps' && (
          <section className="dashboard-panel intelligence-view">
            <div className="panel-head">
              <div>
                <p className="kicker">{tx('aiAnalysis')}</p>
                <h1>{tx('aiGap')}</h1>
                <p className="helper">{tx('compareCompetency')} {profile.role || profile.designation || 'Data Analyst'}.</p>
              </div>
              <div className="filter-pills">
                {['All', 'Critical', 'Moderate', 'Low'].map((filterName) => (
                  <span
                    key={filterName}
                    className={`status-pill ${
                      filterName === 'Critical' ? 'red' : filterName === 'Moderate' ? 'amber' : filterName === 'Low' ? 'green' : 'gray'
                    }`}
                    style={{
                      cursor: 'pointer',
                      opacity: gapFilter === filterName ? 1 : 0.65,
                      fontWeight: gapFilter === filterName ? 700 : 500,
                      outline: gapFilter === filterName ? '2px solid currentColor' : 'none',
                      outlineOffset: '2px',
                    }}
                    onClick={() => setGapFilter(filterName)}
                  >
                    {filterName}
                  </span>
                ))}
              </div>
            </div>

            <div className="gap-analysis-list">
              {[...competencyGaps]
                .sort((a, b) => Math.max(0, b.required - b.current) - Math.max(0, a.required - a.current))
                .filter((item) => {
                  if (gapFilter === 'All') return true
                  const gap = Math.max(0, item.required - item.current)
                  const priority = item.priority || (gap >= 30 ? 'Critical' : gap >= 15 ? 'Moderate' : 'Low')
                  return priority.toLowerCase() === gapFilter.toLowerCase()
                })
                .map((item) => {
                  const gap = Math.max(0, item.required - item.current)
                  const priority = item.priority || (gap >= 30 ? 'Critical' : gap >= 15 ? 'Moderate' : 'Low')
                  return (
                    <div className="gap-analysis-row" key={item.skill}>
                      <div>
                        <h3>{item.skill}</h3>
                        <span>{item.domain}</span>
                      </div>
                      <div className="comparison-bars">
                        <label>{tx('current')} <b>{item.current}%</b></label>
                        <div className="comparison-track">
                          <i className="current-bar" style={{ width: `${item.current}%` }} />
                        </div>
                        <label>{tx('required')} <b>{item.required}%</b></label>
                        <div className="comparison-track">
                          <i className="required-bar" style={{ width: `${item.required}%` }} />
                        </div>
                      </div>
                      <div className="gap-value">
                        <span className="gap-heading-tag">GAP</span>
                        <strong style={{ color: priority === 'Critical' ? 'var(--red)' : priority === 'Moderate' ? 'var(--amber)' : 'var(--green)' }}>
                          {gap}%
                        </strong>
                        <span className={`status-pill ${priority === 'Critical' ? 'red' : priority === 'Moderate' ? 'amber' : 'green'}`}>
                          {priority}
                        </span>
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => handleViewRecommendation(item)}
                        >
                          {tx('viewRecommendation')}
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </section>
        )}

        {dashboardView === 'recommendations' && (
          <section className="intelligence-view">
            <div className="view-heading-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <button
                className="secondary-action btn-sm"
                onClick={() => setDashboardView('dashboard')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                ← Back to Skills Dashboard
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Active Gap Focus:</span>
                <select
                  value={selectedSkillForRec?.skill || 'AI/ML'}
                  onChange={(e) => {
                    const match = competencyGaps.find((g) => g.skill === e.target.value)
                    if (match) handleViewRecommendation(match)
                  }}
                  className="lang-select"
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontWeight: 600 }}
                >
                  {competencyGaps.map((g) => (
                    <option key={g.skill} value={g.skill}>
                      {g.skill} ({g.isAssessed ? `Gap: ${Math.max(0, g.required - g.current)} points` : 'Pending Assessment'} · {g.priority})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="view-heading">
              <p className="kicker">PERSONALIZED RECOMMENDATION ENGINE</p>
              <h1>Recommendations</h1>
              <p className="helper">
                A complete learning path for every skill in your profile.
              </p>
            </div>

            <section className="learning-path-section">
              <div className="learning-path-heading">
                <div>
                  <p className="kicker">YOUR COMPLETE PATH</p>
                  <h2>{selectedSkillList.length} skill paths ready</h2>
                </div>
                <span className="status-pill green">Personalized to your role</span>
              </div>
              <div className="learning-path-grid">
                {selectedSkillList.map((skill, index) => {
                  const skillRec = recommendationsBySkill[skill]
                  const skillGap = competencyGaps.find((gap) => gap.skill === skill)
                  return (
                    <article className="learning-path-card" key={skill}>
                      <div className="learning-path-number">{String(index + 1).padStart(2, '0')}</div>
                      <div className="learning-path-card-body">
                        <span className="path-domain">{skillGap?.domain || 'Role competency'}</span>
                        <h3>{skill}</h3>
                        <p>{skillRec?.explanation || `Build practical ${skill} capability through official learning and applied assessment.`}</p>
                        <div className="path-sources">
                          <span className="path-source igot">iGOT {skillRec?.igotCourses?.length || 0}</span>
                          <span className="path-source nssta">NSSTA / TPAC {skillRec?.nsstaPrograms?.length || 0}</span>
                        </div>
                      </div>
                      <button className="text-button path-open" type="button" onClick={() => skillGap && handleViewRecommendation(skillGap)}>
                        Explore path →
                      </button>
                    </article>
                  )
                })}
              </div>
            </section>

            {/* Skill Gap Card Details */}
            {selectedSkillForRec && (
              <div className="rec-skill-overview-card">
                <div className="rec-skill-info">
                  <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', fontSize: '11px', fontWeight: 700 }}>
                    {selectedSkillForRec.domain || 'Technical Competencies'}
                  </span>
                  <h2>{selectedSkillForRec.skill}</h2>
                  <span>Target Benchmark for {(profile.role && profile.role.trim()) || (profile.designation && profile.designation.trim()) || 'Statistical Officer'}</span>
                </div>

                <div className="comparison-bars">
                  <label>Current Competency: <b>{selectedSkillForRec.isAssessed ? `${selectedSkillForRec.current}%` : 'Pending Assessment'}</b></label>
                  <div className="comparison-track">
                    <i className="current-bar" style={{ width: `${selectedSkillForRec.isAssessed ? selectedSkillForRec.current : 0}%`, background: selectedSkillForRec.isAssessed ? 'var(--primary)' : 'var(--muted)' }} />
                  </div>
                  <label>Required Competency: <b>{selectedSkillForRec.required}%</b></label>
                  <div className="comparison-track">
                    <i className="required-bar" style={{ width: `${selectedSkillForRec.required}%` }} />
                  </div>
                </div>

                <div className="rec-gap-stat">
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Skill Gap</span>
                  <strong style={{ color: !selectedSkillForRec.isAssessed ? 'var(--muted)' : selectedSkillForRec.priority === 'Critical' ? 'var(--red)' : selectedSkillForRec.priority === 'Moderate' ? 'var(--amber)' : 'var(--green)' }}>
                    {selectedSkillForRec.isAssessed ? `${Math.max(0, selectedSkillForRec.required - selectedSkillForRec.current)}%` : 'N/A'}
                  </strong>
                  <span className={`status-pill ${!selectedSkillForRec.isAssessed ? 'gray' : selectedSkillForRec.priority === 'Critical' ? 'red' : selectedSkillForRec.priority === 'Moderate' ? 'amber' : 'green'}`}>
                    {selectedSkillForRec.isAssessed ? `${selectedSkillForRec.priority} Priority` : 'Pending'}
                  </span>
                </div>
              </div>
            )}

            {/* AI Recommendation Context Box */}
            <div className="rec-ai-explanation-box">
              <h4><span>✦</span> AI Recommendation</h4>
              <p>
                {isRecLoading
                  ? 'Analyzing competency requirements and querying official catalogs...'
                  : recommendationData?.explanation ||
                    `Your current competency in ${selectedSkillForRec?.skill || 'this skill'} is ${selectedSkillForRec?.current || 45}%, compared to the required benchmark of ${selectedSkillForRec?.required || 80}%. Focused learning on official government platforms is recommended.`}
              </p>
              <div style={{ marginTop: '14px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  className="primary-action btn-sm"
                  onClick={() => startQuiz('standard', selectedSkillForRec?.skill)}
                >
                  ⚡ Assess {selectedSkillForRec?.skill || 'Competency'} Now →
                </button>
                <small style={{ color: 'var(--muted)', fontSize: '11.5px' }}>
                  Competency score updates only after formal assessment evaluation.
                </small>
              </div>
            </div>

            {/* SOURCE 1: iGOT Karmayogi (Online Learning) */}
            <section className="source-section-block">
              <div className="source-section-header">
                <div className="source-title-group">
                  <h3>
                    <span>🎓</span> iGOT Karmayogi
                    <span className="source-badge-tag igot">Online Learning</span>
                  </h3>
                  <p>Official self-paced government learning ecosystem (Mission Karmayogi)</p>
                </div>
              </div>

              {recommendationData?.igotCourses && recommendationData.igotCourses.length > 0 ? (
                <div className="recommendation-grid">
                  {recommendationData.igotCourses.map((course) => (
                    <article className="recommendation-card" key={course.id || course.title}>
                      <div className="recommendation-card-head">
                        <span className="course-mark">iGOT</span>
                        <span className="status-pill green">Verified Catalogue</span>
                      </div>
                      <h2>{course.title}</h2>
                      <p className="course-provider">{course.provider}</p>
                      <div className="course-meta">
                        <span>{course.difficulty}</span>
                        <span>{course.duration}</span>
                        <span>{course.competency}</span>
                      </div>
                      <div className="course-skills">
                        {course.skills?.map((sk) => (
                          <span key={sk}>{sk}</span>
                        ))}
                      </div>
                      <p className="course-reason">
                        <strong>Why recommended?</strong> {course.whyRecommended || course.reason}
                      </p>
                      <div className="recommendation-actions" style={{ marginTop: 'auto', paddingTop: '14px' }}>
                        <button
                          className="primary-action btn-sm"
                          type="button"
                          onClick={() => {
                            setActiveCourseModal({ ...course, type: 'igot' })
                          }}
                        >
                          View Course Details →
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="no-match-box">
                  <p>No directly matching iGOT course found.</p>
                  <p><small>Try a related competency or explore the official catalog.</small></p>
                </div>
              )}
            </section>

            {/* SOURCE 2: NSSTA / TPAC (Specialised Training) */}
            <section className="source-section-block">
              <div className="source-section-header">
                <div className="source-title-group">
                  <h3>
                    <span>🏛️</span> NSSTA / TPAC
                    <span className="source-badge-tag nssta">Specialised Training</span>
                  </h3>
                  <p>National Statistical Systems Training Academy & TPAC calendar (MoSPI)</p>
                </div>
              </div>

              {recommendationData?.nsstaPrograms && recommendationData.nsstaPrograms.length > 0 ? (
                <div className="programme-grid">
                  {recommendationData.nsstaPrograms.map((prog) => (
                    <article className="programme-card" key={prog.id || prog.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="status-pill amber">{prog.status || 'Verified Programme'}</span>
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{prog.duration}</span>
                      </div>
                      <h3>{prog.name}</h3>
                      <p><strong>Institute:</strong> {prog.institute}</p>
                      <p><strong>Dates:</strong> {prog.dates}</p>
                      <p><strong>Eligibility:</strong> {prog.eligibility}</p>
                      <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)' }}>
                        <strong>Why recommended:</strong> {prog.whyRecommended}
                      </p>
                      <div className="programme-card-footer">
                        <span className="status-pill gray">Source: NSSTA / TPAC</span>
                        <button
                          className="secondary-action btn-sm"
                          type="button"
                          onClick={() => setActiveCourseModal({ ...prog, type: 'nssta' })}
                        >
                          View Training Details →
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="no-match-box">
                  <p>No directly matching NSSTA/TPAC programme found.</p>
                  <p><small>Continue with iGOT learning and reassess the competency.</small></p>
                </div>
              )}
            </section>
          </section>
        )}

        {dashboardView === 'dashboard' && (
          <>
          {/* Welcome Banner */}
        <section className="dashboard-welcome-banner">
          <div className="user-profile-badge">
            <div className="avatar-circle">
              {getUserInitial(profile.name)}
            </div>
            <div>
              <h2>Welcome to your Skillstat Hub</h2>
              <p className="user-sub">
                Target Role: <strong>{(profile.role && profile.role.trim()) || (profile.designation && profile.designation.trim()) || 'Statistical Officer'}</strong>
                {profile.department ? <> • Department: <strong>{profile.department}</strong></> : null}
                {' '}• Experience: <strong>{profile.experience || '10-15 years'}</strong> • Employee Rank:{' '}
                <strong className="rank-highlight-tag">{userRank ? `#${userRank} in Company` : 'Unranked'}</strong>
              </p>
            </div>
          </div>

          <div className="hero-action-buttons">
            <button className="primary-action action-btn-quiz" disabled={isParsingDoc} onClick={() => startQuiz('standard')}>
              ⚡ {isParsingDoc ? 'Loading...' : (quizzesCompleted > 0 ? t.retakeQuiz : t.takeQuiz)}
            </button>
          </div>
        </section>

        {/* Department-Targeted Official Announcements */}
        {(() => {
          try {
            const rawNotifs = localStorage.getItem('skillstat_admin_notifs')
            if (!rawNotifs) return null
            const notifs = JSON.parse(rawNotifs)
            if (!Array.isArray(notifs) || notifs.length === 0) return null
            const userDept = (profile.department || '').toLowerCase()
            const matchingNotifs = notifs.filter((n) => {
              if (!n || !n.title) return false
              const target = (n.target || 'All Departments').toLowerCase()
              return target === 'all' || target === 'all departments' || (userDept && (userDept.includes(target) || target.includes(userDept)))
            })
            if (matchingNotifs.length === 0) return null

            return (
              <section className="dashboard-announcements-bar" aria-label="Department Notices">
                {matchingNotifs.map((n) => (
                  <div key={n.id} className="dept-announcement-card">
                    <div className="dept-announcement-header">
                      <span className="announcement-pill-type">📢 {n.type || 'Notice'}</span>
                      <span className="announcement-pill-dept">Target: {n.target || 'All Wings'}</span>
                      {n.date && <span className="announcement-date">{n.date}</span>}
                    </div>
                    <div className="dept-announcement-content">
                      <strong>{n.title}</strong>
                      <p>{n.message}</p>
                    </div>
                  </div>
                ))}
              </section>
            )
          } catch {
            return null
          }
        })()}

        {/* Career Progression & Promotion Milestone Banner */}
        {(() => {
          const userCurrentRole = (profile.role && profile.role.trim()) || (profile.designation && profile.designation.trim()) || 'Statistical Officer'
          const pathwayPreview = getPromotionPathway(userCurrentRole, overallScore)
          return (
            <section className="dashboard-promo-preview-banner">
              <div className="promo-preview-left">
                <div className="promo-badge-row">
                  <span className="promo-pill-label">🎖️ Career Progression Track</span>
                  <span className="promo-pill-cadre">{pathwayPreview.cadre}</span>
                </div>
                <h3 className="promo-target-heading">
                  Next Promotion Milestone: <span className="promo-target-role-text">{pathwayPreview.targetRole}</span>
                </h3>
                <p className="promo-target-sub">
                  Target Benchmark: <strong>{pathwayPreview.benchmarkScore}%</strong> • Current Score: <strong>{overallScore}%</strong> • 
                  Expected Increment: <strong>{pathwayPreview.gradeIncrement}</strong>
                </p>
                <div className="promo-preview-summary-pills">
                  <span className="promo-tag-item">📚 {pathwayPreview.courses.length} Accredited Courses</span>
                  <span className="promo-tag-item">🎯 Key Role Outcomes Defined</span>
                  <span className="promo-tag-item">⚖️ APAR & Competency Aligned</span>
                </div>
              </div>
              <div className="promo-preview-right">
                <div className="promo-readiness-circle">
                  <span className="promo-gauge-pct">{pathwayPreview.readinessPct}%</span>
                  <span className="promo-gauge-sub">Readiness</span>
                </div>
                <button 
                  type="button" 
                  className="primary-action promo-explore-btn"
                  onClick={() => setDashboardView('promotions')}
                >
                  View Role Courses & Outcomes →
                </button>
              </div>
            </section>
          )
        })()}

        <div className="dashboard-main-grid">
              {/* Profile Overview */}
              <div className="dashboard-panel profile-panel">
                <div className="panel-head">
                  <h3>{t.profile}</h3>
                  <button className="edit-link" onClick={() => setStep('profile')}>
                    Edit
                  </button>
                </div>

                <div className="profile-details-list">
                  <div className="detail-item">
                    <span className="detail-label">{t.roleLabel}</span>
                    <span className="detail-val">{(profile.role && profile.role.trim()) || (profile.designation && profile.designation.trim()) || 'Not selected'}</span>
                  </div>
                  {profile.department && (
                    <div className="detail-item">
                      <span className="detail-label">{tx('department')}</span>
                      <span className="detail-val">{profile.department}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">{t.experienceLabel}</span>
                    <span className="detail-val">{profile.experience || 'Not specified'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Tracked Skills</span>
                    <span className="detail-val">{selectedSkillList.length} Skills</span>
                  </div>
                </div>

                <div className="active-skills-chip-tray">
                  {selectedSkillList.map((skill) => (
                    <span key={skill} className="dashboard-skill-pill">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Overall Readiness Score */}
              <div className="dashboard-panel readiness-panel">
                <div className="panel-head">
                  <h3>{t.progress}</h3>
                  <span className="quizzes-count-badge">
                    {quizzesCompleted} Assessment{quizzesCompleted !== 1 ? 's' : ''} Taken
                  </span>
                </div>

                <div className="readiness-gauge-wrap">
                  <div className="readiness-score-display">
                    <span className="gauge-number">{overallScore}</span>
                    <span className="gauge-pct">%</span>
                  </div>
                  <div className="gauge-status-text">
                    {quizzesCompleted === 0 ? (
                      <p className="pending-text">
                        Take your first personalized skill quiz to compute your live competency score.
                      </p>
                    ) : overallScore >= 75 ? (
                      <p className="good-text">High readiness! Strong foundation across tested areas.</p>
                    ) : overallScore >= 50 ? (
                      <p className="med-text">Moderate readiness. Targeted practice will close your key gaps.</p>
                    ) : (
                      <p className="low-text">Skill gap detected. Prioritize focus skills below.</p>
                    )}
                  </div>
                </div>

                <div className="progress-bar-large">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${Math.max(5, overallScore)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Individual Skill Gaps */}
            <section className="dashboard-panel skill-gaps-section">
              <div className="panel-head">
                <div>
                  <h3>{t.skillsBreakdown}</h3>
                  <p className="section-subtext">
                    Real-time gap evaluation and benchmark recommendations for each selected skill.
                  </p>
                </div>
                <button className="secondary-action btn-sm" disabled={isParsingDoc} onClick={() => startQuiz('standard')}>
                  {isParsingDoc ? 'Loading...' : (quizzesCompleted > 0 ? 'Re-evaluate Skills' : 'Start Assessment')}
                </button>
              </div>

              <div className="skills-gap-cards-container">
                {selectedSkillList.map((skill) => {
                  const data = skillGapData[skill] || {
                    totalQuestions: 0,
                    correctQuestions: 0,
                    proficiency: 0,
                  }
                  const isAssessed = data.totalQuestions > 0
                  const gapPct = Math.max(0, 100 - data.proficiency)

                  return (
                    <div key={skill} className="skill-gap-row-card">
                      <div className="skill-row-left">
                        <div className="skill-identity">
                          <span className="skill-icon-bullet">◆</span>
                          <h4>{skill}</h4>
                        </div>

                        <div className="skill-meta-tags">
                          {isAssessed ? (
                            <span
                              className={`status-pill ${
                                data.proficiency >= 75
                                  ? 'green'
                                  : data.proficiency >= 50
                                  ? 'amber'
                                  : 'red'
                              }`}
                            >
                              {data.proficiency >= 75
                                ? t.highProficiency
                                : data.proficiency >= 50
                                ? t.medProficiency
                                : t.lowProficiency}
                            </span>
                          ) : (
                            <span className="status-pill gray">{t.pendingAssessment}</span>
                          )}
                          <span className="eval-count">
                            {isAssessed
                              ? `${data.correctQuestions}/${data.totalQuestions} Questions Accurate`
                              : 'No quiz taken yet'}
                          </span>
                        </div>
                      </div>

                      <div className="skill-row-mid">
                        <div className="proficiency-stats">
                          <span>Proficiency: <strong>{data.proficiency}%</strong></span>
                          <span className="gap-highlight">Gap: <strong>{isAssessed ? `${gapPct}%` : 'N/A'}</strong></span>
                        </div>
                        <div className="gap-bar-track">
                          <div
                            className={`gap-bar-fill ${
                              data.proficiency >= 75
                                ? 'green'
                                : data.proficiency >= 50
                                ? 'amber'
                                : 'red'
                            }`}
                            style={{ width: `${isAssessed ? Math.max(6, data.proficiency) : 0}%` }}
                          />
                        </div>
                      </div>

                      <div className="skill-row-right">
                        <p className="recommendation-tip">
                          {isAssessed && data.proficiency >= 75
                            ? 'Mastered in real workflows. Ready for advanced optimization.'
                            : isAssessed && data.proficiency >= 50
                            ? 'Review edge-case scenarios and practice complex trade-offs.'
                            : isAssessed
                            ? 'Priority learning gap: practice foundational decision frameworks.'
                            : 'Take the assessment to discover your benchmark gap score.'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}

        {/* VIEW: Weekend Challenge & Company Leaderboard */}
        {dashboardView === 'weekend' && (
          <div className="weekend-tab-content">
            {/* Weekend Sprint Banner */}
            <div className="weekend-hero-card">
              <div className="weekend-hero-left">
                <span className="badge-live-pulse">🔴 Live Weekend Sprint</span>
                <h2>Company-Wide Employee Skills Championship</h2>
                <p>
                  Compete with colleagues in your domain! Complete this weekend's 10 scenario challenge to improve your company rank, earn badges, and benchmark your decision making.
                </p>
                <div className="weekend-meta-points">
                  <span>⏱ 10 Questions</span>
                  <span>🏆 Rank Impact: +50 Pts</span>
                  <span>📅 Ends Sunday 11:59 PM</span>
                </div>
              </div>

              <div className="weekend-hero-right">
                <div className="user-rank-box">
                  <span className="rank-sub">Your Current Rank</span>
                  <div className="rank-number">{userRank ? `#${userRank}` : '—'}</div>
                  <span className="rank-tier-badge">
                    {userRank === 1 ? '🥇 Champion Tier' : userRank ? `#${userRank} Tier` : 'Unranked'}
                  </span>
                  <span className="rank-score-sub">
                    {weekendCompleted ? `Score: ${weekendScore}/100` : 'Not attempted yet'}
                  </span>
                </div>
                <button
                  className="primary-action weekend-start-btn"
                  onClick={() => startQuiz('weekend')}
                >
                  {weekendCompleted ? '⚡ Retake Weekend Quiz' : '🚀 Start Weekend Quiz'}
                </button>
              </div>
            </div>

            {/* Company Leaderboard Table */}
            <div className="dashboard-panel leaderboard-panel">
              <div className="panel-head">
                <div>
                  <h3>Company Performance Leaderboard</h3>
                  <p className="section-subtext">
                    Rankings updated live based on weekend challenge scores & accuracy.
                  </p>
                </div>
                <span className="leaderboard-count">{leaderboard.length} {leaderboard.length === 1 ? 'Active Participant' : 'Active Participants'}</span>
              </div>

              <div className="leaderboard-table">
                <div className="leaderboard-head-row">
                  <span>Rank</span>
                  <span>Employee</span>
                  <span>Role / Domain</span>
                  <span>Score</span>
                  <span>Accuracy</span>
                  <span>Status Badge</span>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="leaderboard-empty-state" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>🏆</div>
                    <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>No Challenge Entries Yet</h4>
                    <p style={{ fontSize: '13px', maxWidth: '440px', margin: '0 auto' }}>
                      Take this weekend's championship sprint above to record your score and claim the #1 spot on the company leaderboard!
                    </p>
                  </div>
                ) : (
                  leaderboard.map((emp) => (
                    <div
                      key={emp.id}
                      className={`leaderboard-row ${emp.isUser ? 'user-highlight' : ''}`}
                    >
                      <div className="rank-col">
                        <span className={`rank-badge rank-${emp.rank}`}>
                          {emp.rank === 1 ? '🥇 1' : emp.rank === 2 ? '🥈 2' : emp.rank === 3 ? '🥉 3' : `#${emp.rank}`}
                        </span>
                      </div>
                      <div className="emp-col">
                        <div className="emp-avatar">{emp.avatar}</div>
                        <strong>{emp.name}</strong>
                      </div>
                      <div className="role-col">{emp.role}</div>
                      <div className="score-col">
                        <strong>{emp.score}</strong> / 100
                      </div>
                      <div className="accuracy-col">
                        <span className="acc-tag">{emp.accuracy}</span>
                      </div>
                      <div className="badge-col">
                        <span className="emp-tier-badge">{emp.badge}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: AI Assessment Studio (PDF / Docs / Training Material) */}
        {dashboardView === 'notes' && (
          <div className="notes-tab-content">
            <div className="dashboard-panel notes-upload-panel">
              <div className="panel-head">
                <div>
                  <span className="status-pill green" style={{ marginBottom: '8px', display: 'inline-block' }}>AI Assessment Studio</span>
                  <h3>📄 AI Assessment Studio & Document Ingestion</h3>
                  <p className="section-subtext">
                    Upload official training manuals, study guides, or SOP documents. Skillstat AI validates encoding, cleans Unicode, extracts domain concepts, and generates verified scenario MCQs.
                  </p>
                </div>
              </div>

              {docExtractionError && (
                <div className="doc-error-alert" role="alert">
                  <span className="error-icon">⚠️</span>
                  <div>
                    <strong>Unable to read the uploaded material correctly. Please upload the document again or use a text-readable PDF.</strong>
                    <p>{docExtractionError}</p>
                  </div>
                </div>
              )}

              {docExtractionSuccess && (
                <div className="doc-success-banner">
                  <span>✓</span>
                  <span>{docExtractionSuccess}</span>
                </div>
              )}

              <div className="upload-dropzone">
                <div className="dropzone-icon">📁</div>
                <h4>Upload Document or Notes</h4>
                <p className="dropzone-hint">
                  Supports .pdf (PDF.js parser), .txt, .md, .doc, and training guides
                </p>

                <label className="file-upload-button">
                  <span>Browse & Upload PDF / File</span>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md,.doc,.docx"
                    onChange={handleFileUpload}
                  />
                </label>

                {notesFileName && (
                  <div className="uploaded-file-chip">
                    <span>✓ Loaded file: <strong>{notesFileName}</strong></span>
                    {isParsingDoc && <small>Validating & extracting concepts...</small>}
                  </div>
                )}
              </div>

              {docExtractedConcepts.length > 0 && (
                <div className="studio-concepts-panel" style={{ marginTop: '16px', padding: '14px 18px', background: 'var(--paper)', borderRadius: 'var(--radius-md)', border: '1px solid var(--line-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>Extracted Competency Concepts ({docExtractedConcepts.length}):</strong>
                    <span className="status-pill green">Competency Mapped</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {docExtractedConcepts.map((c) => (
                      <span key={c.title} className="dashboard-skill-pill" style={{ fontSize: '12px', padding: '4px 10px' }}>
                        ◆ Concept {c.index}: {c.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="notes-paste-section">
                <label htmlFor="notes-textarea">
                  Or paste training text / documentation directly:
                </label>
                <textarea
                  id="notes-textarea"
                  className="notes-text-input"
                  value={uploadedNotesText}
                  onChange={(e) => {
                    setUploadedNotesText(e.target.value)
                    if (docExtractionError) setDocExtractionError('')
                  }}
                  placeholder="Paste official documentation, SOP guidelines, or study notes here..."
                  rows={6}
                />
              </div>

              <div className="notes-action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <small style={{ color: 'var(--muted)', fontSize: '12px' }}>
                  Validation pipeline: Unicode clean → Repetition filter → 4-option verification
                </small>
                <button
                  className="primary-action btn-generate-notes-quiz"
                  disabled={(!uploadedNotesText.trim() && !notesFileName) || isParsingDoc || Boolean(docExtractionError)}
                  onClick={() => startQuiz('notes')}
                >
                  ⚡ Generate Verified AI Quiz from Notes <span>→</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: Role-Based Career & Promotion Progression */}
        {dashboardView === 'promotions' && (() => {
          const userDesignatedRole = (profile.role && profile.role.trim()) || (profile.designation && profile.designation.trim()) || 'Statistical Officer'
          const pathway = getPromotionPathway(userDesignatedRole, overallScore)

          return (
            <div className="promotions-view-container">
              {/* Promotion Header */}
              <div className="promo-header-card">
                <div className="promo-header-top">
                  <div className="promo-header-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      <span className="promo-cadre-tag">🎖️ {pathway.cadre}</span>
                      <span className="status-pill green">Target: {userDesignatedRole}</span>
                      {profile.department && <span className="status-pill blue">{profile.department}</span>}
                    </div>
                    <h2 className="promo-title">Career Progression & Promotion Pathway</h2>
                    <p className="promo-sub">
                      Review official promotion targets, salary grade increments, and accredited learning modules with tangible outcomes required for career advancement.
                    </p>
                  </div>
                </div>

                {/* Career Progression Roadmap Banner */}
                <div className="promo-hero-roadmap">
                  <div className="promo-roadmap-flow">
                    <div className="roadmap-step current">
                      <span className="step-badge">Current Tier</span>
                      <strong className="step-role-title">{pathway.currentRole}</strong>
                      <span className="step-status">Assessed at {overallScore}% Score</span>
                    </div>

                    <div className="roadmap-arrow">
                      <span className="arrow-line"></span>
                      <span className="arrow-icon">➔</span>
                      <span className="arrow-label">Promotion Target</span>
                    </div>

                    <div className="roadmap-step target">
                      <span className="step-badge highlight">Next Cadre</span>
                      <strong className="step-role-title">🎖️ {pathway.targetRole}</strong>
                      <span className="step-status">Benchmark: {pathway.benchmarkScore}%+</span>
                    </div>

                    <div className="roadmap-arrow secondary">
                      <span className="arrow-line"></span>
                      <span className="arrow-icon">➔</span>
                      <span className="arrow-label">Leadership Track</span>
                    </div>

                    <div className="roadmap-step horizon">
                      <span className="step-badge">Future Milestone</span>
                      <strong className="step-role-title">🚀 {pathway.higherTarget}</strong>
                      <span className="step-status">Senior Directorate</span>
                    </div>
                  </div>

                  {/* Readiness Progress Meter */}
                  <div className="promo-readiness-meter-block">
                    <div className="meter-header">
                      <div className="meter-label-group">
                        <span className="meter-title">Promotion Readiness Benchmark</span>
                        <span className={`readiness-status-badge ${pathway.isEligible ? 'eligible' : 'in-progress'}`}>
                          {pathway.isEligible ? '✅ Benchmark Achieved' : `⏳ ${pathway.remainingGap}% Competency Gap`}
                        </span>
                      </div>
                      <div className="meter-score-numbers">
                        <span className="score-val current">{overallScore}% Current</span>
                        <span className="score-divider">/</span>
                        <span className="score-val benchmark">{pathway.benchmarkScore}% Required</span>
                      </div>
                    </div>

                    <div className="promo-meter-track">
                      <div
                        className={`promo-meter-fill ${pathway.isEligible ? 'complete' : 'progressing'}`}
                        style={{ width: `${pathway.readinessPct}%` }}
                      />
                      <div
                        className="benchmark-target-marker"
                        style={{ left: `${Math.min(100, pathway.benchmarkScore)}%` }}
                        title={`Promotion threshold: ${pathway.benchmarkScore}%`}
                      >
                        <span className="marker-flag">Min {pathway.benchmarkScore}%</span>
                      </div>
                    </div>

                    <div className="promo-meter-caption">
                      {pathway.isEligible ? (
                        <p className="caption-text success">
                          🎉 Outstanding! You have reached the minimum competency benchmark for <strong>{pathway.targetRole}</strong>. Complete the accredited courses below to finalize your APAR profile.
                        </p>
                      ) : (
                        <p className="caption-text neutral">
                          Complete the accredited courses and competency quizzes below to close your remaining <strong>{pathway.remainingGap}% gap</strong> and unlock formal promotion eligibility.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Promotion Benefits & Criteria Matrix */}
              <div className="promo-benefits-grid">
                {/* Benefit 1: Pay Scale Upgrade */}
                <div className="promo-benefit-card compensation">
                  <div className="benefit-card-header">
                    <span className="benefit-card-icon">💰</span>
                    <h4>Pay Scale & Grade Promotion</h4>
                  </div>
                  <div className="benefit-grade-highlight">
                    {pathway.gradeIncrement}
                  </div>
                  <p className="benefit-card-desc">
                    Eligible for promotional grade pay revision, higher allowances, and advanced seniority status within the department.
                  </p>
                </div>

                {/* Benefit 2: Expanded Responsibilities */}
                <div className="promo-benefit-card responsibilities">
                  <div className="benefit-card-header">
                    <span className="benefit-card-icon">🏛️</span>
                    <h4>Key Scope & Responsibilities</h4>
                  </div>
                  <ul className="promo-benefit-bullets">
                    {pathway.responsibilities.map((resp, idx) => (
                      <li key={idx}>
                        <span className="bullet-dot">•</span>
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Benefit 3: Promotion Criteria & APAR Value */}
                <div className="promo-benefit-card criteria">
                  <div className="benefit-card-header">
                    <span className="benefit-card-icon">📋</span>
                    <h4>Promotion Screening Criteria</h4>
                  </div>
                  <ul className="promo-criteria-checklist">
                    {pathway.promotionCriteria.map((crit, idx) => {
                      const isFirstAndMet = idx === 0 && pathway.isEligible
                      return (
                        <li key={idx} className={`criteria-item ${isFirstAndMet ? 'cleared' : 'pending'}`}>
                          <span className="criteria-check">{isFirstAndMet ? '✓' : '○'}</span>
                          <span>{crit}</span>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="apar-note-box">
                    <span className="apar-icon">⭐</span>
                    <small>Official completion certificates are directly documented in your digital competency dossier.</small>
                  </div>
                </div>
              </div>

              {/* Curated Promotion Courses with Tangible Outcomes */}
              <div className="promo-courses-section">
                <div className="promo-courses-header">
                  <div>
                    <span className="section-eyebrow">Accredited Learning Tracks</span>
                    <h3 className="section-title">Courses Required for Promotion & Tangible Outcomes</h3>
                    <p className="section-sub">
                      The following certified courses are mapped directly to the competencies evaluated for promotion to <strong>{pathway.targetRole}</strong>.
                    </p>
                  </div>
                  <span className="promo-courses-count">{pathway.courses.length} Accredited Programs</span>
                </div>

                <div className="promo-courses-grid">
                  {pathway.courses.map((course) => (
                    <div key={course.id} className="promo-course-card">
                      {/* Top Badges */}
                      <div className="promo-course-top">
                        <span className={`promo-provider-badge ${course.provider.toLowerCase().includes('nssta') ? 'nssta' : 'igot'}`}>
                          {course.provider.includes('NSSTA') ? '🏛️ ' : '🎓 '}{course.provider}
                        </span>
                        <span className="promo-impact-pill">
                          ⚡ {course.promotionImpact}
                        </span>
                      </div>

                      {/* Title & Metadata */}
                      <h4 className="promo-course-title">{course.title}</h4>
                      
                      <div className="promo-course-meta">
                        <span className="meta-chip">⏱️ {course.duration}</span>
                        <span className="meta-chip">📊 {course.difficulty}</span>
                        <span className="meta-chip">💻 {course.format}</span>
                        <span className="meta-chip competency">🎯 {course.competency || course.skill}</span>
                      </div>

                      {/* Tangible Outcomes Box */}
                      <div className="promo-outcomes-box">
                        <div className="outcomes-header">
                          <span className="outcomes-icon">🎯</span>
                          <strong>Tangible Learning Outcomes & Mastery:</strong>
                        </div>
                        <ul className="outcomes-list">
                          {course.outcomes.map((outcome, idx) => (
                            <li key={idx} className="outcome-item">
                              <span className="outcome-check">✓</span>
                              <span className="outcome-text">{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Certification Credential */}
                      <div className="promo-cert-box">
                        <span className="cert-icon">📜</span>
                        <div className="cert-info">
                          <span className="cert-lbl">Accredited Credential:</span>
                          <strong className="cert-name">{course.certification}</strong>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="promo-course-actions">
                        <button
                          type="button"
                          className="secondary-action btn-sm"
                          onClick={() => setActiveCourseModal(course)}
                        >
                          📖 View Syllabus & Objectives
                        </button>
                        <button
                          type="button"
                          className="primary-action btn-sm"
                          onClick={() => startQuiz('standard', course.competency || course.skill)}
                        >
                          ⚡ Assess Competency ({course.competency || course.skill}) →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Interactive In-App Course Details Modal (No external iGOT redirect) */}
        {activeCourseModal && (
          <div className="course-modal-backdrop" onClick={() => setActiveCourseModal(null)} role="dialog" aria-modal="true">
            <div className="course-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="course-modal-header">
                <div className="course-modal-badges">
                  <span className={`source-badge-tag ${activeCourseModal.type === 'nssta' ? 'nssta' : 'igot'}`}>
                    {activeCourseModal.type === 'nssta' ? '🏛️ NSSTA / TPAC Specialised' : '🎓 iGOT Karmayogi Bharat'}
                  </span>
                  <span className="status-pill green">Verified Government Resource</span>
                </div>
                <button
                  type="button"
                  className="course-modal-close"
                  onClick={() => setActiveCourseModal(null)}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="course-modal-body">
                <h2 className="course-modal-title">{activeCourseModal.title || activeCourseModal.name}</h2>
                <p className="course-modal-provider">
                  <strong>Institution / Platform:</strong> {activeCourseModal.provider || activeCourseModal.institute || 'Ministry / iGOT Karmayogi Bharat'}
                </p>

                <div className="course-modal-meta-grid">
                  <div className="meta-box">
                    <span className="meta-lbl">Duration</span>
                    <span className="meta-val">{activeCourseModal.duration || 'Self-paced (6-8 hrs)'}</span>
                  </div>
                  <div className="meta-box">
                    <span className="meta-lbl">Level / Track</span>
                    <span className="meta-val">{activeCourseModal.difficulty || activeCourseModal.status || 'Intermediate Competency'}</span>
                  </div>
                  <div className="meta-box">
                    <span className="meta-lbl">Target Competency</span>
                    <span className="meta-val">{activeCourseModal.competency || selectedSkillForRec?.skill || 'Domain Competency'}</span>
                  </div>
                </div>

                {activeCourseModal.promotionImpact && (
                  <div className="course-modal-promo-banner">
                    <div className="promo-callout-header">
                      <span className="promo-callout-badge">🎖️ Promotion Advancement Track</span>
                      <span className="promo-callout-impact">{activeCourseModal.promotionImpact}</span>
                    </div>
                    <p className="promo-callout-text">
                      Completing this accredited program directly contributes to closing competency screening requirements for your next promotion.
                    </p>
                    {activeCourseModal.certification && (
                      <div className="promo-callout-cert">
                        <span className="cert-lead">📜 Official Credential:</span> <strong>{activeCourseModal.certification}</strong>
                      </div>
                    )}
                  </div>
                )}

                {activeCourseModal.outcomes && activeCourseModal.outcomes.length > 0 && (
                  <div className="course-modal-section">
                    <h4>🎯 Tangible Learning Outcomes & Practical Mastery</h4>
                    <ul className="course-modal-outcomes">
                      {activeCourseModal.outcomes.map((out, idx) => (
                        <li key={idx} className="outcome-item">
                          <span className="outcome-check">✓</span>
                          <span>{out}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="course-modal-section">
                  <h4>Course Curriculum & Objectives</h4>
                  <p className="course-modal-desc">
                    {activeCourseModal.whyRecommended || activeCourseModal.reason || 'Official government competency-building program designed to impart practical skills and eliminate domain knowledge gaps.'}
                  </p>
                </div>

                {/* Module Progression, Start → Button, and Expandable Topics Drawer */}
                {(() => {
                  const curriculum = getCourseCurriculum(activeCourseModal, profile)
                  const completedModuleCount = curriculum.filter((mod) =>
                    mod.topics.every((top) => completedTopics[top.id])
                  ).length
                  const overallProgressPct = Math.round((completedModuleCount / curriculum.length) * 100)

                  return (
                    <div className="course-modal-section">
                      <h4>Structured Learning Modules</h4>
                      
                      {/* Overall Progress Bar */}
                      <div className="course-progress-header">
                        <div className="course-progress-info">
                          <span>Course Progression</span>
                          <span>
                            {completedModuleCount} of {curriculum.length} modules completed{' '}
                            <span className="course-progress-pct">({overallProgressPct}%)</span>
                          </span>
                        </div>
                        <div className="course-progress-track">
                          <div className="course-progress-fill" style={{ width: `${overallProgressPct}%` }} />
                        </div>
                      </div>

                      {/* Module Overview Cards */}
                      <div className="course-syllabus-list">
                        {curriculum.map((mod, mIdx) => {
                          const isModuleDone = mod.topics.every((top) => completedTopics[top.id])
                          const doneTopicsCount = mod.topics.filter((top) => completedTopics[top.id]).length
                          const isExpanded = expandedModule === mIdx

                          return (
                            <div
                              className={`module-overview-card ${isExpanded ? 'expanded' : ''} ${isModuleDone ? 'all-done' : ''}`}
                              key={`mod-card-${mod.index}`}
                            >
                              <div
                                className="mod-card-top"
                                onClick={() => setExpandedModule(isExpanded ? null : mIdx)}
                              >
                                <div className="mod-title-group">
                                  <div className="mod-meta-row">
                                    <span className="mod-num-badge">Module {mod.index}</span>
                                    <span className="mod-topic-counter">{doneTopicsCount}/5 topics completed</span>
                                  </div>
                                  <strong>{mod.title}</strong>
                                  <p>{mod.desc}</p>
                                </div>

                                <button
                                  type="button"
                                  className={`mod-action-btn ${isModuleDone ? 'btn-done' : isExpanded ? 'btn-active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setExpandedModule(isExpanded ? null : mIdx)
                                  }}
                                >
                                  {isModuleDone ? '✓ Done' : isExpanded ? '✕ Close' : doneTopicsCount > 0 ? 'Continue →' : 'Start →'}
                                </button>
                              </div>

                              {isExpanded && (
                                <div className="module-topics-drawer">
                                  {isModuleDone && (
                                    <div className="module-done-banner">
                                      ✓ All topics completed! This module is marked as done.
                                    </div>
                                  )}
                                  {mod.topics.map((topic, tIdx) => {
                                    const isTopicDone = Boolean(completedTopics[topic.id])
                                    return (
                                      <div
                                        className={`drawer-topic-item ${isTopicDone ? 'topic-completed' : ''}`}
                                        key={topic.id}
                                      >
                                        <div className="drawer-topic-left">
                                          <span className={`drawer-topic-idx ${isTopicDone ? 'idx-done' : ''}`}>
                                            {isTopicDone ? '✓' : topic.index}
                                          </span>
                                          <button
                                            type="button"
                                            className="drawer-topic-title-btn"
                                            onClick={() => setActiveLessonView({
                                              course: activeCourseModal,
                                              moduleIndex: mIdx,
                                              topicIndex: tIdx,
                                              topic,
                                            })}
                                          >
                                            {topic.title}
                                          </button>
                                        </div>

                                        <div className="drawer-topic-right">
                                          <span className="topic-meta-tag video-badge">▶ Video</span>
                                          <span className="topic-meta-tag">{topic.duration}</span>
                                          <button
                                            type="button"
                                            className={`drawer-topic-play-btn ${isTopicDone ? 'btn-is-done' : ''}`}
                                            title={isTopicDone ? 'Completed - Click to watch again' : 'Play Video Lesson'}
                                            onClick={() => setActiveLessonView({
                                              course: activeCourseModal,
                                              moduleIndex: mIdx,
                                              topicIndex: tIdx,
                                              topic,
                                            })}
                                          >
                                            {isTopicDone ? '✓' : '▶'}
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}

                {activeCourseModal.skills && activeCourseModal.skills.length > 0 && (
                  <div className="course-modal-section">
                    <h4>Mapped Competencies & Skills</h4>
                    <div className="course-modal-skills">
                      {activeCourseModal.skills.map((s) => (
                        <span key={s} className="dashboard-skill-pill">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="course-modal-footer">
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => setActiveCourseModal(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => {
                    const skillToAssess = activeCourseModal.skills?.[0] || activeCourseModal.competency || selectedSkillForRec?.skill || 'General'
                    setActiveCourseModal(null)
                    startQuiz('standard', skillToAssess)
                  }}
                >
                  ⚡ Start Interactive Benchmark Quiz for this Competency →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Coursera-Style Fullscreen Video Learning Platform Overlay */}
        {activeLessonView && (() => {
          const currentCourse = activeLessonView.course
          const curriculum = getCourseCurriculum(currentCourse, profile)
          const currentModule = curriculum[activeLessonView.moduleIndex] || curriculum[0]
          const currentTopic = activeLessonView.topic || currentModule.topics[0]
          const mIdx = activeLessonView.moduleIndex
          const tIdx = activeLessonView.topicIndex
          const isCurrentTopicDone = Boolean(completedTopics[currentTopic.id])
          const isFirstTopic = mIdx === 0 && tIdx === 0
          const isLastTopic = mIdx === 3 && tIdx === 4
          const isLastInModule = tIdx === 4

          return (
            <div className="lesson-view-overlay" role="dialog" aria-modal="true">
              {/* Top Navigation Bar (.lesson-topbar) */}
              <header className="lesson-topbar">
                <div className="lesson-topbar-left">
                  <button
                    type="button"
                    className="lesson-back-btn"
                    onClick={() => setActiveLessonView(null)}
                  >
                    ← Back to Course
                  </button>
                  <div className="lesson-breadcrumbs">
                    <span>{currentCourse.title || currentCourse.name}</span>
                    <span className="crumb-sep">&gt;</span>
                    <strong>{currentModule.title}</strong>
                  </div>
                </div>

                <div className="lesson-topbar-right">
                  <button
                    type="button"
                    className="lesson-toggle-sidebar-btn"
                    onClick={() => setSidebarCollapsed((prev) => !prev)}
                  >
                    {sidebarCollapsed ? '≡ Show' : '≡ Hide'}
                  </button>
                </div>
              </header>

              {/* Main Workspace */}
              <div className="lesson-workspace">
                {/* Left Course Syllabus Sidebar (.lesson-sidebar) */}
                <aside className={`lesson-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                  <div className="lsb-header">
                    <span>Course Syllabus</span>
                    <span>4 Modules · 20 Topics</span>
                  </div>
                  {curriculum.map((mod, modI) => {
                    const modDoneCount = mod.topics.filter((t) => completedTopics[t.id]).length
                    return (
                      <div className="lsb-module-group" key={`lsb-mod-${mod.index}`}>
                        <div className="lsb-module-header">
                          <span className="lsb-module-title">Module {mod.index}: {mod.title}</span>
                          <span className="lsb-module-progress">{modDoneCount}/5</span>
                        </div>
                        <div className="lsb-topic-list">
                          {mod.topics.map((t, topI) => {
                            const isDone = Boolean(completedTopics[t.id])
                            const isActive = modI === mIdx && topI === tIdx
                            return (
                              <div
                                key={t.id}
                                className={`lsb-topic-item ${isActive ? 'lsb-topic-active' : ''} ${isDone ? 'lsb-topic-done' : ''}`}
                                onClick={() => setActiveLessonView({
                                  course: currentCourse,
                                  moduleIndex: modI,
                                  topicIndex: topI,
                                  topic: t,
                                })}
                              >
                                <span className="lsb-topic-badge">{isDone ? '✓' : t.index}</span>
                                <span className="lsb-topic-label">{t.title}</span>
                                <span className="lsb-topic-time">{t.duration}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </aside>

                {/* Responsive 16:9 Video Player & Topic Content */}
                <main className="lesson-main-pane">
                  <div className="lesson-content-container">
                    {/* Responsive 16:9 Video Player (.lesson-video-wrap) */}
                    <div className="lesson-video-wrap">
                      <iframe
                        src={currentTopic.videoUrl}
                        title={currentTopic.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>

                    {/* Navigation Bar (.lesson-nav-row) */}
                    <div className="lesson-nav-row">
                      <button
                        type="button"
                        className="lesson-nav-btn"
                        disabled={isFirstTopic}
                        onClick={handlePreviousTopic}
                      >
                        ← Previous
                      </button>

                      <span className="lesson-position-counter">
                        Module {mIdx + 1} · Topic {tIdx + 1} of 5
                      </span>

                      <button
                        type="button"
                        className="lesson-nav-btn primary"
                        onClick={handleMarkCompleteAndContinue}
                      >
                        {isLastTopic ? 'Finish Course ✦' : isLastInModule ? 'Next Module →' : 'Next →'}
                      </button>
                    </div>

                    {/* Topic Info & Action Section (.lesson-content-area) */}
                    <div className="lesson-content-area">
                      <div className="lesson-badges-row">
                        <span className="lesson-pill">▶ Video Lesson</span>
                        <span className="lesson-pill">{currentTopic.duration}</span>
                        {isCurrentTopicDone && (
                          <span className="lesson-pill completed">✓ Completed</span>
                        )}
                      </div>

                      <h1 className="lesson-title">{currentTopic.title}</h1>
                      <p className="lesson-desc">{currentTopic.description}</p>

                      <div className="lesson-cta-row">
                        <button
                          type="button"
                          className="lesson-cta-primary"
                          onClick={handleMarkCompleteAndContinue}
                        >
                          ✓ Mark Complete & Continue →
                        </button>

                        <div className="lesson-cta-secondary-group">
                          {isCurrentTopicDone && (
                            <button
                              type="button"
                              className="lesson-cta-secondary"
                              onClick={handleUndoCompletion}
                            >
                              Undo Completion
                            </button>
                          )}
                          <button
                            type="button"
                            className="lesson-cta-secondary"
                            onClick={handleSkipForNow}
                          >
                            Skip for Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </main>
              </div>
            </div>
          )
        })()}
      </main>
      </div> {/* .dashboard-main-viewport */}

      {/* Floating Skillstat AI Copilot Assistant */}
      <ChatBot
        profile={profile}
        selectedSkillList={selectedSkillList}
        skillGapData={skillGapData}
        overallScore={overallScore}
        quizzesCompleted={quizzesCompleted}
        competencyGaps={competencyGaps}
        onNavigate={(targetView) => {
          setDashboardView(targetView)
        }}
        startQuiz={startQuiz}
        initialHistory={chatHistory}
        onHistoryChange={setChatHistory}
      />
    </div>
  )
}

export default App

