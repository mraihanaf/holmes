import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const STAGES = [
  { at: 0, text: "ESTABLISHING SECURE CONNECTION…" },
  { at: 18, text: "INITIALIZING FEEDS…" },
  { at: 38, text: "LOADING NASA POWER CATALOG…" },
  { at: 58, text: "CALIBRATING SENSORS…" },
  { at: 78, text: "RENDERING CITY BOARD…" },
  { at: 94, text: "SYSTEM READY" },
];

export function Splash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [progress, setProgress] = useState(16);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (ready) return Math.min(100, current + 14);
        return Math.min(90, current + 3);
      });
    }, 90);
    return () => window.clearInterval(timer);
  }, [ready]);

  useEffect(() => {
    if (progress < 100) return;
    setExiting(true);
    const timer = window.setTimeout(onDone, 560);
    return () => window.clearTimeout(timer);
  }, [progress, onDone]);

  // Safety net: never hold the app hostage.
  useEffect(() => {
    const timer = window.setTimeout(onDone, 6000);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  const stage = [...STAGES].reverse().find((item) => progress >= item.at) ?? STAGES[0];

  return (
    <motion.div
      className="splash overflow-hidden"
      animate={exiting ? { opacity: 0, scale: 1.04 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0 crt-scanlines" style={{ opacity: 0.18 }} />
      <div className="relative flex flex-col items-center">
        <div className="relative flex h-[280px] w-[280px] items-center justify-center">
          <div className="splash-ring splash-ring--outer" />
          <div className="splash-ring splash-ring--inner" />
          <div className="splash-orbit" />
          <div className="splash-core" />
          <div className="absolute h-[1px] w-[340px] bg-gradient-to-r from-transparent via-[rgba(77,149,216,0.25)] to-transparent" />
          <div className="absolute h-[340px] w-[1px] bg-gradient-to-b from-transparent via-[rgba(77,149,216,0.25)] to-transparent" />
        </div>
        <div className="mt-2 w-[min(420px,80vw)] text-center">
          <div className="hud-title text-[22px] tracking-[0.32em] text-[var(--text)]">HOLMES</div>
          <div className="hud-label mt-1">EARTH SYSTEM DETECTIVE · NASA SPACE APPS 2026</div>
          <div className="mt-6 progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between font-mono text-[9px] tracking-[0.08em] text-[var(--text-muted)]">
            <span>{stage.text}</span>
            <span className="text-[var(--accent)]">{Math.round(progress)}%</span>
          </div>
          <div className="mt-8 font-mono text-[8px] leading-relaxed tracking-[0.18em] text-[var(--text-muted)]">
            NASA POWER · MERRA-2 · CERES · MODIS · FIRMS · GIBS
            <br />
            SEARCH A CITY TO BEGIN
          </div>
        </div>
      </div>
      <div className="absolute left-4 top-4 font-mono text-[8px] tracking-[0.16em] text-[var(--text-muted)]">
        HOLMES OS · v0.1.0
      </div>
      <div className="absolute right-4 top-4 font-mono text-[8px] tracking-[0.16em] text-[var(--text-muted)]">
        {new Date().toISOString().slice(0, 10)}
      </div>
    </motion.div>
  );
}
