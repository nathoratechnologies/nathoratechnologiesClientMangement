"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import { useRef } from "react";
import { LogoMark } from "../Logo";
import { SplitText } from "../motion";

export function Hero({ phone, whatsappHref }: { phone: string; whatsappHref: string }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative flex min-h-dvh items-center overflow-hidden pt-28 pb-20">
      {/* backdrop */}
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" aria-hidden="true" />
      <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-navy-700/40 blur-[120px]" aria-hidden="true" />
      <div className="absolute right-[-10%] bottom-[-20%] h-[420px] w-[420px] rounded-full bg-gold-500/10 blur-[110px]" aria-hidden="true" />

      <motion.div style={{ y, opacity: fade }} className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gold-500" />
            </span>
            Web · Mobile Apps · Software · Cloud
          </motion.div>

          <h1 className="font-display text-[2.6rem] leading-[1.05] font-bold tracking-tight sm:text-6xl lg:text-7xl">
            <SplitText text="Guiding your business" delay={0.3} />
            <br />
            <span className="text-gold-gradient">
              <SplitText text="into the digital era" delay={0.55} />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-mist"
          >
            End-to-end IT solutions built with Angular, .NET and Android — from your first website to the custom software
            and cloud systems that run your business.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            <a href="#contact" className="btn-gold group">
              Start your project
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </a>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              <MessageCircle size={18} className="text-[#25D366]" /> WhatsApp us
            </a>
            <a href={`tel:${phone}`} className="btn-ghost">
              <Phone size={18} className="text-gold-400" /> Call now
            </a>
          </motion.div>
        </div>

        {/* animated orbit visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className="relative mx-auto aspect-square w-full max-w-[460px]"
          aria-hidden="true"
        >
          <div className="animate-spin-slow absolute inset-0 rounded-full border border-gold-500/25">
            <span className="absolute top-[-6px] left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-gold-500 shadow-[0_0_20px_4px_rgba(212,162,76,0.6)]" />
          </div>
          <div className="animate-spin-slower absolute inset-[12%] rounded-full border border-dashed border-white/15">
            <span className="absolute bottom-[-5px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white/80" />
          </div>
          <div className="animate-spin-slow absolute inset-[26%] rounded-full border border-white/10" />

          {[
            { t: "Angular", c: "top-[8%] left-[2%]" },
            { t: ".NET", c: "top-[14%] right-[0%]" },
            { t: "Android", c: "bottom-[14%] left-[-2%]" },
            { t: "Cloud", c: "bottom-[6%] right-[6%]" },
          ].map((b, i) => (
            <motion.span
              key={b.t}
              className={`absolute ${b.c} rounded-full border border-white/10 bg-navy-900/80 px-4 py-2 text-sm font-medium text-mist shadow-xl backdrop-blur`}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
            >
              {b.t}
            </motion.span>
          ))}

          <div className="animate-float absolute inset-[30%] flex items-center justify-center">
            <div className="absolute inset-0 rounded-[30%] bg-gold-500/20 blur-3xl" />
            <LogoMark size={210} animate />
          </div>
        </motion.div>
      </motion.div>

      <motion.a
        href="#services"
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs tracking-[0.3em] text-mist/70 uppercase sm:flex"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
      >
        Scroll
        <span className="flex h-9 w-5 justify-center rounded-full border border-white/25 pt-1.5">
          <motion.span className="h-2 w-1 rounded-full bg-gold-500" animate={{ y: [0, 12, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
        </span>
      </motion.a>
    </section>
  );
}
