import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { prompt, tags, makeInstrumental } = await request.json();

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const apiKey = process.env.SUNO_API_KEY;
    if (!apiKey) {
      console.error("SUNO_API_KEY not found in environment variables");
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    // Step 1: Start clip generation
    const startResponse = await fetch(
      "https://studio-api.prod.suno.com/api/v2/external/hackmit/generate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: prompt,
          tags: tags || undefined,
          make_instrumental: makeInstrumental || false,
        }),
      }
    );

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      console.error("Suno API generation error:", errorText);
      return NextResponse.json({ error: "Failed to start song generation" }, { status: startResponse.status });
    }

    const clip = await startResponse.json();
    if (!clip || !clip.id) {
      console.error("Invalid response format:", clip);
      return NextResponse.json({ error: "Invalid response from Suno API" }, { status: 500 });
    }

    const clipId = clip.id;

    // Step 2: Poll until the clip is ready
    let retries = 30;
    let finishedClip = clip;

    while (retries-- > 0) {
      const statusResp = await fetch(
        `https://studio-api.prod.suno.com/api/v2/external/hackmit/clip/${clipId}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        }
      );

      if (!statusResp.ok) {
        console.error("Error fetching clip status:", await statusResp.text());
        break;
      }

      finishedClip = await statusResp.json();

      if (finishedClip.status === "complete" && finishedClip.audio_url) {
        break; // clip ready
      }

      await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2s
    }

    if (!finishedClip.audio_url) {
      return NextResponse.json({ error: "Clip not ready" }, { status: 500 });
    }

    // Step 3: Return full clip info
    return NextResponse.json({
      success: true,
      clips: [
        {
          id: finishedClip.id,
          title: finishedClip.title || "Generated Song",
          status: finishedClip.status,
          audio_url: finishedClip.audio_url,
          metadata: finishedClip.metadata || {},
          created_at: finishedClip.created_at,
        },
      ],
    });
  } catch (error) {
    console.error("Generate music error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
