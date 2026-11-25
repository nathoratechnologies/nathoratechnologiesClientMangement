"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import {
  Globe,
  Smartphone,
  Code2,
  Cloud,
  Palette,
  Wrench,
  Search,
  PenTool,
  Rocket,
  LifeBuoy,
  ShieldCheck,
  Zap,
  Users,
  MessagesSquare,
  Plus,
  Check,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { PROJECTS } from "@/lib/site";
import { Reveal, SpotlightCard, Stagger, StaggerItem } from "../motion";

function Heading({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <Reveal className="mx-auto mb-14 max-w-2xl text-center">
      <p className="mb-3 text-xs font-semibold tracking-[0.35em] text-gold-500 uppercase">{eyebrow}</p>
      <h2 className="font-display text-3xl leading-tight font-bold sm:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-lg text-mist">{sub}</p>}
    </Reveal>
  );
}

const services = [
  { icon: Globe, title: "Website Development", text: "Fast, responsive business websites and web apps built with Angular and modern frameworks — designed to convert visitors into customers." },
  { icon: Smartphone, title: "Mobile Apps", text: "Native Android and cross-platform apps that feel at home on every phone, from booking apps to field-team tools." },
  { icon: Code2, title: "Custom Software", text: "ERP, billing, inventory and internal tools on .NET, shaped around how your business actually works." },
  { icon: Cloud, title: "Cloud & DevOps", text: "Hosting, migration, CI/CD and secure, scalable infrastructure so your systems stay online and fast." },
  { icon: Palette, title: "UI / UX Design", text: "Clean, accessible interfaces and brand-consistent design systems, prototyped before a line of code." },
  { icon: Wrench, title: "Maintenance & Support", text: "Updates, monitoring, bug fixes and new features after launch — a team that stays with you." },
];

