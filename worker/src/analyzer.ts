import { z } from 'zod';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const AI_TIMEOUT_MS = 30_000;
const MAX_LOG_CHARS = 50_000;

const ANALYSIS_PROMPT = `You are an expert Site Reliability Engineer and incident analyst.
Analyze the following incident logs and provide a structured root cause analysis.

Return ONLY valid JSON with this exact structure:
{
  "summary": "One-line summary of what happened",
  "root_cause": "Detailed root cause explanation",
  "confidence": 0.85,
  "symptoms": ["symptom1", "symptom2"],
  "affected_services": ["service1", "service2"],
  "suggested_actions": ["action1", "action2"],
  "runbook_links": ["https://example.com/runbook1"],
  "contributing_factors": ["factor1", "factor2"],
  "severity": "critical|high|medium|low"
}

Rules:
- confidence must be between 0 and 1
- severity must be one of: critical, high, medium, low
- Extract actual service names from the logs
- Provide actionable suggestions
- Be specific about the root cause
- Identify all symptoms visible in the logs
- List contributing factors that may have led to the incident`;

// --- Zod schema for runtime validation of AI response ---

const analysisSchema = z.object({
  summary: z.string().min(1).max(500),
  root_cause: z.string().min(1).max(5000),
  confidence: z.number().min(0).max(1).default(0.5),
  symptoms: z.array(z.string()).default([]),
  affected_services: z.array(z.string()).default([]),
  suggested_actions: z.array(z.string()).default([]),
  runbook_links: z.array(z.string().refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid http/https URL' }
  )).default([]),
  contributing_factors: z.array(z.string()).default([]),
  severity: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;

// --- Helpers ---

function truncateLogs(logs: string): string {
  if (logs.length <= MAX_LOG_CHARS) return logs;
  const truncated = logs.slice(0, MAX_LOG_CHARS);
  return truncated + '\n\n[TRUNCATED: Log input exceeded 50,000 characters — showing first 50K]';
}

function sanitizeRunbookLinks(links: string[]): string[] {
  return links.filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  });
}

function validateAnalysisResult(raw: unknown): AnalysisResult {
  const result = analysisSchema.safeParse(raw);
  if (result.success) {
    return result.data;
  }

  // Attempt to salvage partial data
  const partial = raw as Record<string, any>;
  const salvaged = {
    summary: typeof partial?.summary === 'string' ? partial.summary : 'Analysis completed with validation errors',
    root_cause: typeof partial?.root_cause === 'string' ? partial.root_cause : 'Unable to parse root cause',
    confidence: typeof partial?.confidence === 'number' ? Math.min(1, Math.max(0, partial.confidence)) : 0.5,
    symptoms: Array.isArray(partial?.symptoms) ? partial.symptoms.filter((s: any) => typeof s === 'string') : [],
    affected_services: Array.isArray(partial?.affected_services) ? partial.affected_services.filter((s: any) => typeof s === 'string') : [],
    suggested_actions: Array.isArray(partial?.suggested_actions) ? partial.suggested_actions.filter((s: any) => typeof s === 'string') : [],
    runbook_links: Array.isArray(partial?.runbook_links) ? sanitizeRunbookLinks(partial.runbook_links.filter((s: any) => typeof s === 'string')) : [],
    contributing_factors: Array.isArray(partial?.contributing_factors) ? partial.contributing_factors.filter((s: any) => typeof s === 'string') : [],
    severity: ['critical', 'high', 'medium', 'low'].includes(partial?.severity) ? partial.severity : 'medium',
  };

  console.warn('AI response failed schema validation, salvaged partial data:', result.error.flatten());
  return analysisSchema.parse(salvaged);
}

// --- AI Providers ---

async function callGroq(logs: string): Promise<AnalysisResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: ANALYSIS_PROMPT },
          { role: 'user', content: `Analyze these incident logs:\n\n${logs}` },
        ],
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${err.slice(0, 200)}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in Groq response');

    const parsed = JSON.parse(content);
    return validateAnalysisResult(parsed);
  } finally {
    clearTimeout(timeout);
  }
}

async function callOllama(logs: string): Promise<AnalysisResult> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1:8b-8k',
        prompt: `${ANALYSIS_PROMPT}\n\nAnalyze these incident logs:\n\n${logs}`,
        format: 'json',
        stream: false,
        options: { temperature: 0.3 },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      throw new Error(`Ollama error: ${response.status} - ${errText.slice(0, 200)}`);
    }

    const data: any = await response.json();
    const parsed = JSON.parse(data.response);
    return validateAnalysisResult(parsed);
  } finally {
    clearTimeout(timeout);
  }
}

// --- Main export ---

export async function analyzeIncident(logs: string): Promise<AnalysisResult> {
  const truncated = truncateLogs(logs);
  const hasGroqKey = !!process.env.GROQ_API_KEY;

  if (hasGroqKey) {
    try {
      console.log(`Analyzing with Groq... (${truncated.length} chars)`);
      return await callGroq(truncated);
    } catch (groqErr: any) {
      if (groqErr.name === 'AbortError') {
        console.warn('Groq call timed out after 30s, trying Ollama...');
      } else {
        console.warn('Groq failed, trying Ollama:', groqErr.message);
      }
    }
  }

  try {
    console.log(`Analyzing with Ollama... (${truncated.length} chars)`);
    return await callOllama(truncated);
  } catch (ollamaErr: any) {
    if (ollamaErr.name === 'AbortError') {
      throw new Error('AI analysis failed: both Groq and Ollama timed out after 30s each');
    }
    throw new Error(`AI analysis failed: ${ollamaErr.message}`);
  }
}
