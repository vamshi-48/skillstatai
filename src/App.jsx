import { useEffect, useRef, useState, useCallback } from 'react'
import './App.css'
import { extractTextFromFile, cleanExtractedText, validateDocumentText, extractConceptsFromText } from './utils/documentCleaner'
import { validateAndCleanQuiz } from './utils/questionValidator'
import { getRecommendations } from './services/recommendationService'
import ChatBot from './components/ChatBot'

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
  'Statistical Officer', 'Senior Statistical Officer', 'Statistical Investigator', 'Data Analyst',
  'Data Scientist', 'Research Officer', 'Survey Officer', 'Economist', 'GIS Analyst',
  'Digital / IT Officer', 'Data Management Officer',
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

const initialCompetencyGaps = [
  { skill: 'AI/ML', current: 45, required: 80, priority: 'Critical', domain: 'Technical Competencies' },
  { skill: 'Cloud Computing', current: 32, required: 65, priority: 'Critical', domain: 'Technical Competencies' },
  { skill: 'GIS', current: 42, required: 70, priority: 'Moderate', domain: 'Technical Competencies' },
  { skill: 'Data Quality Frameworks', current: 64, required: 85, priority: 'Moderate', domain: 'Statistical Competencies' },
  { skill: 'SQL', current: 82, required: 85, priority: 'Low', domain: 'Technical Competencies' },
]

const codingLanguages = ['C', 'C#', 'C++', 'Java', 'JavaScript', 'TypeScript', 'Python', 'Ruby', 'Kotlin', 'SQL', 'HTML', 'CSS', 'Node.js', 'React', 'Coding', 'C programming']
const supportedLanguages = [
  ['en', 'English'], ['hi', 'हिन्दी (Hindi)'], ['ta', 'தமிழ் (Tamil)'], ['te', 'తెలుగు (Telugu)'],
  ['bn', 'বাংলা (Bengali)'], ['mr', 'मराठी (Marathi)'], ['gu', 'ગુજરાતી (Gujarati)'], ['kn', 'ಕನ್ನಡ (Kannada)'], ['ml', 'മലയാളം (Malayalam)'],
]

const isCodingSkill = (skill) => codingLanguages.includes(skill)

const governmentDepartments = [
  { name: 'Ministry of Statistics and Programme Implementation', designations: ['Statistical Officer', 'Senior Statistical Officer', 'Statistical Investigator', 'Data Analyst', 'Research Officer'] },
  { name: 'Ministry of Electronics and Information Technology', designations: ['Digital / IT Officer', 'Data Management Officer', 'Cybersecurity Analyst', 'Software Engineer', 'Systems Administrator'] },
  { name: 'Ministry of Health and Family Welfare', designations: ['Medical Officer', 'Public Health Officer', 'Health Programme Manager', 'Health Data Analyst', 'Research Officer'] },
  { name: 'Ministry of Education', designations: ['Teacher', 'Education Officer', 'Research Officer', 'Training Specialist', 'Data Analyst', 'Programme Manager'] },
  { name: 'Ministry of Finance', designations: ['Finance Officer', 'Accounts Officer', 'Economic Officer', 'Budget Analyst', 'Audit Officer'] },
  { name: 'Ministry of Home Affairs', designations: ['Administrative Officer', 'Security Officer', 'Research Officer', 'Data Analyst', 'Section Officer'] },
  { name: 'Ministry of Rural Development', designations: ['Development Officer', 'Programme Officer', 'Project Manager', 'Social Development Officer', 'Data Analyst'] },
  { name: 'Ministry of Agriculture and Farmers Welfare', designations: ['Agriculture Officer', 'Agricultural Statistician', 'Research Officer', 'Field Officer', 'Data Analyst'] },
  { name: 'Ministry of Labour and Employment', designations: ['Labour Officer', 'Employment Officer', 'Labour Statistician', 'Welfare Officer', 'Research Officer'] },
  { name: 'Ministry of Environment, Forest and Climate Change', designations: ['Environmental Officer', 'Forest Officer', 'Climate Data Analyst', 'Research Officer', 'GIS Analyst'] },
  { name: 'Ministry of Road Transport and Highways', designations: ['Transport Officer', 'Highways Engineer', 'Project Manager', 'Civil Engineer', 'Data Analyst'] },
  { name: 'Ministry of Housing and Urban Affairs', designations: ['Urban Planner', 'Town Planning Officer', 'Civil Engineer', 'Project Manager', 'GIS Analyst'] },
  { name: 'Ministry of Commerce and Industry', designations: ['Commercial Officer', 'Industry Officer', 'Economic Officer', 'Trade Analyst', 'Research Officer'] },
  { name: 'Ministry of External Affairs', designations: ['Foreign Service Officer', 'Administrative Officer', 'Policy Analyst', 'Research Officer', 'Protocol Officer'] },
  { name: 'Ministry of Women and Child Development', designations: ['Child Development Officer', 'Programme Officer', 'Social Worker', 'Research Officer', 'Data Analyst'] },
  { name: 'Ministry of Social Justice and Empowerment', designations: ['Social Welfare Officer', 'Programme Officer', 'Rehabilitation Officer', 'Research Officer', 'Data Analyst'] },
  { name: 'Department of Personnel and Training', designations: ['Administrative Officer', 'Human Resources Officer', 'Training Specialist', 'Section Officer', 'Policy Analyst'] },
  { name: 'Department of Telecommunications', designations: ['Telecom Engineer', 'Network Administrator', 'Digital / IT Officer', 'Policy Analyst', 'Data Analyst'] },
  { name: 'Department of Revenue', designations: ['Income Tax Officer', 'Customs Officer', 'Tax Specialist', 'Finance Officer', 'Audit Officer'] },
  { name: 'National Statistical Office', designations: ['Statistical Officer', 'Senior Statistical Officer', 'Statistical Investigator', 'Data Analyst', 'Data Scientist'] },
]

const getDepartmentDetails = (departmentName) => governmentDepartments.find((department) => department.name === departmentName)

