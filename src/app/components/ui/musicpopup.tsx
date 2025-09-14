"use client";

import React, { useState } from "react";
import { Button } from "./button";
import { Textarea } from "./textarea";
import { Card } from "./card";
import { Download, Music, Sparkles, Play, Pause } from "lucide-react";
import { SunoService, SunoClip } from "@/lib/suno-service";

interface MusicPopupProps {
  onClose: () => void;
}

const MusicPopup: React.FC<MusicPopupProps> = ({ onClose }) => {
  const [prompt, setPrompt] = useState("");
  const [tags, setTags] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [generatedClips, setGeneratedClips] = useState<SunoClip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({});
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [currentTime, setCurrentTime] = useState<{ [key: string]: number }>({});
  const [duration, setDuration] = useState<{ [key: string]: number }>({});
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ [key: string]: number | undefined }>({});
  const [isDownloading, setIsDownloading] = useState<{ [key: string]: boolean }>({});

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setIsComplete(false);
    setGeneratedClips([]);
    setError(null);

    try {
      const clips = await SunoService.generateAndWaitForCompletion(
        { prompt: prompt.trim(), tags: tags.trim() || undefined, makeInstrumental: false },
        (clips) => {
          if (clips && clips.length > 0) setGeneratedClips(clips);
        }
      );

      setGeneratedClips(clips);
      setIsComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayPause = (clip: SunoClip) => {
    if (!clip.audio_url) return;
    const clipId = clip.id;

    const audio = audioElements[clipId] || new Audio(clip.audio_url);

    if (!audioElements[clipId]) {
      audio.addEventListener("ended", () => setIsPlaying((prev) => ({ ...prev, [clipId]: false })));
      audio.addEventListener("loadedmetadata", () => {
        if (audio.duration && isFinite(audio.duration)) setDuration((prev) => ({ ...prev, [clipId]: audio.duration }));
      });
      audio.addEventListener("timeupdate", () => {
        if (!isDragging || isDragging !== clipId) {
          setCurrentTime((prev) => ({ ...prev, [clipId]: audio.currentTime }));
        }
      });
      setAudioElements((prev) => ({ ...prev, [clipId]: audio }));
    }

    // Pause all others
    Object.keys(audioElements).forEach((id) => {
      if (id !== clipId && isPlaying[id]) {
        audioElements[id]?.pause();
        setIsPlaying((prev) => ({ ...prev, [id]: false }));
      }
    });

    if (isPlaying[clipId]) audio.pause();
    else audio.play();

    setIsPlaying((prev) => ({ ...prev, [clipId]: !isPlaying[clipId] }));
  };

  const handleDownload = async (clip: SunoClip) => {
    if (!clip.audio_url || isDownloading[clip.id]) return;
    setIsDownloading((prev) => ({ ...prev, [clip.id]: true }));
    try {
      const response = await fetch(clip.audio_url);
      if (!response.ok) throw new Error("Failed to fetch audio");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${clip.title || "generated-song"}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDownloading((prev) => ({ ...prev, [clip.id]: false }));
    }
  };

  const getClipDuration = (clip: SunoClip) => duration[clip.id] || clip.metadata.duration || 0;
  const getDisplayPosition = (clipId: string) => (isDragging === clipId && dragPosition[clipId] !== undefined ? dragPosition[clipId]! : currentTime[clipId] || 0);
  const getProgressPercentage = (clipId: string, clip?: SunoClip) => {
    const position = getDisplayPosition(clipId);
    const clipDuration = clip ? getClipDuration(clip) : duration[clipId];
    if (!clipDuration || !isFinite(clipDuration) || clipDuration <= 0) return 0;
    return Math.min(100, Math.max(0, (position / clipDuration) * 100));
  };

  const handleSeek = (clip: SunoClip, seekTime: number) => {
    const audio = audioElements[clip.id];
    if (audio) audio.currentTime = seekTime;
    setCurrentTime((prev) => ({ ...prev, [clip.id]: seekTime }));
  };

  const handleTrackClick = (clip: SunoClip, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPos = (e.clientX - rect.left) / rect.width;
    const seekTime = clickPos * getClipDuration(clip);
    handleSeek(clip, seekTime);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time) || !isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 font-bold">
          ✕
        </button>
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-4">
          <Music /> AI Music Generator
        </h2>

        <div className="space-y-4">
          <Textarea
            placeholder="Describe your song..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full min-h-[100px]"
          />
          <Textarea
            placeholder="Style tags (optional)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full min-h-[60px]"
          />
          <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="w-full">
            {isGenerating ? "Generating..." : "Generate Song"}
          </Button>
        </div>

        {error && <p className="text-red-600 mt-2">{error}</p>}

        {generatedClips.length > 0 && (
          <div className="mt-6 space-y-4">
            {generatedClips.map((clip) => (
              <Card key={clip.id} className="p-4">
                <h3 className="font-semibold">{clip.title || "Untitled Song"}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <Button size="sm" onClick={() => togglePlayPause(clip)}>
                    {isPlaying[clip.id] ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                    {isPlaying[clip.id] ? "Pause" : "Play"}
                  </Button>
                  <Button size="sm" onClick={() => handleDownload(clip)} disabled={isDownloading[clip.id]}>
                    <Download className="w-4 h-4 mr-1" /> Download
                  </Button>
                </div>

                <div
                  className="relative h-2 bg-gray-200 rounded mt-2 cursor-pointer"
                  onClick={(e) => handleTrackClick(clip, e)}
                >
                  <div
                    className="absolute h-2 bg-orange-500 rounded"
                    style={{ width: `${getProgressPercentage(clip.id, clip)}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs mt-1">
                  <span>{formatTime(getDisplayPosition(clip.id))}</span>
                  <span>{formatTime(getClipDuration(clip))}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicPopup;
