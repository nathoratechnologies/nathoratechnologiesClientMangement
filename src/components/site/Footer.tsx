import Link from "next/link";
import { Logo } from "../Logo";

export function Footer({ phone, email }: { phone: string; email: string }) {
  return (
    <footer className="border-t border-white/10 bg-navy-950 pt-16 pb-28 sm:pb-12">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-5 max-w-sm text-mist">
            Guiding your business into the digital era with websites, mobile apps, custom software and cloud solutions.
          </p>
        </div>
        <div>
          <h3 className="font-display mb-4 font-semibold">Company</h3>
          <ul className="space-y-2 text-mist">
            <li><a href="#services" className="hover:text-gold-400">Services</a></li>
            <li><a href="#process" className="hover:text-gold-400">Process</a></li>
            <li><a href="#faq" className="hover:text-gold-400">FAQ</a></li>
            <li><Link href="/login" className="hover:text-gold-400">Client login</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-display mb-4 font-semibold">Get in touch</h3>
          <ul className="space-y-2 text-mist">
            <li><a href={`tel:${phone}`} className="hover:text-gold-400">{phone}</a></li>
            <li><a href={`mailto:${email}`} className="hover:text-gold-400">{email}</a></li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-7xl px-5 text-sm text-mist/70 sm:px-8">
        © 2026 Nathora Technologies. All rights reserved.
      </p>
    </footer>
  );
}
