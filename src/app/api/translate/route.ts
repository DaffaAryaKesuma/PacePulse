import { NextRequest, NextResponse } from "next/server";
import { translateCoachingText } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      text?: unknown;
      targetLanguage?: unknown;
    };

    if (typeof body.text !== "string" || !body.text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const targetLanguage: "id" | "en" =
      body.targetLanguage === "en" ? "en" : "id";

    const translatedText = await translateCoachingText(
      body.text.slice(0, 4000),
      targetLanguage
    );

    return NextResponse.json({ translatedText });
  } catch (err) {
    console.error("[POST /api/translate] Error:", err);
    return NextResponse.json(
      { error: "Failed to translate coaching text" },
      { status: 500 }
    );
  }
}