const designationRoleMap = {
  teacher: ['Physics Teacher', 'Mathematics Teacher', 'Chemistry Teacher', 'Biology Teacher', 'Computer Science Teacher', 'English Teacher', 'Social Science Teacher', 'Primary School Teacher'],
  'statistical officer': ['Economic Statistics Officer', 'Social Statistics Officer', 'Agricultural Statistics Officer', 'Data Quality Officer', 'Survey Operations Officer'],
  'senior statistical officer': ['Statistical Programme Lead', 'Survey Methodology Lead', 'Data Quality Lead', 'Official Statistics Analyst'],
  'statistical investigator': ['Field Survey Investigator', 'Census Investigator', 'Sample Survey Investigator', 'Data Validation Investigator'],
  'data analyst': ['Policy Data Analyst', 'Public Finance Data Analyst', 'Health Data Analyst', 'Education Data Analyst', 'Monitoring & Evaluation Analyst'],
  'data scientist': ['Machine Learning Scientist', 'Public Policy Data Scientist', 'Predictive Analytics Scientist', 'Natural Language Processing Scientist'],
  'research officer': ['Policy Research Officer', 'Education Research Officer', 'Health Research Officer', 'Economic Research Officer', 'Social Research Officer'],
  'digital / it officer': ['Application Support Officer', 'Government Systems Analyst', 'Cybersecurity Officer', 'Cloud Infrastructure Officer', 'Digital Services Officer'],
  'data management officer': ['Data Governance Officer', 'Master Data Officer', 'Data Quality Officer', 'Database Administrator', 'Metadata Officer'],
  'finance officer': ['Public Budget Officer', 'Financial Planning Officer', 'Grants Finance Officer', 'Public Expenditure Analyst'],
  'accounts officer': ['Accounts Payable Officer', 'Accounts Receivable Officer', 'Government Ledger Officer', 'Payroll Accounts Officer'],
  'economic officer': ['Macroeconomic Analyst', 'Trade Economics Analyst', 'Development Economics Analyst', 'Economic Policy Officer'],
  'budget analyst': ['Programme Budget Analyst', 'Public Expenditure Analyst', 'Budget Planning Officer', 'Performance Budget Analyst'],
  'audit officer': ['Internal Audit Officer', 'Compliance Audit Officer', 'Performance Audit Officer', 'Financial Audit Officer'],
  'medical officer': ['Primary Care Medical Officer', 'Community Health Medical Officer', 'Emergency Medical Officer', 'Public Health Medical Officer'],
  'health data analyst': ['Health Informatics Analyst', 'Clinical Data Analyst', 'Public Health Data Analyst', 'Health Programme Analyst'],
  'programme manager': ['Education Programme Manager', 'Health Programme Manager', 'Rural Development Programme Manager', 'Digital Programme Manager'],
  'project manager': ['Infrastructure Project Manager', 'IT Project Manager', 'Public Works Project Manager', 'Programme Delivery Manager'],
  'policy analyst': ['Education Policy Analyst', 'Health Policy Analyst', 'Technology Policy Analyst', 'Social Policy Analyst'],
}

const getRolesForDesignation = (designation) => designationRoleMap[(designation || '').trim().toLowerCase()] || []

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

