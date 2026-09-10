import http from 'node:http'

const port = Number(process.env.API_PORT || 8787)
const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || ''

async function readJson(request) {
  let body = ''
  for await (const chunk of request) body += chunk
  return JSON.parse(body || '{}')
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  })
  response.end(JSON.stringify(payload))
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  if (request.method !== 'POST' || request.url !== '/api/questions') {
    sendJson(response, 404, { error: 'Not found' })
    return
  }

  const reqAuth = request.headers.authorization?.replace(/^Bearer\s+/i, '') || ''
  const effectiveKey = reqAuth || apiKey

  try {
    const profile = await readJson(request)
    const skillsList = String(profile.skills || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const codingLang = profile.codingLanguage || ''
    const hasCodingSkill = Boolean(codingLang && codingLang !== 'none')

    if (!effectiveKey) {
      sendJson(response, 503, {
        error: 'API key is not configured on server. Local fallback questions will be used.',
      })
      return
    }

    const promptText = `You are an expert assessment creator. Generate 15 high-quality, realistic skill-assessment questions for:
Role: ${profile.role}
Skills: ${skillsList.join(', ')}
Experience Level: ${profile.experience || '1-3 years'}
Coding Language: ${hasCodingSkill ? codingLang : 'NONE (strictly non-coding profile)'}

CRITICAL RULES:
1. Skills are: ${skillsList.join(', ')}. Distribute the 15 questions evenly across each of these selected skills. For every question, include the specific "skill" field matching one of their selected skills.
2. ${
      hasCodingSkill
        ? `Because a coding skill (${codingLang}) is selected, include 3 practical coding challenges of type "code" specifically for ${codingLang}. The other 12 questions must be type "choice" scenario questions.`
        : `STRICT REQUIREMENT: This is a NON-CODING profile. You MUST NEVER generate any coding challenges, syntax questions, code blocks, or 'code' type questions. ALL 15 questions MUST be type "choice" scenario questions covering practical real-world situations, problem-solving, and domain judgment.`
    }
3. Each 'choice' question must have:
   - "type": "choice"
   - "skill": "exact skill name from the user's selected skills"
   - "prompt": "Realistic, challenging scenario question"
   - "options": ["Correct practical answer", "Distractor 1", "Distractor 2", "Distractor 3"]
   - "answerIndex": 0
4. Any 'code' question (ONLY if coding skill was selected) must have:
   - "type": "code"
   - "skill": "${codingLang}"
   - "prompt": "Coding problem description"
   - "language": "${codingLang}"
   - "starter": "starter function code"
   - "checks": ["regex pattern 1", "regex pattern 2"]

Return valid JSON strictly in this format:
{
  "questions": [
    {
      "type": "choice",
      "skill": "...",
      "prompt": "...",
      "options": ["...", "...", "..."],
      "answerIndex": 0
    }
  ]
}`

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${effectiveKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You generate accurate skill assessments in valid JSON.',
          },
          { role: 'user', content: promptText },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    })

    const payload = await aiResponse.json()
    if (!aiResponse.ok) {
      throw new Error(payload.error?.message || `AI API returned status ${aiResponse.status}`)
    }

    const content = payload.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(content)
    sendJson(response, 200, parsed)
  } catch (error) {
    sendJson(response, 502, { error: error.message })
  }
})

server.listen(port, () => {
  console.log(`Skillstat AI question API listening on http://localhost:${port}`)
})
