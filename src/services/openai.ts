import { getSetting } from '../database/queries';
import { AIMessage } from '../types';
import * as SecureStore from 'expo-secure-store';
import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';

const OPENAI_API_URL = 'https://api.openai.com/v1';
const API_HISTORY_LIMIT = 6;
const API_MESSAGE_CHAR_LIMIT = 600;

async function getApiKey(): Promise<string> {
  // Try SecureStore first (new secure location), fallback to SQLite (migration)
  let key = await SecureStore.getItemAsync('openai_key');
  if (!key) {
    // fallback: check old SQLite storage and migrate if found
    key = await getSetting('openai_key');
    if (key) {
      await SecureStore.setItemAsync('openai_key', key);
    }
  }
  if (!key) throw new Error('OpenAI API key not set. Please add it in Settings.');
  return key;
}

// ─── AUDIO TRANSCRIPTION (Whisper) ────────────────────────────────────────

export async function transcribeAudio(audioUri: string): Promise<string> {
  const apiKey = await getApiKey();

  const audioFile = new File(audioUri);
  const formData = new FormData();
  formData.append('file', audioFile, 'audio.m4a');
  formData.append('model', 'whisper-1');
  // Uzbek is not accepted by the API language parameter; let Whisper auto-detect it.
  formData.append(
    'prompt',
    'Transcribe exactly as spoken. The speaker may use English or Uzbek, including finance, planning, and health terms.',
  );

  const response = await expoFetch(`${OPENAI_API_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.text;
}

// ─── CHAT COMPLETION (GPT-4o-mini) ────────────────────────────────────────

export async function chatCompletion(
  messages: AIMessage[],
  maxTokens = 500
): Promise<string> {
  const apiKey = await getApiKey();

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message ?? 'OpenAI API error');
  }

  const data = await response.json();
  return data.choices[0].message.content as string;
}



// ─── PARSE USER ACTION FROM TEXT ──────────────────────────────────────────────

export type ParsedAction = 
  | { action: 'expense'; type: 'income' | 'expense'; amount: number; currency: 'UZS' | 'USD'; category: string; note: string; }
  | { action: 'task'; title: string; date: string; time?: string; priority: 'low' | 'normal' | 'high'; category: string; }
  | { action: 'food'; food_name: string; calories: number; date: string; meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'; };

export interface ParsedTask {
  title: string;
  date: string;
  time?: string;
  priority: 'low' | 'normal' | 'high';
  category: string;
}

function cleanJSON(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\s*/i, '');
    cleaned = cleaned.replace(/```\s*$/, '');
    cleaned = cleaned.trim();
  }
  return cleaned;
}

function toImageDataUrl(imageBase64: string): string {
  const trimmed = imageBase64.trim();
  if (trimmed.startsWith('data:image/')) return trimmed;
  return `data:image/jpeg;base64,${trimmed}`;
}

export async function parseUserAction(text: string, imageBase64?: string): Promise<ParsedAction | null> {
  const systemPrompt = `You are a personal assistant handling finances, daily planning, and health (calories).
Analyze the user's text (and image if provided) and extract EITHER a financial transaction, a task/reminder, OR a food calorie log.

If the user uploads a food image and asks to calculate/add calories ("kaloaraya qosh", "kaloriya hisobla"), or texts that they ate something:
Return exactly this JSON for FOOD:
{
  "action": "food",
  "food_name": "Name of the food",
  "calories": number (estimated calories),
  "date": "YYYY-MM-DD" (today is ${new Date().toISOString().split('T')[0]}),
  "meal_type": "breakfast", "lunch", "dinner", "snack", or "other"
}

If it's a transaction, return exactly this JSON:
{
  "action": "expense",
  "type": "expense" or "income",
  "amount": number,
  "currency": "UZS" or "USD",
  "category": one of [food, transport, entertainment, health, education, clothing, utilities, salary, freelance, gift, other],
  "note": "short description"
}

If it's a task or schedule (like "21:00 da uchrashuv"), return exactly this JSON:
{
  "action": "task",
  "title": "Task name/description",
  "date": "YYYY-MM-DD",
  "time": "HH:mm" (optional),
  "priority": "normal",
  "category": "general"
}

Rules:
- For transactions: "oldim", "topdim" → income; "berdim", "to'ladim", "sotib oldim" → expense.
- Return ONLY the JSON object, nothing else. If you can't parse anything meaningful, return: null`;

  try {
    const userContent: any[] = [{ type: 'text', text }];
    if (imageBase64) {
      userContent.push({
        type: 'image_url',
        image_url: { url: toImageDataUrl(imageBase64), detail: 'low' }
      });
    }

    const result = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent as any },
    ], 300);

    const cleaned = cleanJSON(result);
    if (cleaned === 'null') return null;
    return JSON.parse(cleaned) as ParsedAction;
  } catch {
    return null;
  }
}

