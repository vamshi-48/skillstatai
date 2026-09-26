import React, { useState, useEffect, useRef } from 'react'
import './ChatBot.css'

export default function ChatBot({
  profile = {},
  selectedSkillList = [],
  skillGapData = {},
  overallScore = 0,
  quizzesCompleted = 0,
  onNavigate,
  startQuiz,
  initialHistory = [],
  onHistoryChange,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const roleName = (profile.role && profile.role.trim()) || (profile.designation && profile.designation.trim()) || 'Government Professional'
  const deptName = profile.department || 'Official Statistics'
  const userName = profile.name ? profile.name.split(' ')[0] : 'Colleague'

  const initialMessage = {
    id: 1,
    sender: 'bot',
    text: `Hello ${userName}! 👋 I am your Skillstat AI Copilot. I'm here to help you evaluate competency benchmarks, discover official iGOT Karmayogi courses, check the NSSTA / TPAC calendar, and navigate your career path as a **${roleName}** (${deptName}). How can I help you today?`,
    time: 'Just now',
    actions: [
      { label: '🎯 Analyze My Gaps', query: 'Analyze my skill gaps' },
      { label: '📚 iGOT Courses', query: 'Recommend iGOT courses' },
      { label: '🏛️ NSSTA Calendar', query: 'Tell me about NSSTA workshops' },
      { label: '⚡ Take Assessment', query: 'Start my assessment' },
    ],
  }

  const [messages, setMessages] = useState(() => [...initialHistory, initialMessage])

  useEffect(() => {
    onHistoryChange?.(messages)
  }, [messages, onHistoryChange])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  const quickPrompts = [
    'Analyze my skill gaps',
    'Recommend iGOT courses',
    'Upcoming NSSTA workshops',
    'Career roadmap for my role',
  ]

  const generateBotResponse = (userText) => {
    const query = userText.toLowerCase()

    // 1. Skill Gaps / Assessment status
    if (query.includes('gap') || query.includes('competency') || query.includes('readiness') || query.includes('score')) {
      if (quizzesCompleted === 0) {
        return {
          text: `You are currently tracking **${selectedSkillList.length} skills**: ${selectedSkillList.join(', ')}. Since you haven't taken an assessment yet, your readiness score is **0%**.\n\nTaking your first skill quiz will establish your live benchmark comparison and calculate exact competency gaps.`,
          actions: [
            {
              label: '⚡ Take Skill Assessment Now',
              onClick: () => {
                if (startQuiz) startQuiz('standard')
              },
            },
          ],
        }
      }

      const assessedSkills = selectedSkillList.map((skill) => {
        const data = skillGapData[skill]
        if (data && data.totalQuestions > 0) {
          const gap = Math.max(0, 100 - data.proficiency)
          return `• **${skill}**: ${data.proficiency}% proficiency (${gap > 0 ? `${gap}% gap` : 'Mastered'})`
        }
        return `• **${skill}**: Assessment pending`
      })

      return {
        text: `Here is your current competency status:\n\n**Overall Readiness**: ${overallScore}%\n**Assessments Completed**: ${quizzesCompleted}\n\n**Breakdown**:\n${assessedSkills.join('\n')}\n\nWould you like recommendations on closing your largest gaps?`,
        actions: [
          {
            label: '✦ View AI Recommendations',
            onClick: () => {
              if (onNavigate) onNavigate('recommendations')
            },
          },
          {
            label: '⚡ Retake Assessment',
            onClick: () => {
              if (startQuiz) startQuiz('standard')
            },
          },
        ],
      }
    }

    // 2. iGOT Karmayogi Courses
    if (query.includes('igot') || query.includes('course') || query.includes('learn') || query.includes('karmayogi')) {
      return {
        text: `Official courses from **iGOT Karmayogi Bharat** directly matched for **${roleName}**:\n\n1. **Data Governance & Official Statistical Standards** — iGOT MoSPI (4.8 ★, 6 hrs)\n2. **Survey Sampling & Field Data Quality** — MoSPI / TPAC (4.9 ★, 10 hrs)\n3. **Practical Data Visualization with Python & SQL** — Digital India (4.7 ★, 8 hrs)\n4. **Public Health & Healthcare Administration** (for medical/health roles)\n\nYou can access these anytime on the official government portal:`,
        actions: [
          {
            label: '📚 View Recommended Courses',
            onClick: () => {
              if (onNavigate) onNavigate('recommendations')
            },
          },
          {
            label: '✦ View Skills Dashboard',
            onClick: () => {
              if (onNavigate) onNavigate('dashboard')
            },
          },
        ],
      }
    }

    // 3. NSSTA / TPAC Training
    if (query.includes('nssta') || query.includes('tpac') || query.includes('workshop') || query.includes('training') || query.includes('calendar')) {
      return {
        text: `**National Statistical Systems Training Academy (NSSTA)** in Greater Noida conducts residential programmes approved by TPAC:\n\n• **Advanced Official Data Science & Machine Learning Lab** — 14 Oct – 18 Oct 2026 (NSSTA Campus)\n• **Sampling Theory & Field Operations Workshop** — 04 Nov – 08 Nov 2026 (Residential)\n• **Digital Public Infrastructure & Data Governance** — 22 Nov – 26 Nov 2026\n\nAll courses provide hands-on laboratory depth and government certification.`,
        actions: [
          {
            label: '📅 View Full Training Calendar',
            onClick: () => {
              if (onNavigate) onNavigate('recommendations')
            },
          },
        ],
      }
    }

    // 4. Start assessment / Quiz
    if (query.includes('quiz') || query.includes('test') || query.includes('start') || query.includes('assessment')) {
      return {
        text: `Ready to test your knowledge? We have three assessment modes available:\n\n1. **Skill Benchmark Assessment**: Evaluates your selected role skills.\n2. **Weekend Challenge**: Live competitive quiz with leaderboard rank.\n3. **AI Notes Studio**: Upload any document/PDF to generate an instant customized quiz.`,
        actions: [
          {
            label: '⚡ Start Benchmark Quiz',
            onClick: () => {
              if (startQuiz) startQuiz('standard')
            },
          },
          {
            label: '🏆 Weekend Challenge',
            onClick: () => {
              if (onNavigate) onNavigate('weekend')
            },
          },
          {
            label: '📄 Upload Notes for Quiz',
            onClick: () => {
              if (onNavigate) onNavigate('notes')
            },
          },
        ],
      }
    }

    // 4b. AI Interview / Viva-Voce
    if (query.includes('interview') || query.includes('viva') || query.includes('oral')) {
      return {
        text: `The **Live AI Competency Interview** conducts an adaptive oral and scenario-based examination directly evaluating conceptual depth, field protocols, and practical reasoning for **${roleName}** (${deptName}).\n\nWould you like to commence your interview now?`,
        actions: [
          {
            label: '🎙️ Open AI Interview',
            onClick: () => {
              if (onNavigate) {
                setIsOpen(false)
                onNavigate('ai-interview')
              }
            },
          },
        ],
      }
    }

    // 5. Role & Roadmap
    if (query.includes('role') || query.includes('roadmap') || query.includes('career') || query.includes('doctor') || query.includes('analyst')) {
      return {
        text: `**Personalized Roadmap for ${roleName}** (${deptName}):\n\n1. **Foundational Competencies**: Master core requirements (${selectedSkillList.slice(0, 3).join(', ') || 'Domain Fundamentals'}).\n2. **Digital Government Standards**: Complete compliance and data handling certifications on iGOT.\n3. **Practical Lab Immersion**: Attend an NSSTA residential workshop or departmental simulation.\n4. **Peer Benchmarking**: Participate in weekly challenges to climb the departmental ranking (Currently #${profile.rank || 4}).`,
        actions: [
          {
            label: '🎯 View Skill Breakdown on Dashboard',
            onClick: () => {
              if (onNavigate) onNavigate('dashboard')
            },
          },
        ],
      }
    }

    // Default intelligent response
    return {
      text: `I understand! As your Skillstat AI Copilot for **${roleName}** (${deptName}), I can help analyze your skill benchmarks, suggest relevant iGOT courses, or generate tailored practice questions.\n\nWhat would you like to explore next?`,
      actions: [
        { label: '🎯 Analyze Skill Gaps', query: 'Analyze my skill gaps' },
        { label: '📚 Recommend iGOT Courses', query: 'Recommend iGOT courses' },
        { label: '🏛️ NSSTA Workshops', query: 'Upcoming NSSTA workshops' },
      ],
    }
  }

  const requestGeminiResponse = async (userText) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userText,
        context: {
          name: userName,
          role: roleName,
          department: deptName,
          skills: selectedSkillList,
          skillGapData,
          overallScore,
          quizzesCompleted,
        },
        history: messages.slice(-8).map((message) => ({
          role: message.sender === 'user' ? 'user' : 'model',
          text: message.text,
        })),
      }),
    })
    if (!response.ok) throw new Error('Gemini chatbot unavailable')
    const data = await response.json()
    if (!data.text) throw new Error('Gemini returned no response')
    return data.text
  }

  const msgIdCounter = useRef(10)

  const handleSend = async (textToSend = input) => {
    const trimmed = textToSend.trim()
    if (!trimmed) return

    msgIdCounter.current += 1
    const userMessage = {
      id: msgIdCounter.current,
      sender: 'user',
      text: trimmed,
      time: 'Just now',
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    try {
      const responseText = await requestGeminiResponse(trimmed)
      msgIdCounter.current += 1
      const botMessage = {
        id: msgIdCounter.current,
        sender: 'bot',
        text: responseText,
        time: 'Just now',
        actions: [],
      }
      setMessages((prev) => [...prev, botMessage])
    } catch {
      const fallback = generateBotResponse(trimmed)
      msgIdCounter.current += 1
      setMessages((prev) => [...prev, {
        id: msgIdCounter.current,
        sender: 'bot',
        text: fallback.text,
        time: 'Just now',
        actions: fallback.actions || [],
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleClear = () => {
    setMessages([initialMessage])
  }

  return (
    <aside className="skillstat-chatbot-wrapper" aria-label="Skillstat AI Assistant">
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <button
          className="chatbot-fab-btn"
          onClick={() => setIsOpen(true)}
          type="button"
          aria-label="Open Skillstat AI Assistant"
        >
          <span className="fab-icon">💬</span>
          <span className="fab-pulse-dot" />
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <section className="chatbot-window" aria-label="AI Chatbot Window">
          {/* Header */}
          <header className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar-circle">✦</div>
              <div>
                <h4>Skillstat AI Copilot</h4>
                <p className="chatbot-status">
                  <span className="online-indicator" /> Online · iGOT & NSSTA Advisor
                </p>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button
                type="button"
                className="chatbot-icon-btn"
                onClick={handleClear}
                title="Reset conversation"
                aria-label="Reset conversation"
              >
                🗑️
              </button>
              <button
                type="button"
                className="chatbot-icon-btn close-btn"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
          </header>

          {/* Quick Prompts Bar */}
          <nav className="chatbot-quick-chips" aria-label="Quick suggestion chips">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="quick-chip-btn"
                onClick={() => handleSend(prompt)}
              >
                {prompt}
              </button>
            ))}
          </nav>

          {/* Message History */}
          <div className="chatbot-messages-body">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chatbot-message-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="bot-avatar-badge" aria-hidden="true">
                    ✦
                  </div>
                )}
                <div className={`message-bubble ${msg.sender === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                  <div className="bubble-text">
                    {msg.text.split('\n').map((line, idx) => (
                      <React.Fragment key={idx}>
                        {line.split('**').map((seg, i) => (i % 2 === 1 ? <strong key={i}>{seg}</strong> : seg))}
                        {idx !== msg.text.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Optional Action Buttons inside Bot Message */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="bubble-actions-tray">
                      {msg.actions.map((act, i) => (
                        <button
                          key={i}
                          type="button"
                          className="bubble-action-btn"
                          onClick={() => {
                            if (act.onClick) {
                              act.onClick()
                            } else if (act.query) {
                              handleSend(act.query)
                            }
                          }}
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="bubble-timestamp">{msg.time}</span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chatbot-message-row bot-row">
                <div className="bot-avatar-badge">✦</div>
                <div className="message-bubble bot-bubble typing-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <footer className="chatbot-input-bar">
            <input
              type="text"
              className="chatbot-text-input"
              placeholder="Ask about skills, iGOT courses, NSSTA..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSend()
                }
              }}
            />
            <button
              type="button"
              className="chatbot-send-btn"
              disabled={!input.trim()}
              onClick={() => handleSend()}
              aria-label="Send message"
            >
              ➤
            </button>
          </footer>
        </section>
      )}
    </aside>
  )
}
