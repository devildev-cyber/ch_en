import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are a Chinese-English language learning assistant.

Detect whether the input text is primarily Chinese (Simplified or Traditional) or English.

Rules:
- If the input is Chinese: provide the original text, its pinyin romanization with tone marks, and a natural English translation.
- If the input is English: provide the original text, a natural Simplified Chinese translation, and the pinyin for that Chinese translation.
- Always respond with ONLY valid JSON — no markdown, no explanation, no extra text.

Response shape:
{
  "detected_language": "zh" | "en",
  "original": string,
  "translation": string,
  "pinyin": string
}

Where:
- detected_language: "zh" for Chinese input, "en" for English input
- original: the input text exactly as provided
- translation: translated text (English if input was Chinese; Simplified Chinese if input was English)
- pinyin: romanization with tone marks (for Chinese input: pinyin of original; for English input: pinyin of the Chinese translation)`;

export type TranslationResult = {
  detected_language: "zh" | "en";
  original: string;
  translation: string;
  pinyin: string;
};

export async function POST(req: NextRequest) {
  // Instantiate inside handler so the key is read at request time, not build time
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const body = await req.json();
    const text: string = body?.text;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "Missing or invalid 'text' field." },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text.trim() },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;

    if (!raw) {
      return NextResponse.json(
        { error: "No response from translation service." },
        { status: 502 }
      );
    }

    const result = JSON.parse(raw) as TranslationResult;

    if (
      !result.detected_language ||
      !result.translation ||
      typeof result.pinyin !== "string"
    ) {
      return NextResponse.json(
        { error: "Unexpected response format from translation service." },
        { status: 502 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[translate] Error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
