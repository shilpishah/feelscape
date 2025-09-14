"use client";

import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  X,
  Music,
  Play,
  Pause,
  Download,
  Image as ImageIcon,
} from "lucide-react";

import { MusicService, MusicClip } from "@/lib/music-service";

interface MusicPopupProps {
  visible: boolean;
  onClose: () => void;
}

const MusicPopup: React.FC<MusicPopupProps> = ({ visible, onClose }) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ offsetX: 0, offsetY: 0, dragging: false });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedClips, setGeneratedClips] = useState<MusicClip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({});
  const [audioElements, setAudioElements] = useState<{
    [key: string]: HTMLAudioElement;
  }>({});
  const [currentTime, setCurrentTime] = useState<{ [key: string]: number }>({});
  const [duration, setDuration] = useState<{ [key: string]: number }>({});
  const [isDownloading, setIsDownloading] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!drag.current.dragging || !popupRef.current) return;
      popupRef.current.style.left = `${e.clientX - drag.current.offsetX}px`;
      popupRef.current.style.top = `${e.clientY - drag.current.offsetY}px`;
    };

    const handleMouseUp = () => (drag.current.dragging = false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    if (!popupRef.current) return;
    const rect = popupRef.current.getBoundingClientRect();
    drag.current.dragging = true;
    drag.current.offsetX = e.clientX - rect.left;
    drag.current.offsetY = e.clientY - rect.top;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedClips([]);
    setError(null);
    setImageDescription("");

    try {
      // Get the current landscape image
      const imageFile = await MusicService.getCurrentLandscapeImage();
      if (!imageFile) {
        throw new Error("Failed to get current landscape image");
      }

      // Generate music from image using the service
      const result = await MusicService.generateMusicFromImage(
        imageFile,
        (clips, progress, description) => {
          if (description) {
            setImageDescription(description);
          }
          setGeneratedClips(clips);
        },
      );

      setGeneratedClips(result.clips);
      setImageDescription(result.description);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      console.error("Music generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayPause = (clip: MusicClip) => {
    if (!clip.audio_url) return;
    const clipId = clip.id;

    if (audioElements[clipId]) {
      if (isPlaying[clipId]) {
        audioElements[clipId].pause();
        setIsPlaying((prev) => ({ ...prev, [clipId]: false }));
      } else {
        Object.keys(audioElements).forEach((id) => {
          if (id !== clipId && isPlaying[id]) audioElements[id].pause();
        });
        audioElements[clipId].play();
        setIsPlaying((prev) => ({ ...prev, [clipId]: true }));
      }
    } else {
      const audio = new Audio(clip.audio_url);
      audio.addEventListener("ended", () =>
        setIsPlaying((prev) => ({ ...prev, [clipId]: false })),
      );
      audio.addEventListener("loadedmetadata", () => {
        if (audio.duration && isFinite(audio.duration))
          setDuration((prev) => ({ ...prev, [clipId]: audio.duration }));
      });
      audio.addEventListener("timeupdate", () =>
        setCurrentTime((prev) => ({ ...prev, [clipId]: audio.currentTime })),
      );
      setAudioElements((prev) => ({ ...prev, [clipId]: audio }));
      audio.play();
      setIsPlaying((prev) => ({ ...prev, [clipId]: true }));
    }
  };

  const handleDownload = async (clip: MusicClip) => {
    if (!clip.audio_url || isDownloading[clip.id]) return;
    setIsDownloading((prev) => ({ ...prev, [clip.id]: true }));

    try {
      const response = await fetch(clip.audio_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${clip.title || "generated-song"}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setIsDownloading((prev) => ({ ...prev, [clip.id]: false }));
    }
  };

  const getProgressPercentage = (clipId: string, clip?: MusicClip) => {
    const pos = currentTime[clipId] || 0;
    const dur = clip
      ? clip.metadata?.duration || duration[clipId]
      : duration[clipId];
    if (!dur || dur <= 0) return 0;
    return Math.min(100, Math.max(0, (pos / dur) * 100));
  };

  return (
    <div
      ref={popupRef}
      onMouseDown={startDrag}
      className="fixed z-[999] w-[380px] max-h-[80vh] flex flex-col rounded-3xl border border-white/20
                backdrop-blur-2xl bg-white/10 bg-gradient-to-br from-white/20 via-white/10 to-pink-200/20
                shadow-xl cursor-grab active:cursor-grabbing overflow-hidden"
      style={{
        top: "120px",
        left: "120px",
        display: visible ? "block" : "none",
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center px-6 pt-4 pb-3 select-none">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-white/90" />
          <h2 className="text-white/90 font-bold text-lg tracking-wide drop-shadow-md">
            Music from Landscape
          </h2>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 rounded-full hover:bg-white/20 transition"
        >
          <X className="w-5 h-5 text-white/80" />
        </button>
      </div>

      {/* Generate Button */}
      <div className="px-6 pb-4 flex flex-col gap-3">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          {isGenerating
            ? "Generating Music..."
            : "Generate Music from Current Scene"}
        </Button>
      </div>

      {/* Generated Clips */}
      <div className="px-6 pb-4 flex flex-col gap-3 overflow-y-auto max-h-[250px]">
        {error && (
          <Card className="p-3 bg-red-500/20 border border-red-400/30">
            <p className="text-red-200 text-sm drop-shadow-md">{error}</p>
          </Card>
        )}

        {generatedClips.map((clip) => (
          <Card
            key={clip.id}
            className="p-3 bg-white/10 border border-white/20 flex flex-col gap-2"
          >
            <div className="flex justify-between">
              <h3 className="text-white/90 font-medium drop-shadow-md">
                {clip.title || "Untitled"}
              </h3>
              <span className="text-white/50 text-xs">
                {clip.metadata?.duration
                  ? `${Math.round(clip.metadata.duration)}s`
                  : ""}
              </span>
            </div>
            {clip.audio_url && (
              <div className="relative h-2 bg-white/20 rounded-full mb-2 cursor-pointer">
                <div
                  className="h-2 bg-white/60 rounded-full"
                  style={{ width: `${getProgressPercentage(clip.id, clip)}%` }}
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={() => togglePlayPause(clip)}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white border border-white/30"
                disabled={!clip.audio_url}
              >
                {isPlaying[clip.id] ? (
                  <>
                    <Pause className="w-4 h-4 mr-1 text-white/90" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1 text-white/90" />
                    Play
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleDownload(clip)}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white border border-white/30"
                disabled={isDownloading[clip.id] || !clip.audio_url}
              >
                {isDownloading[clip.id] ? (
                  "Downloading..."
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-1 text-white/90" />
                    Download
                  </>
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MusicPopup;
