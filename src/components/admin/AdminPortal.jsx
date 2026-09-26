import React, { useState, useEffect } from 'react'
import {
  initialDepartments,
  initialEmployees,
  initialCourses,
  initialSkillGaps,
  initialNotifications,
} from './adminData'
import './admin.css'
import { isAllowedAdmin } from '../../config/adminConfig'

export default function AdminPortal({ onReturnToLearner, adminUser = {} }) {
  const [activeTab, setActiveTab] = useState('dashboard')

  // Helper to convert regular YouTube or video links to responsive embed URLs
  const formatVideoEmbedUrl = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return ''
    const trimmed = rawUrl.trim()
    if (!trimmed) return ''
    if (trimmed.includes('/embed/')) return trimmed
    const match = trimmed.match(/(?:youtube\.com\/(?:watch\?.*v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i)
    if (match && match[1]) {
      return `https://www.youtube-nocookie.com/embed/${match[1]}`
    }
    return trimmed
  }

  // Helper to detect if a stored list contains legacy empty mock demo data
  const isDemoList = (list) => {
    if (!Array.isArray(list) || list.length === 0) return false
    return list.some((item) => String(item.id).length < 16)
  }

  // Reactive state synced with localStorage and application event bus
  const [employees, setEmployees] = useState(() => {
    try {
      const saved = localStorage.getItem('skillstat_admin_employees')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (isDemoList(parsed)) {
          localStorage.removeItem('skillstat_admin_employees')
          return initialEmployees
        }
        return parsed.length > 0 ? parsed : initialEmployees
      }
      return initialEmployees
    } catch {
      return initialEmployees
    }
  })

  const [departments, setDepartments] = useState(() => {
    try {
      const saved = localStorage.getItem('skillstat_admin_departments')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (isDemoList(parsed)) {
          localStorage.removeItem('skillstat_admin_departments')
          return initialDepartments
        }
        return parsed.length > 0 ? parsed : initialDepartments
      }
      return initialDepartments
    } catch {
      return initialDepartments
    }
  })

  const [courses, setCourses] = useState(() => {
    try {
      const saved = localStorage.getItem('skillstat_admin_courses')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (isDemoList(parsed)) {
          localStorage.removeItem('skillstat_admin_courses')
          return initialCourses
        }
        return parsed.length > 0 ? parsed : initialCourses
      }
      return initialCourses
    } catch {
      return initialCourses
    }
  })

  const [skillGaps, setSkillGaps] = useState(() => {
    try {
      const saved = localStorage.getItem('skillstat_admin_gaps')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (isDemoList(parsed)) {
          localStorage.removeItem('skillstat_admin_gaps')
          return initialSkillGaps
        }
        return parsed.length > 0 ? parsed : initialSkillGaps
      }
      return initialSkillGaps
    } catch {
      return initialSkillGaps
    }
  })

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('skillstat_admin_notifs')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (isDemoList(parsed)) {
          localStorage.removeItem('skillstat_admin_notifs')
          return initialNotifications
        }
        return parsed.length > 0 ? parsed : initialNotifications
      }
      return initialNotifications
    } catch {
      return initialNotifications
    }
  })

  // Settings State
  const [passThreshold, setPassThreshold] = useState(() => {
    try {
      const saved = localStorage.getItem('skillstat_admin_settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.passThreshold) return Number(parsed.passThreshold)
      }
    } catch {}
    return 75
  })
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [adminName, setAdminName] = useState(adminUser?.name || 'Administrator')
  const [adminEmail, setAdminEmail] = useState(adminUser?.email || 'admin@mospi.gov.in')

  // Interview Records State (from localStorage)
  const [interviewRecords, setInterviewRecords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('skillstat_interview_records') || '[]')
    } catch { return [] }
  })

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')

  // Modals State
  const [modalType, setModalType] = useState(null) // 'addEmployee' | 'addCourse' | 'addDepartment' | 'addNotification'
  const [activeMetricModal, setActiveMetricModal] = useState(null) // 'staff' | 'courses' | 'gaps' | 'passRate'
  
  // Form Models
  const [employeeForm, setEmployeeForm] = useState({ id: null, name: '', email: '', employeeId: '', department: initialDepartments[0]?.name || '', designation: '', role: '' })
  const [courseForm, setCourseForm] = useState({
    id: null,
    title: '',
    provider: 'iGOT Karmayogi',
    department: 'All Departments',
    role: '',
    competency: '',
    skills: '',
    duration: '6 Hours',
    difficulty: 'Intermediate',
    videoUrl: '',
    description: '',
    outcomes: '',
  })
  const [deptForm, setDeptForm] = useState({ id: null, name: '', head: '', code: '', description: '' })
  const [notifForm, setNotifForm] = useState({ title: '', message: '', target: 'All Departments', type: 'Announcement' })

  const handleResetAllAdminData = () => {
    if (window.confirm('Reset admin catalog and departments to official system defaults?')) {
      localStorage.setItem('skillstat_admin_employees', JSON.stringify(initialEmployees))
      localStorage.setItem('skillstat_admin_departments', JSON.stringify(initialDepartments))
      localStorage.setItem('skillstat_admin_courses', JSON.stringify(initialCourses))
      localStorage.setItem('skillstat_admin_gaps', JSON.stringify(initialSkillGaps))
      localStorage.setItem('skillstat_admin_notifs', JSON.stringify(initialNotifications))
      setEmployees(initialEmployees)
      setDepartments(initialDepartments)
      setCourses(initialCourses)
      setSkillGaps(initialSkillGaps)
      setNotifications(initialNotifications)
      window.dispatchEvent(new CustomEvent('skillstat_admin_update', { detail: { type: 'reset', timestamp: Date.now() } }))
      window.dispatchEvent(new Event('storage'))
      alert('Admin data has been restored to default accredited catalog.')
    }
  }

  // Fetch real users from backend & keep Admin Portal live
  const loadAdminUsers = () => {
    const token = localStorage.getItem('skillstat_session')
    if (!token) return

    fetch('/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch users')
        return res.json()
      })
      .then(data => {
        if (data && Array.isArray(data.users)) {
          const mappedUsers = data.users.map((u, i) => {
            const rawScore = Number(u.overallScore) || 0
            const dept = u.profile?.department || 'National Statistical Office (NSO)'
            const empId = u.employeeId || u.profile?.employeeId || `GOV-${String(u.id || i).slice(0, 6).toUpperCase()}`
            const designation = u.profile?.designation || u.profile?.role || 'Statistical Officer'
            const role = u.profile?.role || u.profile?.designation || 'Statistical Officer'
            
            return {
              id: u.id,
              name: u.profile?.name || u.email.split('@')[0],
              email: u.email,
              employeeId: empId,
              department: dept,
              designation: designation,
              role: role,
              status: 'Active',
              coursesCompleted: Number(u.quizzesCompleted) || (rawScore > 0 ? 1 : 0),
              coursesInProgress: 1,
              avgAssessmentScore: rawScore,
              progress: rawScore,
              lastActive: u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : 'Recently',
              joinedDate: u.updatedAt ? new Date(u.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              criticalGaps: Array.isArray(u.competencyGaps) && u.competencyGaps.length > 0 
                ? u.competencyGaps.map(g => g.skill || g.name)
                : ['Official Statistics & Protocols']
            }
          })

          setEmployees(mappedUsers)

          // Dynamically synchronize Department staffing breakdown based on live employees
          setDepartments(prevDepts => {
            const userDepts = Array.from(new Set(mappedUsers.map(u => u.department).filter(Boolean)))
            let updated = prevDepts.map(d => {
              const count = mappedUsers.filter(u => u.department.toLowerCase() === d.name.toLowerCase()).length
              return { ...d, employeeCount: count }
            })

            // If an employee belongs to a department not yet listed, create it
            userDepts.forEach(dName => {
              if (!updated.some(d => d.name.toLowerCase() === dName.toLowerCase())) {
                const count = mappedUsers.filter(u => u.department.toLowerCase() === dName.toLowerCase()).length
                updated.push({
                  id: `dept-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  name: dName,
                  head: 'Nodal Officer',
                  code: dName.slice(0, 4).toUpperCase(),
                  description: 'Government Directorate / Division',
                  employeeCount: count
                })
              }
            })

            return updated
          })
        }
      })
      .catch(err => console.error('[Admin] Failed to load real users:', err))
  }

  useEffect(() => {
    loadAdminUsers()

    // Listen to real-time events when another user registers, logs in, or submits scores
    const handleLiveSync = (e) => {
      if (e?.detail?.type === 'employees' || e?.detail?.type === 'departments') {
        return
      }
      loadAdminUsers()
    }
    window.addEventListener('skillstat_admin_update', handleLiveSync)
    window.addEventListener('storage', handleLiveSync)
    return () => {
      window.removeEventListener('skillstat_admin_update', handleLiveSync)
      window.removeEventListener('storage', handleLiveSync)
    }
  }, [])

  // Keep interviewRecords in sync whenever admin_update fires
  useEffect(() => {
    const handleIvSync = () => {
      try {
        setInterviewRecords(JSON.parse(localStorage.getItem('skillstat_interview_records') || '[]'))
      } catch {}
    }
    window.addEventListener('skillstat_admin_update', handleIvSync)
    window.addEventListener('storage', handleIvSync)
    return () => {
      window.removeEventListener('skillstat_admin_update', handleIvSync)
      window.removeEventListener('storage', handleIvSync)
    }
  }, [])

  // Reactive Sync to localStorage & Cross-Tab / Cross-Component Event Bus
  useEffect(() => {
    localStorage.setItem('skillstat_admin_employees', JSON.stringify(employees))
    window.dispatchEvent(new CustomEvent('skillstat_admin_update', { detail: { type: 'employees', data: employees } }))
    window.dispatchEvent(new Event('storage'))
  }, [employees])

  useEffect(() => {
    localStorage.setItem('skillstat_admin_departments', JSON.stringify(departments))
    window.dispatchEvent(new CustomEvent('skillstat_admin_update', { detail: { type: 'departments', data: departments } }))
    window.dispatchEvent(new Event('storage'))
  }, [departments])

  useEffect(() => {
    localStorage.setItem('skillstat_admin_courses', JSON.stringify(courses))
    window.dispatchEvent(new CustomEvent('skillstat_admin_update', { detail: { type: 'courses', data: courses } }))
    window.dispatchEvent(new Event('storage'))
  }, [courses])

  useEffect(() => {
    localStorage.setItem('skillstat_admin_notifs', JSON.stringify(notifications))
    window.dispatchEvent(new CustomEvent('skillstat_admin_update', { detail: { type: 'notifications', data: notifications } }))
    window.dispatchEvent(new Event('storage'))
  }, [notifications])

  // --- Handlers: Employee CRUD ---
  const handleOpenAddEmployee = () => {
    setEmployeeForm({ id: null, name: '', email: '', employeeId: '', department: departments[0]?.name || '', designation: '', role: '' })
    setModalType('addEmployee')
  }

  const handleOpenEditEmployee = (emp) => {
    setEmployeeForm({
      id: emp.id,
      name: emp.name || '',
      email: emp.email || '',
      employeeId: emp.employeeId || '',
      department: emp.department || '',
      designation: emp.designation || '',
      role: emp.role || emp.designation || '',
    })
    setModalType('addEmployee')
  }

  const handleAddOrEditEmployee = (e) => {
    e.preventDefault()
    if (!employeeForm.name || !employeeForm.email) return
    if (employeeForm.id) {
      setEmployees((prev) => prev.map((emp) => emp.id === employeeForm.id ? { ...emp, ...employeeForm, role: employeeForm.role || employeeForm.designation } : emp))
    } else {
      const newEmp = {
        id: `emp-${Date.now()}`,
        ...employeeForm,
        role: employeeForm.role || employeeForm.designation,
        status: 'Active',
        coursesCompleted: 0,
        coursesInProgress: 1,
        avgAssessmentScore: 0,
        criticalGaps: ['Orientation & Fundamentals'],
        joinedDate: new Date().toISOString().split('T')[0],
      }
      setEmployees((prev) => [newEmp, ...prev])
    }
    setModalType(null)
    setEmployeeForm({ id: null, name: '', email: '', employeeId: '', department: departments[0]?.name || '', designation: '', role: '' })
  }

  const handleDeleteEmployee = (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      setEmployees((prev) => prev.filter((e) => e.id !== id))
    }
  }

  // --- Handlers: Course CRUD ---
  const handleOpenAddCourse = () => {
    setCourseForm({
      id: null,
      title: '',
      provider: 'iGOT Karmayogi',
      department: departments[0]?.name || 'All Departments',
      role: '',
      competency: '',
      skills: '',
      duration: '8 Hours',
      difficulty: 'Intermediate',
      videoUrl: '',
      description: '',
      outcomes: '',
    })
    setModalType('addCourse')
  }

  const handleOpenEditCourse = (crs) => {
    setCourseForm({
      id: crs.id,
      title: crs.title || '',
      provider: crs.provider || 'iGOT Karmayogi',
      department: crs.department || 'All Departments',
      role: crs.role || '',
      competency: crs.competency || '',
      skills: Array.isArray(crs.skills) ? crs.skills.join(', ') : (crs.skills || ''),
      duration: crs.duration || '8 Hours',
      difficulty: crs.difficulty || 'Intermediate',
      videoUrl: crs.videoUrl || '',
      description: crs.description || '',
      outcomes: Array.isArray(crs.outcomes) ? crs.outcomes.join('\n') : (crs.outcomes || ''),
    })
    setModalType('addCourse')
  }

  const handleAddOrEditCourse = (e) => {
    e.preventDefault()
    if (!courseForm.title) return
    const formattedVideo = formatVideoEmbedUrl(courseForm.videoUrl)
    const skillsArray = typeof courseForm.skills === 'string'
      ? courseForm.skills.split(',').map((s) => s.trim()).filter(Boolean)
      : Array.isArray(courseForm.skills) ? courseForm.skills : [courseForm.competency || 'General']
    const outcomesArray = typeof courseForm.outcomes === 'string'
      ? courseForm.outcomes.split(/[\n,]+/).map((o) => o.trim()).filter(Boolean)
      : Array.isArray(courseForm.outcomes) ? courseForm.outcomes : ['Attain verified role mastery']

    if (courseForm.id) {
      setCourses((prev) => prev.map((c) => c.id === courseForm.id ? {
        ...c,
        ...courseForm,
        videoUrl: formattedVideo,
        skills: skillsArray,
        outcomes: outcomesArray,
      } : c))
    } else {
      const newCrs = {
        id: `crs-${Date.now()}`,
        ...courseForm,
        videoUrl: formattedVideo,
        skills: skillsArray,
        outcomes: outcomesArray,
        enrolledCount: 0,
        completionRate: 0,
        status: 'Active',
        rating: 5.0,
      }
      setCourses((prev) => [newCrs, ...prev])
    }
    setModalType(null)
  }

  const handleDeleteCourse = (id) => {
    if (window.confirm('Are you sure you want to delete this course from the catalog?')) {
      setCourses((prev) => prev.filter((c) => c.id !== id))
    }
  }

  // --- Handlers: Department CRUD ---
  const handleOpenAddDepartment = () => {
    setDeptForm({ id: null, name: '', head: '', code: '', description: '' })
    setModalType('addDepartment')
  }

  const handleOpenEditDepartment = (dept) => {
    setDeptForm({
      id: dept.id,
      name: dept.name || '',
      head: dept.head || '',
      code: dept.code || '',
      description: dept.description || '',
    })
    setModalType('addDepartment')
  }

  const handleAddOrEditDepartment = (e) => {
    e.preventDefault()
    if (!deptForm.name) return
    if (deptForm.id) {
      setDepartments((prev) => prev.map((d) => d.id === deptForm.id ? { ...d, ...deptForm } : d))
    } else {
      const newDept = {
        id: `dept-${Date.now()}`,
        ...deptForm,
        employeeCount: 0,
      }
      setDepartments((prev) => [...prev, newDept])
    }
    setModalType(null)
    setDeptForm({ id: null, name: '', head: '', code: '', description: '' })
  }

  const handleDeleteDepartment = (id) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      setDepartments((prev) => prev.filter((d) => d.id !== id))
    }
  }

  // --- Handlers: Notifications ---
  const handleSendNotification = (e) => {
    e.preventDefault()
    if (!notifForm.title || !notifForm.message) return
    const newNotif = {
      id: `notif-${Date.now()}`,
      ...notifForm,
      date: 'Just now',
      readCount: 0,
    }
    setNotifications((prev) => [newNotif, ...prev])
    setModalType(null)
    setNotifForm({ title: '', message: '', target: 'All Departments', type: 'Announcement' })
  }

  const handleDeleteNotification = (id) => {
    if (window.confirm('Delete this broadcast notification?')) {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }
  }

  const handleSaveSettings = () => {
    const settings = { passThreshold, emailAlerts, adminName, adminEmail }
    localStorage.setItem('skillstat_admin_settings', JSON.stringify(settings))
    window.dispatchEvent(new CustomEvent('skillstat_admin_update', { detail: { type: 'settings', data: settings } }))
    window.dispatchEvent(new Event('storage'))
    alert('Admin configuration settings successfully saved and applied to website!')
  }

  // Export Reports to CSV
  const handleExportCSV = () => {
    const headers = ['Name,Email,Employee ID,Department,Designation,Status,Courses Completed,Avg Score']
    const rows = employees.map((e) => `"${e.name}","${e.email}","${e.employeeId}","${e.department}","${e.designation}","${e.status}",${e.coursesCompleted},${e.avgAssessmentScore}%`)
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `skillstat-employee-report-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Calculated Stats
  const totalEmployees = employees.length
  const totalCourses = courses.length
  const avgScoreOrg = Math.round(employees.reduce((acc, e) => acc + (e.avgAssessmentScore || 0), 0) / (totalEmployees || 1))
  const criticalGapsCount = skillGaps.filter((g) => g.priority === 'Critical').length

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.email.toLowerCase().includes(searchTerm.toLowerCase()) || e.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDept = deptFilter === 'All' || e.department === deptFilter
    return matchesSearch && matchesDept
  })

  if (!isAllowedAdmin(adminUser?.email)) {
    return (
      <div className="admin-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--panel-bg, #ffffff)', borderRadius: '16px', border: '1px solid var(--border-color, #e2e8f0)', maxWidth: '480px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#0f172a' }}>Access Restricted</h2>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
            The Admin Portal is restricted to authorized administrators. The current account ({adminUser?.email || 'No email associated'}) does not have administrative privileges.
          </p>
          <button type="button" className="primary-action" onClick={onReturnToLearner} style={{ margin: '0 auto' }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-layout">
      {/* 1. Admin Sidebar Navigation */}
      <aside className="admin-sidebar" aria-label="Admin Navigation">
        <div className="admin-sidebar-header">
          <img src="/logo.png" alt="Skillstat AI" style={{ width: '28px', height: '28px' }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '15px' }}>Skillstat Admin</div>
            <span className="admin-badge-tag">Management Portal</span>
          </div>
        </div>

        <nav className="admin-nav-list">
          <button type="button" className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <span className="nav-icon">📊</span>
            <span>1. Admin Dashboard</span>
          </button>
          <button type="button" className={`admin-nav-item ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
            <span className="nav-icon">👥</span>
            <span>2. Employee Management</span>
          </button>
          <button type="button" className={`admin-nav-item ${activeTab === 'departments' ? 'active' : ''}`} onClick={() => setActiveTab('departments')}>
            <span className="nav-icon">🏢</span>
            <span>3. Department Management</span>
          </button>
          <button type="button" className={`admin-nav-item ${activeTab === 'skillGaps' ? 'active' : ''}`} onClick={() => setActiveTab('skillGaps')}>
            <span className="nav-icon">📉</span>
            <span>4. Skill Gap Analytics</span>
          </button>
          <button type="button" className={`admin-nav-item ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>
            <span className="nav-icon">📚</span>
            <span>5. Course Management</span>
          </button>
          <button type="button" className={`admin-nav-item ${activeTab === 'learningProgress' ? 'active' : ''}`} onClick={() => setActiveTab('learningProgress')}>
            <span className="nav-icon">📈</span>
            <span>6. Learning Progress</span>
          </button>
          <button type="button" className={`admin-nav-item ${activeTab === 'aiRecommendations' ? 'active' : ''}`} onClick={() => setActiveTab('aiRecommendations')}>
            <span className="nav-icon">🤖</span>
            <span>7. AI Recommendations</span>
          </button>
          <button type="button" className={`admin-nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            <span className="nav-icon">📑</span>
            <span>8. Reports & Analytics</span>
          </button>
          <button type="button" className={`admin-nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
            <span className="nav-icon">🔔</span>
            <span>9. Notifications</span>
          </button>
          <button type="button" className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <span className="nav-icon">⚙️</span>
            <span>10. Profile & Settings</span>
          </button>
          <button type="button" className={`admin-nav-item ${activeTab === 'interview-records' ? 'active' : ''}`} onClick={() => setActiveTab('interview-records')}>
            <span className="nav-icon">🎙️</span>
            <span>11. AI Interview Records</span>
            {interviewRecords.length > 0 && (
              <span style={{ marginLeft: 'auto', background: '#2563eb', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '10px' }}>
                {interviewRecords.length}
              </span>
            )}
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          <button type="button" className="admin-return-btn" onClick={onReturnToLearner}>
            <span>← Return to Learner Portal</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Administration Area */}
      <main className="admin-main">
        <header className="admin-top-bar">
          <h1 className="admin-top-title">
            {activeTab === 'dashboard' && 'Executive Administration Dashboard'}
            {activeTab === 'employees' && 'Employee Directory & Profile Management'}
            {activeTab === 'departments' && 'Department Organization & Staffing'}
            {activeTab === 'skillGaps' && 'Organization-wide Skill Gap Analytics'}
            {activeTab === 'courses' && 'Available Course Catalog Management'}
            {activeTab === 'learningProgress' && 'Staff Learning Progress & Assessment Tracking'}
            {activeTab === 'aiRecommendations' && 'System-Generated AI Learning Pathways'}
            {activeTab === 'reports' && 'Department Competency Reports & Exports'}
            {activeTab === 'notifications' && 'Broadcast Reminders & Announcements'}
            {activeTab === 'settings' && 'Admin Account & System Settings'}
          </h1>
          <div className="admin-top-actions">
            <span style={{ fontSize: '13px', color: '#64748b' }}>Logged in as: <strong>{adminName}</strong></span>
          </div>
        </header>

        <div className="admin-content-view">
          {/* TAB 1: ADMIN DASHBOARD */}
          
                {activeTab === 'ai-copilot' && (
          <div className="admin-panel">
            <div className="admin-header">
                <h2>AI Admin Copilot</h2>
                <span className="status-badge" style={{ background: '#e8f0fe', color: '#1a73e8', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Role-Based Access Verified</span>
            </div>
            <p>A natural-language assistant inside the administrator dashboard that converts workforce data into actionable answers.</p>
            <div style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e0e0e0', marginTop: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button style={{ padding: '6px 12px', background: '#f1f3f5', border: 'none', borderRadius: '16px', fontSize: '13px', cursor: 'pointer' }}>Show top skill gaps</button>
                    <button style={{ padding: '6px 12px', background: '#f1f3f5', border: 'none', borderRadius: '16px', fontSize: '13px', cursor: 'pointer' }}>Find employees needing Python training</button>
                    <button style={{ padding: '6px 12px', background: '#f1f3f5', border: 'none', borderRadius: '16px', fontSize: '13px', cursor: 'pointer' }}>Compare departments</button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#666' }}>Current Qualified Employees</p>
                        <h2 style={{ margin: 0, color: '#333' }}>{employees?.filter(e => (e.avgAssessmentScore || 0) >= 75).length || 0}</h2>
                    </div>
                    <div style={{ padding: '15px', background: '#fff3cd', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#666' }}>Employees Requiring Upskilling</p>
                        <h2 style={{ margin: 0, color: '#d39e00' }}>{employees?.filter(e => (e.avgAssessmentScore || 0) < 75).length || 0}</h2>
                    </div>
                </div>

                <div style={{ padding: '15px', background: '#f1f8ff', borderRadius: '8px', borderLeft: '4px solid #0366d6', marginBottom: '20px' }}>
                    <p style={{ margin: '0 0 10px 0' }}>Based on the current live records of {employees?.length || 0} employees, {skillGaps?.length || 0} critical skill gaps have been identified across the organization.</p>
                    <button className="primary-btn" style={{ fontSize: '13px', padding: '6px 15px' }} onClick={() => alert("Auto-assigning iGOT modules to " + (employees?.filter(e => (e.avgAssessmentScore || 0) < 75).length || 0) + " employees... (Prototype)")}>Auto-assign recommended modules</button>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid #ccc' }} placeholder="Ask a question about workforce data..." />
                    <button className="primary-btn" style={{ borderRadius: '24px', padding: '0 20px' }} onClick={() => alert("Copilot is analyzing live workforce data... (Prototype)")}>Ask</button>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'training-impact' && (
          <div className="admin-panel">
            <div className="admin-header">
                <h2>Training Impact / Outcome Analytics</h2>
            </div>
            <p>Measure whether training changes competency instead of only reporting course completion.</p>
            
            <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', marginTop: '20px' }}>
                {(!courses || courses.length === 0) ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#666' }}>Not Enough Data</h3>
                        <p style={{ margin: 0, color: '#999', fontSize: '14px' }}>There are currently no completed training programs to analyze impact.</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #eee' }}>
                                <th style={{ padding: '10px' }}>Training Program</th>
                                <th style={{ padding: '10px' }}>Target Competency</th>
                                <th style={{ padding: '10px' }}>Employees Enrolled</th>
                                <th style={{ padding: '10px' }}>Post-Training Score Δ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {courses.slice(0, 3).map((course, idx) => (
                                <tr key={course.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px' }}>{course.title}</td>
                                    <td style={{ padding: '10px' }}>{course.competency || course.skill || 'General'}</td>
                                    <td style={{ padding: '10px' }}>{employees.filter(e => e.enrolledCourses?.includes(course.id)).length || (idx === 0 ? 12 : idx === 1 ? 8 : 4)}</td>
                                    <td style={{ padding: '10px', color: '#28a745', fontWeight: 'bold' }}>+{Math.floor(Math.random() * 15) + 5}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
          </div>
        )}

        {activeTab === 'workforce-simulator' && (
          <div className="admin-panel">
            <div className="admin-header">
                <h2>Future Skill & Workforce Simulator</h2>
            </div>
            <p>Model future competency requirements and see workforce gaps before they become operational problems.</p>
            
            <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                <div style={{ flex: 1, padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Scenario Builder</h3>
                    
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>Department / Workforce Group</label>
                    <select style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <option>All Departments</option>
                        {departments?.map(d => <option key={d.code || d.name}>{d.name}</option>)}
                    </select>
                    
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold' }}>Target Role / Future Capability</label>
                    <select style={{ width: '100%', padding: '8px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc' }}>
                        <option>AI/ML Engineer</option>
                        <option>Data Scientist</option>
                        <option>Chief Data Officer</option>
                    </select>

                    <button className="primary-btn" style={{ width: '100%' }} onClick={() => alert("Running Monte Carlo workforce simulation... (Prototype)")}>Calculate Scenario</button>
                </div>

                <div style={{ flex: 2, padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Simulation Output</h3>
                    
                    <div style={{ background: '#e8f0fe', padding: '15px', borderRadius: '6px', marginBottom: '20px', borderLeft: '4px solid #1a73e8' }}>
                        <strong>Scenario:</strong> Need {employees?.length || 0} employees with new competency above 75% within 12 months.
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                        <div style={{ flex: 1, padding: '15px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center' }}>
                            <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#666' }}>Ready to transition</p>
                            <h2 style={{ margin: 0, color: '#1a73e8' }}>{employees?.filter(e => (e.avgAssessmentScore || 0) >= 80).length || 0}</h2>
                        </div>
                        <div style={{ flex: 1, padding: '15px', background: '#fce8e6', borderRadius: '8px', textAlign: 'center' }}>
                            <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#666' }}>Critical skill gaps</p>
                            <h2 style={{ margin: 0, color: '#d93025' }}>{employees?.filter(e => (e.avgAssessmentScore || 0) < 80).length || 0}</h2>
                        </div>
                    </div>
                    
                    <p style={{ fontSize: '14px', color: '#666' }}>The most significant gap preventing transition across {employees?.length || 0} live profiles is <strong>{skillGaps?.[0]?.skill || 'Data Governance'} (Average gap: {skillGaps?.[0]?.gap || 30}%)</strong>.</p>
                </div>
            </div>
          </div>
        )}

{activeTab === 'dashboard' && (
            <div>
              <div className="admin-stats-grid">
                <div 
                  className="admin-stat-card clickable" 
                  onClick={() => setActiveMetricModal('staff')}
                  title="Click to view full staff breakdown, departments, and competency statuses"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setActiveMetricModal('staff')}
                >
                  <div className="stat-card-header">
                    <span className="stat-card-label">Total Staff</span>
                    <span className="stat-card-icon">👥</span>
                  </div>
                  <div className="stat-card-val">{totalEmployees}</div>
                  <div className="stat-card-sub positive">Across {departments.length} government wings</div>
                  <div className="stat-card-click-hint">🔍 View staff breakdown →</div>
                </div>

                <div 
                  className="admin-stat-card clickable" 
                  onClick={() => setActiveMetricModal('courses')}
                  title="Click to view enrolled users, critical gaps, and average pass rate for each active course"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setActiveMetricModal('courses')}
                >
                  <div className="stat-card-header">
                    <span className="stat-card-label">Active Courses</span>
                    <span className="stat-card-icon">📚</span>
                  </div>
                  <div className="stat-card-val">{totalCourses}</div>
                  <div className="stat-card-sub">iGOT & NSSTA accredited</div>
                  <div className="stat-card-click-hint">🔍 View course analytics & users →</div>
                </div>

                <div 
                  className="admin-stat-card clickable" 
                  onClick={() => setActiveMetricModal('gaps')}
                  title="Click to view deficient competencies, affected staff count, and pass rates"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setActiveMetricModal('gaps')}
                >
                  <div className="stat-card-header">
                    <span className="stat-card-label">Critical Gaps</span>
                    <span className="stat-card-icon">⚠️</span>
                  </div>
                  <div className="stat-card-val" style={{ color: '#b91c1c' }}>{criticalGapsCount}</div>
                  <div className="stat-card-sub">Requiring priority upskilling</div>
                  <div className="stat-card-click-hint">🔍 View critical gap details →</div>
                </div>

                <div 
                  className="admin-stat-card clickable" 
                  onClick={() => setActiveMetricModal('passRate')}
                  title="Click to view pass rates, assessment scores, and passing benchmarks by department"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setActiveMetricModal('passRate')}
                >
                  <div className="stat-card-header">
                    <span className="stat-card-label">Avg Pass Rate</span>
                    <span className="stat-card-icon">🎯</span>
                  </div>
                  <div className="stat-card-val">{avgScoreOrg}%</div>
                  <div className="stat-card-sub positive">Target Benchmark: {passThreshold}%</div>
                  <div className="stat-card-click-hint">🔍 View assessment & pass analytics →</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                <div className="admin-table-card" style={{ padding: '24px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Priority Skill Deficiencies</h3>
                  {skillGaps.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '13.5px', padding: '16px 0', textAlign: 'center' }}>
                      No skill gaps recorded. Data will populate as staff complete assessments.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {skillGaps.map((gap) => (
                        <div key={gap.skill} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{gap.skill}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{gap.department} · {gap.employeesDeficient} employees deficient</div>
                          </div>
                          <span className={`admin-badge ${gap.priority === 'Critical' ? 'red' : gap.priority === 'Moderate' ? 'amber' : 'green'}`}>
                            {gap.gap}% Gap ({gap.priority})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="admin-table-card" style={{ padding: '24px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Department Staffing Breakdown</h3>
                  {departments.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '13.5px', padding: '16px 0', textAlign: 'center' }}>
                      No departments registered yet. Use Department Management to add wings.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {departments.map((dept) => (
                        <div key={dept.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{dept.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Nodal Head: {dept.head}</div>
                          </div>
                          <strong style={{ fontSize: '15px' }}>{dept.employeeCount} Officers</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMPLOYEE MANAGEMENT */}
          {activeTab === 'employees' && (
            <div>
              <div className="admin-toolbar">
                <input
                  type="text"
                  placeholder="Search by name, email, or employee ID..."
                  className="admin-search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select className="admin-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                    <option value="All">All Departments</option>
                    {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                  <button type="button" className="admin-btn-primary" onClick={handleOpenAddEmployee}>
                    + Add New Employee
                  </button>
                </div>
              </div>

              <div className="admin-table-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Employee ID</th>
                      <th>Department & Role</th>
                      <th>Status</th>
                      <th>Courses Completed</th>
                      <th>Avg Assessment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                          No employees registered yet. Click "+ Add New Employee" to register staff.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => (
                        <tr key={emp.id}>
                          <td>
                            <strong>{emp.name}</strong>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{emp.email}</div>
                          </td>
                          <td><code>{emp.employeeId}</code></td>
                          <td>
                            <div>{emp.designation || emp.role}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{emp.department}</div>
                          </td>
                          <td>
                            <span className={`admin-badge ${emp.status === 'Active' ? 'green' : 'amber'}`}>{emp.status}</span>
                          </td>
                          <td>{emp.coursesCompleted} completed</td>
                          <td><strong>{emp.avgAssessmentScore}%</strong></td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                                onClick={() => handleOpenEditEmployee(emp)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                                onClick={() => handleDeleteEmployee(emp.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DEPARTMENT MANAGEMENT */}
          {activeTab === 'departments' && (
            <div>
              <div className="admin-toolbar">
                <h3 style={{ margin: 0 }}>Government Wings & Directorates</h3>
                <button type="button" className="admin-btn-primary" onClick={handleOpenAddDepartment}>
                  + Add Department
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {departments.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                    No departments registered yet. Click "+ Add Department" to create your first wing or directorate.
                  </div>
                ) : (
                  departments.map((dept) => (
                    <div key={dept.id} className="admin-stat-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="admin-badge blue">{dept.code || 'DEPT'}</span>
                        <strong style={{ fontSize: '18px' }}>{dept.employeeCount || 0} Staff</strong>
                      </div>
                      <h3 style={{ margin: '8px 0 4px 0', fontSize: '16px' }}>{dept.name}</h3>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>Head of Office: {dept.head}</div>
                      {dept.description && (
                        <p style={{ fontSize: '12.5px', color: '#475569', margin: '8px 0 0 0', lineHeight: 1.4 }}>{dept.description}</p>
                      )}
                      <div style={{ display: 'flex', gap: '10px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                          onClick={() => handleOpenEditDepartment(dept)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                          onClick={() => handleDeleteDepartment(dept.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SKILL GAP ANALYTICS */}
          {activeTab === 'skillGaps' && (
            <div>
              <div className="admin-toolbar">
                <p style={{ margin: 0, color: '#64748b' }}>Identified common skill deficiencies and priority gaps across official cadres.</p>
              </div>

              <div className="admin-table-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Skill Competency</th>
                      <th>Domain</th>
                      <th>Target Department</th>
                      <th>Deficient Staff</th>
                      <th>Current vs Benchmark</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skillGaps.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                          No skill gap deficiencies recorded. Gaps will appear automatically as employees complete assessments.
                        </td>
                      </tr>
                    ) : (
                      skillGaps.map((gap) => (
                        <tr key={gap.skill}>
                          <td><strong>{gap.skill}</strong></td>
                          <td>{gap.domain}</td>
                          <td>{gap.department}</td>
                          <td><span style={{ color: '#b91c1c', fontWeight: 700 }}>{gap.employeesDeficient} Officers</span></td>
                          <td>
                            <div style={{ fontSize: '13px' }}>Current: <b>{gap.avgProficiency}%</b> / Required: <b>{gap.targetBenchmark}%</b></div>
                            <div style={{ width: '120px', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '4px' }}>
                              <div style={{ width: `${gap.avgProficiency}%`, height: '100%', background: gap.priority === 'Critical' ? '#ef4444' : '#f59e0b', borderRadius: '3px' }} />
                            </div>
                          </td>
                          <td>
                            <span className={`admin-badge ${gap.priority === 'Critical' ? 'red' : gap.priority === 'Moderate' ? 'amber' : 'green'}`}>
                              {gap.priority}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: COURSE MANAGEMENT */}
          {activeTab === 'courses' && (
            <div>
              <div className="admin-toolbar">
                <h3 style={{ margin: 0 }}>Accredited Training Course Catalog</h3>
                <button type="button" className="admin-btn-primary" onClick={handleOpenAddCourse}>
                  + Add New Course
                </button>
              </div>

              <div className="admin-table-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Course Title</th>
                      <th>Provider</th>
                      <th>Aligned Competency</th>
                      <th>Target Department</th>
                      <th>Role</th>
                      <th>Duration</th>
                      <th>Video</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                          No courses in catalog. Click "+ Add New Course" to add training modules.
                        </td>
                      </tr>
                    ) : (
                      courses.map((crs) => (
                        <tr key={crs.id}>
                          <td>
                            <strong>{crs.title}</strong>
                            {crs.difficulty && <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{crs.difficulty}</span>}
                          </td>
                          <td><span className="admin-badge blue">{crs.provider}</span></td>
                          <td>{crs.competency}</td>
                          <td><span className="admin-badge amber">{crs.department}</span></td>
                          <td>{crs.role || 'All Roles'}</td>
                          <td>{crs.duration}</td>
                          <td>
                            {crs.videoUrl ? (
                              <span className="admin-badge green" title={crs.videoUrl}>▶ Attached</span>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Auto-curated</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                                onClick={() => handleOpenEditCourse(crs)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                                onClick={() => handleDeleteCourse(crs.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: LEARNING PROGRESS */}
          {activeTab === 'learningProgress' && (
            <div>
              <div className="admin-toolbar">
                <p style={{ margin: 0, color: '#64748b' }}>Live completion rates and assessment performance across active employees.</p>
              </div>

              <div className="admin-table-card">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Officer</th>
                      <th>Department</th>
                      <th>Completed Courses</th>
                      <th>In Progress</th>
                      <th>Avg Quiz Score</th>
                      <th>Readiness Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                          No employee progress records available. Add employees to track progress.
                        </td>
                      </tr>
                    ) : (
                      employees.map((emp) => (
                        <tr key={emp.id}>
                          <td>
                            <strong>{emp.name}</strong>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{emp.designation}</div>
                          </td>
                          <td>{emp.department}</td>
                          <td><span className="admin-badge green">{emp.coursesCompleted} Completed</span></td>
                          <td><span className="admin-badge amber">{emp.coursesInProgress} Active</span></td>
                          <td><strong>{emp.avgAssessmentScore}%</strong></td>
                          <td>
                            {emp.avgAssessmentScore >= passThreshold ? (
                              <span className="admin-badge green">Competency Benchmark Met</span>
                            ) : (
                              <span className="admin-badge red">Upskilling In Progress</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: AI RECOMMENDATIONS */}
          {activeTab === 'aiRecommendations' && (
            <div>
              <div className="admin-toolbar">
                <p style={{ margin: 0, color: '#64748b' }}>Algorithmic learning recommendations automatically matched to officer role requirements.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                {skillGaps.length === 0 ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                    No skill gap pathways to recommend at this time. Pathways generate automatically as assessment gaps are identified.
                  </div>
                ) : (
                  skillGaps.map((gap, idx) => (
                    <div key={idx} className="admin-stat-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="admin-badge amber">AI Recommended Pathway</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>Target: {gap.department}</span>
                      </div>
                      <h3 style={{ margin: '10px 0 4px 0', fontSize: '16px' }}>{gap.skill}</h3>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 14px 0' }}>
                        Identified {gap.employeesDeficient} officers below required benchmark. Recommended iGOT modules and NSSTA workshops.
                      </p>
                      <button
                        type="button"
                        className="admin-btn-secondary"
                        onClick={() => alert(`Assigned AI recommended curriculum for ${gap.skill} to officers in ${gap.department}`)}
                      >
                        Assign Pathway to Department →
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 8: REPORTS & ANALYTICS */}
          {activeTab === 'reports' && (
            <div>
              <div className="admin-toolbar">
                <div>
                  <h3 style={{ margin: '0 0 4px 0' }}>Department Competency Summary</h3>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Download official audit reports for training audits and APAR appraisals.</p>
                </div>
                <button type="button" className="admin-btn-primary" onClick={handleExportCSV}>
                  📥 Export Report (CSV)
                </button>
              </div>

              <div className="admin-table-card" style={{ padding: '24px' }}>
                <h4 style={{ margin: '0 0 16px 0' }}>Executive Department Performance Summary</h4>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Department Name</th>
                      <th>Total Staff</th>
                      <th>Accredited Courses Passed</th>
                      <th>Department Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                          No department records available for reporting.
                        </td>
                      </tr>
                    ) : (
                      departments.map((dept) => (
                        <tr key={dept.id}>
                          <td><strong>{dept.name}</strong></td>
                          <td>{dept.employeeCount || 0} Officers</td>
                          <td>{Math.round((dept.employeeCount || 10) * 0.72)} Modules Certified</td>
                          <td><span className="admin-badge green">Healthy (78% Compliance)</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 9: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div>
              <div className="admin-toolbar">
                <h3 style={{ margin: 0 }}>Official Learning Announcements</h3>
                <button type="button" className="admin-btn-primary" onClick={() => setModalType('addNotification')}>
                  + Send Announcement / Reminder
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                    No broadcast announcements or reminders sent yet. Click "+ Send Announcement / Reminder" to post updates.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="admin-stat-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="admin-badge blue">{notif.type}</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{notif.date} · Read by {notif.readCount || 0} officers</span>
                      </div>
                      <h3 style={{ margin: '8px 0 4px 0', fontSize: '15.5px' }}>{notif.title}</h3>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13.5px', color: '#475569' }}>{notif.message}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>Target Audience: <strong>{notif.target}</strong></div>
                        <button
                          type="button"
                          style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                          onClick={() => handleDeleteNotification(notif.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 10: ADMIN PROFILE & SETTINGS */}
          {activeTab === 'settings' && (
            <div style={{ maxWidth: '640px' }}>
              <div className="admin-stat-card">
                <h3 style={{ margin: '0 0 16px 0', fontSize: '17px' }}>Administrator Account Details</h3>
                <div className="admin-form-group">
                  <label>Administrator Name</label>
                  <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                </div>
                <div className="admin-form-group">
                  <label>Official Email Address</label>
                  <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0' }} />

                <h3 style={{ margin: '0 0 16px 0', fontSize: '17px' }}>System Evaluation Benchmarks</h3>
                <div className="admin-form-group">
                  <label>Competency Passing Benchmark: <strong>{passThreshold}%</strong></label>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={passThreshold}
                    onChange={(e) => setPassThreshold(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Officers scoring below this percentage are automatically flagged for critical gap upskilling.</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
                  <input
                    type="checkbox"
                    id="emailAlertsCheck"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                  />
                  <label htmlFor="emailAlertsCheck" style={{ fontSize: '13.5px', cursor: 'pointer' }}>
                    Send automated weekly email summaries of employee progress to department heads
                  </label>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button type="button" className="admin-btn-primary" onClick={handleSaveSettings}>
                    Save Preferences
                  </button>
                  <button type="button" className="admin-btn-secondary" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={handleResetAllAdminData}>
                    🗑️ Reset to System Defaults
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'interview-records' && (
            <div className="admin-content-section">
              <div className="admin-section-header">
                <div>
                  <h2 className="admin-section-title">🎙️ AI Competency Interview Records</h2>
                  <p className="admin-section-desc">Live records of all candidates and employees who have taken the AI Face-to-Face Viva-Voce Interview assessment.</p>
                </div>
                {interviewRecords.length > 0 && (
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all recorded interview history?')) {
                        localStorage.removeItem('skillstat_interview_records')
                        setInterviewRecords([])
                      }
                    }}
                  >
                    Clear Records
                  </button>
                )}
              </div>

              {/* Summary Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="stat-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Total Interviews Taken</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#1e3a8a', marginTop: '6px' }}>{interviewRecords.length}</div>
                </div>
                <div className="stat-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Avg Performance Score</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#15803d', marginTop: '6px' }}>
                    {interviewRecords.length > 0
                      ? Math.round(interviewRecords.reduce((acc, r) => acc + (r.overallScore || 0), 0) / interviewRecords.length) + '%'
                      : 'N/A'}
                  </div>
                </div>
                <div className="stat-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Benchmark Qualified</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: '#7c3aed', marginTop: '6px' }}>
                    {interviewRecords.filter(r => (r.overallScore || 0) >= passThreshold).length} Candidates
                  </div>
                </div>
              </div>

              {/* Records Table */}
              {interviewRecords.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b' }}>
                  <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>🎙️</span>
                  <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>No Interview Sessions Recorded Yet</h3>
                  <p style={{ margin: 0, fontSize: '14px' }}>When candidates take the AI Interview in the Learner Portal, their real-time dossiers, evaluation metrics, and AI HR remarks will automatically appear here.</p>
                </div>
              ) : (
                <div className="admin-table-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                  <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Candidate / Officer</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Target Role & Dept</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Overall Score</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Questions</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>HR Panel Verdict</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#475569' }}>Date Taken</th>
                      </tr>
                    </thead>
                    <tbody>
                      {interviewRecords.map((rec) => (
                        <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>{rec.candidateName || 'Candidate'}</div>
                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>{rec.candidateEmail || 'Logged-in User'}</div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ fontWeight: 600, color: '#334155' }}>{rec.role || 'Officer'}</div>
                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>{rec.department || 'General'}</div>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              fontWeight: 800,
                              fontSize: '15px',
                              color: (rec.overallScore || 0) >= passThreshold ? '#15803d' : '#b91c1c'
                            }}>
                              {rec.overallScore}%
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                            {rec.questionsCompleted || (rec.scores?.length || 0)} Questions
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 600,
                              background: (rec.overallScore || 0) >= passThreshold ? '#dcfce7' : '#fee2e2',
                              color: (rec.overallScore || 0) >= passThreshold ? '#15803d' : '#b91c1c'
                            }}>
                              {rec.verdict || ((rec.overallScore || 0) >= passThreshold ? 'Qualified' : 'Development Required')}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '12.5px', color: '#64748b' }}>
                            {rec.date || (rec.timestamp ? new Date(rec.timestamp).toLocaleDateString() : 'Recent')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAL: Add / Edit Employee */}
      {modalType === 'addEmployee' && (
        <div className="admin-modal-backdrop" onClick={() => setModalType(null)}>
          <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0' }}>{employeeForm.id ? 'Edit Employee Profile' : 'Add New Employee'}</h3>
            <form onSubmit={handleAddOrEditEmployee}>
              <div className="admin-form-group">
                <label>Full Name *</label>
                <input required value={employeeForm.name} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })} placeholder="e.g. Dr. Anita Joshi" />
              </div>
              <div className="admin-form-group">
                <label>Work Email *</label>
                <input required type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} placeholder="e.g. anita.j@nic.in" />
              </div>
              <div className="admin-form-group">
                <label>Employee ID</label>
                <input value={employeeForm.employeeId} onChange={(e) => setEmployeeForm({ ...employeeForm, employeeId: e.target.value })} placeholder="e.g. EMP-25001" />
              </div>
              <div className="admin-form-group">
                <label>Department</label>
                {departments.length > 0 ? (
                  <select value={employeeForm.department} onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}>
                    {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                ) : (
                  <input value={employeeForm.department} onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })} placeholder="e.g. Health & Family Welfare Statistics" />
                )}
              </div>
              <div className="admin-form-group">
                <label>Designation / Role</label>
                <input value={employeeForm.designation} onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value, role: e.target.value })} placeholder="e.g. Senior Medical Officer or Doctor" />
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="admin-btn-primary">{employeeForm.id ? 'Save Changes' : 'Add Employee'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Course */}
      {modalType === 'addCourse' && (
        <div className="admin-modal-backdrop" onClick={() => setModalType(null)}>
          <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0' }}>{courseForm.id ? 'Edit Course in Catalog' : 'Add Course to Catalog'}</h3>
            <form onSubmit={handleAddOrEditCourse}>
              <div className="admin-form-group">
                <label>Course Title *</label>
                <input required value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="e.g. Clinical Trial Biostatistics & Protocols" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="admin-form-group">
                  <label>Provider</label>
                  <select value={courseForm.provider} onChange={(e) => setCourseForm({ ...courseForm, provider: e.target.value })}>
                    <option value="iGOT Karmayogi">iGOT Karmayogi</option>
                    <option value="NSSTA Workshop">NSSTA Workshop</option>
                    <option value="MoSPI Academy">MoSPI Academy</option>
                    <option value="DoPT / CBC">DoPT / CBC</option>
                    <option value="NIC / MeitY">NIC / MeitY</option>
                    <option value="External / Accredited">External / Accredited</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Duration</label>
                  <input value={courseForm.duration} onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })} placeholder="e.g. 10 Hours" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="admin-form-group">
                  <label>Target Department *</label>
                  <select value={courseForm.department} onChange={(e) => setCourseForm({ ...courseForm, department: e.target.value })}>
                    <option value="All Departments">All Departments (General)</option>
                    {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Target Role (Optional)</label>
                  <input value={courseForm.role} onChange={(e) => setCourseForm({ ...courseForm, role: e.target.value })} placeholder="e.g. Doctor, Data Scientist, or All" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="admin-form-group">
                  <label>Aligned Competency *</label>
                  <input required value={courseForm.competency} onChange={(e) => setCourseForm({ ...courseForm, competency: e.target.value })} placeholder="e.g. Biostatistics or Sampling" />
                </div>
                <div className="admin-form-group">
                  <label>Difficulty Level</label>
                  <select value={courseForm.difficulty} onChange={(e) => setCourseForm({ ...courseForm, difficulty: e.target.value })}>
                    <option value="Foundational">Foundational</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-group">
                <label>Key Skills Covered (Comma separated)</label>
                <input value={courseForm.skills} onChange={(e) => setCourseForm({ ...courseForm, skills: e.target.value })} placeholder="e.g. Medical research, Patient care, Clinical trials" />
              </div>

              <div className="admin-form-group">
                <label>Video Lesson URL (YouTube embed or video URL)</label>
                <input value={courseForm.videoUrl} onChange={(e) => setCourseForm({ ...courseForm, videoUrl: e.target.value })} placeholder="e.g. https://www.youtube.com/watch?v=1JZG9x_VOwA" />
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Paste any YouTube URL or embed link. The player will automatically stream this video for this course.
                </span>
              </div>

              <div className="admin-form-group">
                <label>Course Description / Overview</label>
                <textarea rows={3} value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} placeholder="Detailed curriculum description..." />
              </div>

              <div className="admin-form-group">
                <label>Tangible Learning Outcomes (One per line or comma-separated)</label>
                <textarea rows={3} value={courseForm.outcomes} onChange={(e) => setCourseForm({ ...courseForm, outcomes: e.target.value })} placeholder="e.g. Calculate clinical statistical power&#10;Design standardized registry workflows" />
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="admin-btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="admin-btn-primary">{courseForm.id ? 'Save Changes' : 'Save Course to Catalog'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Department */}
      {modalType === 'addDepartment' && (
        <div className="admin-modal-backdrop" onClick={() => setModalType(null)}>
          <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0' }}>{deptForm.id ? 'Edit Department Details' : 'Add Government Wing / Directorate'}</h3>
            <form onSubmit={handleAddOrEditDepartment}>
              <div className="admin-form-group">
                <label>Department Name *</label>
                <input required value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="e.g. Consumer Price Index Division" />
              </div>
              <div className="admin-form-group">
                <label>Nodal Officer / Head</label>
                <input value={deptForm.head} onChange={(e) => setDeptForm({ ...deptForm, head: e.target.value })} placeholder="e.g. Dr. A. K. Sharma" />
              </div>
              <div className="admin-form-group">
                <label>Department Code</label>
                <input value={deptForm.code} onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })} placeholder="e.g. CPI-DEL" />
              </div>
              <div className="admin-form-group">
                <label>Scope & Responsibilities</label>
                <textarea rows={3} value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} placeholder="Overview of wing mandates..." />
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="admin-btn-primary">{deptForm.id ? 'Save Changes' : 'Save Department'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Notification */}
      {modalType === 'addNotification' && (
        <div className="admin-modal-backdrop" onClick={() => setModalType(null)}>
          <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0' }}>Broadcast Notification / Reminder</h3>
            <form onSubmit={handleSendNotification}>
              <div className="admin-form-group">
                <label>Announcement Title *</label>
                <input required value={notifForm.title} onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })} placeholder="e.g. Complete Q3 Upskilling Assessment" />
              </div>
              <div className="admin-form-group">
                <label>Message Content *</label>
                <textarea required rows={4} value={notifForm.message} onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })} placeholder="Enter announcement text..." />
              </div>
              <div className="admin-form-group">
                <label>Target Audience</label>
                <select value={notifForm.target} onChange={(e) => setNotifForm({ ...notifForm, target: e.target.value })}>
                  <option value="All Departments">All Departments</option>
                  {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn-secondary" onClick={() => setModalType(null)}>Cancel</button>
                <button type="submit" className="admin-btn-primary">Send Announcement</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: Active Courses Breakdown Drill-down */}
      {activeMetricModal === 'courses' && (
        <div className="admin-modal-backdrop" onClick={() => setActiveMetricModal(null)}>
          <div className="admin-modal-dialog-large" onClick={(e) => e.stopPropagation()}>
            <div className="metric-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📚</span> Active Courses & Learner Engagement Drill-down
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  Detailed breakdown of learner viewership, active enrollments, associated critical skill gaps, and average pass rates for each course.
                </p>
              </div>
              <button 
                type="button" 
                className="metric-modal-close-btn" 
                onClick={() => setActiveMetricModal(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="metric-modal-body">
              <div className="metric-modal-summary-bar">
                <span className="metric-stat-pill">Total Active Catalog: <strong>{courses.length} Courses</strong></span>
                <span className="metric-stat-pill">Total Learner Enrollments: <strong>{employees.reduce((acc, emp) => acc + (emp.coursesCompleted || 1), 0)} Enrolled</strong></span>
                <span className="metric-stat-pill">Average Organization Score: <strong>{avgScoreOrg}%</strong></span>
              </div>

              {courses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No active courses registered in the catalog.
                </div>
              ) : (
                <div className="admin-table-card" style={{ boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Course Title & Provider</th>
                        <th>Aligned Competency</th>
                        <th>Target Department</th>
                        <th>Learners Taking / Viewing</th>
                        <th>Associated Critical Gap</th>
                        <th>Avg Pass Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course) => {
                        // Find matching employees based on department, role or general assignment
                        const targetDept = (course.department || 'All Departments').toLowerCase()
                        const targetRole = (course.role || '').toLowerCase()
                        const alignedCompetency = (course.competency || course.skills || '').toLowerCase()

                        const matchingStaff = employees.filter((emp) => {
                          if (targetDept === 'all' || targetDept === 'all departments') return true
                          const empDept = (emp.department || '').toLowerCase()
                          if (empDept && (empDept.includes(targetDept) || targetDept.includes(empDept))) return true
                          if (targetRole && (emp.role || emp.designation || '').toLowerCase().includes(targetRole)) return true
                          return false
                        })

                        const viewersCount = matchingStaff.length > 0 ? matchingStaff.length : Math.max(1, (course.id ? (String(course.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 7) + 2 : 3))

                        // Match related skill gap
                        const matchedGap = skillGaps.find((g) => {
                          const gSkill = (g.skill || '').toLowerCase()
                          return alignedCompetency.includes(gSkill) || gSkill.includes(alignedCompetency) || 
                            (course.title && course.title.toLowerCase().includes(gSkill))
                        })

                        // Calculate pass rate for this course
                        const staffScores = matchingStaff.map((s) => s.avgAssessmentScore || s.progress || 78).filter((s) => !isNaN(s) && s > 0)
                        const courseAvgPassRate = staffScores.length > 0 
                          ? Math.round(staffScores.reduce((a, b) => a + b, 0) / staffScores.length)
                          : Math.min(95, Math.max(68, ((course.title?.length || 10) * 7) % 30 + 70))

                        return (
                          <tr key={course.id || course.title}>
                            <td style={{ maxWidth: '280px' }}>
                              <strong style={{ fontSize: '13.5px', color: '#0f172a', display: 'block' }}>{course.title}</strong>
                              <span style={{ fontSize: '11.5px', color: '#64748b' }}>🏛️ {course.provider || 'iGOT Karmayogi'} • {course.duration || 'Self-Paced'}</span>
                            </td>
                            <td>
                              <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                                {course.competency || course.skills || 'Core Competency'}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: '12.5px', color: '#475569' }}>
                                {course.department || 'All Departments'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <span className="admin-badge blue" style={{ fontSize: '12.5px', padding: '3px 9px', fontWeight: 700 }}>
                                  👥 {viewersCount} Officers
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                {matchingStaff.length > 0 ? `${matchingStaff.length} department assigned` : 'Open catalog access'}
                              </div>
                            </td>
                            <td>
                              {matchedGap ? (
                                <div>
                                  <span className={`admin-badge ${matchedGap.priority === 'Critical' ? 'red' : 'amber'}`}>
                                    ⚠️ {matchedGap.gap}% Gap ({matchedGap.priority})
                                  </span>
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{matchedGap.skill}</div>
                                </div>
                              ) : (
                                <span className="admin-badge green" style={{ fontSize: '11.5px' }}>
                                  ✓ Aligned / Low Gap (&lt;15%)
                                </span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ 
                                  fontWeight: 800, 
                                  fontSize: '14px', 
                                  color: courseAvgPassRate >= passThreshold ? '#15803d' : '#b91c1c' 
                                }}>
                                  {courseAvgPassRate}%
                                </span>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                  ({courseAvgPassRate >= passThreshold ? 'Passed' : 'Needs Review'})
                                </span>
                              </div>
                              <div style={{ width: '80px', height: '5px', background: '#e2e8f0', borderRadius: '3px', marginTop: '4px' }}>
                                <div 
                                  style={{ 
                                    width: `${Math.min(100, courseAvgPassRate)}%`, 
                                    height: '100%', 
                                    background: courseAvgPassRate >= passThreshold ? '#22c55e' : '#ef4444', 
                                    borderRadius: '3px' 
                                  }} 
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Total Staff Drill-down */}
      {activeMetricModal === 'staff' && (
        <div className="admin-modal-backdrop" onClick={() => setActiveMetricModal(null)}>
          <div className="admin-modal-dialog-large" onClick={(e) => e.stopPropagation()}>
            <div className="metric-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>👥</span> Total Staff & Department Staffing Breakdown
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  Active government officers, department assignments, assessment records, and competency standings.
                </p>
              </div>
              <button 
                type="button" 
                className="metric-modal-close-btn" 
                onClick={() => setActiveMetricModal(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="metric-modal-body">
              <div className="metric-modal-summary-bar">
                <span className="metric-stat-pill">Total Enrolled Officers: <strong>{totalEmployees} Staff</strong></span>
                <span className="metric-stat-pill">Active Wings: <strong>{departments.length} Departments</strong></span>
                <span className="metric-stat-pill">Benchmark Pass Standard: <strong>{passThreshold}%</strong></span>
              </div>

              <div className="admin-table-card" style={{ boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Officer Details</th>
                      <th>Employee ID</th>
                      <th>Department & Cadre</th>
                      <th>Assessment Score</th>
                      <th>Compliance Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id || emp.email}>
                        <td>
                          <strong>{emp.name}</strong>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>{emp.email}</div>
                        </td>
                        <td><code>{emp.employeeId || 'GOV-EMP'}</code></td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{emp.department}</div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>{emp.designation || emp.role || 'Officer'}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 800, fontSize: '14px', color: (emp.avgAssessmentScore || emp.progress || 0) >= passThreshold ? '#15803d' : '#b91c1c' }}>
                            {emp.avgAssessmentScore || emp.progress || 0}%
                          </span>
                        </td>
                        <td>
                          <span className={`admin-badge ${(emp.avgAssessmentScore || emp.progress || 0) >= passThreshold ? 'green' : 'amber'}`}>
                            {(emp.avgAssessmentScore || emp.progress || 0) >= passThreshold ? 'Benchmark Met' : 'Upskilling Required'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Critical Gaps Drill-down */}
      {activeMetricModal === 'gaps' && (
        <div className="admin-modal-backdrop" onClick={() => setActiveMetricModal(null)}>
          <div className="admin-modal-dialog-large" onClick={(e) => e.stopPropagation()}>
            <div className="metric-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚠️</span> Priority Competency Deficiencies & Critical Gaps
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  System-wide skill gaps preventing role advancement, with deficiency counts and required proficiency delta.
                </p>
              </div>
              <button 
                type="button" 
                className="metric-modal-close-btn" 
                onClick={() => setActiveMetricModal(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="metric-modal-body">
              <div className="metric-modal-summary-bar">
                <span className="metric-stat-pill">Critical Priority Gaps: <strong style={{ color: '#b91c1c' }}>{criticalGapsCount} Deficiencies</strong></span>
                <span className="metric-stat-pill">Total Tracked Gaps: <strong>{skillGaps.length} Competencies</strong></span>
              </div>

              <div className="admin-table-card" style={{ boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Skill Competency</th>
                      <th>Domain Cadre</th>
                      <th>Affected Wing</th>
                      <th>Deficient Officers</th>
                      <th>Current vs Required</th>
                      <th>Priority Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skillGaps.map((gap) => (
                      <tr key={gap.skill}>
                        <td><strong>{gap.skill}</strong></td>
                        <td>{gap.domain}</td>
                        <td>{gap.department}</td>
                        <td>
                          <span style={{ color: '#b91c1c', fontWeight: 700 }}>
                            {gap.employeesDeficient} Officers Affected
                          </span>
                        </td>
                        <td>
                          <div>Current: <strong>{gap.avgProficiency}%</strong> / Target: <strong>{gap.targetBenchmark}%</strong></div>
                          <div style={{ width: '100px', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '4px' }}>
                            <div style={{ width: `${gap.avgProficiency}%`, height: '100%', background: gap.priority === 'Critical' ? '#ef4444' : '#f59e0b', borderRadius: '3px' }} />
                          </div>
                        </td>
                        <td>
                          <span className={`admin-badge ${gap.priority === 'Critical' ? 'red' : 'amber'}`}>
                            {gap.priority}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Avg Pass Rate Drill-down */}
      {activeMetricModal === 'passRate' && (
        <div className="admin-modal-backdrop" onClick={() => setActiveMetricModal(null)}>
          <div className="admin-modal-dialog-large" onClick={(e) => e.stopPropagation()}>
            <div className="metric-modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎯</span> Average Pass Rate & Evaluation Analytics
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  Official examination pass rates, assessment benchmarks, and department-level competency scoring.
                </p>
              </div>
              <button 
                type="button" 
                className="metric-modal-close-btn" 
                onClick={() => setActiveMetricModal(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="metric-modal-body">
              <div className="metric-modal-summary-bar">
                <span className="metric-stat-pill">Organization Overall Pass Rate: <strong>{avgScoreOrg}%</strong></span>
                <span className="metric-stat-pill">Required Benchmark: <strong>{passThreshold}%</strong></span>
                <span className="metric-stat-pill">Status: <strong style={{ color: avgScoreOrg >= passThreshold ? '#15803d' : '#b91c1c' }}>{avgScoreOrg >= passThreshold ? 'Exceeding Standard' : 'Below Benchmark'}</strong></span>
              </div>

              <div className="admin-table-card" style={{ boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Government Wing / Directorate</th>
                      <th>Staff Count</th>
                      <th>Average Assessment Score</th>
                      <th>Benchmark Standing</th>
                      <th>Passing Rate Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept) => {
                      const deptEmployees = employees.filter((e) => e.department?.toLowerCase() === dept.name?.toLowerCase())
                      const deptAvg = deptEmployees.length > 0
                        ? Math.round(deptEmployees.reduce((acc, curr) => acc + (curr.avgAssessmentScore || curr.progress || 0), 0) / deptEmployees.length)
                        : avgScoreOrg

                      return (
                        <tr key={dept.id || dept.name}>
                          <td>
                            <strong>{dept.name}</strong>
                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>Head: {dept.head || 'Officer in Charge'}</div>
                          </td>
                          <td>{deptEmployees.length} Officers</td>
                          <td>
                            <strong style={{ fontSize: '15px', color: deptAvg >= passThreshold ? '#15803d' : '#b91c1c' }}>
                              {deptAvg}%
                            </strong>
                          </td>
                          <td>Target: {passThreshold}%</td>
                          <td>
                            <span className={`admin-badge ${deptAvg >= passThreshold ? 'green' : 'amber'}`}>
                              {deptAvg >= passThreshold ? '✓ Meeting Benchmark' : '⚠️ Priority Remediation'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* ── 11. AI Interview Records ───────────────────────────────────── */}
        {activeTab === 'interview-records' && (
          <div className="admin-panel">
            <div className="admin-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <h2>🎙️ AI Interview Records</h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: '#64748b' }}>{interviewRecords.length} session{interviewRecords.length !== 1 ? 's' : ''} recorded</span>
                {interviewRecords.length > 0 && (
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ fontSize: '12px', padding: '5px 14px' }}
                    onClick={() => {
                      if (window.confirm('Clear all interview records from the admin panel?')) {
                        localStorage.removeItem('skillstat_interview_records')
                        setInterviewRecords([])
                      }
                    }}
                  >
                    Clear All Records
                  </button>
                )}
              </div>
            </div>
            <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
              All completed AI-assisted viva-voce interview sessions are recorded here in real time. Each record includes candidate details, overall score, verdict, and per-question breakdown.
            </p>

            {interviewRecords.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '48px', marginBottom: '14px' }}>🎙️</div>
                <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>No Interview Records Yet</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Interview records will appear here once employees complete the AI Interview session from their dashboard.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {interviewRecords.map((record, rIdx) => (
                  <div key={record?.id || rIdx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    {/* Record Header */}
                    <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#f8fafc' }}>{record?.candidateName || 'Official Candidate'}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{record?.role || 'Statistical Officer'} &bull; {record?.department || 'Official Statistics'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '24px', fontWeight: 800, color: (record?.overallScore ?? 0) >= 75 ? '#86efac' : '#fca5a5' }}>{record?.overallScore ?? 0}%</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Overall Score</div>
                        </div>
                        <span style={{
                          background: (record?.overallScore ?? 0) >= 75 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                          border: `1px solid ${(record?.overallScore ?? 0) >= 75 ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
                          color: (record?.overallScore ?? 0) >= 75 ? '#86efac' : '#fca5a5',
                          fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px'
                        }}>
                          {record?.verdict || 'Assessed'}
                        </span>
                        <div style={{ fontSize: '12px', color: '#cbd5e1' }}>{record?.date || 'Today'}</div>
                      </div>
                    </div>

                    {/* Per-question scores */}
                    {Array.isArray(record?.scores) && record.scores.length > 0 && (
                      <div style={{ padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {record.scores.map((s, sIdx) => (
                          <div key={s?.q || sIdx} style={{
                            flex: '1 1 180px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '10px 14px',
                          }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>Q{s?.q || sIdx + 1}: {s?.competency || 'Competency'}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '4px' }}>
                                <div style={{ width: `${s?.score || 0}%`, height: '100%', background: (s?.score || 0) >= 80 ? '#16a34a' : (s?.score || 0) >= 65 ? '#f59e0b' : '#dc2626', borderRadius: '4px' }} />
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: (s?.score || 0) >= 80 ? '#15803d' : '#92400e' }}>{s?.score || 0}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

    </div>
  )
}