export function Services() {
  return (
    <section id="services" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Heading
          eyebrow="What we do"
          title={<>Everything your business needs <span className="text-gold-gradient">to go digital</span></>}
          sub="One partner for design, development, launch and long-term support."
        />
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <StaggerItem key={s.title}>
              <SpotlightCard className="group h-full p-7">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-500/30 bg-gold-500/10 text-gold-400 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-gold-500 group-hover:text-navy-950">
                  <s.icon size={26} aria-hidden="true" />
                </div>
                <h3 className="font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-mist">{s.text}</p>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function Projects() {
  return (
    <section id="work" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Heading
          eyebrow="Our work"
          title={<>Projects we&apos;ve <span className="text-gold-gradient">built and launched</span></>}
          sub="Real products, live today and used by real customers."
        />
        <Stagger className="grid gap-6 lg:grid-cols-2">
          {PROJECTS.map((p) => (
            <StaggerItem key={p.name}>
              <SpotlightCard className="group flex h-full flex-col overflow-hidden">
                <div className={`relative flex h-56 items-center justify-center overflow-hidden bg-gradient-to-br ${p.logoBg}`}>
                  <Image
                    src={p.logo}
                    alt={`${p.name} logo`}
                    width={176}
                    height={176}
                    className="h-44 w-44 rounded-3xl object-cover shadow-2xl transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-7">
                  <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase">{p.type}</p>
                  <h3 className="font-display mt-2 text-2xl font-semibold">
                    {p.name} <span className="text-lg font-normal text-mist">· {p.localName}</span>
                  </h3>
                  <p className="mt-3 leading-relaxed text-mist">{p.description}</p>
                  <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-white/85">
                        <Check size={16} className="mt-0.5 shrink-0 text-gold-400" aria-hidden="true" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <ul className="mt-5 flex flex-wrap gap-2" aria-label="Technologies">
                    {p.tech.map((t) => (
                      <li key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-mist">
                        {t}
                      </li>
                    ))}
                  </ul>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn-gold mt-7 self-start !py-2.5 text-sm">
                    Visit live site <ExternalLink size={16} aria-hidden="true" />
                  </a>
                </div>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

const tech = ["Angular", ".NET", "C#", "Android", "Kotlin", "React", "Next.js", "Node.js", "TypeScript", "SQL Server", "PostgreSQL", "Azure", "AWS", "Firebase", "Docker", "Figma"];

export function TechMarquee() {
  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-navy-900/50 py-10" aria-label="Technologies we use">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-navy-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-navy-950 to-transparent" />
      <div className="animate-marquee flex w-max gap-12 hover:[animation-play-state:paused]">
        {[...tech, ...tech].map((t, i) => (
          <span key={i} className="font-display flex items-center gap-3 text-2xl font-semibold whitespace-nowrap text-white/40 transition hover:text-gold-400" aria-hidden={i >= tech.length}>
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}

const steps = [
  { icon: Search, title: "Discover", text: "We listen to your goals, users and budget, then define the scope together." },
  { icon: PenTool, title: "Design", text: "Wireframes and visual designs you can click through and approve." },
  { icon: Code2, title: "Build", text: "Agile development with regular demos, so you see progress every week." },
  { icon: Rocket, title: "Launch", text: "Testing, deployment to web and Play Store, and a smooth go-live." },
  { icon: LifeBuoy, title: "Support", text: "Monitoring, updates and improvements as your business grows." },
];

export function Process() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="process" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <Heading eyebrow="How we work" title={<>A clear path from <span className="text-gold-gradient">idea to launch</span></>} />
        <div ref={ref} className="relative">
          <div className="absolute top-0 bottom-0 left-7 w-px bg-white/10 sm:left-1/2" aria-hidden="true" />
          <motion.div style={{ scaleY }} className="absolute top-0 bottom-0 left-7 w-px origin-top bg-gradient-to-b from-gold-300 to-gold-600 sm:left-1/2" aria-hidden="true" />
          <ol className="space-y-12">
            {steps.map((s, i) => (
              <li key={s.title} className={`relative flex items-start gap-6 sm:w-1/2 ${i % 2 ? "sm:ml-auto sm:pl-12" : "sm:flex-row-reverse sm:pr-12 sm:text-right"}`}>
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className={`relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gold-500/40 bg-navy-900 text-gold-400 shadow-[0_0_30px_-5px_rgba(212,162,76,0.5)] sm:absolute sm:top-0 ${i % 2 ? "sm:-left-7" : "sm:-right-7"}`}
                >
                  <s.icon size={22} aria-hidden="true" />
                </motion.div>
                <Reveal delay={0.1} className="pt-1">
                  <p className="text-xs font-semibold tracking-[0.3em] text-gold-500">STEP 0{i + 1}</p>
                  <h3 className="font-display mt-1 text-2xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-mist">{s.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

const reasons = [
  { icon: Zap, title: "Fast delivery", text: "Weekly demos and clear milestones keep your project moving." },
  { icon: ShieldCheck, title: "Secure by default", text: "Role-based access, encrypted data and best-practice code." },
  { icon: Users, title: "Direct access", text: "Talk to the people building your product — no middlemen." },
  { icon: MessagesSquare, title: "Always reachable", text: "Chat, call or WhatsApp us; every enquiry gets a reply." },
];

export function WhyUs() {
  return (
    <section id="why" className="relative py-24 sm:py-32">
      <div className="absolute inset-x-0 top-1/2 h-[500px] -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(29,48,99,0.55),transparent_70%)]" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
        <Reveal>
          <p className="mb-3 text-xs font-semibold tracking-[0.35em] text-gold-500 uppercase">Why Nathora</p>
          <h2 className="font-display text-3xl leading-tight font-bold sm:text-5xl">
            Technology partners who <span className="text-gold-gradient">care about your growth</span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-mist">
            We combine solid engineering in Angular, .NET and Android with honest communication. You get software that is
            easy to use, easy to maintain and built to scale with your business.
          </p>
          <a href="#contact" className="btn-gold mt-8">
            Talk to us
          </a>
        </Reveal>
        <Stagger className="grid gap-5 sm:grid-cols-2">
          {reasons.map((r) => (
            <StaggerItem key={r.title}>
              <SpotlightCard className="h-full p-6">
                <r.icon className="text-gold-400" size={28} aria-hidden="true" />
                <h3 className="font-display mt-4 text-lg font-semibold">{r.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">{r.text}</p>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

const faqs = [
  { q: "How much does a website or app cost?", a: "It depends on features and scope. Send an enquiry with your requirements and budget range and we'll share a clear, itemised quote." },
  { q: "How long does a project take?", a: "A business website usually takes 2–4 weeks. Mobile apps and custom software are planned in milestones; you'll get a timeline with your quote." },
  { q: "Will I be able to update my website myself?", a: "Yes. We can add an admin panel so you can edit content, products and enquiries without any coding." },
  { q: "Do you provide support after launch?", a: "Yes — we offer maintenance plans covering updates, backups, security fixes and new features." },
  { q: "How do I track my enquiry?", a: "Create a free account with the same email you used for your enquiry. You can then chat with our team and follow its status from your dashboard." },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <Heading eyebrow="FAQ" title="Questions, answered" />
        <div className="space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={i * 0.05}>
                <div className={`card overflow-hidden transition-colors ${isOpen ? "border-gold-500/40" : ""}`}>
                  <button
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <span className="font-display text-lg font-semibold">{f.q}</span>
                    <motion.span animate={{ rotate: isOpen ? 45 : 0 }} className="shrink-0 text-gold-400">
                      <Plus size={22} aria-hidden="true" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35 }}>
                        <p className="px-6 pb-6 leading-relaxed text-mist">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
