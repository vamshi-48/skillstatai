import React, { useState, useEffect, useRef } from 'react'
import './AIInterviewView.css'

// ── Off-topic / Non-answer detection ──────────────────────────────────────────
const OFF_TOPIC_EXACT = [
  'bye', 'goodbye', 'hello', 'hi', 'hey', 'ok', 'okay', 'yes', 'no', 'sure', 'fine',
  'nothing', 'idk', "i don't know", 'skip', 'pass', 'next', 'done', 'stop',
  'quit', 'exit', 'thanks', 'thank you', 'good', 'great', 'cool', 'nice',
  'lol', 'haha', 'test', 'testing', '...',
]

function isOffTopicResponse(text) {
  const trimmed = text.trim().toLowerCase()
  if (trimmed.length < 15) return true
  if (OFF_TOPIC_EXACT.some(p => trimmed === p || trimmed.startsWith(p + ' ') || trimmed.endsWith(' ' + p))) return true
  const wordCount = trimmed.split(/\s+/).length
  if (wordCount < 4) return true
  return false
}

// ── Local Fallback Evaluator (Dynamic Scoring according to user input) ────────
function evaluateAnswerLocally(text, competencyName) {
  const words = text.trim().split(/\s+/).length
  const lower = text.toLowerCase()

  // Base score according to response depth & articulation
  let calculatedScore = 68
  if (words > 65) calculatedScore += 16
  else if (words > 40) calculatedScore += 11
  else if (words > 22) calculatedScore += 6
  else if (words < 12) calculatedScore -= 18

  // Professional competencies & STAR methodology signals
  const qualitySignals = [
    'challenge', 'result', 'team', 'lead', 'metric', 'project', 'process',
    'improved', 'data', 'stakeholder', 'strategy', 'analysis', 'delivered',
    'solved', 'action', 'impact', 'managed', 'collaborated'
  ]
  const matchCount = qualitySignals.filter(k => lower.includes(k)).length
  calculatedScore += Math.min(14, matchCount * 3)

  const finalScore = Math.max(50, Math.min(97, calculatedScore))
  const verdict = finalScore >= 80 ? 'Exceeds Expectations' : finalScore >= 70 ? 'Meets Expectations' : 'Development Required'

  return {
    score: finalScore,
    verdict,
    feedback: `Good articulation regarding ${competencyName || 'your professional experience'}. Your response highlights valuable operational understanding.`,
    strength: words > 30 ? 'Comprehensive context and practical depth.' : 'Focused response directly answering the question.',
    improvement: 'Consider structuring your next example using the STAR approach (Situation, Task, Action, Result) with quantified impact.',
  }
}

