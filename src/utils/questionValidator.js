/**
 * AI Question Validation and Sanitization Engine
 *
 * Rules:
 * 1. Readable prompt text
 * 2. No \uFFFD () characters
 * 3. No obvious encoding garbage or repeated character spam
 * 4. Exactly 4 options
 * 5. Exactly 1 correct answer (index 0..3)
 * 6. Options are meaningful, distinct, and clean
 * 7. Clean concept/source badge (e.g. "Notes • Concept 4"), never raw document text
 */

/**
 * Validates whether a question conforms strictly to quality standards.
 */
export function isQuestionValid(q) {
  if (!q || typeof q !== 'object') return false

  // Validate prompt
  if (!q.prompt || typeof q.prompt !== 'string' || q.prompt.trim().length < 15) {
    return false
  }

  // Check for replacement characters or obvious repeated garbage
  if (q.prompt.includes('\uFFFD') || /([a-zA-Z0-9])\1{5,}/.test(q.prompt)) {
    return false
  }

  // Ensure prompt does not expose raw extracted binary text or weird punctuation sequences
  if (/%PDF|stream\s*|<<[\s\S]*?>>|\/FlateDecode/.test(q.prompt)) {
    return false
  }

  if (q.type === 'code') {
    if (!q.language || typeof q.language !== 'string' || !q.starter || typeof q.starter !== 'string') return false
    if (!Array.isArray(q.checks) || q.checks.length < 2) return false
    return q.checks.every((check) => check instanceof RegExp || typeof check === 'string')
  }

  // Validate options array: must have EXACTLY 4 options
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    return false
  }

  // Validate each option
  const optionSet = new Set()
  for (const opt of q.options) {
    if (!opt || typeof opt !== 'string' || opt.trim().length < 2) {
      return false
    }
    if (opt.includes('\uFFFD') || /([a-zA-Z0-9])\1{5,}/.test(opt)) {
      return false
    }
    const cleanOpt = opt.trim().toLowerCase()
    if (optionSet.has(cleanOpt)) {
      return false // duplicate option
    }
    optionSet.add(cleanOpt)
  }

  // Validate correctIndex
  const correctIdx = q.correctIndex !== undefined ? q.correctIndex : q.answerIndex
  if (typeof correctIdx !== 'number' || correctIdx < 0 || correctIdx > 3) {
    return false
  }

  return true
}

/**
 * Sanitizes and repairs a question object.
 * If question can be cleanly repaired, returns sanitized question.
 * If irreparable, returns null.
 */
export function sanitizeQuestion(q, fallbackTopic = 'Core Concept') {
  if (!q || typeof q !== 'object') return null

  let prompt = String(q.prompt || '').trim()
  prompt = prompt.replace(/\uFFFD/g, '')
  prompt = prompt.replace(/([a-zA-Z0-9])\1{4,}/g, '')
  prompt = prompt.replace(/[ \t]+/g, ' ').trim()

  // Prevent raw unformatted source dumps in prompt
  if (prompt.toLowerCase().startsWith('based on your uploaded material: "')) {
    // Clean out quotes with garbage
    prompt = prompt.replace(/^based on your uploaded material:\s*"[^"]*"\s*[—–-]?\s*/i, 'Based on your uploaded material, ')
  }

  if (prompt.length < 15) return null

  // Ensure exactly 4 options
  let options = Array.isArray(q.options) ? q.options.map((o) => String(o || '').trim()) : []
  options = options.filter((o) => o.length > 2 && !o.includes('\uFFFD') && !/([a-zA-Z0-9])\1{4,}/.test(o))

  // Deduplicate
  const uniqueOptions = []
  const seen = new Set()
  for (const opt of options) {
    const key = opt.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      uniqueOptions.push(opt)
    }
  }

  // If fewer than 4 options, fill with contextually valid distractors
  const defaultDistractors = [
    'Apply this standard to eliminate workflow discrepancies and ensure data integrity',
    'Bypass this protocol in favor of ad-hoc assumptions without audit logs',
    'Defer quality verification until end-stage deployment failures occur',
    'Rely exclusively on unverified legacy estimates without re-benchmarking',
  ]

  for (const distractor of defaultDistractors) {
    if (uniqueOptions.length >= 4) break
    if (!seen.has(distractor.toLowerCase())) {
      seen.add(distractor.toLowerCase())
      uniqueOptions.push(distractor)
    }
  }

  if (uniqueOptions.length < 4) return null
  const finalOptions = uniqueOptions.slice(0, 4)

  let correctIndex = q.correctIndex !== undefined ? Number(q.correctIndex) : Number(q.answerIndex || 0)
  if (isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    correctIndex = 0
  }

  const cleanLabel = q.label && !q.label.includes('\uFFFD') ? q.label : `Concept Question`
  const cleanSource = q.sourceBadge || `Notes • ${fallbackTopic}`

  return {
    ...q,
    label: cleanLabel,
    skill: fallbackTopic,
    sourceBadge: cleanSource,
    prompt,
    options: finalOptions,
    correctIndex,
    answerIndex: correctIndex,
  }
}

/**
 * Validates a list of questions, cleans them, and removes invalid entries.
 */
export function validateAndCleanQuiz(questions, fallbackTopic = 'Document Concept') {
  if (!Array.isArray(questions)) return []

  const validQuestions = []
  const seenPrompts = new Set()
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    if (q?.type === 'code' && isQuestionValid(q)) {
      const checks = q.checks.map((check) => {
        if (check instanceof RegExp) return check
        try {
          return new RegExp(check, 'i')
        } catch {
          return null
        }
      }).filter(Boolean)
      if (checks.length >= 2) {
        const promptKey = q.prompt.trim().toLowerCase().replace(/\s+/g, ' ')
        if (!seenPrompts.has(promptKey)) {
          seenPrompts.add(promptKey)
          validQuestions.push({ ...q, checks, sourceBadge: q.sourceBadge || `Coding • ${q.language}` })
        }
      }
      continue
    }
    if (isQuestionValid(q)) {
      const promptKey = q.prompt.trim().toLowerCase().replace(/\s+/g, ' ')
      if (!seenPrompts.has(promptKey)) {
        seenPrompts.add(promptKey)
        validQuestions.push({
          ...q,
          sourceBadge: q.sourceBadge || `Notes • Concept ${i + 1}`,
        })
      }
    } else {
      const sanitized = sanitizeQuestion(q, `${fallbackTopic} ${i + 1}`)
      const promptKey = sanitized?.prompt.trim().toLowerCase().replace(/\s+/g, ' ')
      if (sanitized && isQuestionValid(sanitized) && !seenPrompts.has(promptKey)) {
        seenPrompts.add(promptKey)
        validQuestions.push(sanitized)
      }
    }
  }

  return validQuestions
}
