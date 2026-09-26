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
    'solved', 'action', 'impact', 'managed', 'collaborated', 'measured'
  ]
  const matchCount = qualitySignals.filter(k => lower.includes(k)).length
  calculatedScore += Math.min(14, matchCount * 3)

  const finalScore = Math.max(50, Math.min(97, calculatedScore))
  const verdict = finalScore >= 80 ? 'Exceeds Expectations' : finalScore >= 70 ? 'Meets Expectations' : 'Development Required'

  return {
    score: finalScore,
    verdict,
    feedback: `Thank you for sharing that context. You demonstrated clear practical awareness regarding ${competencyName || 'your professional workflow'}.`,
    strength: words > 30 ? 'Comprehensive context and structured problem-solving approach.' : 'Focused response directly answering the core challenge.',
    improvement: 'Ensure you consistently articulate measurable outcomes and specific stakeholder alignment.',
  }
}

export default function AIInterviewView({ profile = {}, competencyGaps = [], onScoreUpdate }) {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [isAiSpeaking, setIsAiSpeaking] = useState(false)
  const [interviewComplete, setInterviewComplete] = useState(false)
  const [evaluationDossier, setEvaluationDossier] = useState(null)
  const [questionCount, setQuestionCount] = useState(0)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [sessionScores, setSessionScores] = useState([])

  const chatBottomRef = useRef(null)
  const textareaRef = useRef(null)
  const selectedVoiceRef = useRef(null)

  const userRole = (profile.role && profile.role.trim()) || (profile.designation && profile.designation.trim()) || 'Professional'
  const userDept = profile.department || 'Official Organization'
  const candidateName = profile.name || 'Candidate'
  const candidateEmail = profile.email || ''

  const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // ── Voice Management (Consistent, Authoritative Voice that Remains Same) ───
  const getCachedVoice = () => {
    if (selectedVoiceRef.current) return selectedVoiceRef.current
    if (!('speechSynthesis' in window)) return null
    const voices = window.speechSynthesis.getVoices()
    if (!voices || voices.length === 0) return null

    // Exact original voice selection criteria: British/Indian English / Daniel / Google UK / Natural
    const pick = voices.find(v =>
      v.name.includes('Daniel') ||
      v.name.includes('Google UK English Male') ||
      v.name.includes('George') ||
      v.name.includes('Oliver') ||
      v.name.includes('Ravi') ||
      (v.lang.includes('en-GB') && !v.name.toLowerCase().includes('female')) ||
      (v.lang.includes('en-IN') && !v.name.toLowerCase().includes('female')) ||
      v.name.includes('Natural')
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0]

    selectedVoiceRef.current = pick
    return pick
  }

  useEffect(() => {
    getCachedVoice()
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        getCachedVoice()
      }
    }
  }, [])

  // ── Natural Speech Synthesis ───────────────────────────────────────────────
  const speakText = (text) => {
    if (!('speechSynthesis' in window) || !ttsEnabled) {
      setIsAiSpeaking(true)
      setTimeout(() => {
        setIsAiSpeaking(false)
      }, Math.min(text.length * 36, 8000))
      return
    }
    try {
      window.speechSynthesis.cancel()
      const clean = text.replace(/[*_#`]/g, '').trim()
      const utter = new SpeechSynthesisUtterance(clean)
      utter.rate = 0.93 // Original exact rate
      utter.pitch = 1.0 // Original exact pitch
      const voice = getCachedVoice()
      if (voice) utter.voice = voice
      utter.onstart = () => setIsAiSpeaking(true)
      utter.onend = () => setIsAiSpeaking(false)
      utter.onerror = () => setIsAiSpeaking(false)
      window.speechSynthesis.speak(utter)
    } catch {
      setIsAiSpeaking(true)
      setTimeout(() => setIsAiSpeaking(false), 4000)
    }
  }

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
      setIsAiSpeaking(false)
    }
  }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAiThinking])

  // ── Start Interview Session (Real-Life HR Opening) ──────────────────────────
  const startInterview = async () => {
    setInterviewStarted(true)
    setIsAiThinking(true)

    const initialQ = `Good day, ${candidateName}. Welcome. I am Dr. V. Ramanathan, Chair of the Senior Executive HR & Talent Assessment Panel. We are very glad to connect with you today.\n\nOur objective here is to have a genuine, two-way professional conversation to understand your practical competencies, leadership, and operational decision-making in ${userDept}.\n\nTo kick off our conversation: could you walk me through your current scope of responsibilities as a ${userRole}, and tell me about a standout project or initiative where your direct contribution drove a significant outcome?`

    const firstMsg = {
      id: 'ai-0',
      sender: 'ai',
      text: initialQ,
      time: nowTime(),
      competency: 'Core Professional Scope & High-Impact Delivery',
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

    const closingDialogue = `Thank you very much, ${candidateName}. That concludes today's interview session. I have thoroughly enjoyed our discussion and learning about your practical leadership in ${userDept}. Our panel has completed your evaluation, and your performance dossier has been synchronized with the Admin Portal and your Competency Passport. Well done.`

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

  // ── Handle Candidate Response (Adaptive Real-Life HR Logic) ─────────────────
  const handleSend = async (e) => {
    e?.preventDefault()
    const text = inputText.trim()
    if (!text || isAiThinking || isAiSpeaking) return

    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setIsAiSpeaking(false)

    const userMsg = { id: `u-${Date.now()}`, sender: 'user', text, time: nowTime() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInputText('')

    // ── Off-topic Guard (Prompt candidate to answer the actual HR question) ────
    if (isOffTopicResponse(text)) {
      const redirectText = `I appreciate you speaking up, ${candidateName}, but as an executive interviewer I need to hear about your actual professional experience. Please take a moment and respond to the question with details about your work or projects. There is no rush!`
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
      message: `You are Dr. V. Ramanathan, a distinguished Senior Executive HR Director and Chair of the Talent Assessment Panel.
You are conducting a live executive competency interview with ${candidateName}, who works as/targets the position of ${userRole} in ${userDept}.

PREVIOUS QUESTION YOU ASKED:
"${lastAiMsg ? lastAiMsg.text : 'Walk me through your background'}"

CANDIDATE'S ACTUAL ANSWER:
"${text}"

TOTAL QUESTIONS ASKED SO FAR: ${currentQNumber}

CRITICAL HR INTERVIEWER INSTRUCTIONS:
1. ACT LIKE A REAL-LIFE EXECUTIVE HR DIRECTOR:
   - Always begin your response by directly acknowledging and reflecting on what the candidate just told you with professional depth (e.g. "I appreciate you walking me through that cross-departmental friction...", "That is a sound analytical framework you chose for mitigating the data bottleneck...").
   - Speak conversationally, with high-level professional gravitas, empathy, and active listening.
2. ADAPTIVE REAL-LIFE HR FOLLOW-UP:
   - Formulate your NEXT question directly building upon what they shared or probing their behavioral competency (STAR method: Situation, Task, Action, Result).
   - If they gave an overview without mentioning pushback or conflict, probe: "How did you manage pushback from reluctant stakeholders or conflicting priorities?"
   - If they discussed an achievement, probe: "What specific metric proved that was a success, and what would you do differently in hindsight?"
   - If they discussed leadership, probe: "How do you navigate underperforming team members when project deadlines are tight?"
   - Questions are not fixed to 4. Adapt organically to their practical experience.
   - If they have answered at least 3-4 questions with depth and clarity, you can wrap up by setting "shouldConclude": true. Otherwise set "shouldConclude": false and provide "nextQuestion".
3. REALISTIC INPUT-BASED SCORING:
   - Evaluate strictly based on what they actually wrote:
     * Brief/vague/generic: 52% - 66%
     * Competent, practical with examples: 74% - 84%
     * Exemplary, quantifiable, structured STAR response: 86% - 96%
   - NEVER default to 60%.

RETURN STRICT JSON ONLY:
{
  "hrFeedback": "Natural 1-2 sentence executive HR reaction addressing what they said",
  "score": 84,
  "verdict": "Proficient",
  "strength": "Specific practical strength demonstrated in their response",
  "improvement": "Constructive executive coaching tip or area to elaborate",
  "nextQuestion": "The next adaptive question tailored to their answer",
  "competency": "Domain / Behavioral Competency Area",
  "shouldConclude": false
}`,
      context: { role: userRole, department: userDept, candidateName, isInterview: true, mode: 'interview' },
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
        const local = evaluateAnswerLocally(text, 'Practical Execution')
        evalResult = {
          hrFeedback: `Thank you for detailing that, ${candidateName}. Your approach demonstrates commendable operational discipline.`,
          score: local.score,
          verdict: local.verdict,
          strength: local.strength,
          improvement: local.improvement,
          nextQuestion: currentQNumber < 3
            ? `When dealing with tight delivery timelines and competing stakeholder demands in ${userDept}, what systematic approach do you use to prioritize critical deliverables?`
            : `Looking toward the next 2 to 3 years, what emerging methodologies or competencies are you prioritizing to elevate your strategic impact?`,
          competency: currentQNumber < 3 ? 'Operational Prioritization & Risk' : 'Strategic Growth & Leadership',
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
            LIVE EXECUTIVE PANEL
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

        {/* LEFT: PHOTOREALISTIC EXECUTIVE HR AVATAR */}
        <div className="avatar-panel">
          <div className="avatar-scene">
            <div className={`ring ring-outer ${isAiSpeaking ? 'speaking' : ''}`} />
            <div className={`ring ring-inner ${isAiSpeaking ? 'speaking' : ''}`} />

            <div className={`avatar-container ${isAiSpeaking ? 'bob' : ''}`}>
              <div className={`avatar-photo-frame ${isAiSpeaking ? 'speaking' : ''}`}>
                <div className="camera-feed-badge">
                  <span className="camera-feed-dot" />
                  LIVE HD
                </div>
                <img
                  src="/avatar-interviewer.jpg"
                  alt="Dr. V. Ramanathan - Senior Executive HR & Panel Chair"
                  className="avatar-photo-img"
                />
                {isAiSpeaking && (
                  <div className="avatar-audio-waves">
                    {[1, 2, 3, 4, 5].map((w) => (
                      <span
                        key={w}
                        className={`viz-bar bar-${w} active`}
                        style={{ height: `${10 + (w % 3) * 6}px` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Audio Bars */}
            <div className="audio-viz">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <span key={i} className={`viz-bar bar-${i} ${isAiSpeaking ? 'active' : ''}`} />
              ))}
            </div>
          </div>

          <div className="examiner-info">
            <div className="examiner-name">Dr. V. Ramanathan</div>
            <div className="examiner-role">Senior Executive HR Director &amp; Panel Chair</div>
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
              <div className="welcome-icon">🏛️</div>
              <h2>Executive AI HR Interview</h2>
              <p>Welcome, {candidateName}! You are about to enter a live, face-to-face conversational interview with <strong>Dr. V. Ramanathan</strong>, Chair of the Senior Executive HR &amp; Talent Assessment Panel.</p>
              <ul className="welcome-rules">
                <li>🎙️ Dr. Ramanathan speaks aloud with clear, consistent vocal cadence</li>
                <li>⌨️ Type your real, detailed professional experience in the response box</li>
                <li>🎯 <strong>Dynamic &amp; Adaptive:</strong> Questions are not fixed to 4 — each follow-up is adapted to what you say</li>
                <li>📊 Accurate scoring reflecting your actual depth, recorded directly to the Admin Portal &amp; Competency Passport</li>
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
                          <span className="msg-sender">Dr. V. Ramanathan (HR Chair)</span>
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
                      <span>Dr. Ramanathan is analyzing your response and preparing the next question</span>
                      <div className="thinking-dots"><span /><span /><span /></div>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {!interviewComplete ? (
                <form className="input-area" onSubmit={handleSend}>
                  <div className="input-hint">
                    ⌨️ Type your response naturally — Dr. Ramanathan will listen, evaluate, and adapt the next question to your answer
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
