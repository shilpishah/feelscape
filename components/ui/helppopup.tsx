"use client";

import React, { useRef, useEffect } from "react";
import { X, HelpCircle } from "lucide-react";

interface HelpPopupProps {
  visible: boolean;
  onClose: () => void;
}

const HelpPopup: React.FC<HelpPopupProps> = ({ visible, onClose }) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ offsetX: 0, offsetY: 0, dragging: false });

  const handleMouseMove = (e: MouseEvent) => {
    if (!drag.current.dragging || !popupRef.current) return;
    popupRef.current.style.left = `${e.clientX - drag.current.offsetX}px`;
    popupRef.current.style.top = `${e.clientY - drag.current.offsetY}px`;
  };

  const handleMouseUp = () => {
    drag.current.dragging = false;
  };

  useEffect(() => {
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

  // Only conditionally render JSX
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
      <div className="flex justify-between items-center px-6 pt-4 pb-3 select-none">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-white/90" />
          <h2 className="text-white/90 font-bold text-lg drop-shadow-md">
            Help & Instructions
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
      <div className="px-6 pb-4 flex flex-col gap-3 overflow-y-auto max-h-[250px]">
        <p className="text-white/90 text-sm leading-relaxed">
          Welcome to Feelscape! Here’s how to navigate and use the app:
        </p>
        <ul className="text-white/80 text-sm list-disc list-inside space-y-1">
          <li>Use the Mood button to view detected emotions in real-time.</li>
          {/* <li>Use the Biometrics button to view detailed EEG, HR, and breathing metrics.</li> */}
          <li>Use the Music button to play ambient tracks based on your mood.</li>
          <li>Close any popup by clicking the X in the top-right corner or drag them around freely.</li>
        </ul>
        <p className="text-white/60 text-xs mt-2">Tip: Keep your device connected for accurate readings.</p>
      </div>
    </div>
  );
};

export default HelpPopup;
