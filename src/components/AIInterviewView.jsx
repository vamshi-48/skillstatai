import React, { useState, useEffect, useRef } from 'react'
import './AIInterviewView.css'

// ── Comprehensive Answer Analysis & Inappropriateness Detection ──────────────
function analyzeAnswerAppropriateness(text, candidateRole = 'Statistical Officer', candidateDept = 'National Statistical Office') {
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase()
  const words = trimmed.split(/\s+/).filter(Boolean)
  const wordCount = words.length

  // 1. Unprofessional, rude, abusive, disrespectful, or vulgar language
  const RUDE_OR_UNPROFESSIONAL = [
    'shut up', 'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'crap', 'damn', 'idiot', 'fool', 'stupid',
    'none of your business', 'why do you care', 'mind your own business', 'who asked you', 'why are you asking',
    'hate you', 'hate this', 'waste of time', 'bullshit', 'scam', 'useless', 'go away', 'get lost',
    'i don\'t care', 'dont care', 'idgaf', 'whatever', 'no way', 'nah', 'nope', 'nah bro', 'shut your mouth',
  ]
  const isRude = RUDE_OR_UNPROFESSIONAL.some(phrase => lower.includes(phrase))

  // 2. Unethical, illegal, or conduct violations
  const UNETHICAL_OR_MALPRACTICE = [
    'bribed', 'bribe', 'faked the data', 'fake data', 'cheated', 'falsified', 'forged', 'stole',
    'leaked the data', 'leaked confidential', 'ignored rules', 'broke the law', 'deleted audit logs',
    'faked numbers', 'manipulated report'
  ]
  const isMalpractice = UNETHICAL_OR_MALPRACTICE.some(phrase => lower.includes(phrase))

  // 3. Evasive, trivial, or monosyllabic greetings/exits
  const EVASIVE_PATTERNS = [
    'bye', 'goodbye', 'hello', 'hi', 'hey', 'ok', 'okay', 'yes', 'no', 'sure', 'fine',
    'nothing', 'idk', 'i don\'t know', 'dont know', 'skip', 'pass', 'next', 'done', 'stop',
    'quit', 'exit', 'thanks', 'thank you', 'good', 'great', 'cool', 'nice', 'lol', 'haha',
    'test', 'testing', '...', 'hmm', 'uh', 'um', 'blah', 'asdf', 'qwerty', 'idk really'
  ]
  const isEvasive = wordCount < 4 || EVASIVE_PATTERNS.some(p => lower === p || lower === `${p}.` || lower === `${p}!`)

  // 4. Repetitive characters or gibberish (e.g. "aaaaa", "asdfghjk")
  const isGibberish = /^([a-z0-9])\1{4,}$/i.test(trimmed) || (wordCount <= 3 && !/[aeiou]/i.test(trimmed))

  if (isRude) {
    return {
      isInappropriate: true,
      category: 'unprofessional',
      reason: 'Your response contains dismissive or unprofessional language, which violates executive civil service standards and committee viva-voce decorum.',
      modelAnswer: `When addressing administrative questions as a ${candidateRole}, an officer is expected to demonstrate executive composure: "In our division at ${candidateDept}, my approach is to maintain objective focus on statutory objectives, aligning team members around transparent milestones, data integrity, and empirical performance metrics."`,
    }
  }

  if (isMalpractice) {
    return {
      isInappropriate: true,
      category: 'malpractice',
      reason: 'Your response references actions contrary to official civil service conduct, statutory guidelines, or data integrity protocols.',
      modelAnswer: `A compliant, ethical response adheres strictly to statutory governance: "When facing operational pressure, I strictly follow statutory data security and audit protocols, immediately reporting discrepancies to the nodal directorate and initiating formal verification procedures."`,
    }
  }

  if (isGibberish || isEvasive) {
    return {
      isInappropriate: true,
      category: 'evasive',
      reason: `Your response ("${trimmed.slice(0, 32)}${trimmed.length > 32 ? '...' : ''}") is inadequate or evasive. A senior assessment requires substantive evidence of your real-world professional practice.`,
      modelAnswer: `An appropriate response should employ the STAR method: "In my recent assignment as a ${candidateRole} in ${candidateDept}, I led a data reconciliation initiative where our team identified sampling anomalies. By implementing automated validation scripts in Python and SQL, we improved data throughput by 22% while eliminating cross-tabulation discrepancies."`,
    }
  }

  return { isInappropriate: false }
}

