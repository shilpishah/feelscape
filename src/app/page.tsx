"use client";

import React, { useState } from "react";
import { Compass, Menu } from "lucide-react";

const FeelscapeStart: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLandscape, setShowLandscape] = useState(false);

  const handleGetStarted = () => {
    if (loading) return;
    console.log("Starting Feelscape journey...");
    setLoading(true);

    // Simulate data collection delay
    setTimeout(() => {
      setLoading(false);
      setShowLandscape(true);
    }, 2500);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-900">
      {/* Aurora Background - make sure it doesn't block clicks */}
      {!showLandscape && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 via-blue-800 via-blue-700 via-blue-800 to-slate-900" />
          <div className="absolute inset-0 bg-gradient-radial from-blue-600/40 via-blue-700/30 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-blue-800/20 via-blue-600/10 to-blue-700/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/50 via-blue-700/15 via-transparent via-blue-700/15 to-slate-900/50" />

          {/* Floating particles (pointer-events-none) */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-blue-300 rounded-full opacity-20 animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 20}s`,
                  animationDuration: `${15 + Math.random() * 10}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Loading overlay (blocks interactions while loading) */}
      {loading && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-40 animate-fadeIn"
          role="status"
          aria-busy="true"
        >
          <p className="text-white text-3xl font-light animate-pulse mb-4">
            Loading...
          </p>
          <p className="text-blue-200/80 text-lg tracking-wide">
            Collecting data · Processing signals
          </p>
        </div>
      )}

      {/* Intro Content (hidden when loading or showing landscape) */}
      {!loading && !showLandscape && (
        <div className="relative z-10 flex min-h-screen">
          {/* Left Side - Brand */}
          <div className="flex-1 flex flex-col justify-center px-40">
            <div className="max-w-lg">
              <h1 className="text-6xl md:text-7xl font-bold text-white mb-4 tracking-tight">
                <span className="bg-gradient-to-r from-blue-200 via-blue-300 to-teal-300 bg-clip-text text-transparent">
                  Feelscape
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-blue-100/80 font-light tracking-wide leading-relaxed">
                Navigate your inner landscape
              </p>

              {/* subtle glow behind text (keep behind) */}
              <div className="absolute -z-10 -ml-8 -mt-16 w-96 h-32 bg-blue-500/10 blur-3xl rounded-full" />
            </div>
          </div>

          {/* Right Side - CTA */}
          <div className="flex-1 flex flex-col justify-center items-center px-12 relative">
            <div className="flex flex-col items-center space-y-8 relative">
              {/* Decorative rings: behind the button, pointer-events-none */}
              <div
                className="absolute w-48 h-48 rounded-full border border-blue-300/10 animate-pulse pointer-events-none z-0"
                style={{ transform: "translate(-50%, -50%)", left: "50%", top: "50%" }}
              />
              <div
                className="absolute w-64 h-64 rounded-full border border-teal-300/5 animate-pulse pointer-events-none z-0"
                style={{ transform: "translate(-50%, -50%)", left: "50%", top: "50%", animationDelay: "1s" }}
              />

              {/* Compass Button - ensure it's above everything and clickable */}
              <button
                onClick={handleGetStarted}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                disabled={loading}
                className="group relative z-30 p-8 rounded-full bg-white/5 backdrop-blur-md border border-white/10 
                           hover:bg-white/10 hover:border-white/20 transition-all duration-300 
                           hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Begin Feelscape journey"
                style={{ pointerEvents: loading ? "none" : "auto" }}
              >
                {/* Button glow effect (purely visual, not interactive) */}
                <div
                  aria-hidden
                  className={`absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-teal-400/20 
                              blur-xl transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`}
                />

                <Compass
                  className={`w-16 h-16 text-blue-300 relative z-10 transition-all duration-500 ${
                    isHovered ? "rotate-45 text-blue-200" : ""
                  }`}
                />
              </button>

              {/* CTA Text */}
              <div className="text-center mt-2">
                <p className="text-2xl font-medium text-white mb-2">Begin your journey</p>
                <p className="text-blue-200/60 text-sm">Connect your biometric devices to start</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Landscape placeholder */}
      {showLandscape && (
        <div className="absolute inset-0 bg-gradient-to-br from-pink-200 via-pink-300 to-pink-400 transition-all duration-700 z-20">
          {/* Hamburger Menu (top-right) */}
          <div className="absolute top-4 right-4">
            <button
              className="p-3 rounded-full bg-white/30 backdrop-blur-sm hover:bg-white/50 transition"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Landscape placeholder center */}
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-black mb-2">🌸 Landscape Placeholder</h2>
              <p className="text-black/70">EEG/biometric visualizations will appear here.</p>
            </div>
          </div>
        </div>
      )}

      {/* Global styles for animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes float {
            0%, 100% {
              transform: translateY(0px) translateX(0px);
              opacity: 0.3;
            }
            25% { opacity: 0.7; }
            50% {
              transform: translateY(-120px) translateX(30px);
              opacity: 0.9;
            }
            75% { opacity: 0.6; }
          }
          .animate-float { animation: float linear infinite; }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .animate-fadeIn {
            animation: fadeIn 0.5s ease-in-out forwards;
          }
        `,
        }}
      />
    </div>
  );
};

export default FeelscapeStart;