export default function AIInterviewView({ profile = {}, competencyGaps = [], onScoreUpdate }) {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)
  const [mouthOpen, setMouthOpen] = useState(false)
  const [eyeBlink, setEyeBlink] = useState(false)
  const [interviewComplete, setInterviewComplete] = useState(false)
  const [evaluationDossier, setEvaluationDossier] = useState(null)
  const [questionCount, setQuestionCount] = useState(0)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [sessionScores, setSessionScores] = useState([])

  const chatBottomRef = useRef(null)
  const mouthIntervalRef = useRef(null)
  const blinkIntervalRef = useRef(null)
  const textareaRef = useRef(null)

  const userRole = (profile.role && profile.role.trim()) || (profile.designation && profile.designation.trim()) || 'Professional'
  const userDept = profile.department || 'Official Organization'
  const candidateName = profile.name || 'Candidate'
  const candidateEmail = profile.email || ''

  const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // ── Avatar Animations ───────────────────────────────────────────────────────
  const startMouthAnimation = () => {
    stopMouthAnimation()
    mouthIntervalRef.current = setInterval(() => {
      setMouthOpen(prev => !prev)
    }, 130)
  }

  const stopMouthAnimation = () => {
    if (mouthIntervalRef.current) {
      clearInterval(mouthIntervalRef.current)
      mouthIntervalRef.current = null
    }
    setMouthOpen(false)
  }

  const startBlinkLoop = () => {
    blinkIntervalRef.current = setInterval(() => {
      setEyeBlink(true)
      setTimeout(() => setEyeBlink(false), 140)
    }, 3000)
  }

  // ── Realistic Voice Synthesis ──────────────────────────────────────────────
  const speakText = (text) => {
    if (!('speechSynthesis' in window) || !ttsEnabled) {
      setIsAiSpeaking(true)
      startMouthAnimation()
      setTimeout(() => {
        setIsAiSpeaking(false)
        stopMouthAnimation()
      }, Math.min(text.length * 36, 8000))
      return
    }
    try {
      window.speechSynthesis.cancel()
      const clean = text.replace(/[*_#`]/g, '').trim()
      const utter = new SpeechSynthesisUtterance(clean)
      utter.rate = 0.95
      utter.pitch = 1.05
      const voices = window.speechSynthesis.getVoices()
      const pick = voices.find(v =>
        (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Google UK English Female') || v.lang.includes('en-IN') || v.lang.includes('en-GB'))
      ) || voices[0]
      if (pick) utter.voice = pick
      utter.onstart = () => { setIsAiSpeaking(true); startMouthAnimation() }
      utter.onend = () => { setIsAiSpeaking(false); stopMouthAnimation() }
      utter.onerror = () => { setIsAiSpeaking(false); stopMouthAnimation() }
      window.speechSynthesis.speak(utter)
    } catch {
      setIsAiSpeaking(true)
      startMouthAnimation()
      setTimeout(() => { setIsAiSpeaking(false); stopMouthAnimation() }, 4000)
    }
  }

  useEffect(() => {
    startBlinkLoop()
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      stopMouthAnimation()
      if (blinkIntervalRef.current) clearInterval(blinkIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAiThinking])

  // ── Start Interview Session ─────────────────────────────────────────────────
  const startInterview = async () => {
    setInterviewStarted(true)
    setIsAiThinking(true)

    const initialQ = `Hello ${candidateName}, welcome! I'm Priya Sharma from Senior Talent & HR Advisory. It's a pleasure to connect with you today.\n\nTo kick off our conversation, could you walk me through your key responsibilities as a ${userRole} within ${userDept}, and share what you consider your most meaningful professional accomplishment in this role?`

    const firstMsg = {
      id: 'ai-0',
      sender: 'ai',
      text: initialQ,
      time: nowTime(),
      competency: 'Role Scope & Professional Background',
      questionNumber: 1,
    }

    setMessages([firstMsg])
    setQuestionCount(1)
    setIsAiThinking(false)
    setTimeout(() => speakText(initialQ), 500)
  }

  // ── Conclude Interview Helper ───────────────────────────────────────────────
  const concludeSession = (scoresToDate) => {
    const finalScores = scoresToDate.length > 0 ? scoresToDate : [{ q: 1, score: 75, competency: 'General Competency' }]
    const overall = Math.round(finalScores.reduce((acc, s) => acc + s.score, 0) / finalScores.length)
    const passed = overall >= 75

    const closingDialogue = `Thank you very much, ${candidateName}. That wraps up our interview today! I really enjoyed learning about your background and how you approach challenges in ${userDept}. Our panel has completed the evaluation, and your performance report has been synced to your Competency Passport and the Admin Portal.`

    const closeMsg = {
      id: `ai-close-${Date.now()}`,
      sender: 'ai',
      text: closingDialogue,
      time: nowTime(),
      isConclusion: true,
    }

    setMessages(prev => [...prev, closeMsg])
    speakText(closingDialogue)

    const dossier = {
      id: `iv-${Date.now()}`,
      candidateName,
      candidateEmail,
      role: userRole,
      department: userDept,
      overallScore: overall,
      verdict: passed ? 'Recommended — Benchmark Met' : 'Development Recommended',
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      timestamp: new Date().toISOString(),
      questionsCompleted: finalScores.length,
      scores: finalScores,
    }

    setEvaluationDossier(dossier)
    setInterviewComplete(true)
    if (typeof onScoreUpdate === 'function') onScoreUpdate(overall)

    // Sync to Admin Portal and Competency Passport
    try {
      const existing = JSON.parse(localStorage.getItem('skillstat_interview_records') || '[]')
      existing.unshift(dossier)
      localStorage.setItem('skillstat_interview_records', JSON.stringify(existing.slice(0, 250)))
      window.dispatchEvent(new CustomEvent('skillstat_admin_update', { detail: { type: 'interview_records', dossier } }))
    } catch (err) {
      console.error('Storage sync error:', err)
    }
  }

  // ── Handle Candidate Response (Adaptive HR Logic) ───────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault()
    const text = inputText.trim()
    if (!text || isAiThinking || isAiSpeaking) return

    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    stopMouthAnimation()
    setIsAiSpeaking(false)

    const userMsg = { id: `u-${Date.now()}`, sender: 'user', text, time: nowTime() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInputText('')

    // ── Off-topic Guard (Prompt candidate to answer the actual HR question) ────
    if (isOffTopicResponse(text)) {
      const redirectText = `I appreciate you speaking up, ${candidateName}, but as an interviewer I need to hear about your actual professional experience. Please take a moment and answer the question with details about your work or projects. There's no rush!`
      const redirectMsg = {
        id: `ai-redirect-${Date.now()}`,
        sender: 'ai',
        text: redirectText,
        time: nowTime(),
      }
      setMessages(prev => [...prev, redirectMsg])
      speakText(redirectText)
      setTimeout(() => textareaRef.current?.focus(), 250)
      return
    }

    setIsAiThinking(true)

    const currentQNumber = questionCount
    const lastAiMsg = [...messages].reverse().find(m => m.sender === 'ai' && !m.isConclusion)
    const promptPayload = {
      message: `You are Priya Sharma, an empathetic, highly professional Senior Talent Acquisition & Human Resources Lead at ${userDept}.
You are currently interviewing ${candidateName}, who works as/targets the position of ${userRole}.

PREVIOUS QUESTION YOU ASKED:
"${lastAiMsg ? lastAiMsg.text : 'Tell me about yourself'}"

CANDIDATE'S ANSWER:
"${text}"

TOTAL QUESTIONS ASKED SO FAR: ${currentQNumber}

INSTRUCTIONS FOR YOUR RESPONSE:
1. Act like a REAL HR interviewer. Acknowledge and react specifically to what the candidate just said in a warm, conversational, authentic tone.
2. Evaluate their answer realistically between 45% and 96% based strictly on their actual depth, clarity, relevance, and problem-solving.
   - Poor, superficial, or vague answers: 50% - 68%
   - Solid, practical answers with some examples: 72% - 84%
   - Exceptional, quantifiable answers with strong impact: 86% - 96%
   NEVER default to 60%. Use an accurate score based on their input.
3. ADAPTIVE NEXT QUESTION:
   - Formulate the NEXT question based organically on what they just shared or probe deeper into their approach, technical decision-making, or conflict resolution.
   - The interview is not strictly 4 questions. If they have answered at least 3 questions thoroughly, you can conclude by setting "shouldConclude": true. Otherwise set "shouldConclude": false and provide "nextQuestion".

RETURN STRICT JSON ONLY:
{
  "hrFeedback": "Natural 1-2 sentence reaction to what they said",
  "score": 84,
  "verdict": "Proficient",
  "strength": "Clear demonstration of stakeholder consensus building",
  "improvement": "Include specific quantitative metrics or KPI improvements",
  "nextQuestion": "The next adaptive question tailored to their answer",
  "competency": "Adaptive Competency Area",
  "shouldConclude": false
}`,
      context: { role: userRole, department: userDept, candidateName },
    }

    try {
      let evalResult = null
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(promptPayload),
        })
        if (res.ok) {
          const data = await res.json()
          const jsonMatch = (data.text || '').match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            evalResult = JSON.parse(jsonMatch[0])
          }
        }
      } catch (err) {
        console.warn('API call fallback:', err)
      }

      // Safe local evaluation fallback if API fails
      if (!evalResult || typeof evalResult.score !== 'number') {
        const local = evaluateAnswerLocally(text, 'Practical Competency')
        evalResult = {
          hrFeedback: `Thank you for that response, ${candidateName}. That gives helpful context to your problem-solving style.`,
          score: local.score,
          verdict: local.verdict,
          strength: local.strength,
          improvement: local.improvement,
          nextQuestion: currentQNumber < 3
            ? `Building on what you mentioned, when unexpected obstacles or conflicting stakeholder priorities arise, what method do you use to renegotiate deadlines and maintain alignment?`
            : `Looking toward the future, what specific skills or domain technologies are you looking to develop over the next year to expand your impact?`,
          competency: currentQNumber < 3 ? 'Operational Problem Solving' : 'Professional Growth & Roadmap',
          shouldConclude: currentQNumber >= 4,
        }
      }

      const newScoreRecord = {
        q: currentQNumber,
        score: evalResult.score,
        competency: evalResult.competency || 'Domain Competency',
      }
      const updatedScores = [...sessionScores, newScoreRecord]
      setSessionScores(updatedScores)

      const shouldFinish = evalResult.shouldConclude || (currentQNumber >= 5)

      if (shouldFinish) {
        setIsAiThinking(false)
        concludeSession(updatedScores)
      } else {
        const nextQNum = currentQNumber + 1
        setQuestionCount(nextQNum)

        const dialogue = `${evalResult.hrFeedback}\n\n${evalResult.nextQuestion}`
        const aiMsg = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: dialogue,
          time: nowTime(),
          score: evalResult.score,
          verdict: evalResult.verdict,
          strength: evalResult.strength,
          improvement: evalResult.improvement,
          questionNumber: nextQNum,
          competency: evalResult.competency,
        }

        setMessages(prev => [...prev, aiMsg])
        setIsAiThinking(false)
        setTimeout(() => speakText(dialogue), 400)
      }
    } catch (err) {
      console.error(err)
      setIsAiThinking(false)
    } finally {
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }

  // ── Retake session ─────────────────────────────────────────────────────────
  const handleRestart = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    stopMouthAnimation()
    setIsAiSpeaking(false)
    setMessages([])
    setQuestionCount(0)
    setInterviewComplete(false)
    setEvaluationDossier(null)
    setInputText('')
    setInterviewStarted(false)
    setSessionScores([])
  }

  return (
    <div className="interview-root">

      {/* TOP HEADER */}
      <div className="interview-topbar">
        <div className="topbar-left">
          <span className="live-badge">
            <span className="live-dot" />
            LIVE HR SESSION
          </span>
          <span className="topbar-title">AI Face-to-Face Competency Interview</span>
        </div>
        <div className="topbar-center">
          {candidateName} &nbsp;·&nbsp; {userRole} ({userDept})
        </div>
        <div className="topbar-right">
          <button
            type="button"
            className={`voice-toggle ${ttsEnabled ? 'on' : 'off'}`}
            onClick={() => {
              if (ttsEnabled && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel()
                stopMouthAnimation()
                setIsAiSpeaking(false)
              }
              setTtsEnabled(t => !t)
            }}
          >
            {ttsEnabled ? '🔊 Voice: ON' : '🔇 Voice: OFF'}
          </button>
          <div className="step-counter">
            {questionCount > 0 ? `Question ${questionCount}` : 'Adaptive Evaluation'}
          </div>
          {interviewStarted && !interviewComplete && questionCount >= 3 && (
            <button
              type="button"
              className="end-session-btn"
              onClick={() => concludeSession(sessionScores)}
              style={{
                background: '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: '16px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Finish Interview
            </button>
          )}
        </div>
      </div>

      {/* MAIN BODY */}
      <div className="interview-body">

        {/* LEFT: ENHANCED REALISTIC HR AVATAR */}
        <div className="avatar-panel">
          <div className="avatar-scene">
            <div className={`ring ring-outer ${isAiSpeaking ? 'speaking' : ''}`} />
            <div className={`ring ring-inner ${isAiSpeaking ? 'speaking' : ''}`} />

            <div className={`avatar-container ${isAiSpeaking ? 'bob' : ''}`}>
              <svg viewBox="0 0 200 230" className="avatar-svg" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* Skin Tone Gradient - Warm, Natural Professional */}
                  <radialGradient id="hrSkin" cx="50%" cy="38%" r="62%">
                    <stop offset="0%" stopColor="#ffdfc4" />
                    <stop offset="70%" stopColor="#e8a87c" />
                    <stop offset="100%" stopColor="#cf8a5c" />
                  </radialGradient>

                  {/* Sleek Professional Dark Hair */}
                  <linearGradient id="hrHair" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2c1d11" />
                    <stop offset="50%" stopColor="#1a1109" />
                    <stop offset="100%" stopColor="#0d0804" />
                  </linearGradient>

                  {/* Elegant Navy Blazer */}
                  <linearGradient id="hrBlazer" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>

                  {/* Silk Blouse */}
                  <linearGradient id="hrBlouse" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="100%" stopColor="#e2e8f0" />
                  </linearGradient>

                  <filter id="softShadow">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#00000040" />
                  </filter>
                </defs>

                {/* Shoulders & Navy Executive Blazer */}
                <path d="M 12 230 L 32 165 Q 65 174 100 170 Q 135 174 168 165 L 188 230 Z" fill="url(#hrBlazer)" />

                {/* Silk Blouse & Neckline */}
                <polygon points="100,170 70,165 85,215" fill="url(#hrBlouse)" />
                <polygon points="100,170 130,165 115,215" fill="url(#hrBlouse)" />
                
                {/* Gold Executive Pendant */}
                <circle cx="100" cy="192" r="3.5" fill="#f59e0b" />
                <line x1="90" y1="172" x2="100" y2="192" stroke="#d97706" strokeWidth="1" />
                <line x1="110" y1="172" x2="100" y2="192" stroke="#d97706" strokeWidth="1" />

                {/* Neck */}
                <rect x="85" y="140" width="30" height="28" fill="#cf8a5c" rx="6" />

                {/* Hair Background */}
                <ellipse cx="100" cy="95" rx="55" ry="62" fill="url(#hrHair)" />
                <path d="M 44 95 Q 36 170 65 190 Q 75 160 52 110 Z" fill="url(#hrHair)" />
                <path d="M 156 95 Q 164 170 135 190 Q 125 160 148 110 Z" fill="url(#hrHair)" />

                {/* Face Shape */}
                <ellipse cx="100" cy="105" rx="46" ry="54" fill="url(#hrSkin)" filter="url(#softShadow)" />

                {/* Hair Front Part */}
                <path d="M 54 85 Q 100 48 146 85 Q 125 58 100 56 Q 72 58 54 85 Z" fill="url(#hrHair)" />
                <path d="M 54 85 Q 75 110 52 135 Q 48 100 54 85 Z" fill="url(#hrHair)" />

                {/* Ears & Pearl Earrings */}
                <ellipse cx="54" cy="110" rx="6" ry="9" fill="#cf8a5c" />
                <ellipse cx="146" cy="110" rx="6" ry="9" fill="#cf8a5c" />
                <circle cx="53" cy="114" r="2.8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />
                <circle cx="147" cy="114" r="2.8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.5" />

                {/* Refined Eyebrows */}
                <path d="M 72 87 Q 84 82 93 87" stroke="#3e2723" strokeWidth="2.4" fill="none" strokeLinecap="round" />
                <path d="M 107 87 Q 116 82 128 87" stroke="#3e2723" strokeWidth="2.4" fill="none" strokeLinecap="round" />

                {/* Expressive Eyes */}
                {eyeBlink ? (
                  <>
                    <line x1="73" y1="99" x2="91" y2="99" stroke="#2c1d11" strokeWidth="2.8" strokeLinecap="round" />
                    <line x1="109" y1="99" x2="127" y2="99" stroke="#2c1d11" strokeWidth="2.8" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <ellipse cx="82" cy="98" rx="8.5" ry="6" fill="#fff" />
                    <circle cx="82" cy="98" r="4.5" fill="#4b382a" />
                    <circle cx="82" cy="98" r="2.5" fill="#1c1917" />
                    <circle cx="84" cy="96" r="1.5" fill="#fff" />
                    <path d="M 73 95 Q 82 92 91 95" stroke="#2c1d11" strokeWidth="1.8" fill="none" />

                    <ellipse cx="118" cy="98" rx="8.5" ry="6" fill="#fff" />
                    <circle cx="118" cy="98" r="4.5" fill="#4b382a" />
                    <circle cx="118" cy="98" r="2.5" fill="#1c1917" />
                    <circle cx="120" cy="96" r="1.5" fill="#fff" />
                    <path d="M 109 95 Q 118 92 127 95" stroke="#2c1d11" strokeWidth="1.8" fill="none" />
                  </>
                )}

                {/* Soft Cheeks */}
                <ellipse cx="70" cy="115" rx="7" ry="4" fill="#fb7185" opacity="0.35" />
                <ellipse cx="130" cy="115" rx="7" ry="4" fill="#fb7185" opacity="0.35" />

                {/* Nose */}
                <path d="M 100 102 L 98 116 Q 100 119 102 116 Z" fill="#b45309" opacity="0.4" />

                {/* Natural Animated Mouth */}
                {isAiSpeaking ? (
                  mouthOpen ? (
                    <g>
                      <path d="M 86 134 Q 100 150 114 134 Q 100 144 86 134 Z" fill="#991b1b" />
                      <rect x="91" y="134" width="18" height="4" rx="2" fill="#f8fafc" opacity="0.9" />
                    </g>
                  ) : (
                    <path d="M 87 136 Q 100 143 113 136 Q 100 140 87 136 Z" fill="#be123c" />
                  )
                ) : isAiThinking ? (
                  <path d="M 89 136 Q 100 138 111 136" stroke="#9f1239" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="3 3" />
                ) : (
                  <path d="M 88 136 Q 100 144 112 136" stroke="#be123c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                )}
              </svg>
            </div>

            {/* Audio Bars */}
            <div className="audio-viz">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <span key={i} className={`viz-bar bar-${i} ${isAiSpeaking ? 'active' : ''}`} />
              ))}
            </div>
          </div>

          <div className="examiner-info">
            <div className="examiner-name">Priya Sharma</div>
            <div className="examiner-role">Senior HR & Talent Acquisition Lead</div>
            <div className={`status-pill ${isAiSpeaking ? 'speaking' : isAiThinking ? 'thinking' : 'listening'}`}>
              {isAiSpeaking ? '🎙️ Speaking...' : isAiThinking ? '⏳ Reviewing your answer...' : '👂 Listening intently'}
            </div>
          </div>

          {/* Real-time Session Status */}
          <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
            {sessionScores.length > 0 ? (
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                {sessionScores.length} Response{sessionScores.length > 1 ? 's' : ''} Assessed &amp; Logged
              </span>
            ) : (
              <span>Adaptive Viva-Voce Evaluation</span>
            )}
          </div>
        </div>

        {/* RIGHT: CHAT INTERACTION PANEL */}
        <div className="chat-panel">
          {!interviewStarted ? (
            <div className="welcome-screen">
              <div className="welcome-icon">👩‍💼</div>
              <h2>Executive AI HR Interview</h2>
              <p>Welcome, {candidateName}! You are about to enter a live, face-to-face conversational interview with <strong>Priya Sharma</strong>, your Senior Talent Partner.</p>
              <ul className="welcome-rules">
                <li>🎙️ Priya speaks aloud with real-time conversational animation</li>
                <li>⌨️ Type your real, detailed professional experience in the chat</li>
                <li>🎯 <strong>Dynamic &amp; Adaptive:</strong> Questions are not fixed to 4 — Priya adapts each question to what you say</li>
                <li>📊 Accurate scoring reflecting your depth and competency, recorded directly to the Admin Portal &amp; Competency Passport</li>
              </ul>
              <button type="button" className="start-btn" onClick={startInterview}>
                Start Face-to-Face Interview ➤
              </button>
            </div>
          ) : (
            <>
              <div className="chat-messages">
                {messages.map(msg => (
                  <div key={msg.id} className={`msg-row ${msg.sender === 'ai' ? 'ai-row' : 'user-row'}`}>
                    {msg.sender === 'ai' && <div className="msg-avatar-badge">HR</div>}
                    <div className={`msg-bubble ${msg.sender === 'ai' ? 'ai-bubble' : 'user-bubble'}`}>
                      {msg.sender === 'ai' && (
                        <div className="msg-header">
                          <span className="msg-sender">Priya Sharma (HR)</span>
                          {msg.questionNumber && <span className="q-badge">Q{msg.questionNumber}</span>}
                          {msg.competency && <span className="competency-tag">{msg.competency}</span>}
                          <span className="msg-time">{msg.time}</span>
                        </div>
                      )}
                      <div className="msg-text">
                        {msg.text.split('\n').map((line, i, arr) => (
                          <React.Fragment key={i}>
                            {line}{i < arr.length - 1 && <br />}
                          </React.Fragment>
                        ))}
                      </div>
                      {msg.score && (
                        <div className="score-card">
                          <div className="score-row">
                            <span className="score-num" style={{ color: msg.score >= 75 ? '#15803d' : '#b45309' }}>
                              {msg.score}%
                            </span>
                            <span className={`verdict-tag ${msg.score >= 80 ? 'good' : 'warn'}`}>{msg.verdict}</span>
                          </div>
                          {msg.strength && <div className="score-detail strength-line">✔ <strong>Strength:</strong> {msg.strength}</div>}
                          {msg.improvement && <div className="score-detail improve-line">▲ <strong>Opportunity:</strong> {msg.improvement}</div>}
                        </div>
                      )}
                      {msg.sender === 'user' && <span className="user-time">{msg.time}</span>}
                    </div>
                  </div>
                ))}

                {isAiThinking && (
                  <div className="msg-row ai-row">
                    <div className="msg-avatar-badge">HR</div>
                    <div className="msg-bubble ai-bubble thinking-bubble">
                      <span>Priya is analyzing your response and preparing the next question</span>
                      <div className="thinking-dots"><span /><span /><span /></div>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {!interviewComplete ? (
                <form className="input-area" onSubmit={handleSend}>
                  <div className="input-hint">
                    ⌨️ Type your response naturally — Priya will listen, evaluate, and adapt the next question to your answer
                  </div>
                  <div className="input-row">
                    <textarea
                      ref={textareaRef}
                      className="answer-textarea"
                      placeholder="Share your practical experience, actions taken, and outcomes..."
                      rows={3}
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                      }}
                      disabled={isAiThinking || isAiSpeaking}
                    />
                    <button
                      type="submit"
                      className="send-btn"
                      disabled={!inputText.trim() || isAiThinking || isAiSpeaking}
                    >
                      <span>Submit</span>
                      <span className="send-icon">➤</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="complete-bar">
                  <span className="complete-icon">🎖️</span>
                  <div className="complete-text">
                    <strong>Evaluation Session Complete</strong>
                    <p>Your performance report has been synced to your Competency Passport and Admin records.</p>
                  </div>
                  <button type="button" className="restart-btn" onClick={handleRestart}>Retake Interview</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* DOSSIER */}
      {interviewComplete && evaluationDossier && (
        <div className="dossier-wrap">
          <div className="dossier-card">
            <div className="dossier-seal">🏛️</div>
            <h3 className="dossier-title">Official Competency Evaluation Dossier</h3>
            <p className="dossier-sub">Executive Talent Viva-Voce Assessment — {evaluationDossier.date}</p>
            <div className="dossier-grid">
              <div className="dossier-metric">
                <span className="dm-label">Candidate Score</span>
                <span className="dm-value score-color">{evaluationDossier.overallScore}%</span>
              </div>
              <div className="dossier-metric">
                <span className="dm-label">HR Panel Verdict</span>
                <span className="dm-value verdict-color">{evaluationDossier.verdict}</span>
              </div>
              <div className="dossier-metric">
                <span className="dm-label">Questions Evaluated</span>
                <span className="dm-value">{evaluationDossier.questionsCompleted} Adaptive Questions</span>
              </div>
              <div className="dossier-metric">
                <span className="dm-label">Candidate</span>
                <span className="dm-value">{evaluationDossier.candidateName}</span>
              </div>
              <div className="dossier-metric">
                <span className="dm-label">Assessed Role</span>
                <span className="dm-value">{evaluationDossier.role}</span>
              </div>
              <div className="dossier-metric">
                <span className="dm-label">Department</span>
                <span className="dm-value">{evaluationDossier.department}</span>
              </div>
            </div>
            <p className="dossier-notice">✔ Data automatically synchronized to the Admin Panel and your Competency Passport.</p>
          </div>
        </div>
      )}
    </div>
  )
}
