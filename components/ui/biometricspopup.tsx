"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, HeartPulse } from "lucide-react";

interface BiometricsPopupProps {
  visible: boolean;
  onClose: () => void;
}

interface BiometricsData {
  raw_eeg: number[][];
  processed_eeg: {
    raw_windows: number[][][];
    power_features: number[][];
    statistical_features: number[][];
    combined_features: number[][];
  };
  latest_emotion: string | null;
}

const BiometricsPopup: React.FC<BiometricsPopupProps> = ({ visible, onClose }) => {
  const [show, setShow] = useState(visible);
  const [data, setData] = useState<BiometricsData | null>(null);
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

  // Fetch biometrics every 3 seconds
  useEffect(() => {
    if (!visible) return;
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:8000/biometrics");
        const json = await res.json();
        if (json.status === "ok") setData(json);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
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
      onMouseDown={startDrag}
      style={{ top: "100px", left: "100px", position: "fixed" }}
      className="z-50 p-4 w-96 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-lg cursor-grab active:cursor-grabbing overflow-auto max-h-[70vh]"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3 select-none">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-white/90" />
          <h2 className="text-white/90 font-bold text-lg drop-shadow-md">
            Biometrics Data
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

      {/* Content */}
      <div className="flex flex-col gap-2 text-white/80 text-sm">
        {data ? (
          <>
            <p>
              <strong>Latest Emotion:</strong> {data.latest_emotion || "N/A"}
            </p>
            <p>
              <strong>EEG Channels:</strong> {data.raw_eeg.length} x {data.raw_eeg[0]?.length || 0}
            </p>
            <p>
              <strong>Power Features (first window):</strong>{" "}
              {data.processed_eeg.power_features[0]?.map(f => f.toFixed(2)).join(", ")}
            </p>
            <p>
              <strong>Statistical Features (first window):</strong>{" "}
              {data.processed_eeg.statistical_features[0]?.map(f => f.toFixed(2)).join(", ")}
            </p>
          </>
        ) : (
          <p>Loading biometric data...</p>
        )}
      </div>
    </div>
  );
};

export default BiometricsPopup;
