"use client";

import React from "react";
import { X } from "lucide-react";

interface HelpPopupProps {
  visible: boolean;
  onClose: () => void;
}

const HelpPopup: React.FC<HelpPopupProps> = ({ visible, onClose }) => {
  // ----------------------------
  // ✅ Hooks declared unconditionally
  // ----------------------------
  const popupRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef({ offsetX: 0, offsetY: 0, dragging: false });

  // ----------------------------
  // Drag handlers
  // ----------------------------
  const handleMouseMove = (e: MouseEvent) => {
    if (!drag.current.dragging || !popupRef.current) return;
    popupRef.current.style.left = `${e.clientX - drag.current.offsetX}px`;
    popupRef.current.style.top = `${e.clientY - drag.current.offsetY}px`;
  };

  const handleMouseUp = () => {
    drag.current.dragging = false;
  };

  const startDrag = (e: React.MouseEvent) => {
    if (!popupRef.current) return;
    const rect = popupRef.current.getBoundingClientRect();
    drag.current.dragging = true;
    drag.current.offsetX = e.clientX - rect.left;
    drag.current.offsetY = e.clientY - rect.top;
  };

  // ----------------------------
  // Effect for event listeners
  // ----------------------------
  React.useEffect(() => {
    if (!visible) return; // only attach when visible

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [visible]);

  // ----------------------------
  // Conditional render AFTER hooks
  // ----------------------------
  if (!visible) return null;

  return (
    <div
      ref={popupRef}
      onMouseDown={startDrag}
      className="fixed z-[999] w-[380px] max-h-[80vh] flex flex-col rounded-3xl border border-white/20
                 backdrop-blur-2xl bg-white/10 bg-gradient-to-br from-white/20 via-white/10 to-pink-200/20
                 shadow-xl cursor-grab active:cursor-grabbing overflow-hidden"
      style={{ top: "120px", left: "120px" }}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-white/10">
        <h3 className="text-white font-semibold text-lg">Help</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto text-white text-sm">
        <p>Welcome to Feelscape! Here's how to navigate your experience:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Use the buttons in the top-right menu to open Mood, Biometrics, Music, and Insights.</li>
          <li>Drag any popup around to reposition it on your screen.</li>
          <li>Biometric data updates in real-time, reflecting your EEG and heart rate.</li>
          <li>Click "Begin your journey" to start exploring your inner landscape.</li>
        </ul>
      </div>
    </div>
  );
};

export default HelpPopup;