function getRoleSkillCategories(role, designation) {
  const target = `${role || ''} ${designation || ''}`.toLowerCase()

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

  if (target.includes('statist') || target.includes('economist') || target.includes('survey') || target.includes('investigator') || target.includes('census')) {
    return [
      ['Statistical Competencies', ['Survey Design', 'Sampling Techniques', 'National Accounts', 'Price Statistics', 'Labour Statistics', 'Agricultural Statistics', 'Industrial Statistics', 'SDG Indicators', 'Data Quality Frameworks', 'Metadata Standards']],
      ['Technical & Analytical Tools', ['Python', 'R Programming', 'SQL', 'Stata', 'SPSS', 'SAS', 'Data Visualization', 'GIS Spatial Analysis', 'AI/ML for Official Statistics']],
      ['Digital Governance', ['Cybersecurity', 'Data Privacy', 'Digital Public Infrastructure', 'Open Data Standards', 'Government Cloud']],
      ['Managerial & Behavioural', ['Leadership', 'Analytical Thinking', 'Report Writing', 'Public Policy Analysis', 'Decision Making', 'Ethics & Integrity']],
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
    securePlatform: 'Secure Government Platform', privacy: 'Your profile data is stored locally for this demonstration. Privacy notice',
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
  en: ['Dashboard', 'Recommendations', 'Weekend Challenge', 'AI Quiz', 'Profile Overview'],
  hi: ['डैशबोर्ड', 'सिफारिशें', 'वीकेंड चैलेंज', 'AI क्विज़', 'प्रोफाइल विवरण'],
  ta: ['டாஷ்போர்டு', 'பரிந்துரைகள்', 'வார இறுதி சவால்', 'AI வினாடி வினா', 'சுயவிவர மேலோட்டம்'],
  te: ['డాష్‌బోర్డ్', 'సిఫార్సులు', 'వీకెండ్ ఛాలెంజ్', 'AI క్విజ్', 'ప్రొఫైల్ అవలోకనం'],
  bn: ['ড্যাশবোর্ড', 'সুপারিশ', 'সাপ্তাহিক চ্যালেঞ্জ', 'AI কুইজ', 'প্রোফাইল'],
  mr: ['डॅशबोर्ड', 'शिफारसी', 'वीकेंड चॅलेंज', 'AI क्विझ', 'प्रोफाइल'],
  gu: ['ડેશબોર્ડ', 'ભલામણો', 'વીકએન્ડ ચેલેન્જ', 'AI ક્વિઝ', 'પ્રોફાઇલ'],
  kn: ['ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', 'ಶಿಫಾರಸುಗಳು', 'ವಾರಾಂತ್ಯ ಸವಾಲು', 'AI ಕ್ವಿಜ್', 'ಪ್ರೊಫೈಲ್'],
  ml: ['ഡാഷ്ബോർഡ്', 'ശുപാർശകൾ', 'വാരാന്ത്യ ചലഞ്ച്', 'AI ക്വിസ്', 'പ്രൊഫൈൽ'],
}

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark">S</span>
      <strong>Skillstat AI</strong>
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
  if (passed >= 2) return { state: 'valid', message: `${passed} checks passed. Solution acceptable.` }
  return { state: 'working', message: `${passed} of ${checks.length} checks passed. Pass at least 2 checks to continue.` }
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

function buildScenarioQuestions(profile, t, userSkills, quizMode = 'standard', notesContent = '', targetSkill = '') {
  const skills = targetSkill ? [targetSkill] : (userSkills.length ? userSkills : ['Problem solving', 'Communication'])
  const exp = profile.experience || '1–2 years'

  // If quiz from notes / uploaded document
  if (quizMode === 'notes' && notesContent.trim()) {
    const cleanNotes = cleanExtractedText(notesContent)
    const val = validateDocumentText(cleanNotes)
    if (!val.isValid) {
      return []
    }
    const concepts = extractConceptsFromText(cleanNotes, 5)
    const questions = []
    const count = 10
    const questionTemplates = [
      (title) => `Which action best applies the principle of ${title} in a real government workflow?`,
      (title) => `What is the main risk to control when implementing ${title}?`,
      (title) => `How should an officer validate work related to ${title} before publishing results?`,
      (title) => `Which evidence would demonstrate effective practice of ${title}?`,
      (title) => `A team is applying ${title}. Which decision best protects quality and accountability?`,
    ]
    const optionTemplates = [
      ['Apply the principle with documented checks, evidence, and review before approval', 'Skip the principle because the workflow is already familiar', 'Use an unverified shortcut and remove the audit trail', 'Wait for an error before deciding how the principle applies'],
      ['Define the risk, assign an owner, and monitor controls throughout delivery', 'Treat the risk as irrelevant unless a complaint is received', 'Transfer the risk to another team without recording it', 'Remove the related data so the risk cannot be measured'],
      ['Compare the work with the source guidance, validate the evidence, and record exceptions', 'Approve the work from memory without checking the source', 'Change the results until they match an expected outcome', 'Publish immediately and document issues only if challenged'],
      ['A reproducible result, clear documentation, and an independent quality check', 'A verbal claim that the process was followed correctly', 'A final number with no source or calculation trail', 'A faster result produced without peer review'],
      ['Balance the source guidance, measurable evidence, stakeholder impact, and accountability', 'Choose the fastest option without assessing consequences', 'Delegate the decision without giving review criteria', 'Ignore conflicting evidence and proceed on assumption'],
    ]

    for (let i = 0; i < count; i++) {
      const concept = concepts[i % concepts.length]
      const conceptTitle = concept?.title || `Concept ${i + 1}`
      const conceptContext = concept?.context ? ` The source material explains: ${concept.context.slice(0, 180)}.` : ''
      const questionPrompt = `${questionTemplates[i % questionTemplates.length](conceptTitle)}${conceptContext}`

      questions.push({
        type: 'choice',
        skill: conceptTitle,
        label: `Notes Concept ${i + 1}`,
        sourceBadge: `Notes • Concept ${i + 1}`,
        prompt: questionPrompt,
        options: optionTemplates[i % optionTemplates.length],
        correctIndex: 0,
      })
    }
    return validateAndCleanQuiz(questions, 'Notes Concept')
  }

  // Weekend company-wide challenge questions
  if (quizMode === 'weekend') {
    const weekendScenarios = [
      {
        prompt: `[Weekend Sprint] In a high-stakes cross-functional initiative between ${profile.role} and product teams, a sudden bottleneck delays delivery by 48 hours. What is the optimal executive action?`,
        options: [
          'Run a rapid critical-path root cause triage, align stakeholders on trade-off triage, and communicate revised SLAs proactively',
          'Conceal the delay and attempt unvetted shortcuts without testing',
          'Reassign entire department responsibilities without notice',
          'Halt all communications and wait until Monday morning',
        ],
        correct: 0,
      },
      {
        prompt: `[Weekend Sprint] When optimizing company-wide operational efficiency in ${skills[0] || 'your role'}, which leading metric demonstrates sustainable value?`,
        options: [
          'High throughput accuracy with reduced rework cycles and documented SOP compliance',
          'Maximum raw activity volume regardless of error and defect rates',
          'Eliminating all peer reviews and compliance checkpoints',
          'Relying solely on retrospective customer complaints',
        ],
        correct: 0,
      },
      {
        prompt: `[Weekend Sprint] An unexpected system or data discrepancy is uncovered during the quarterly close. As a ${profile.role}, how should you isolate the discrepancy?`,
        options: [
          'Perform a structured reconciliation against primary audit logs and isolate variance boundaries',
          'Overhaul unrelated ledger entries without isolating the discrepancy',
          'Assume the system discrepancy is an acceptable rounding error without verifying',
          'Delete historical records to force balance calculations',
        ],
        correct: 0,
      },
      {
        prompt: `[Weekend Sprint] Under strict deadline pressure, two viable solutions exist for a ${skills[1] || 'core skill'} challenge. How should you evaluate them?`,
        options: [
          'Evaluate feasibility, maintenance overhead, scalability risk, and stakeholder ROI through an objective decision matrix',
          'Pick the easiest option without assessing long-term technical debt',
          'Delegate the choice randomly to avoid accountability',
          'Attempt both solutions simultaneously without adequate resource allocation',
        ],
        correct: 0,
      },
    ]

    const questions = []
    for (let i = 0; i < 10; i++) {
      const curSkill = skills[i % skills.length]
      const template = weekendScenarios[i % weekendScenarios.length]
      questions.push({
        type: 'choice',
        skill: curSkill,
        label: `Weekend Challenge Q${i + 1}`,
        prompt: template.prompt,
        options: template.options,
        correctIndex: 0,
      })
    }
    return questions
  }

  // Standard skill gap assessment
  const scenarioBank = {
    'AI/ML': [
      { prompt: `When evaluating an AI model deployed on official registration records, you notice performance degrades on new rural demographics (covariate shift). What is the standard protocol?`, options: ['Perform stratified re-sampling, monitor feature distribution drift, and re-calibrate decision thresholds', 'Ignore the distribution shift and continue inference with legacy model weights', 'Immediately remove rural demographic data from processing pipelines', 'Increase model learning rate arbitrarily without testing validation loss'], correct: 0 },
      { prompt: `In a machine learning pipeline for official statistical data, why is model explainability (SHAP/LIME) mandatory for governance?`, options: ['It provides auditable attribution for each feature, ensuring non-discriminatory and transparent decisions', 'It allows developers to hardcode model predictions manually', 'It reduces the compute required for deep learning training', 'It guarantees 100% accuracy without testing on holdout data'], correct: 0 },
    ],
    'Cloud Computing': [
      { prompt: `When architecting a secure data ingestion pipeline on government cloud (MeghRaj), which strategy guarantees zero data loss during network interruptions?`, options: ['Implement distributed message queues with dead-letter buffering and idempotent consumers', 'Store incoming records in unpersisted server memory buffers', 'Discard timed-out packets and request manual file re-upload', 'Disable transport encryption to speed up packet throughput'], correct: 0 },
      { prompt: `What is the primary operational advantage of Role-Based Access Control (RBAC) and least-privilege IAM policies in official cloud repositories?`, options: ['Enforces granular least-privilege access, audit logging, and blast-radius containment', 'Allows all statistical officers root administrative access', 'Eliminates the requirement for user passwords and MFA', 'Prevents all network communication between microservices'], correct: 0 },
    ],
    'GIS': [
      { prompt: `When merging field survey census blocks with national satellite shapefiles, spatial misalignment occurs. What is the standard geodetic remediation?`, options: ['Standardize coordinate reference systems (CRS) using EPSG transformations to WGS84', 'Manually drag polygons visually without verifying datum projection', 'Delete survey blocks that do not immediately align', 'Switch from vector shapefiles to low-resolution unreferenced images'], correct: 0 },
      { prompt: `In spatial analytics for public health data, why are choropleth maps normalized by population density rather than raw case counts?`, options: ['To prevent geographic area size from misleadingly dominating relative incidence rates', 'To reduce the number of colors required in the map legend', 'Because raw counts are prohibited by GIS software', 'To remove all municipal boundaries from the map display'], correct: 0 },
    ],
    'Data Quality Frameworks': [
      { prompt: `Under the National Quality Assurance Framework (NQAF), how should extensive item non-response in economic surveys be addressed?`, options: ['Apply validated donor imputation or regression imputation with explicit imputation flags', 'Silently replace missing entries with zeros without documentation', 'Discard all incomplete questionnaires, biasing the sampling frame', 'Duplicate adjacent records without statistical validation'], correct: 0 },
      { prompt: `When performing automated data reconciliation across decentralized departmental registers, what is the best practice for duplicate resolution?`, options: ['Utilize deterministic and probabilistic record linkage with defined confidence thresholds and audit logs', 'Randomly delete one of the conflicting records', 'Average all disparate numerical fields together without inspection', 'Halt all database operations until manual paper audits occur'], correct: 0 },
    ],
    'SQL': [
      { prompt: `A query joining a 50-million-row official register with district lookup tables runs sluggishly. What optimization should be examined first?`, options: ['Inspect the execution plan, verify composite indexing on join keys, and eliminate full-table sequential scans', 'Add SELECT * to retrieve all table columns', 'Remove WHERE clauses to allow faster data retrieval', 'Restart the database instance during peak transaction hours'], correct: 0 },
      { prompt: `When aggregating survey averages where some respondents left optional income fields blank (NULL), how does standard SQL behave?`, options: ['AVG() automatically ignores NULL values; COALESCE should be applied if null defaults are needed', 'AVG() automatically treats NULLs as 0.0, distorting true averages', 'The query immediately throws a runtime fatal syntax error', 'NULL values are converted into maximum possible integer values'], correct: 0 },
    ],
    'Sampling': [
      { prompt: `When calculating standard errors in a multi-stage stratified cluster sample for nationwide surveys, which factor must be accounted for?`, options: ['Design effect (DEFF) and intra-cluster correlation to prevent underestimating variance', 'Assuming simple random sampling (SRS) with equal variance across all clusters', 'Disregarding sampling weights in aggregate national estimations', 'Eliminating second-stage sampling units that require travel'], correct: 0 },
      { prompt: `If sample attrition disproportionately affects mobile young demographic strata, how should population representations be adjusted?`, options: ['Apply post-stratification non-response weight calibration based on known census marginals', 'Remove the entire demographic stratum from public dissemination', 'Assume non-respondents have the exact same distribution as overall respondents', 'Fabricate synthetic respondents without statistical weighting'], correct: 0 },
    ],
    'Financial analysis': [
      { prompt: `In a quarterly financial model for ${profile.role}, an unexpected 14% variance appears between forecasted and actual operating costs. What is the standard first step?`, options: ['Perform a line-item variance audit to isolate fixed vs variable cost drivers', 'Adjust the target forecast retroactively to mask the gap', 'Immediately cut project headcount without analyzing the category', 'Ignore the variance until year-end reporting'], correct: 0 },
      { prompt: `When assessing project capital expenditure ROI under ${exp} constraints, how should you factor inflation risks?`, options: ['Apply discounted cash flow with an adjusted hurdle rate and sensitivity analysis', 'Assume historical interest rates remain completely static', 'Only evaluate the nominal gross return of year 1', 'Exclude tax amortization and salvage value'], correct: 0 },
    ],
    'Excel': [
      { prompt: `To combine dynamic transactional datasets across multiple tabs without breaking on column shifts, which formula is recommended in modern Excel?`, options: ['XLOOKUP or INDEX(MATCH) combined with dynamic spill ranges', 'Hardcoded static VLOOKUP with fixed index numbers', 'Manual copy-paste across sheets', 'CONCATENATE all cell rows into text strings'], correct: 0 },
      { prompt: `When designing an audit-proof financial tracker in Excel, what is the best practice for raw data integrity?`, options: ['Separate raw data tabs from calculation models and summary dashboards', 'Mix calculation formulas directly inside raw input rows', 'Color code cells manually without validation rules', 'Avoid using structured Excel tables or named ranges'], correct: 0 },
    ],
    'Digital marketing': [
      { prompt: `A multi-channel paid acquisition campaign experiences a 35% drop in conversion rate despite stable click-through rates. What should you evaluate first?`, options: ['Landing page load speed, messaging alignment, and checkout drop-off funnel', 'Double the campaign ad spend immediately', 'Change the brand logo and colors across all ads', 'Turn off all tracking pixels and conversion tags'], correct: 0 },
      { prompt: `When allocating budget across top-of-funnel brand awareness vs bottom-of-funnel retargeting, how should incrementality be measured?`, options: ['Run geo-lift experiments or holdout control groups to measure true incremental conversions', 'Attribute 100% credit exclusively to the last ad clicked', 'Rely purely on impression counts without attribution modeling', 'Stop running search campaigns completely'], correct: 0 },
    ],
    'UI design': [
      { prompt: `When designing a complex enterprise dashboard for high-frequency users, which visual hierarchy principle improves usability the most?`, options: ['Establish clear typographical scales, consistent spatial grids, and prioritized primary action anchors', 'Use 10 different vivid accent colors across all buttons', 'Hide all navigation menus inside deep nested drawers', 'Remove all labels and rely exclusively on ambiguous abstract icons'], correct: 0 },
      { prompt: `During an accessibility audit (WCAG 2.1 AA), a primary button with white text fails contrast against an emerald background. How do you resolve it?`, options: ['Increase the background luminance contrast ratio to at least 4.5:1', 'Reduce the font size to make the text less noticeable', 'Remove the button label text entirely', 'Disable keyboard focus indicators on all inputs'], correct: 0 },
    ],
    'User research': [
      { prompt: `When planning usability testing for a critical workflow, what is the most effective approach to uncover authentic user friction?`, options: ['Observe users performing task-based scenarios using think-aloud protocol without leading prompts', 'Ask users hypothetical questions like "Would you buy this feature?"', 'Tell users the correct answers whenever they hesitate', 'Test only with internal employees who built the product'], correct: 0 },
    ],
    'Project management': [
      { prompt: `A key dependency is delayed by 3 weeks, threatening a fixed client milestone. What is the most effective management action?`, options: ['Assess critical path impact, evaluate scope descope or fast-tracking options, and communicate trade-offs early to stakeholders', 'Silently delay the deadline without notifying stakeholders', 'Require 18-hour daily overtime without reviewing the critical path', 'Cancel the entire project without an impact assessment'], correct: 0 },
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
    'Sales': [
      { prompt: `A qualified enterprise prospect raises a severe pricing objection during final negotiations. What is the best sales response?`, options: ['Explore the underlying value driver and ROI metrics before exploring customized packaging or terms', 'Immediately drop the contract price by 70%', 'End the sales discussion immediately', 'Tell the prospect their budget concerns are irrelevant'], correct: 0 },
    ],
    'Patient care': [
      { prompt: `A patient exhibits sudden acute changes in vital signs following medication administration. What is the priority protocol?`, options: ['Conduct immediate rapid assessment, verify airway/breathing/circulation, and notify attending physician with SBAR protocol', 'Wait 4 hours until the next scheduled shift change rounds', 'Leave the patient unattended to search for textbook references', 'Administer unprescribed sedatives without consultation'], correct: 0 },
    ],
    'Supply chain management': [
      { prompt: `A primary overseas supplier suffers a port strike causing a 4-week supply disruption. What is the resilient supply chain response?`, options: ['Activate pre-qualified secondary local supplier agreements and prioritize safety stock for critical SKUs', 'Halt all customer order fulfillment without mitigation', 'Triple all end-product prices overnight', 'Ignore delivery schedules until the strike concludes'], correct: 0 },
    ],
  }

  const generatedQuestions = []
  const questionCount = 15
  const codingSkills = skills.filter(isCodingSkill)
  const nonCodingSkills = skills.filter((skill) => !isCodingSkill(skill))
  const codingQuestionIndexes = new Set([2, 5, 8, 11, 14])

  for (let i = 0; i < questionCount; i++) {
    const isCodingQuestion = codingSkills.length > 0 && codingQuestionIndexes.has(i)
    const currentSkill = isCodingQuestion
      ? codingSkills[Math.floor(i / 3) % codingSkills.length]
      : (nonCodingSkills.length > 0 ? nonCodingSkills[i % nonCodingSkills.length] : 'Problem solving')

    if (isCodingQuestion) {
      const lang = currentSkill
      const challenges = codingCodeChallenges[lang] || [additionalCodingChallenges[lang]]
      const challenge = challenges[i % challenges.length]
      generatedQuestions.push({
        type: 'code',
        skill: currentSkill,
        label: `${t.question} ${i + 1}`,
        experienceLevel: exp,
        prompt: challenge.prompt,
        language: challenge.language || lang,
        starter: challenge.starter,
        checks: challenge.checks,
      })
    } else {
      const bankItems = scenarioBank[currentSkill]
      let item = bankItems ? bankItems[i % bankItems.length] : null

      if (!item) {
        const promptTemplate = [
          `In a high-stakes ${profile.role} scenario involving ${currentSkill}, what is the best practice to balance speed and accuracy?`,
          `When standardizing a workflow around ${currentSkill} across a team with ${exp} experience, which step prevents execution errors?`,
          `An edge-case risk is detected in your ${currentSkill} workflow. How should you validate your corrective action?`,
          `Which key performance indicator (KPI) best demonstrates high-caliber mastery of ${currentSkill} in this role?`,
          `A cross-functional conflict arises regarding the implementation of ${currentSkill}. What is the ideal collaborative approach?`,
        ][i % 5]

        item = {
          prompt: promptTemplate,
          options: [
            `Establish structured validation checkpoints and apply evidence-based ${currentSkill} principles`,
            `Proceed without peer review or documentation to save immediate time`,
            `Rely strictly on intuition without verifying operational metrics`,
            `Delegate the entire responsibility without guidance or quality standards`,
          ],
          correct: 0,
        }
      }

      generatedQuestions.push({
        type: 'choice',
        skill: currentSkill,
        label: `${t.question} ${i + 1}`,
        experienceLevel: exp,
        prompt: item.prompt,
        options: item.options,
        correctIndex: item.correct ?? 0,
      })
    }
  }

  return generatedQuestions
}

function getSkillSpecificQuestions(profile, t, skillList) {
  const questions = buildScenarioQuestions(profile, t, skillList, 'standard')
  return questions.filter((question) => skillList.includes(question.skill))
}

const initialCompanyLeaderboard = [
  { id: 1, name: 'Ananya Patel', role: 'Staff Product Designer', score: 96, accuracy: '96%', rank: 1, badge: '🥇 Gold', avatar: 'AP' },
  { id: 2, name: 'Vikram Joshi', role: 'Lead Data Scientist', score: 94, accuracy: '94%', rank: 2, badge: '🥈 Silver', avatar: 'VJ' },
  { id: 3, name: 'Sneha Rao', role: 'Senior Software Engineer', score: 90, accuracy: '90%', rank: 3, badge: '🥉 Bronze', avatar: 'SR' },
  { id: 4, name: 'Priya Sharma (You)', role: 'Software Engineer', score: 88, accuracy: '88%', rank: 4, badge: '⭐ Top 5%', avatar: 'PS', isUser: true },
  { id: 5, name: 'Rahul Verma', role: 'DevOps Architect', score: 85, accuracy: '85%', rank: 5, badge: 'Top 10%', avatar: 'RV' },
  { id: 6, name: 'Kavita Menon', role: 'Financial Controller', score: 82, accuracy: '82%', rank: 6, badge: 'Top 15%', avatar: 'KM' },
  { id: 7, name: 'Arjun Das', role: 'Digital Marketing Lead', score: 79, accuracy: '79%', rank: 7, badge: 'Top 20%', avatar: 'AD' },
]

function App() {
  const [language, setLanguage] = useState('en')
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [step, setStep] = useState('loading')
  const [dashboardView, setDashboardView] = useState('dashboard')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [ssoLoading, setSsoLoading] = useState(false)
  const [roleSearch, setRoleSearch] = useState('')
  const [departmentSearch, setDepartmentSearch] = useState('')
  const [isDepartmentMenuOpen, setIsDepartmentMenuOpen] = useState(false)
  const [profile, setProfile] = useState({
    name: '', employeeId: '', department: '',
    organization: '', designation: '',
    assignment: '', location: '', role: '', skills: '', experience: '',
    previousIGOT: '', previousNSSTA: '', externalTraining: '', certifications: '',
  })
  const [profileDraft, setProfileDraft] = useState({})
  const [isProfileEditing, setIsProfileEditing] = useState(false)
  const [customRole, setCustomRole] = useState('')
  const [customSkill, setCustomSkill] = useState('')
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

  // Official Skill Gaps & Combined Recommendation Engine State
  const [competencyGaps, setCompetencyGaps] = useState(initialCompetencyGaps)
  const [selectedSkillForRec, setSelectedSkillForRec] = useState(initialCompetencyGaps[0])
  const [recommendationData, setRecommendationData] = useState(null)
  const [recommendationsBySkill, setRecommendationsBySkill] = useState({})
  const [isRecLoading, setIsRecLoading] = useState(false)
  const [currentQuizSkill, setCurrentQuizSkill] = useState('')
  const [gapFilter, setGapFilter] = useState('All')

  // Weekend Challenge & Leaderboard State
  const [weekendCompleted, setWeekendCompleted] = useState(false)
  const [weekendScore, setWeekendScore] = useState(88)
  const [userRank, setUserRank] = useState(4)
  const [leaderboard, setLeaderboard] = useState(initialCompanyLeaderboard)

  // Notes & PDF Upload State (Robust Document Extraction)
  const [notesFileName, setNotesFileName] = useState('')
  const [uploadedNotesText, setUploadedNotesText] = useState('')
  const [isParsingDoc, setIsParsingDoc] = useState(false)
  const [docExtractionError, setDocExtractionError] = useState('')
  const [docExtractionSuccess, setDocExtractionSuccess] = useState('')
  const [docExtractedConcepts, setDocExtractedConcepts] = useState([])
  const [activeCourseModal, setActiveCourseModal] = useState(null)

  const t = text[language] || extendedText[language] || text.en
  const tx = (key) => uiText[language]?.[key] || uiText.en[key] || key

  const updateProfile = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }))
  }

  const selectDepartment = (departmentName) => {
    updateProfile('department', departmentName)
    updateProfile('designation', '')
    setDepartmentSearch(departmentName)
    setIsDepartmentMenuOpen(false)
  }

  const toggleSkill = (skill) => {
    const clean = skill.trim()
    if (!clean) return
    const codingCount = selectedSkillList.filter(isCodingSkill).length
    if (!selectedSkillList.includes(clean) && isCodingSkill(clean) && codingCount >= 4) return
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
    if (isCodingSkill(clean) && selectedSkillList.filter(isCodingSkill).length >= 4) return
    const updated = [...selectedSkillList, clean]
    setSelectedSkillList(updated)
    updateProfile('skills', updated.join(', '))
    setCustomSkill('')
  }

  const skillCategories = getRoleSkillCategories(profile.role, profile.designation)

  // Load initial recommendation data
  useEffect(() => {
    if (selectedSkillForRec && !recommendationData) {
      getRecommendations(profile, selectedSkillForRec).then(setRecommendationData)
    }
  }, [profile, selectedSkillForRec, recommendationData])

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
  }, [profile, selectedSkillList, competencyGaps])

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

  useEffect(() => {
    if (step !== 'loading') return
    const timer = setTimeout(() => setStep('login'), 1200)
    return () => clearTimeout(timer)
  }, [step])

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
    const skillList = specificSkill
      ? [specificSkill]
      : selectedSkillList.length
      ? selectedSkillList
      : ['Problem solving', 'Communication']
    const hasCoding = skillList.some((s) => codingLanguages.includes(s))
    const chosenLang = hasCoding ? skillList.find(isCodingSkill) : ''

    if (quizMode === 'standard' && !specificSkill) {
      const codingCount = skillList.filter(isCodingSkill).length
      if (codingCount > 0 && (codingCount < 2 || codingCount > 4)) return
    }

    if (quizMode === 'notes') {
      const clean = cleanExtractedText(uploadedNotesText)
      const val = validateDocumentText(clean)
      if (!val.isValid) {
        setDocExtractionError(val.error || 'Unable to read the uploaded material correctly. Please upload the document again or use a text-readable PDF.')
        return
      }
      const noteQs = buildScenarioQuestions(profile, t, skillList, 'notes', clean)
      if (!noteQs || noteQs.length === 0) {
        setDocExtractionError('Unable to read the uploaded material correctly. Please upload the document again or use a text-readable PDF.')
        return
      }
      setQuestions(noteQs)
      setQuestionIndex(0)
      setAnswer('')
      setCodeAnswer('')
      setQuestionResults([])
      setStep('test')
      return
    }

    if (quizMode === 'weekend') {
      const weekendQs = buildScenarioQuestions(profile, t, skillList, 'weekend')
      setQuestions(weekendQs)
      setQuestionIndex(0)
      setAnswer('')
      setCodeAnswer('')
      setQuestionResults([])
      setStep('test')
      return
    }

    if (specificSkill) {
      const targetedQs = buildScenarioQuestions(profile, t, [specificSkill], 'standard', '', specificSkill)
      setQuestions(targetedQs)
      setQuestionIndex(0)
      setAnswer('')
      setCodeAnswer('')
      setQuestionResults([])
      setStep('test')
      return
    }

    // Standard Skill Assessment
    fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: profile.role,
        skills: skillList.join(', '),
        experience: profile.experience,
        codingLanguage: chosenLang,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('AI fallback'))))
      .then((data) => {
          if (Array.isArray(data.questions) && data.questions.length >= 5) {
          const validated = validateAndCleanQuiz(data.questions, skillList[0])
          const selectedSkillNames = new Set(skillList.map((skill) => skill.toLowerCase()))
          const selectedQuestions = validated.filter((question) => selectedSkillNames.has(String(question.skill || '').toLowerCase()))
          const coversEverySkill = skillList.every((skill) => selectedQuestions.some((question) => String(question.skill || '').toLowerCase() === skill.toLowerCase()))
          const requiredCodingQuestions = hasCoding ? selectedQuestions.filter((question) => question.type === 'code').length >= 5 : true
          if (selectedQuestions.length >= 5 && coversEverySkill && requiredCodingQuestions) {
            setQuestions(selectedQuestions)
            return
          }
        }
        setQuestions(getSkillSpecificQuestions(profile, t, skillList))
      })
      .catch(() => {
        setQuestions(getSkillSpecificQuestions(profile, t, skillList))
      })
      .finally(() => {
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
      isCorrect = parseInt(answer, 10) === (currentQ.correctIndex ?? 0)
    }

    const currentResult = {
      questionIndex,
      skill: currentQ.skill,
      isCorrect,
      type: currentQ.type,
    }

    const updatedResults = [...questionResults, currentResult]
    setQuestionResults(updatedResults)

    if (questionIndex === questions.length - 1) {
      const totalCorrect = updatedResults.filter((r) => r.isCorrect).length
      const calculatedScore = Math.round((totalCorrect / updatedResults.length) * 100)

      if (activeQuizType === 'weekend') {
        // Compute weekend rank on leaderboard
        setWeekendCompleted(true)
        setWeekendScore(calculatedScore)

        let newRank = 1
        if (calculatedScore < 80) newRank = 6
        else if (calculatedScore < 88) newRank = 4
        else if (calculatedScore < 95) newRank = 2
        else newRank = 1

        setUserRank(newRank)

        // Update leaderboard
        const updatedBoard = initialCompanyLeaderboard.map((item) => {
          if (item.isUser) {
            return {
              ...item,
              score: calculatedScore,
              accuracy: `${calculatedScore}%`,
              role: profile.role || item.role,
              rank: newRank,
              badge: newRank === 1 ? '🥇 Champion' : newRank <= 3 ? '🥈 Top 3' : '⭐ Top 5%',
            }
          }
          return item
        }).sort((a, b) => b.score - a.score).map((item, idx) => ({ ...item, rank: idx + 1 }))

        setLeaderboard(updatedBoard)
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
  // VIEW: Loading Screen
  // -------------------------------------------------------------
  if (step === 'loading') {
    return (
      <div className="loading-page">
        <div className="loading-orbit">
          <span>S</span>
        </div>
        <Brand />
        <p>{tx('initializing')}</p>
        <div className="loading-track">
          <i />
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // VIEW: Login Page (Centered + Interactive Canvas + Top-Right Language)
  // -------------------------------------------------------------
  if (step === 'login') {
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

        <section className="login-card">
          <Brand />
          <p className="kicker">{tx('intelligentEvaluation')}</p>
          <h1>{t.welcome}</h1>
          <p className="helper">{t.signIn}</p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              const emailInput = e.target.querySelector('input[type="email"]')?.value || ''
              const extractedName = emailInput ? emailInput.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : ''
              setProfile({
                name: extractedName,
                employeeId: '',
                department: '',
                organization: '',
                designation: '',
                assignment: '',
                location: '',
                role: '',
                skills: '',
                experience: '',
                previousIGOT: '',
                previousNSSTA: '',
                externalTraining: '',
                certifications: '',
              })
              setDepartmentSearch('')
              setIsDepartmentMenuOpen(false)
              setSelectedSkillList([])
              setQuizzesCompleted(0)
              setOverallScore(0)
              setStep('profile')
            }}
          >
            <label>
              {t.email}
              <input type="email" placeholder="your@company.com" required />
            </label>
            <label>
              {t.password}
              <input type="password" placeholder="••••••••" required />
            </label>

            <button type="submit" className="primary-action">
              {t.continue} <span>→</span>
            </button>
          </form>
          <div className="login-divider"><span>OR</span></div>
          <button className="sso-demo-button" type="button" disabled={ssoLoading} onClick={() => {
            setSsoLoading(true)
            setTimeout(() => {
              setSsoLoading(false)
              setProfile({
                name: '',
                employeeId: '',
                department: '',
                organization: '',
                designation: '',
                assignment: '',
                location: '',
                role: '',
                skills: '',
                experience: '',
                previousIGOT: '',
                previousNSSTA: '',
                externalTraining: '',
                certifications: '',
              })
              setDepartmentSearch('')
              setIsDepartmentMenuOpen(false)
              setSelectedSkillList([])
              setQuizzesCompleted(0)
              setOverallScore(0)
              setStep('profile')
            }, 900)
          }}>
            {ssoLoading ? tx('connectingSso') : tx('continueSso')}
          </button>
          <div className="login-meta-row">
            <label className="remember-control"><input type="checkbox" /> {tx('remember')}</label>
            <button type="button" className="text-button">{tx('forgot')}</button>
          </div>
          <div className="security-note">🔒 {tx('securePlatform')}</div>
          <p className="privacy-note">{tx('privacy')}</p>
          <button type="button" className="theme-toggle" onClick={() => setIsDarkMode((value) => !value)}>
            {isDarkMode ? '☀ Light theme' : '◐ Dark theme'}
          </button>
        </section>
      </div>
    )
  }

  if (step === 'profile') {
    const selectedDepartment = getDepartmentDetails(profile.department)
    const filteredDepartments = governmentDepartments.filter(({ name }) => name.toLowerCase().includes(departmentSearch.toLowerCase()))
    return (
      <div className="simple-page">
        <div className="page-centered-container selection-page">
          <div className="top-nav-bar">
            <button className="back-nav-btn" onClick={() => setStep('login')}>← {t.back}</button>
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
                <input value={profile.name} placeholder="e.g. Sathvika Sharma" onChange={(e) => updateProfile('name', e.target.value)} />
              </label>
              <label className="profile-field">{tx('employeeId')}
                <input value={profile.employeeId} placeholder="e.g. EMP-24018" onChange={(e) => updateProfile('employeeId', e.target.value)} />
              </label>
              <label className="profile-field department-combobox">{tx('department')}
                <div className="department-input-wrap">
                  <input
                    value={departmentSearch}
                    placeholder="Search government departments"
                    onFocus={() => setIsDepartmentMenuOpen(true)}
                    onChange={(e) => {
                      setDepartmentSearch(e.target.value)
                      setIsDepartmentMenuOpen(true)
                      if (profile.department && e.target.value !== profile.department) updateProfile('department', '')
                    }}
                    aria-label="Search government departments"
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
              <label className="profile-field">{tx('designation')}
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
                  <option value="">{selectedDepartment ? 'Select your designation' : 'Select a department first'}</option>
                  {(selectedDepartment?.designations || []).map((designation) => <option key={designation} value={designation}>{designation}</option>)}
                </select>
              </label>
            </div>
            <div className="selection-actions">
              <button className="secondary-action btn-back" onClick={() => setStep('login')}>← {t.back}</button>
              <button className="primary-action btn-next" disabled={!profile.department || !profile.designation} onClick={() => setStep('role')}>Continue <span>→</span></button>
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
            <button className="back-nav-btn" onClick={() => setStep('login')}>
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
                    if (!profile.designation || !profile.designation.trim()) {
                      updateProfile('designation', role)
                    }
                    const categories = getRoleSkillCategories(role, profile.designation)
                    const initialSkills = categories[0]?.[1]?.slice(0, 3) || ['Communication', 'Problem solving']
                    setSelectedSkillList(initialSkills)
                    updateProfile('skills', initialSkills.join(', '))
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
    const isMinSkillsMet = selectedSkillList.length >= 2
    const normalizedCodingSkills = selectedSkillList.filter(isCodingSkill)
    const hasTooManyCodingSkills = normalizedCodingSkills.length > 4
    const hasTooFewCodingSkills = normalizedCodingSkills.length === 1
    const codingSelectionValid = !hasTooManyCodingSkills && !hasTooFewCodingSkills
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

            <div className={`skill-requirement-banner ${isMinSkillsMet && codingSelectionValid ? 'met' : 'needed'}`}>
              <span className="banner-icon">{isMinSkillsMet && codingSelectionValid ? '✓' : 'ℹ'}</span>
              <span>
                {selectedSkillList.length} {t.skillsSelected} (
                {!isMinSkillsMet
                  ? `Please select at least ${2 - selectedSkillList.length} more skill(s)`
                  : !codingSelectionValid
                  ? hasTooManyCodingSkills
                  ? 'Remove coding skills until you have a maximum of 4'
                  : 'Select at least 2 coding skills'
                  : 'Choose any skills that match your work'}
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
                disabled={!isMinSkillsMet || !codingSelectionValid}
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
                    const defaultCurrents = [45, 52, 60, 38, 48, 65, 40]
                    const defaultReqs = [80, 85, 75, 80, 85, 90, 70]
                    const cur = defaultCurrents[index % defaultCurrents.length]
                    const req = defaultReqs[index % defaultReqs.length]
                    const gap = req - cur
                    return {
                      skill: sk,
                      current: cur,
                      required: req,
                      priority: gap >= 30 ? 'Critical' : gap >= 15 ? 'Moderate' : 'Low',
                      domain: foundDomain,
                    }
                  })
                  setSkillGapData(initialGaps)
                  if (dynamicGaps.length > 0) {
                    setCompetencyGaps(dynamicGaps)
                    setSelectedSkillForRec(dynamicGaps[0])
                  }
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
            <div className="quiz-skill-tag" title={activeQuizType === 'notes' ? (currentQuestion.sourceBadge || 'Uploaded Notes') : (currentQuestion.skill || profile.role)}>
              <span>{activeQuizType === 'weekend' ? '🏆 Weekend Challenge' : activeQuizType === 'notes' ? '📄 Notes AI Quiz' : 'Assessing:'}</span>{' '}
              <strong>{activeQuizType === 'notes' ? (currentQuestion.sourceBadge || 'Uploaded Notes') : (currentQuestion.skill || profile.role)}</strong>
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
                  {activeQuizType === 'weekend' ? 'Weekend Company Challenge' : activeQuizType === 'notes' ? (currentQuestion.sourceBadge || 'Uploaded Notes / PDF') : currentQuestion.skill}
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
                <span>{Math.round(((questionIndex + 1) / questions.length) * 100)}% Complete</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="question-card-inner">
              <div className="question-badge-row">
                <span className="question-badge">{currentQuestion.label}</span>
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
                    <h3>Company Rank: #{userRank} of 148 Employees</h3>
                    <p>
                      Your weekend assessment placed you in the <strong>Top {userRank <= 2 ? '2%' : userRank <= 4 ? '5%' : '10%'}</strong> across all company departments!
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
    <div className="dashboard-page-container">
      {/* Top Header with Primary Navigation */}
      <header className="dashboard-top-nav">
        <div className="nav-left">
          <Brand />
        </div>

        <nav className="header-nav-links" aria-label="Main Navigation">
          <button
            type="button"
            className={`header-nav-item ${dashboardView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setDashboardView('dashboard')}
          >
            <span className="nav-icon">▦</span>
            <span>{navText[language]?.[0] || navText.en[0]}</span>
          </button>

          <button
            type="button"
            className={`header-nav-item ${dashboardView === 'recommendations' ? 'active' : ''}`}
            onClick={() => setDashboardView('recommendations')}
          >
            <span className="nav-icon">✦</span>
            <span>{navText[language]?.[2] || navText.en[2]}</span>
          </button>

          <button
            type="button"
            className={`header-nav-item ${dashboardView === 'weekend' ? 'active' : ''}`}
            onClick={() => setDashboardView('weekend')}
          >
            <span className="nav-icon">🏆</span>
            <span>{navText[language]?.[2] || navText.en[2]}</span>
          </button>

          <button
            type="button"
            className={`header-nav-item ${dashboardView === 'notes' ? 'active' : ''}`}
            onClick={() => setDashboardView('notes')}
          >
            <span className="nav-icon">📄</span>
            <span>{navText[language]?.[4] || navText.en[4]}</span>
          </button>

          <button
            type="button"
            className={`header-nav-item ${dashboardView === 'profile' ? 'active' : ''}`}
            onClick={() => setDashboardView('profile')}
          >
            <span className="nav-icon">👤</span>
            <span>{navText[language]?.[1] || navText.en[1]}</span>
          </button>
        </nav>

        <div className="nav-right">
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
                {(profile.designation || profile.role || profile.name || 'User').slice(0, 2).toUpperCase()}
              </span>
              <span>{(profile.name ? profile.name.split(' ')[0] : (profile.designation || profile.role || 'User'))}</span>
              <span className="profile-menu-chevron">⌄</span>
            </button>
            {isProfileMenuOpen && (
              <div className="profile-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => { setDashboardView('profile'); setIsProfileMenuOpen(false) }}>{t.myProfile}</button>
                <button type="button" role="menuitem" onClick={() => setIsSettingsOpen((open) => !open)}>{t.settings}</button>
                {isSettingsOpen && (
                  <div className="theme-settings" role="group" aria-label={t.settings}>
                    <button type="button" className={!isDarkMode ? 'theme-choice active' : 'theme-choice'} onClick={() => setIsDarkMode(false)}>{t.lightMode}</button>
                    <button type="button" className={isDarkMode ? 'theme-choice active' : 'theme-choice'} onClick={() => setIsDarkMode(true)}>{t.darkMode}</button>
                  </div>
                )}
                <button type="button" role="menuitem" onClick={() => { setIsProfileMenuOpen(false); setStep('login') }}>{t.logout}</button>
              </div>
            )}
          </div>

          <button className="nav-btn-secondary" onClick={() => setStep('skills')}>
            ← {tx('editProfile')}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="dashboard-body">
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
                {[['name', tx('fullName')], ['employeeId', tx('employeeId')], ['department', tx('department')], ['designation', tx('designation')]].map(([key, label]) => (
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
                {[[tx('fullName'), profile.name || 'Not provided'], [tx('employeeId'), profile.employeeId || 'Not provided'], [tx('department'), profile.department || 'Not provided'], [tx('designation'), profile.designation || 'Not provided'], [t.roleLabel, profile.role || 'Not selected'], [t.experienceLabel, profile.experience || 'Not selected']].map(([label, value]) => (
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
                      {g.skill} (Gap: {Math.max(0, g.required - g.current)} points · {g.priority})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="view-heading">
              <p className="kicker">PERSONALIZED RECOMMENDATION ENGINE</p>
              <h1>AI Learning & Specialised Training Pathway</h1>
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
                  <span>Target Benchmark for {profile.role || profile.designation || 'Statistical Officer'}</span>
                </div>

                <div className="comparison-bars">
                  <label>Current Competency: <b>{selectedSkillForRec.current}%</b></label>
                  <div className="comparison-track">
                    <i className="current-bar" style={{ width: `${selectedSkillForRec.current}%` }} />
                  </div>
                  <label>Required Competency: <b>{selectedSkillForRec.required}%</b></label>
                  <div className="comparison-track">
                    <i className="required-bar" style={{ width: `${selectedSkillForRec.required}%` }} />
                  </div>
                </div>

                <div className="rec-gap-stat">
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Skill Gap</span>
                  <strong style={{ color: selectedSkillForRec.priority === 'Critical' ? 'var(--red)' : selectedSkillForRec.priority === 'Moderate' ? 'var(--amber)' : 'var(--green)' }}>
                    {Math.max(0, selectedSkillForRec.required - selectedSkillForRec.current)}%
                  </strong>
                  <span className={`status-pill ${selectedSkillForRec.priority === 'Critical' ? 'red' : selectedSkillForRec.priority === 'Moderate' ? 'amber' : 'green'}`}>
                    {selectedSkillForRec.priority} Priority
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
              {(profile.designation || profile.role || profile.name || 'DO').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2>Welcome to your Skillstat Hub</h2>
              <p className="user-sub">
                Target Role: <strong>{profile.designation || profile.role || 'Doctor'}</strong>
                {profile.department ? <> • Department: <strong>{profile.department}</strong></> : null}
                {' '}• Experience: <strong>{profile.experience || '10-15 years'}</strong> • Employee Rank:{' '}
                <strong className="rank-highlight-tag">#{userRank} in Company</strong>
              </p>
            </div>
          </div>

          <div className="hero-action-buttons">
            <button className="primary-action action-btn-quiz" onClick={() => startQuiz('standard')}>
              ⚡ {quizzesCompleted > 0 ? t.retakeQuiz : t.takeQuiz}
            </button>
          </div>
        </section>

        <div className="dashboard-main-grid">
              {/* Profile Overview */}
              <div className="dashboard-panel profile-panel">
                <div className="panel-head">
                  <h3>{t.profile}</h3>
                  <button className="edit-link" onClick={() => setStep('skills')}>
                    Edit
                  </button>
                </div>

                <div className="profile-details-list">
                  <div className="detail-item">
                    <span className="detail-label">{t.roleLabel}</span>
                    <span className="detail-val">{profile.designation || profile.role || 'Not selected'}</span>
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
                <button className="secondary-action btn-sm" onClick={() => startQuiz('standard')}>
                  {quizzesCompleted > 0 ? 'Re-evaluate Skills' : 'Start Assessment'}
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
                  <div className="rank-number">#{userRank}</div>
                  <span className="rank-tier-badge">
                    {userRank === 1 ? '🥇 Champion Tier' : userRank <= 3 ? '🥈 Top 3 Elite' : '⭐ Top 5% Tier'}
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
                <span className="leaderboard-count">148 Active Employees</span>
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

                {leaderboard.map((emp) => (
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
                ))}
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

                <div className="course-modal-section">
                  <h4>Course Curriculum & Objectives</h4>
                  <p className="course-modal-desc">
                    {activeCourseModal.whyRecommended || activeCourseModal.reason || 'Official government competency-building program designed to impart practical skills and eliminate domain knowledge gaps.'}
                  </p>
                </div>

                <div className="course-modal-section">
                  <h4>Structured Learning Modules</h4>
                  <div className="course-syllabus-list">
                    <div className="syllabus-item">
                      <span className="mod-num">Module 1</span>
                      <div>
                        <strong>Core Principles & Departmental Guidelines</strong>
                        <p>Foundational principles, governance standards, and official procedures for {activeCourseModal.title || activeCourseModal.name}.</p>
                      </div>
                    </div>
                    <div className="syllabus-item">
                      <span className="mod-num">Module 2</span>
                      <div>
                        <strong>Applied Workflows & Case Applications</strong>
                        <p>Implementation methodologies, practical frameworks, and domain-specific scenarios.</p>
                      </div>
                    </div>
                    <div className="syllabus-item">
                      <span className="mod-num">Module 3</span>
                      <div>
                        <strong>Quality Verification & Best Practices</strong>
                        <p>Field-tested best practices, error prevention techniques, and compliance checks.</p>
                      </div>
                    </div>
                    <div className="syllabus-item">
                      <span className="mod-num">Module 4</span>
                      <div>
                        <strong>Competency Benchmark & Assessment Preparation</strong>
                        <p>Hands-on scenario evaluations aligned with national certification standards.</p>
                      </div>
                    </div>
                  </div>
                </div>

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
      </main>

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
      />
    </div>
  )
}

export default App