export async function parseTaskList(text: string, imageBase64: string): Promise<ParsedTask[]> {
  const today = new Date().toISOString().split('T')[0];
  const prompt = `Read the attached handwritten or printed task list. Extract every distinct actionable task in order.
Today is ${today}. Resolve relative dates using today. Preserve the user's wording as much as possible.
Return ONLY a JSON array, no markdown:
[{"title":"...","date":"YYYY-MM-DD","time":"HH:MM","priority":"low|normal|high","category":"work|health|personal|finance|learning|general|other"}]
Use date ${today} and omit time when it is not present. If no task is readable, return [].`;

  try {
    const result = await chatCompletion([
      { role: 'system', content: prompt },
      { role: 'user', content: [
        { type: 'text', text: text || 'Extract all tasks from this image.' },
        { type: 'image_url', image_url: { url: toImageDataUrl(imageBase64), detail: 'low' } },
      ] as any },
    ], 500);
    const parsed = JSON.parse(cleanJSON(result));
    return Array.isArray(parsed) ? parsed.filter(task => typeof task?.title === 'string').slice(0, 20) : [];
  } catch {
    return [];
  }
}

// ─── FOOD CALORIE ANALYSIS ────────────────────────────────────────────────

export async function analyzeFoodImage(
  imageBase64: string,
  additionalText?: string
): Promise<{ food_name: string; calories: number; meal_type: string }> {
  const apiKey = await getApiKey();

  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: toImageDataUrl(imageBase64), detail: 'low' },
        },
        {
          type: 'text',
          text: `Identify the food in this image and estimate calories. ${additionalText ?? ''}
Return ONLY JSON: {"food_name": "name in uzbek/english", "calories": number, "meal_type": "breakfast|lunch|dinner|snack|other"}`,
        },
      ],
    },
  ];

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      max_tokens: 150,
    }),
  });

  if (!response.ok) throw new Error('Food analysis failed');
  const data = await response.json();
  const content = cleanJSON(data.choices[0].message.content);
  return JSON.parse(content);
}

// ─── DAY PLAN SUGGESTION ─────────────────────────────────────────────────

export async function suggestDayPlan(
  taskHistory: string,
  tomorrowDate: string,
  language: 'uz' | 'en' = 'uz'
): Promise<Array<{ title: string; time: string; category: string; priority: string }>> {
  const lang = language === 'uz' ? 'Uzbek' : 'English';
  const systemPrompt = `You are a personal productivity assistant. Build a realistic schedule for tomorrow (${tomorrowDate}) from the user's actual recent history.
Analyze yesterday, the last 14 days, recurring weekday habits, completed vs unfinished tasks, and timing patterns. Keep recurring habits, move unfinished important work forward, and avoid duplicating completed one-off tasks. Do not invent too many tasks: suggest at most 6 useful items with realistic spacing.
Return ONLY a JSON array of tasks (max 6 items):
[{"title": "task name in ${lang}", "time": "HH:MM", "category": "work|health|personal|finance|learning|other", "priority": "low|normal|high"}]
Use the user's language and habits. Make it balanced but practical.
Return ONLY the JSON array.`;

  try {
    const result = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Task history and habit summary:\n${taskHistory}` },
    ], 400);
    const cleaned = cleanJSON(result);
    return JSON.parse(cleaned);
  } catch {
    return [];
  }
}

// ─── FREE AI CHAT ─────────────────────────────────────────────────────────

export async function sendAIChat(
  userMessage: string,
  conversationHistory: AIMessage[],
  anonymousContext: string,
  language: 'uz' | 'en' = 'uz',
  imageBase64?: string
): Promise<string> {
  const lang = language === 'uz' ? 'Uzbek' : 'English';
  const systemPrompt = `You are LifeOS, a personal life assistant. Reply in ${lang}.
You help with daily planning, expense tracking, health monitoring, and general life advice.
User's anonymous context (no personal info): ${anonymousContext}
If the user uploads an image of food, analyze it and estimate its calories, then respond nicely.
Be concise, friendly, and helpful. Max 3 sentences unless details needed.`;

  const userContent: any = imageBase64 
    ? [
        { type: 'text', text: userMessage },
        { type: 'image_url', image_url: { url: toImageDataUrl(imageBase64), detail: 'low' } }
      ]
    : userMessage;

  const messages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory
      .slice(-API_HISTORY_LIMIT)
      .map(message => ({
        role: message.role,
        content: typeof message.content === 'string'
          ? message.content.slice(-API_MESSAGE_CHAR_LIMIT)
          : message.content,
      })),
    { role: 'user', content: userContent as any },
  ];

  return await chatCompletion(messages, 300);
}
