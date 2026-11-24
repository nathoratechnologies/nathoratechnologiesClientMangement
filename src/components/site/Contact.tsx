"use client";

import { Mail, MessageCircle, Phone } from "lucide-react";
import { EnquiryForm } from "../EnquiryForm";
import { Reveal } from "../motion";

export function Contact({ phone, email, whatsappHref }: { phone: string; email: string; whatsappHref: string }) {
  const channels = [
    { icon: MessageCircle, label: "WhatsApp", value: "Chat instantly", href: whatsappHref, color: "text-[#25D366]", ext: true },
    { icon: Phone, label: "Call us", value: phone, href: `tel:${phone}`, color: "text-gold-400" },
    { icon: Mail, label: "Email", value: email, href: `mailto:${email}`, color: "text-gold-400" },
  ];
  return (
    <section id="contact" className="relative py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <Reveal>
          <p className="mb-3 text-xs font-semibold tracking-[0.35em] text-gold-500 uppercase">Contact</p>
          <h2 className="font-display text-3xl leading-tight font-bold sm:text-5xl">
            Let&apos;s build <span className="text-gold-gradient">something great</span>
          </h2>
          <p className="mt-5 text-lg text-mist">
            Send an enquiry and you&apos;ll get an instant WhatsApp confirmation. Our team replies with next steps, usually the same day.
          </p>
          <ul className="mt-10 space-y-4">
            {channels.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  {...(c.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="card group flex items-center gap-4 p-5 transition hover:border-gold-500/40"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 transition group-hover:scale-110">
                    <c.icon className={c.color} size={22} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm text-mist">{c.label}</span>
                    <span className="block font-semibold">{c.value}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="card relative overflow-hidden p-6 sm:p-10">
            <div className="absolute -top-24 -right-24 h-60 w-60 rounded-full bg-gold-500/15 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h3 className="font-display mb-6 text-2xl font-semibold">Send an enquiry</h3>
              <EnquiryForm />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
