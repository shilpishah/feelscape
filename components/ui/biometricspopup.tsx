"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, HeartPulse } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

interface BiometricsPopupProps {
  visible: boolean;
  onClose: () => void;
}

interface HRData {
  heart_rate: number;
  latest_emotion?: string | null; // optional, not used
}

const MAX_POINTS = 30; // number of points to show in the chart

const BiometricsPopup: React.FC<BiometricsPopupProps> = ({ visible, onClose }) => {
  const [show, setShow] = useState(visible);
  const [hrHistory, setHrHistory] = useState<{ time: string; hr: number }[]>([]);
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

  // Fetch heart rate
  useEffect(() => {
    if (!visible) return;

    const fetchHR = async () => {
      try {
        const res = await fetch("http://localhost:8000/biometrics");
        const json: HRData = await res.json();
        if (json.status === "ok") {
          const now = new Date();
          setHrHistory(prev => {
            const updated = [...prev, { time: now.toLocaleTimeString(), hr: json.heart_rate }];
            return updated.slice(-MAX_POINTS); // keep last MAX_POINTS
          });
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchHR();
    const interval = setInterval(fetchHR, 3000);
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
            Heart Rate
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

      {/* Heart rate chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hrHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="white/20" />
                <XAxis dataKey="time" stroke="white" />
                <YAxis 
                stroke="white" 
                domain={([dataMin, dataMax]) => [dataMin - 5, dataMax + 5]} 
                />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', color: 'white' }} />
                <Line type="monotone" dataKey="hr" stroke="#f87171" strokeWidth={2} dot={false} />
            </LineChart>
            </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BiometricsPopup;
