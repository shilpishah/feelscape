"use client";

import React, { useState } from "react";
import {
  Compass,
  Menu,
  X,
  Brain,
  HeartPulse,
  Puzzle,
  Music,
  HelpCircle,
} from "lucide-react";
import MusicPopup from "../components/ui/MusicPopup";
import MoodPopup from "../components/ui/moodpopup";
import BiometricsPopup from "../components/ui/biometricspopup";
import HelpPopup from "../components/ui/helppopup";


const FeelscapeStart: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLandscape, setShowLandscape] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMoodPopup, setShowMoodPopup] = useState(false);
  const [showBiometricsPopup, setShowBiometricsPopup] = useState(false);
  const [showMusicPopup, setShowMusicPopup] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);

  const handleGetStarted = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowLandscape(true);
    }, 6000);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-900">
      {/* Aurora Background */}
      {!showLandscape && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 via-blue-800 via-blue-700 via-blue-800 to-slate-900" />
          <div className="absolute inset-0 bg-gradient-radial from-blue-600/40 via-blue-700/30 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-blue-800/20 via-blue-600/10 to-blue-700/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/50 via-blue-700/15 via-transparent via-blue-700/15 to-slate-900/50" />
          <ParticleField />
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-40 animate-fadeIn">
          <div className="relative w-16 h-16 mb-6">
            {/* Dot 1 */}
            <div className="absolute w-4 h-4 bg-blue-400 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-orbit1" />
            {/* Dot 2 */}
            <div className="absolute w-4 h-4 bg-teal-400 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-orbit2" />
            {/* Dot 3 */}
            <div className="absolute w-4 h-4 bg-indigo-400 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-orbit3" />
          </div>
          <TypingText />
        </div>
      )}

      {/* Intro screen */}
      {!loading && !showLandscape && (
        <div className="relative z-10 flex min-h-screen">
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
              <div className="absolute -z-10 -ml-8 -mt-16 w-96 h-32 bg-blue-500/10 blur-3xl rounded-full" />
            </div>
          </div>

          {/* Right Side */}
          <div className="flex-1 flex flex-col justify-center items-center px-12 relative">
            <div className="flex flex-col items-center space-y-8 relative">
              <div
                className="absolute w-48 h-48 rounded-full border border-blue-300/10 animate-pulse pointer-events-none z-0"
                style={{
                  transform: "translate(-50%, -50%)",
                  left: "50%",
                  top: "50%",
                }}
              />
              <div
                className="absolute w-64 h-64 rounded-full border border-teal-300/5 animate-pulse pointer-events-none z-0"
                style={{
                  transform: "translate(-50%, -50%)",
                  left: "50%",
                  top: "50%",
                  animationDelay: "1s",
                }}
              />
              <button
                onClick={handleGetStarted}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                disabled={loading}
                className="group relative z-30 p-8 rounded-full bg-white/5 backdrop-blur-md border border-white/10
                           hover:bg-white/10 hover:border-white/20 transition-all duration-300
                           hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <div
                  aria-hidden
                  className={`absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-teal-400/20
                              blur-xl transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`}
                />
                <Compass
                  className={`w-16 h-16 text-blue-300 relative z-10 transition-all duration-500 ${isHovered ? "rotate-45 text-blue-200" : ""}`}
                />
              </button>
              <div className="text-center mt-2">
                <p className="text-2xl font-medium text-white mb-2">
                  Begin your journey
                </p>
                <p className="text-blue-200/60 text-sm">
                  Connect your biometric devices to start
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Landscape */}
      {showLandscape && (
        <div
          className="absolute inset-0 z-20 animate-fadeIn"
          style={{
            backgroundImage: "url('/positive_5.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Menu */}
          <div className="absolute top-4 right-4 z-50 flex flex-col items-end space-y-3">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30
                        hover:bg-white/30 hover:scale-110 transition-all duration-300
                        hover:shadow-lg hover:shadow-white/25 flex items-center justify-center"
            >
              {menuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </button>

            {/* Dropdown menu */}
            <div
              className={`flex flex-col items-center space-y-3 transition-transform transition-opacity duration-300 ease-out origin-top-right ${
                menuOpen
                  ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 scale-95 -translate-y-4 pointer-events-none"
              }`}
            >
              <MenuIcon icon={Brain} label="Mood" onClick={() => setShowMoodPopup(true)} />
              <MenuIcon icon={HeartPulse} label="Biometrics" onClick={() => setShowBiometricsPopup(true)} />
              <MenuIcon icon={Puzzle} label="Insights" />
              <MenuIcon icon={Music} label="Music" onClick={() => setShowMusicPopup(true)} />
              <MenuIcon icon={HelpCircle} label="Help" onClick={() => setShowHelpPopup(true)} />
            </div>
          </div>
        </div>
      )}

      {/* POPUP */}
      <MoodPopup visible={showMoodPopup} onClose={() => setShowMoodPopup(false)} />
      <BiometricsPopup visible={showBiometricsPopup} onClose={() => setShowBiometricsPopup(false)} />
      <MusicPopup visible={showMusicPopup} onClose={() => setShowMusicPopup(false)} />
      <HelpPopup visible={showHelpPopup} onClose={() => setShowHelpPopup(false)} />

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes orbit1 {
            0%   { transform: rotate(0deg) translateX(24px) rotate(0deg); }
            100% { transform: rotate(360deg) translateX(24px) rotate(-360deg); }
          }
          @keyframes orbit2 {
            0%   { transform: rotate(120deg) translateX(24px) rotate(-120deg); }
            100% { transform: rotate(480deg) translateX(24px) rotate(-480deg); }
          }
          @keyframes orbit3 {
            0%   { transform: rotate(240deg) translateX(24px) rotate(-240deg); }
            100% { transform: rotate(600deg) translateX(24px) rotate(-600deg); }
          }

          .animate-orbit1 { animation: orbit1 1.5s linear infinite; }
          .animate-orbit2 { animation: orbit2 1.5s linear infinite; }
          .animate-orbit3 { animation: orbit3 1.5s linear infinite; }

          @keyframes float {
            0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
            25% { opacity: 0.7; }
            50% { transform: translateY(-120px) translateX(30px); opacity: 0.9; }
            75% { opacity: 0.6; }
          }
          .animate-float { animation: float linear infinite; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          .animate-fadeIn { animation: fadeIn 0.5s ease-in-out forwards; }
        `,
        }}
      />
    </div>
  );
};

const ParticleField: React.FC = React.memo(() => {
  const particles = React.useMemo(
    () =>
      [...Array(50)].map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${10 + Math.random() * 5}s`,
      })),
    [],
  );

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-1 h-1 bg-blue-300 rounded-full opacity-20 animate-float"
          style={{
            left: p.left,
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
});

ParticleField.displayName = "ParticleField";

const TypingText: React.FC = () => {
  const phrases = ["Collecting data...", "Processing signals..."];
  const [displayed, setDisplayed] = React.useState("");
  const [index, setIndex] = React.useState(0);
  const [subIndex, setSubIndex] = React.useState(0);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    const currentPhrase = phrases[index];
    let timeout: NodeJS.Timeout;

    if (!deleting && subIndex < currentPhrase.length)
      timeout = setTimeout(() => setSubIndex((s) => s + 1), 70);
    else if (deleting && subIndex > 0)
      timeout = setTimeout(() => setSubIndex((s) => s - 1), 40);
    else if (!deleting && subIndex === currentPhrase.length)
      timeout = setTimeout(() => setDeleting(true), 1200);
    else if (deleting && subIndex === 0) {
      setDeleting(false);
      setIndex((prev) => (prev + 1) % phrases.length);
    }

    setDisplayed(currentPhrase.substring(0, subIndex));
    return () => clearTimeout(timeout);
  }, [subIndex, deleting, index]);

  return (
    <p className="text-blue-200/80 text-lg tracking-wide font-mono">
      {displayed}
      <span className="inline-block w-1 bg-blue-200 ml-0.5 animate-pulse" />
    </p>
  );
};

const MenuIcon: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}> = ({ icon: Icon, label, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="p-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30
                   hover:bg-white/30 hover:scale-110 transition-all duration-300
                   hover:shadow-lg hover:shadow-white/25"
      >
        <Icon className="w-5 h-5 text-white" />
      </button>
      <div
        className={`absolute top-1/2 right-full mr-3 transform -translate-y-1/2
                      bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1
                      rounded-lg whitespace-nowrap transition-all duration-200 ${
                        isHovered
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 translate-x-2 pointer-events-none"
                      }`}
      >
        {label}
      </div>
    </div>
  );
};

export default FeelscapeStart;
