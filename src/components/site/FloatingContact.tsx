"use client";

import { motion } from "motion/react";
import { MessageCircle, Phone } from "lucide-react";

/** Sticky call + WhatsApp buttons (bottom bar on phones, floating stack on desktop). */
export function FloatingContact({ phone, whatsappHref }: { phone: string; whatsappHref: string }) {
  return (
    <>
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 1.5, type: "spring", stiffness: 120 }}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-white/10 bg-navy-950/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:hidden"
      >
        <a href={`tel:${phone}`} className="btn-ghost !rounded-xl">
          <Phone size={18} className="text-gold-400" aria-hidden="true" /> Call
        </a>
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#1FAF54] font-semibold text-white">
          <MessageCircle size={18} aria-hidden="true" /> WhatsApp
        </a>
      </motion.div>

      <div className="fixed right-6 bottom-6 z-40 hidden flex-col gap-3 sm:flex">
        <motion.a
          href={`tel:${phone}`}
          aria-label="Call Nathora Technologies"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.6, type: "spring" }}
          whileHover={{ scale: 1.1 }}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-gold-500/40 bg-navy-900 text-gold-400 shadow-2xl"
        >
          <Phone size={22} aria-hidden="true" />
        </motion.a>
        <motion.a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.8, type: "spring" }}
          whileHover={{ scale: 1.1 }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#1FAF54] text-white shadow-2xl"
        >
          <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-30" />
          <MessageCircle size={24} aria-hidden="true" />
        </motion.a>
      </div>
    </>
  );
}
