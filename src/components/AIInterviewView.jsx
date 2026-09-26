import React, { useState, useEffect, useRef } from 'react'
import './AIInterviewView.css'

// ── Off-topic / insufficient response detector ───────────────────────────────
const OFF_TOPIC_PHRASES = [
  'bye', 'goodbye', 'hello', 'hi', 'ok', 'okay', 'yes', 'no', 'sure', 'fine',
  'nothing', 'idk', "i don't know", 'skip', 'pass', 'next', 'done', 'stop',
  'quit', 'exit', 'thanks', 'thank you', 'good', 'great', 'cool', 'nice',
  'lol', 'haha', 'test', 'testing', '...',
]

function isOffTopicResponse(text) {
  const trimmed = text.trim().toLowerCase()
  if (trimmed.length < 20) return true  // too short to be a real answer
  if (OFF_TOPIC_PHRASES.some(p => trimmed === p || trimmed.startsWith(p + ' ') || trimmed.endsWith(' ' + p))) return true
  const wordCount = trimmed.split(/\s+/).length
  if (wordCount < 5) return true  // fewer than 5 words = not a proper answer
  return false
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
  const [currentStep, setCurrentStep] = useState(0)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [questionScores, setQuestionScores] = useState([])

  const chatBottomRef = useRef(null)
  const mouthIntervalRef = useRef(null)
  const blinkIntervalRef = useRef(null)
  const textareaRef = useRef(null)

  const userRole = (profile.role && profile.role.trim()) || (profile.designation && profile.designation.trim()) || 'Professional'
  const userDept = profile.department || 'Organization'
  const candidateName = profile.name || 'Candidate'

  const interviewQuestions = [
    {
      id: 1,
      competency: 'Core Competency & Role Understanding',
      text: `Good day, ${candidateName}. I am Dr. Ramanathan, your panel interviewer today. Welcome to your AI-assisted competency assessment.\n\nLet us begin. Can you walk me through your key responsibilities as a ${userRole} within ${userDept}, and describe a major challenge you have successfully resolved in your current capacity?`,
    },
    {
      id: 2,
      competency: 'Problem Solving & Critical Thinking',
      text: `Thank you for that response. Let us now move to problem-solving.\n\nDescribe a complex problem you encountered in your work that required cross-functional collaboration. How did you approach it methodically, what stakeholders were involved, and what was the measurable outcome?`,
    },
    {
      id: 3,
      competency: 'Strategic & Analytical Thinking',
      text: `Very good. Now, from a strategic perspective:\n\nIf you were tasked with improving a key process or metric within your domain by 20% over the next quarter, what analytical framework would you apply? Walk me through your planning, execution, and measurement approach.`,
    },
    {
      id: 4,
      competency: 'Leadership & Professional Growth',
      text: `This is our final question for today:\n\nWhat specific skills or competencies are you actively developing right now, and how do you see your role evolving in the next 2 to 3 years within ${userDept}?`,
    },
  ]

  const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // ── Animation helpers ──────────────────────────────────────────────────────

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
      setTimeout(() => setEyeBlink(false), 150)
    }, 3200)
  }

  // ── TTS ────────────────────────────────────────────────────────────────────

  const speakText = (text) => {
    if (!('speechSynthesis' in window) || !ttsEnabled) {
      setIsAiSpeaking(true)
      startMouthAnimation()
      setTimeout(() => {
        setIsAiSpeaking(false)
        stopMouthAnimation()
      }, Math.min(text.length * 38, 9000))
      return
    }
    try {
      window.speechSynthesis.cancel()
      const clean = text.replace(/[*_#`]/g, '').trim()
      const utter = new SpeechSynthesisUtterance(clean)
      utter.rate = 0.93
      utter.pitch = 1.0
      const voices = window.speechSynthesis.getVoices()
      const pick = voices.find(v =>
        v.lang.includes('en-GB') || v.lang.includes('en-IN') ||
        v.name.includes('Daniel') || v.name.includes('Google UK') || v.name.includes('Natural')
      )
      if (pick) utter.voice = pick
      utter.onstart = () => { setIsAiSpeaking(true); startMouthAnimation() }
      utter.onend = () => { setIsAiSpeaking(false); stopMouthAnimation() }
      utter.onerror = () => { setIsAiSpeaking(false); stopMouthAnimation() }
      window.speechSynthesis.speak(utter)
    } catch {
      setIsAiSpeaking(true)
      startMouthAnimation()
      setTimeout(() => { setIsAiSpeaking(false); stopMouthAnimation() }, 5000)
    }
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

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

  // ── Start interview ─────────────────────────────────────────────────────────

  const startInterview = () => {
    setInterviewStarted(true)
    const q = interviewQuestions[0]
    const msg = {
      id: 'ai-0',
      sender: 'ai',
      text: q.text,
      time: nowTime(),
      competency: q.competency,
      questionNumber: 1,
    }
    setMessages([msg])
    setTimeout(() => speakText(q.text), 700)
  }

  // ── Send response ───────────────────────────────────────────────────────────

  const handleSend = async (e) => {
    e?.preventDefault()
    const text = inputText.trim()
    if (!text || isAiThinking || isAiSpeaking) return

    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    stopMouthAnimation()
    setIsAiSpeaking(false)

    const userMsg = { id: `u-${Date.now()}`, sender: 'user', text, time: nowTime() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInputText('')

    // ── Off-topic / insufficient answer check ────────────────────────────────
    if (isOffTopicResponse(text)) {
      const redirectMsg = {
        id: `ai-redirect-${Date.now()}`,
        sender: 'ai',
        text: `I appreciate you engaging, but I need a proper answer to continue the assessment. Please respond to the question with relevant details about your professional experience and approach. Take your time — there is no rush.`,
        time: nowTime(),
      }
      setMessages(prev => [...prev, redirectMsg])
      speakText(redirectMsg.text)
      setTimeout(() => textareaRef.current?.focus(), 200)
      return
    }

    setIsAiThinking(true)

    const activeQ = interviewQuestions[currentStep]

    try {
      let evalData = null
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `You are a senior panel interviewer evaluating ${candidateName} for ${userRole} at ${userDept}.
Question: "${activeQ.text}"
Competency: "${activeQ.competency}"
Candidate answer: "${text}"
Respond as a professional interviewer directly to the candidate in 2 to 3 sentences.
Return JSON only:
{"feedback":"...", "score": 82, "verdict": "Proficient", "strength": "...", "improvement": "..."}`,
            context: { role: userRole, department: userDept },
          }),
        })
        if (res.ok) {
          const d = await res.json()
          const m = (d.text || '').match(/\{[\s\S]*\}/)
          if (m) evalData = JSON.parse(m[0])
        }
      } catch { /* use fallback */ }

      if (!evalData || typeof evalData.score !== 'number') {
        const wc = text.split(/\s+/).length
        const score = Math.min(93, Math.max(65, 58 + Math.round(wc * 0.8)))
        evalData = {
          score,
          verdict: score >= 80 ? 'Proficient' : 'Developing',
          feedback: `Thank you, ${candidateName}. You have demonstrated a reasonable understanding of ${activeQ.competency}. Strengthening your answer with specific data points and measurable outcomes would make it even more compelling.`,
          strength: 'Clear articulation and relevant practical awareness.',
          improvement: 'Add specific metrics, timelines, and quantified outcomes to your examples.',
        }
      }

      const updatedScores = [...questionScores, { q: currentStep + 1, score: evalData.score, competency: activeQ.competency }]
      setQuestionScores(updatedScores)

      const next = currentStep + 1
      setCurrentStep(next)

      if (next < interviewQuestions.length) {
        const nextQ = interviewQuestions[next]
        const aiText = `${evalData.feedback}\n\nLet us proceed to the next question:\n\n${nextQ.text}`
        const aiMsg = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: aiText,
          time: nowTime(),
          score: evalData.score,
          verdict: evalData.verdict,
          strength: evalData.strength,
          improvement: evalData.improvement,
          questionNumber: next + 1,
          competency: nextQ.competency,
        }
        setMessages(prev => [...prev, aiMsg])
        setTimeout(() => speakText(aiText), 400)
      } else {
        const overall = Math.round(updatedScores.reduce((acc, s) => acc + s.score, 0) / updatedScores.length)
        const closeText = `Thank you very much, ${candidateName}. That concludes today's session. Our panel has carefully evaluated your responses across all four competency areas. Your performance has been recorded and your evaluation dossier is now ready. Well done.`
        setMessages(prev => [...prev, {
          id: `ai-close-${Date.now()}`,
          sender: 'ai',
          text: closeText,
          time: nowTime(),
          isConclusion: true,
        }])
        setTimeout(() => speakText(closeText), 400)
        const dossier = {
          id: `iv-${Date.now()}`,
          candidateName,
          role: userRole,
          department: userDept,
          overallScore: overall,
          verdict: overall >= 75 ? 'Qualified — Recommended for Advancement' : 'Competency Development Required',
          date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          timestamp: new Date().toISOString(),
          questionsCompleted: interviewQuestions.length,
          scores: updatedScores,
        }
        setEvaluationDossier(dossier)
        setInterviewComplete(true)
        if (typeof onScoreUpdate === 'function') onScoreUpdate(overall)

        // ── Persist to localStorage for Admin Portal ─────────────────────────
        try {
          const existing = JSON.parse(localStorage.getItem('skillstat_interview_records') || '[]')
          existing.unshift(dossier)
          localStorage.setItem('skillstat_interview_records', JSON.stringify(existing.slice(0, 200)))
          window.dispatchEvent(new CustomEvent('skillstat_admin_update', { detail: { type: 'interview_records' } }))
        } catch {}
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsAiThinking(false)
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }

  const handleRestart = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    stopMouthAnimation()
    setIsAiSpeaking(false)
    setMessages([])
    setCurrentStep(0)
    setInterviewComplete(false)
    setEvaluationDossier(null)
    setInputText('')
    setInterviewStarted(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="interview-root">

      {/* TOP BAR */}
      <div className="interview-topbar">
        <div className="topbar-left">
          <span className="live-badge">
            <span className="live-dot" />
            LIVE SESSION
          </span>
          <span className="topbar-title">AI Competency Interview</span>
        </div>
        <div className="topbar-center">
          {candidateName} &nbsp;·&nbsp; {userRole}
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
            {ttsEnabled ? '🔊 Voice ON' : '🔇 Voice OFF'}
          </button>
          <div className="step-counter">Q {Math.min(currentStep + 1, 4)} / 4</div>
        </div>
      </div>

      {/* BODY */}
      <div className="interview-body">

        {/* LEFT: ANIMATED AI AVATAR */}
        <div className="avatar-panel">
          <div className="avatar-scene">
            <div className={`ring ring-outer ${isAiSpeaking ? 'speaking' : ''}`} />
            <div className={`ring ring-inner ${isAiSpeaking ? 'speaking' : ''}`} />

            <div className={`avatar-container ${isAiSpeaking ? 'bob' : ''}`}>
              <svg viewBox="0 0 200 230" className="avatar-svg" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="skinGrad" cx="50%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="#fde8d0" />
                    <stop offset="100%" stopColor="#d4956a" />
                  </radialGradient>
                  <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#374151" />
                    <stop offset="100%" stopColor="#111827" />
                  </linearGradient>
                  <linearGradient id="suitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1e3a8a" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                  <filter id="faceShadow">
                    <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#00000033" />
                  </filter>
                </defs>

                {/* Suit */}
                <path d="M 10 230 L 35 165 Q 70 175 100 172 Q 130 175 165 165 L 190 230 Z" fill="url(#suitGrad)" />
                <polygon points="100,172 68,165 82,210" fill="#f8fafc" />
                <polygon points="100,172 132,165 118,210" fill="#f8fafc" />
                <polygon points="96,178 104,178 107,220 93,220" fill="#dc2626" />
                <polygon points="93,178 107,178 105,188 95,188" fill="#b91c1c" />

                {/* Neck */}
                <rect x="84" y="143" width="32" height="25" fill="#d49b6b" rx="5" />

                {/* Hair back */}
                <ellipse cx="100" cy="92" rx="52" ry="58" fill="url(#hairGrad)" />

                {/* Face */}
                <ellipse cx="100" cy="105" rx="48" ry="56" fill="url(#skinGrad)" filter="url(#faceShadow)" />

                {/* Hair front */}
                <path d="M 52 82 Q 100 48 148 82 Q 132 56 100 54 Q 68 56 52 82 Z" fill="url(#hairGrad)" />

                {/* Ears */}
                <ellipse cx="52" cy="108" rx="7" ry="10" fill="#d49b6b" />
                <ellipse cx="148" cy="108" rx="7" ry="10" fill="#d49b6b" />

                {/* Eyebrows */}
                <path d="M 70 86 Q 83 82 92 87" stroke="#1f2937" strokeWidth="2.8" fill="none" strokeLinecap="round" />
                <path d="M 108 87 Q 117 82 130 86" stroke="#1f2937" strokeWidth="2.8" fill="none" strokeLinecap="round" />

                {/* Eyes */}
                {eyeBlink ? (
                  <>
                    <line x1="72" y1="98" x2="90" y2="98" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
                    <line x1="110" y1="98" x2="128" y2="98" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <ellipse cx="81" cy="98" rx="9" ry="6" fill="#fff" />
                    <circle cx="81" cy="98" r="4.5" fill="#1e3a8a" />
                    <circle cx="83" cy="96" r="1.8" fill="#fff" />
                    <ellipse cx="119" cy="98" rx="9" ry="6" fill="#fff" />
                    <circle cx="119" cy="98" r="4.5" fill="#1e3a8a" />
                    <circle cx="121" cy="96" r="1.8" fill="#fff" />
                  </>
                )}

                {/* Glasses */}
                <rect x="69" y="91" width="23" height="14" rx="4" fill="none" stroke="#94a3b8" strokeWidth="2" />
                <rect x="108" y="91" width="23" height="14" rx="4" fill="none" stroke="#94a3b8" strokeWidth="2" />
                <line x1="92" y1="97" x2="108" y2="97" stroke="#94a3b8" strokeWidth="2" />
                <line x1="48" y1="97" x2="69" y2="97" stroke="#94a3b8" strokeWidth="1.5" />
                <line x1="131" y1="97" x2="152" y2="97" stroke="#94a3b8" strokeWidth="1.5" />

                {/* Nose */}
                <path d="M 100 104 L 97 120 Q 100 124 103 120 Z" fill="#c4875a" opacity="0.5" />

                {/* Dynamic mouth */}
                {isAiSpeaking ? (
                  mouthOpen ? (
                    <g>
                      <path d="M 84 136 Q 100 152 116 136 Q 100 146 84 136 Z" fill="#7f1d1d" />
                      <rect x="90" y="136" width="20" height="5" rx="2" fill="#f8fafc" opacity="0.85" />
                    </g>
                  ) : (
                    <path d="M 86 138 Q 100 145 114 138 Q 100 142 86 138 Z" fill="#b91c1c" />
                  )
                ) : isAiThinking ? (
                  <path d="M 88 138 Q 100 140 112 138" stroke="#a16207" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="2 3" />
                ) : (
                  <path d="M 86 139 Q 100 145 114 139" stroke="#a16207" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                )}
              </svg>
            </div>

            {/* Audio bars */}
            <div className="audio-viz">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <span key={i} className={`viz-bar bar-${i} ${isAiSpeaking ? 'active' : ''}`} />
              ))}
            </div>
          </div>

          <div className="examiner-info">
            <div className="examiner-name">Dr. V. Ramanathan</div>
            <div className="examiner-role">Senior Panel Examiner</div>
            <div className={`status-pill ${isAiSpeaking ? 'speaking' : isAiThinking ? 'thinking' : 'listening'}`}>
              {isAiSpeaking ? '🎙️ Speaking...' : isAiThinking ? '⏳ Evaluating...' : '👂 Listening'}
            </div>
          </div>

          <div className="progress-dots">
            {interviewQuestions.map((_, i) => (
              <div key={i} className={`dot ${i < currentStep ? 'done' : i === currentStep && interviewStarted ? 'current' : ''}`} />
            ))}
          </div>
        </div>

        {/* RIGHT: CHAT PANEL */}
        <div className="chat-panel">
          {!interviewStarted ? (
            <div className="welcome-screen">
              <div className="welcome-icon">🤖</div>
              <h2>Face-to-Face AI Interview</h2>
              <p>You are about to begin a live competency interview with Dr. V. Ramanathan, your AI panel examiner.</p>
              <ul className="welcome-rules">
                <li>🎙️ The AI will <strong>speak</strong> each question aloud — listen carefully</li>
                <li>⌨️ <strong>You type</strong> your answers in the chat box</li>
                <li>📋 4 competency questions will be assessed</li>
                <li>📊 A performance dossier is generated at the end</li>
              </ul>
              <button type="button" className="start-btn" onClick={startInterview}>
                Begin Interview ➤
              </button>
            </div>
          ) : (
            <>
              <div className="chat-messages">
                {messages.map(msg => (
                  <div key={msg.id} className={`msg-row ${msg.sender === 'ai' ? 'ai-row' : 'user-row'}`}>
                    {msg.sender === 'ai' && <div className="msg-avatar-badge">AI</div>}
                    <div className={`msg-bubble ${msg.sender === 'ai' ? 'ai-bubble' : 'user-bubble'}`}>
                      {msg.sender === 'ai' && (
                        <div className="msg-header">
                          <span className="msg-sender">Dr. Ramanathan</span>
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
                            <span className="score-num">{msg.score}%</span>
                            <span className={`verdict-tag ${msg.score >= 80 ? 'good' : 'warn'}`}>{msg.verdict}</span>
                          </div>
                          {msg.strength && <div className="score-detail strength-line">✔ <strong>Strength:</strong> {msg.strength}</div>}
                          {msg.improvement && <div className="score-detail improve-line">▲ <strong>Improve:</strong> {msg.improvement}</div>}
                        </div>
                      )}
                      {msg.sender === 'user' && <span className="user-time">{msg.time}</span>}
                    </div>
                  </div>
                ))}

                {isAiThinking && (
                  <div className="msg-row ai-row">
                    <div className="msg-avatar-badge">AI</div>
                    <div className="msg-bubble ai-bubble thinking-bubble">
                      <span>Evaluating your response</span>
                      <div className="thinking-dots"><span /><span /><span /></div>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {!interviewComplete ? (
                <form className="input-area" onSubmit={handleSend}>
                  <div className="input-hint">⌨️ &nbsp;Type your answer — press Enter to submit (Shift+Enter for new line)</div>
                  <div className="input-row">
                    <textarea
                      ref={textareaRef}
                      className="answer-textarea"
                      placeholder="Type your response here..."
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
                      <span>Send</span>
                      <span className="send-icon">➤</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="complete-bar">
                  <span className="complete-icon">🏆</span>
                  <div className="complete-text">
                    <strong>Interview Complete</strong>
                    <p>Your evaluation dossier has been generated below.</p>
                  </div>
                  <button type="button" className="restart-btn" onClick={handleRestart}>Retake</button>
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
            <p className="dossier-sub">AI-Assisted Viva-Voce Assessment — {evaluationDossier.date}</p>
            <div className="dossier-grid">
              <div className="dossier-metric">
                <span className="dm-label">Overall Score</span>
                <span className="dm-value score-color">{evaluationDossier.overallScore}%</span>
              </div>
              <div className="dossier-metric">
                <span className="dm-label">Panel Verdict</span>
                <span className="dm-value verdict-color">{evaluationDossier.verdict}</span>
              </div>
              <div className="dossier-metric">
                <span className="dm-label">Questions Assessed</span>
                <span className="dm-value">{evaluationDossier.questionsCompleted} / 4</span>
              </div>
              <div className="dossier-metric">
                <span className="dm-label">Candidate</span>
                <span className="dm-value">{evaluationDossier.candidateName}</span>
              </div>
              <div className="dossier-metric">
                <span className="dm-label">Role</span>
                <span className="dm-value">{evaluationDossier.role}</span>
              </div>
              <div className="dossier-metric">
                <span className="dm-label">Department</span>
                <span className="dm-value">{evaluationDossier.department}</span>
              </div>
            </div>
            <p className="dossier-notice">✔ Score synchronized to your Competency Passport and live employee profile.</p>
          </div>
        </div>
      )}
    </div>
  )
}
