"use client";

import React, { useEffect, useState, useRef } from "react";
import { Brain, X } from "lucide-react";

interface MoodPopupProps {
  visible: boolean;
  onClose: () => void;
}

const MoodPopup: React.FC<MoodPopupProps> = ({ visible, onClose }) => {
  const [show, setShow] = useState(visible);
  const [emotion, setEmotion] = useState<string>(""); // store fetched emotion
  const popupRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ offsetX: 0, offsetY: 0, dragging: false });

  // Fade in/out
  useEffect(() => {
    if (visible) setShow(true);
    else {
      const timeout = setTimeout(() => setShow(false), 250);
      return () => clearTimeout(timeout);
    }
  }, [visible]);

  // Fetch the latest emotion from the server
  useEffect(() => {
    if (!visible) return;

    const fetchEmotion = async () => {
      try {
        const res = await fetch("http://localhost:8000/emotion");
        if (!res.ok) throw new Error("Failed to fetch emotion");
        const data = await res.json();
        setEmotion(data.emotion); // assumes { emotion: "Happy" }
      } catch (err) {
        console.error(err);
        setEmotion("Unknown");
      }
    };

    fetchEmotion();
    const interval = setInterval(fetchEmotion, 3000); // refresh every 3s
    return () => clearInterval(interval);
  }, [visible]);

  // Drag logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!drag.current.dragging || !popupRef.current) return;
      popupRef.current.style.left = `${e.clientX - drag.current.offsetX}px`;
      popupRef.current.style.top = `${e.clientY - drag.current.offsetY}px`;
    };

    const handleMouseUp = () => {
      drag.current.dragging = false;
      document.body.style.userSelect = "";
    };

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
    document.body.style.userSelect = "none";
  };

  if (!show) return null;

  return (
    <div
      ref={popupRef}
      style={{ top: "100px", left: "100px", position: "fixed" }}
      className={`z-50 p-4 w-64 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-lg
                  ${visible ? "opacity-100" : "opacity-0"} transition-opacity duration-250`}
    >
      {/* Header (draggable) */}
      <div
        className="flex justify-between items-center mb-3 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={startDrag}
      >
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-white/90" />
          <h2 className="text-white/90 font-bold text-lg drop-shadow-md">
            Currently feeling...
          </h2>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 rounded-full hover:bg-white/20 transition"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Emotion display */}
      <div className="flex justify-center items-center h-20">
        <span className="text-white/90 font-semibold text-xl drop-shadow-md">
          {emotion || "Loading..."}
        </span>
      </div>
    </div>
  );
};

export default MoodPopup;
