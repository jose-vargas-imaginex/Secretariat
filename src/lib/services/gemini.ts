import { getSetting } from './db/settings.js';

export type GeminiErrorCode =
  | 'NO_API_KEY'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'AUTH_ERROR'
  | 'RATE_LIMIT';

export class GeminiError extends Error {
  code: GeminiErrorCode;

  constructor(code: GeminiErrorCode, message: string) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
  }
}

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export async function generateContent(prompt: string): Promise<string> {
  const apiKey = getSetting('gemini_api_key');
  if (!apiKey) {
    throw new GeminiError('NO_API_KEY', 'Gemini API key not configured. Add it in Settings.');
  }

  let response: Response;
  try {
    response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });
  } catch {
    throw new GeminiError('NETWORK_ERROR', 'Failed to connect to Gemini API. Check your internet connection.');
  }

  if (response.status === 401 || response.status === 403) {
    throw new GeminiError('AUTH_ERROR', 'Invalid API key. Check your Gemini API key in Settings.');
  }

  if (response.status === 429) {
    throw new GeminiError('RATE_LIMIT', 'Rate limited by Gemini API. Please try again later.');
  }

  if (!response.ok) {
    let errorMessage = `Gemini API error: ${response.status} ${response.statusText}`;
    let errorCode: GeminiErrorCode = 'NETWORK_ERROR';
    try {
      const errorData = await response.json() as { error?: { message?: string; status?: string } };
      if (errorData?.error?.message) {
        errorMessage = errorData.error.message;
      }
      if (errorData?.error?.status === 'INVALID_ARGUMENT' && errorMessage.toLowerCase().includes('api key')) {
        errorCode = 'AUTH_ERROR';
        errorMessage = 'Invalid API key. Check your Gemini API key in Settings.';
      }
    } catch {
      // Use default error message
    }
    throw new GeminiError(errorCode, errorMessage);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new GeminiError('INVALID_RESPONSE', 'Failed to parse Gemini API response.');
  }

  const text = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
    ?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new GeminiError('INVALID_RESPONSE', 'Unexpected response format from Gemini API.');
  }

  return text;
}
