"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { Logo } from "../Logo";

const links = [
  { href: "#services", label: "Services" },
  { href: "#work", label: "Our work" },
  { href: "#process", label: "Process" },
  { href: "#why", label: "Why us" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

export function Navbar({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled ? "border-b border-white/10 bg-navy-950/75 py-3 backdrop-blur-xl" : "py-5"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Main">
        <Link href="/" aria-label="Nathora Technologies home">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="group relative text-sm font-medium text-mist transition hover:text-white">
                {l.label}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-gold-500 transition-all duration-300 group-hover:w-full" />
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 lg:flex">
          {signedIn ? (
            <Link href="/dashboard" className="btn-gold !py-2.5 text-sm">
              My dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost !py-2.5 text-sm">
                Sign in
              </Link>
              <a href="#contact" className="btn-gold !py-2.5 text-sm">
                Get a quote
              </a>
            </>
          )}
        </div>

        <button
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/10 bg-navy-950/95 backdrop-blur-xl lg:hidden"
          >
            <ul className="flex flex-col gap-1 px-5 py-4">
              {links.map((l, i) => (
                <motion.li key={l.href} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
                  <a href={l.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-base text-mist hover:bg-white/5 hover:text-white">
                    {l.label}
                  </a>
                </motion.li>
              ))}
              <li className="mt-3 grid grid-cols-2 gap-3">
                {signedIn ? (
                  <Link href="/dashboard" className="btn-gold col-span-2">
                    My dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="btn-ghost">
                      Sign in
                    </Link>
                    <Link href="/register" className="btn-gold">
                      Create account
                    </Link>
                  </>
                )}
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
