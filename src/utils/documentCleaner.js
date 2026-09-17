/* eslint-disable no-control-regex */
/**
 * Document extraction, Unicode validation, and text cleaning pipeline.
 * Handles PDF, TXT, MD, DOC, and pasted text.
 */
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker using legacy/local fallback safe for browser and bundlers
if (typeof window !== 'undefined' && pdfjsLib?.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString()
  } catch {
    // Worker will use default if URL resolution fails
  }
}

/**
 * Clean and validate raw extracted text.
 * - Preserves valid Unicode (English, Hindi, Tamil, Telugu, etc.)
 * - Removes replacement chars \uFFFD ()
 * - Removes binary escape codes and control chars
 * - Detects repeated character garbage (e.g. "6QQQQQQQQQQ...", "AAAAAA...")
 * - Detects PDF/binary stream headers
 * - Normalizes whitespace and punctuation
 */
export function cleanExtractedText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return ''
  }

  let text = rawText

  // 1. Remove binary PDF/DOC format artifacts & byte markers
  text = text.replace(/%PDF-[\d.]+/gi, ' ')
  text = text.replace(/\/Filter\s*\/[A-Za-z0-9]+/gi, ' ')
  text = text.replace(/stream[\r\n]+[\s\S]*?endstream/gi, ' ')
  text = text.replace(/xref[\s\S]*?trailer/gi, ' ')
  text = text.replace(/<<[\s\S]*?>>/gi, ' ')
  text = text.replace(/PK\x03\x04[\s\S]*?/gi, ' ') // zip/docx binary header

  // 2. Remove Unicode replacement character \uFFFD () and null/control characters
  text = text.replace(/\uFFFD/g, ' ')
  // Remove ASCII control characters except tab, newline, and carriage return
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')

  // 3. Remove long repeated character garbage like "6QQQQQQQQQQQQ...", "xxxxxxx...", "========..."
  // Matches any non-whitespace character repeated 5 or more times in a row
  text = text.replace(/([^\s])\1{4,}/g, ' ')

  // 4. Preserve valid Unicode: English, Hindi (\u0900-\u097F), Tamil (\u0B80-\u0BFF), Telugu (\u0C00-\u0C7F), numbers, standard punctuation
  // Remove sequences of bizarre unprintable or private-use unicode blocks
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\uE000-\uF8FF\uFFF0-\uFFFF]/g, ' ')

  // 5. Normalize whitespace: collapse multiple spaces, tabs, and duplicate blank lines
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/(\r\n|\n|\r){3,}/g, '\n\n')
  text = text.trim()

  return text
}

/**
 * Validate readability of extracted text.
 * Rejects unreadable, predominantly garbage, or binary strings.
 */
export function validateDocumentText(cleanedText) {
  const UNREADABLE_ERROR =
    'Unable to read the uploaded material correctly. Please upload the document again or use a text-readable PDF.'

  if (!cleanedText || cleanedText.length < 30) {
    return {
      isValid: false,
      text: '',
      error: UNREADABLE_ERROR,
    }
  }

  // Check if text still contains replacement char or repeated garbage patterns
  if (cleanedText.includes('\uFFFD') || /([a-zA-Z0-9])\1{5,}/.test(cleanedText)) {
    return {
      isValid: false,
      text: '',
      error: UNREADABLE_ERROR,
    }
  }

  // Count recognizable words (English letters or Indic script letters)
  const validWords = cleanedText.match(/[\p{L}]{2,}/gu) || []
  if (validWords.length < 10) {
    return {
      isValid: false,
      text: '',
      error: UNREADABLE_ERROR,
    }
  }

  // Calculate ratio of valid word characters to total characters
  const wordCharsLength = validWords.join('').length
  const ratio = wordCharsLength / cleanedText.length

  // If text is predominantly non-letter symbols or punctuation garbage (ratio < 0.35)
  if (ratio < 0.35) {
    return {
      isValid: false,
      text: '',
      error: UNREADABLE_ERROR,
    }
  }

  return {
    isValid: true,
    text: cleanedText,
    wordCount: validWords.length,
    error: null,
  }
}

/**
 * Extract concepts and topics from clean document text.
 * Returns clean semantic topic phrases for question generation and badges.
 */
