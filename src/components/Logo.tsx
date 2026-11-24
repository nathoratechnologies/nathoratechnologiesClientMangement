"use client";

import { motion } from "motion/react";

/** Nathora mark: navy tile, white "N" stroke, gold orbit arc and dot. `animate` draws it in. */
export function LogoMark({ size = 40, animate = false }: { size?: number; animate?: boolean }) {
  const draw = animate
    ? { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 } }
    : {};
  return (
    <svg width={size} height={size} viewBox="0 0 260 260" role="img" aria-label="Nathora Technologies logo">
      <rect x="10" y="10" width="240" height="240" rx="60" fill="#14224A" />
      <motion.path
        d="M58 168 A78 78 0 1 1 202 92"
        fill="none"
        stroke="#D4A24C"
        strokeWidth="6"
        strokeLinecap="round"
        style={{ opacity: 0.7 }}
        {...draw}
        transition={{ duration: 1.4, ease: "easeInOut", delay: 0.2 }}
      />
      <motion.path
        d="M85 180 L85 82 L175 180 L175 82"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...draw}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
      <motion.circle
        cx="175"
        cy="58"
        r="11"
        fill="#D4A24C"
        initial={animate ? { scale: 0 } : undefined}
        animate={animate ? { scale: 1 } : undefined}
        transition={{ type: "spring", delay: 1.2, stiffness: 300, damping: 12 }}
      />
    </svg>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark size={size} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-bold tracking-[0.2em] text-white">NATHORA</span>
        <span className="font-display text-[9px] font-semibold tracking-[0.42em] text-gold-500">TECHNOLOGIES</span>
      </span>
    </span>
  );
}
