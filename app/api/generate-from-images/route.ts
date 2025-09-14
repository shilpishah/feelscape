import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const PYTHON_SERVER_URL =
  process.env.PYTHON_SERVER_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    // Parse the multipart form data from the request
    const formData = await req.formData();

    // Create a new FormData object to forward to the Python server
    const pythonFormData = new FormData();

    let hasImages = false;

    // Process all uploaded files
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        // Validate that it's an image file
        if (!value.type.startsWith('image/')) {
          return NextResponse.json(
            {
              success: false,
              error: `File '${value.name}' is not a valid image. Please upload only images.`,
            },
            { status: 400 }
          );
        }

        // Add the file to the form data for the Python server
        pythonFormData.append('files', value, value.name);
        hasImages = true;
      }
    }

    if (!hasImages) {
      return NextResponse.json(
        {
          success: false,
          error: "No image files were uploaded.",
        },
        { status: 400 }
      );
    }

    // Forward the request to the Python FastAPI server
    const response = await fetch(`${PYTHON_SERVER_URL}/generate-from-images/`, {
      method: "POST",
      body: pythonFormData,
      // Don't set Content-Type header - let fetch set it automatically for multipart/form-data
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Python server error:", errorText);

      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorText;
      } catch {
        errorMessage = errorText;
      }

      return NextResponse.json(
        {
          success: false,
          error: `Image processing failed: ${errorMessage}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      image_description: data.image_description_prompt,
      music_generation: data.music_generation_details,
    });

  } catch (err) {
    console.error("Error processing images:", err);

    // Handle specific error types
    if (err instanceof Error) {
      if (err.message.includes('fetch')) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot connect to image processing server. Please ensure the Python server is running.",
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error occurred while processing images",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Image to Music Generation API",
    description: "POST images to this endpoint to generate music based on their emotional content",
    python_server: PYTHON_SERVER_URL,
  });
}