// ── Local Evaluator (Reflects Candidate Input & Generates Model Answers for Inappropriate Inputs) ──
function evaluateAnswerLocally(text, competencyName, candidateRole = 'Statistical Officer', candidateDept = 'National Statistical Office', lastQuestion = '') {
  const analysis = analyzeAnswerAppropriateness(text, candidateRole, candidateDept)
  const trimmed = text.trim()
  const lower = trimmed.toLowerCase()
  const words = trimmed.split(/\s+/).filter(Boolean)
  const wordCount = words.length

  // Case 1: Inappropriate or Evasive Response
  if (analysis.isInappropriate) {
    const penalizedScore = Math.floor(Math.random() * 12) + 32 // 32% - 44%
    return {
      isInappropriate: true,
      inappropriatenessReason: analysis.reason,
      modelAnswer: analysis.modelAnswer,
      score: penalizedScore,
      verdict: 'Unsatisfactory / Inadequate Response',
      hrFeedback: `Candidate, as Chair of the Executive Assessment Panel, I must be direct with you: ${analysis.reason}`,
      strength: 'Identified an urgent opportunity to calibrate responses to the structured STAR competency standard.',
      improvement: 'Must present concrete situations, operational actions, and quantifiable outcomes with executive composure.',
      nextQuestion: `Let us redirect our focus to your core functional domain. Could you describe a specific time in ${candidateDept} where you had to manage competing priorities under strict regulatory timelines? What systematic method did you apply?`,
      competency: 'Professional Conduct & Operational Discipline',
      shouldConclude: false,
    }
  }

  // Case 2: Substantive Response — Extract specific technical tools, methodologies, and actions
  const detectedTools = ['python', 'sql', 'r', 'excel', 'power bi', 'gis', 'stata', 'spss', 'tableau', 'database', 'pipeline']
    .filter(t => lower.includes(t))
  const detectedMethods = ['sampling', 'survey', 'reconciliation', 'audit', 'validation', 'framework', 'stratification', 'kpi', 'metric', 'quality', 'report']
    .filter(m => lower.includes(m))
  const detectedActions = ['led', 'managed', 'collaborated', 'resolved', 'automated', 'delivered', 'improved', 'implemented', 'streamlined', 'coordinated']
    .filter(a => lower.includes(a))

  let calculatedScore = 72
  if (wordCount > 65) calculatedScore += 14
  else if (wordCount > 40) calculatedScore += 9
  else if (wordCount > 20) calculatedScore += 4
  else calculatedScore -= 8

  calculatedScore += Math.min(10, detectedTools.length * 3 + detectedMethods.length * 2)

  const finalScore = Math.max(58, Math.min(96, calculatedScore))
  const verdict = finalScore >= 85 ? 'Exceeds Expectations' : finalScore >= 75 ? 'Proficient — Benchmark Met' : 'Competent — Further Detail Recommended'

  const citedDetails = []
  if (detectedTools.length > 0) citedDetails.push(`your utilization of ${detectedTools.join(', ').toUpperCase()}`)
  if (detectedMethods.length > 0) citedDetails.push(`your structured focus on ${detectedMethods.join(' and ')}`)
  if (detectedActions.length > 0) citedDetails.push(`how you ${detectedActions[0]} the key deliverables`)

  const citedText = citedDetails.length > 0
    ? `I noted with interest ${citedDetails.join(', as well as ')}.`
    : `I appreciate you articulating that operational scenario in ${candidateDept}.`

  const adaptiveFollowUps = [
    `Building directly on that: when unforeseen field discrepancies or stakeholder pushback arose during that process, what specific risk mitigation protocol did you initiate?`,
    `Given that workflow, what quantifiable metric or KPI proved that your intervention was an enduring operational success?`,
    `Reflecting on that project in hindsight, what governance or technical safeguard would you institutionalize to prevent similar bottlenecks in future cycles?`,
  ]
  const pickedFollowUp = adaptiveFollowUps[Math.floor(Math.random() * adaptiveFollowUps.length)]

  return {
    isInappropriate: false,
    inappropriatenessReason: null,
    modelAnswer: null,
    score: finalScore,
    verdict,
    hrFeedback: `${citedText} That demonstrates commendable practical grounding in your scope as a ${candidateRole}.`,
    strength: wordCount > 35 ? 'Structured articulation with concrete operational context and ownership.' : 'Direct, focused response addressing the primary challenge.',
    improvement: 'Consistently quantify the long-term impact and institutional scalability of your solutions.',
    nextQuestion: pickedFollowUp,
    competency: competencyName || 'Operational Execution & Quality Control',
    shouldConclude: false,
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

    setIsAiThinking(true)

    const currentQNumber = questionCount
    const lastAiMsg = [...messages].reverse().find(m => m.sender === 'ai' && !m.isConclusion)
    const promptPayload = {
      message: `You are Dr. V. Ramanathan, a distinguished Senior Executive HR Director and Chair of the Talent Assessment Panel.
You are conducting a high-stakes, live competency viva-voce interview with ${candidateName}, candidate for the position of ${userRole} in ${userDept}.

PREVIOUS QUESTION YOU ASKED:
"${lastAiMsg ? lastAiMsg.text : 'Walk me through your background and scope of responsibilities'}"

CANDIDATE'S ACTUAL ANSWER:
"${text}"

TOTAL QUESTIONS ASKED SO FAR: ${currentQNumber}

CRITICAL HR INTERVIEWER TRAINING & DIRECTIVES:
1. DEEP ANSWER ANALYSIS & ACTIVE LISTENING:
   - Closely analyze what the candidate specifically stated.
   - Quote or explicitly cite specific technical frameworks, operational tools, methodologies, or actions from their text in your hrFeedback.

2. DETECT & ADDRESS INAPPROPRIATE, EVASIVE, OR DEFICIENT ANSWERS:
   - If the candidate's response is:
     a) Unprofessional, dismissive, sarcastic, rude, or disrespectful (e.g. "shut up", "none of your business", "who asked you", offensive slang);
     b) Evasive, trivial, monosyllabic, or completely off-topic (e.g. "bye", "ok", "cool", "idk", talking about sports/movies, gibberish like "asdfghjk");
     c) Violating civil service ethics or statutory data integrity protocols:
   - THEN YOU MUST:
     * Set "isInappropriate": true.
     * In "inappropriatenessReason", explain why this response fails official executive standards.
     * In "modelAnswer", PROVIDE THE COMPLETE, EXEMPLARY MODEL ANSWER showing how an authorized official should effectively answer this specific challenge using the STAR framework.
     * In "hrFeedback", address the candidate firmly and courteously with executive poise, point out the deficiency, and introduce the model standard.
     * Score accordingly low: 25% to 45% (verdict: "Inadequate / Below Standard").
     * In "nextQuestion", provide a structured redirection question to give them a focused opportunity to redeem themselves.

3. APPROPRIATE, COMPETENT ANSWERS:
   - If the candidate gave a relevant, professional answer:
     * Set "isInappropriate": false, "modelAnswer": null, "inappropriatenessReason": null.
     * In "hrFeedback", acknowledge and analyze specific strengths and tools from their actual text.
     * In "nextQuestion", formulate an adaptive follow-up probing deeper into that specific scenario (risk mitigation, stakeholder diplomacy, measurable KPIs, scalability).
     * Score between 74% and 96% based strictly on depth, practical evidence, and STAR methodology. NEVER default to 60%.

4. CONCLUSION CONDITION:
   - If at least 3-4 questions have been answered with substance and the candidate has demonstrated clear competency, set "shouldConclude": true. Otherwise set "shouldConclude": false.

5. RETURN STRICT JSON ONLY matching this schema:
{
  "isInappropriate": false,
  "inappropriatenessReason": null,
  "modelAnswer": null,
  "hrFeedback": "Specific executive HR reaction analyzing what the candidate wrote",
  "score": 82,
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

      // Safe local evaluation fallback if API fails or returns invalid structure
      if (!evalResult || typeof evalResult.score !== 'number') {
        evalResult = evaluateAnswerLocally(text, 'Operational Delivery & Quality', userRole, userDept, lastAiMsg?.text)
      }

      const newScoreRecord = {
        q: currentQNumber,
        score: evalResult.score,
        competency: evalResult.competency || 'Domain Competency',
      }
      const updatedScores = [...sessionScores, newScoreRecord]
      setSessionScores(updatedScores)

      const shouldFinish = evalResult.shouldConclude || (currentQNumber >= 5 && !evalResult.isInappropriate)

      if (shouldFinish) {
        setIsAiThinking(false)
        concludeSession(updatedScores)
      } else {
        const nextQNum = currentQNumber + 1
        setQuestionCount(nextQNum)

        const isBad = Boolean(evalResult.isInappropriate)
        let spokenText = evalResult.hrFeedback
        if (isBad && evalResult.modelAnswer) {
          spokenText += ` To assist your preparation, here is how an authorized official should respond: ${evalResult.modelAnswer}`
        }
        spokenText += ` ${evalResult.nextQuestion}`

        const fullMsgText = `${evalResult.hrFeedback}\n\n${evalResult.nextQuestion}`

        const aiMsg = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: fullMsgText,
          time: nowTime(),
          score: evalResult.score,
          verdict: evalResult.verdict,
          strength: evalResult.strength,
          improvement: evalResult.improvement,
          isInappropriate: isBad,
          inappropriatenessReason: evalResult.inappropriatenessReason,
          modelAnswer: evalResult.modelAnswer,
          questionNumber: nextQNum,
          competency: evalResult.competency,
        }

        setMessages(prev => [...prev, aiMsg])
        setIsAiThinking(false)
        setTimeout(() => speakText(spokenText), 400)
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
                      {msg.isInappropriate && (
                        <div className="inappropriate-alert-box">
                          <div className="inappropriate-header">
                            <span>⚠️ Evaluation Alert: Inappropriate / Inadequate Response</span>
                          </div>
                          <p className="inappropriate-reason-text">
                            {msg.inappropriatenessReason || 'The answer provided was off-topic, evasive, or failed to meet executive standards.'}
                          </p>
                        </div>
                      )}

                      {msg.modelAnswer && (
                        <div className="model-answer-box">
                          <div className="model-answer-header">
                            <span>💡 Model Exemplary Response</span>
                            <span className="model-answer-badge">How to Answer Effectively</span>
                          </div>
                          <div className="model-answer-quote">
                            "{msg.modelAnswer}"
                          </div>
                        </div>
                      )}

                      {msg.score !== undefined && (
                        <div className="score-card">
                          <div className="score-row">
                            <span className="score-num" style={{ color: msg.isInappropriate ? '#e11d48' : msg.score >= 75 ? '#15803d' : '#b45309' }}>
                              {msg.score}%
                            </span>
                            <span className={`verdict-tag ${msg.isInappropriate ? 'danger' : msg.score >= 80 ? 'good' : 'warn'}`}>
                              {msg.verdict}
                            </span>
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
