import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PYTHON_SERVER_URL =
  process.env.PYTHON_SERVER_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Forward the request to the uvicorn server
    const response = await fetch(`${PYTHON_SERVER_URL}/generate-from-images/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Python server error:", errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Python server returned ${response.status}: ${errorText}`,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Error connecting to Python server:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to connect to Python server",
      },
      { status: 500 },
    );
  }
}

// Add a GET endpoint to check if the Python server is running
export async function GET() {
  try {
    const response = await fetch(`${PYTHON_SERVER_URL}/docs`);
    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: "Python server is running",
        server_url: PYTHON_SERVER_URL,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "Python server is not responding properly",
      });
    }
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: "Cannot connect to Python server",
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