export function extractConceptsFromText(cleanedText, count = 5) {
  if (!cleanedText) return ['Core Principles', 'Practical Application', 'Domain Standards']

  // Split into paragraphs or full sentences
  const rawSentences = cleanedText
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => {
      // Must be a coherent sentence: 25 to 250 characters, at least 4 words, not ending in weird symbols
      const words = s.split(/\s+/)
      return s.length >= 25 && s.length <= 250 && words.length >= 5 && !/([^\s])\1{3,}/.test(s)
    })

  if (rawSentences.length === 0) {
    return ['Core Methodologies', 'Workflow Standards', 'Operational Guidance', 'Quality Protocols', 'Compliance Guidelines'].slice(0, count)
  }

    // Extract key topic phrases from top sentences
    const concepts = []
    for (let i = 0; i < Math.min(rawSentences.length, count * 3); i++) {
      const s = rawSentences[i]
      // Clean out leading bullet points, numbers, dashes, or markdown
      const cleanSentence = s.replace(/^[\d.)\-\s*•#]+/, '').trim()
      const words = cleanSentence.split(/\s+/).filter(Boolean)
      if (words.length < 3) continue

      // Look for clean topic phrases: take 2 to 4 words
      let meaningfulWords = words.slice(0, 4)
      // Trim dangling prepositions/conjunctions/verbs from end
      while (
        meaningfulWords.length > 2 &&
        /^(by|is|are|was|were|of|in|to|for|with|and|or|a|an|the|from|as|at|that|which|into|on)$/i.test(
          meaningfulWords[meaningfulWords.length - 1]
        )
      ) {
        meaningfulWords.pop()
      }

      let conceptTitle = meaningfulWords
        .join(' ')
        .replace(/^[^\w]+|[^\w]+$/g, '')
        .trim()

      // Capitalize first character of each word for clean presentation
      if (conceptTitle) {
        conceptTitle = conceptTitle
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      }

      if (conceptTitle && conceptTitle.length >= 4 && !concepts.some((c) => c.title.toLowerCase() === conceptTitle.toLowerCase())) {
        concepts.push({
          index: concepts.length + 1,
          title: conceptTitle,
          context: cleanSentence,
        })
      }

      if (concepts.length >= count) break
    }

    return concepts.length > 0
      ? concepts
      : [{ index: 1, title: 'Core Document Principles', context: cleanedText.slice(0, 150) }]
  }

/**
 * Extracts rich, authentic question items directly from uploaded document text.
 * Formulates realistic comprehension, policy, procedural, and metric questions
 * based on actual sentences and factual assertions in the text.
 */
