// Service for handling image-to-music generation through backend

export interface MusicClip {
  id: string;
  status: "submitted" | "queued" | "streaming" | "complete" | "error";
  title?: string;
  audio_url?: string;
  video_url?: string;
  image_url?: string;
  created_at: string;
  metadata?: {
    duration?: number;
    tags?: string;
    prompt?: string;
    error_type?: string;
    error_message?: string;
  };
}

export interface ImageToMusicResponse {
  success: boolean;
  image_description?: string;
  music_generation?: {
    id?: string;
    clips?: Array<{ id: string; status: string; created_at: string }>;
  };
  error?: string;
}

export interface StatusResponse {
  success: boolean;
  clips?: MusicClip[];
  error?: string;
}

export class MusicService {
  private static baseUrl =
    process.env.NODE_ENV === "development" ? "http://localhost:3000" : "";

  /**
   * Generate music from an image file
   * This sends the image to the backend which:
   * 1. Converts image to text description via AWS Bedrock
   * 2. Sends text to Suno API to generate music
   * 3. Returns both the description and music generation details
   */
  static async generateFromImage(
    imageFile: File,
  ): Promise<ImageToMusicResponse> {
    try {
      const formData = new FormData();
      formData.append("files", imageFile);

      const response = await fetch(`${this.baseUrl}/api/generate-from-images`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to generate music from image",
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Generate from image error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Check the status of music generation
   */
  static async checkStatus(clipIds: string[]): Promise<StatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/check-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clipIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to check status");
      }

      return await response.json();
    } catch (error) {
      console.error("Check status error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Poll for completion with automatic retry logic
   */
  static async pollForCompletion(
    clipIds: string[],
    maxAttempts: number = 60, // 5 minutes with 5-second intervals
    interval: number = 5000, // 5 seconds
    onProgress?: (clips: MusicClip[], progress: number) => void,
  ): Promise<MusicClip[]> {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          attempts++;
          const progress = Math.min((attempts / maxAttempts) * 100, 95);

          const statusResponse = await this.checkStatus(clipIds);

          if (!statusResponse.success || !statusResponse.clips) {
            if (attempts >= maxAttempts) {
              reject(new Error("Max polling attempts reached"));
              return;
            }
            setTimeout(poll, interval);
            return;
          }

          const clips = statusResponse.clips;

          // Call progress callback if provided
          if (onProgress) {
            onProgress(clips, progress);
          }

          const completedClips = clips.filter(
            (clip) => clip.status === "complete" && clip.audio_url,
          );
          const errorClips = clips.filter((clip) => clip.status === "error");

          // If we have errors on all clips, reject
          if (errorClips.length === clips.length) {
            reject(
              new Error(
                `All clips failed: ${errorClips
                  .map((c) => c.metadata?.error_message)
                  .join(", ")}`,
              ),
            );
            return;
          }

          // If at least one clip is complete, resolve with all clips
          if (completedClips.length > 0) {
            if (onProgress) {
              onProgress(clips, 100);
            }
            resolve(clips);
            return;
          }

          // If we've exceeded max attempts, reject
          if (attempts >= maxAttempts) {
            reject(new Error("Generation timed out - no clips completed"));
            return;
          }

          // Continue polling
          setTimeout(poll, interval);
        } catch (error) {
          if (attempts >= maxAttempts) {
            reject(error);
            return;
          }
          // Retry on error
          setTimeout(poll, interval);
        }
      };

      poll();
    });
  }

  /**
   * Complete end-to-end flow: Image -> Text -> Music -> Poll for completion
   */
  static async generateMusicFromImage(
    imageFile: File,
    onProgress?: (
      clips: MusicClip[],
      progress: number,
      description?: string,
    ) => void,
  ): Promise<{ clips: MusicClip[]; description: string }> {
    // Step 1: Send image to backend for processing
    const response = await this.generateFromImage(imageFile);

    if (!response.success) {
      throw new Error(
        response.error || "Failed to start music generation from image",
      );
    }

    const description = response.image_description || "";
    const musicData = response.music_generation;

    // Extract clip IDs from the response
    let clipIds: string[] = [];
    if (musicData?.id) {
      // Single clip response
      clipIds = [musicData.id];
    } else if (musicData?.clips && Array.isArray(musicData.clips)) {
      // Multiple clips response
      clipIds = musicData.clips.map((clip: { id: string }) => clip.id);
    } else {
      throw new Error("Invalid music generation response format");
    }

    // Step 2: Poll for completion
    const completedClips = await this.pollForCompletion(
      clipIds,
      60, // maxAttempts
      5000, // interval
      (clips, progress) => {
        if (onProgress) {
          onProgress(clips, progress, description);
        }
      },
    );

    return {
      clips: completedClips,
      description,
    };
  }

  /**
   * Utility function to get current landscape image from public directory
   */
  static async getCurrentLandscapeImage(): Promise<File | null> {
    try {
      const response = await fetch("/testImage2.png");
      if (!response.ok) {
        throw new Error("Failed to fetch landscape image");
      }

      const blob = await response.blob();
      return new File([blob], "landscape.png", { type: "image/png" });
    } catch (err) {
      console.error("Error getting landscape image:", err);
      return null;
    }
  }
}