export function extractDocumentQuizItems(cleanedText, count = 10) {
  if (!cleanedText || typeof cleanedText !== 'string' || cleanedText.trim().length < 20) {
    return []
  }

  // 1. Split text into coherent, information-rich sentences
  const rawSegments = cleanedText
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.replace(/^[\d.)\-\s*•#]+/, '').trim())
    .filter((s) => {
      const words = s.split(/\s+/).filter(Boolean)
      return (
        s.length >= 35 &&
        s.length <= 320 &&
        words.length >= 6 &&
        !/^table\s*\d+/i.test(s) &&
        !/^figure\s*\d+/i.test(s) &&
        !/([^\s])\1{3,}/.test(s)
      )
    })

  if (rawSegments.length === 0) {
    return []
  }

  // Deduplicate near-identical sentences
  const uniqueSegments = []
  const seenPrefixes = new Set()
  for (const seg of rawSegments) {
    const prefix = seg.slice(0, 30).toLowerCase()
    if (!seenPrefixes.has(prefix)) {
      seenPrefixes.add(prefix)
      uniqueSegments.push(seg)
    }
  }

  // 2. Extract key topic phrase from a sentence
  function extractKeyTopic(sentence) {
    const words = sentence.split(/\s+/).filter(Boolean)
    const stopWords = new Set([
      'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are', 'was', 'were',
      'that', 'this', 'with', 'from', 'by', 'as', 'it', 'its', 'be', 'been', 'has', 'have', 'had',
      'will', 'shall', 'should', 'would', 'can', 'could', 'may', 'might', 'must', 'each', 'all',
      'any', 'such', 'when', 'where', 'which', 'who', 'whom', 'their', 'our', 'these', 'those'
    ])

    // Find the first sequence of 2-4 content words
    const contentWords = []
    for (const w of words) {
      const clean = w.replace(/^[^\w]+|[^\w]+$/g, '')
      if (clean && !stopWords.has(clean.toLowerCase())) {
        contentWords.push(clean)
        if (contentWords.length >= 3) break
      } else if (contentWords.length > 0) {
        if (contentWords.length >= 2) break
      }
    }

    if (contentWords.length >= 2) {
      return contentWords.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }
    return words.slice(0, 3).join(' ').replace(/^[^\w]+|[^\w]+$/g, '')
  }

  // 3. Build diverse question types based on the sentence
  const questionGenerators = [
    // Type A: Direct procedural / standard requirement
    (topic, sentence) => ({
      prompt: `According to the uploaded material, what is the established guideline or standard regarding "${topic}"?`,
      correct: `${sentence.endsWith('.') ? sentence.slice(0, -1) : sentence}.`,
      distractors: [
        `The document explicitly advises bypassing ${topic} protocols to avoid procedural delays in reporting.`,
        `The material recommends delegating ${topic} decisions entirely to unverified external contractors without oversight.`,
        `The text states that ${topic} should only be recorded if retrospective audit discrepancies are identified.`,
      ],
    }),
    // Type B: Core objective & operational mandate
    (topic, sentence) => ({
      prompt: `Based on the provided document, what key principle or operational procedure is highlighted for "${topic}"?`,
      correct: `${sentence.endsWith('.') ? sentence.slice(0, -1) : sentence}.`,
      distractors: [
        `Operational teams are instructed to replace ${topic} guidelines with informal legacy practices.`,
        `The document considers ${topic} optional and recommends deferring documentation indefinitely.`,
        `The text directs officers to alter source benchmarks for ${topic} whenever targets are not met.`,
      ],
    }),
    // Type C: Compliance & methodological rigor
    (topic, sentence) => ({
      prompt: `In the context of the uploaded document, which statement accurately reflects the required methodology for "${topic}"?`,
      correct: `${sentence.endsWith('.') ? sentence.slice(0, -1) : sentence}.`,
      distractors: [
        `The protocol permits omitting data validation for ${topic} when handling large-scale administrative feeds.`,
        `The document advises adopting unverified third-party estimates for ${topic} without provenance checks.`,
        `The text mandates that ${topic} records be discarded if conflicting regional variances are detected.`,
      ],
    }),
    // Type D: Quality control & governance assertion
    (topic, sentence) => ({
      prompt: `Which of the following statements is explicitly supported by the uploaded text regarding "${topic}"?`,
      correct: `${sentence.endsWith('.') ? sentence.slice(0, -1) : sentence}.`,
      distractors: [
        `The material recommends silencing exceptions in ${topic} to expedite final clearance.`,
        `The document suggests standardizing ${topic} by removing historical verification logs.`,
        `The text states that ${topic} compliance does not require adherence to statutory governance norms.`,
      ],
    }),
  ]

  // Step across the document evenly so questions represent the entire document
  const stepSize = Math.max(1, Math.floor(uniqueSegments.length / count))
  const items = []

  for (let i = 0; i < count; i++) {
    const segIndex = (i * stepSize) % uniqueSegments.length
    const sentence = uniqueSegments[segIndex]
    const topic = extractKeyTopic(sentence)
    const gen = questionGenerators[i % questionGenerators.length]
    const qData = gen(topic, sentence)

    const difficultyLevels = [
      { name: 'Foundational', level: 1, label: 'Level 1: Foundational', badgeClass: 'diff-foundational' },
      { name: 'Foundational', level: 1, label: 'Level 1: Foundational', badgeClass: 'diff-foundational' },
      { name: 'Intermediate', level: 2, label: 'Level 2: Intermediate', badgeClass: 'diff-intermediate' },
      { name: 'Intermediate', level: 2, label: 'Level 2: Intermediate', badgeClass: 'diff-intermediate' },
      { name: 'Intermediate', level: 2, label: 'Level 2: Intermediate', badgeClass: 'diff-intermediate' },
      { name: 'Advanced', level: 3, label: 'Level 3: Advanced', badgeClass: 'diff-advanced' },
      { name: 'Advanced', level: 3, label: 'Level 3: Advanced', badgeClass: 'diff-advanced' },
      { name: 'Advanced', level: 3, label: 'Level 3: Advanced', badgeClass: 'diff-advanced' },
      { name: 'Expert', level: 4, label: 'Level 4: Expert Challenge', badgeClass: 'diff-expert' },
      { name: 'Expert', level: 4, label: 'Level 4: Expert Challenge', badgeClass: 'diff-expert' },
    ]
    const diff = difficultyLevels[i % difficultyLevels.length]

    // Create 4 distinct options
    const rawOptions = [
      qData.correct,
      qData.distractors[0],
      qData.distractors[1],
      qData.distractors[2],
    ]

    items.push({
      type: 'choice',
      skill: topic,
      label: `Document Question ${i + 1}`,
      sourceBadge: `Notes • ${topic}`,
      difficulty: diff.name,
      difficultyLevel: diff.level,
      difficultyLabel: diff.label,
      difficultyBadgeClass: diff.badgeClass,
      prompt: qData.prompt,
      options: rawOptions,
      correctIndex: 0,
      contextSentence: sentence,
    })
  }

  return items
}

/**
 * Asynchronously extracts text from an uploaded File object.
 * Handles PDF (via pdfjs-dist), TXT, MD, and fallback reading.
 */
export async function extractTextFromFile(file) {
  const UNREADABLE_ERROR =
    'Unable to read the uploaded material correctly. Please upload the document again or use a text-readable PDF.'

  if (!file) {
    return { isValid: false, text: '', error: 'No file provided.' }
  }

  const fileName = file.name.toLowerCase()
  const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf'

  if (isPdf) {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
      const pdf = await loadingTask.promise

      let fullText = ''
      const maxPages = Math.min(pdf.numPages, 20) // process up to first 20 pages for speed

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item) => (typeof item.str === 'string' ? item.str : ''))
          .join(' ')
        fullText += pageText + '\n\n'
      }

      const cleaned = cleanExtractedText(fullText)
      return validateDocumentText(cleaned)
    } catch (pdfErr) {
      console.warn('PDF text extraction error:', pdfErr)
      return {
        isValid: false,
        text: '',
        error: UNREADABLE_ERROR,
      }
    }
  }

  // Handle plain text, markdown, or textual files
  try {
    const rawText = await file.text()
    const cleaned = cleanExtractedText(rawText)
    return validateDocumentText(cleaned)
  } catch (textErr) {
    console.warn('Text file read error:', textErr)
    return {
      isValid: false,
      text: '',
      error: UNREADABLE_ERROR,
    }
  }
}
