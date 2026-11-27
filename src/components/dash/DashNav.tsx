"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { LayoutDashboard, Inbox, Users, MessageCircle, UserCircle, LogOut, Globe, FolderKanban, Bug, Timer, Building2, Wallet } from "lucide-react";
import { Logo } from "../Logo";
import { logout } from "@/lib/actions";

const NAV = {
  USER: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
    { href: "/dashboard/bugs", label: "Bugs", icon: Bug },
    { href: "/dashboard/payments", label: "Payments", icon: Wallet },
    { href: "/dashboard/enquiries", label: "Enquiries", icon: Inbox },
    { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
  ],
  STAFF: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/bugs", label: "My bugs", icon: Bug },
    { href: "/dashboard/time", label: "My time", icon: Timer },
    { href: "/dashboard/enquiries", label: "Enquiries", icon: Inbox },
    { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
  ],
  ADMIN: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/clients", label: "Clients", icon: Building2 },
    { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
    { href: "/dashboard/bugs", label: "Bugs", icon: Bug },
    { href: "/dashboard/time", label: "Time", icon: Timer },
    { href: "/dashboard/payments", label: "Payments", icon: Wallet },
    { href: "/dashboard/enquiries", label: "Enquiries", icon: Inbox },
    { href: "/dashboard/users", label: "Users", icon: Users },
    { href: "/dashboard/whatsapp", label: "WhatsApp", icon: MessageCircle },
    { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
  ],
} as const;

export function DashNav({ role, name }: { role: "USER" | "STAFF" | "ADMIN"; name: string }) {
  const path = usePathname();
  const items = NAV[role];
  const isActive = (href: string) =>
    href === "/dashboard"
      ? path === href
      : href === "/dashboard/enquiries"
        ? path.startsWith(href) && path !== "/dashboard/enquiries/new"
        : path.startsWith(href);

  return (
    <>
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto border-r border-white/10 bg-navy-950/80 p-5 backdrop-blur-xl lg:flex print:!hidden">
        <Link href="/" className="mb-10 px-2" aria-label="Website home">
          <Logo size={34} />
        </Link>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Dashboard">
          {items.map((it) => {
            const active = isActive(it.href);
            return (
              <Link key={it.href} href={it.href} className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${active ? "text-navy-950" : "text-mist hover:bg-white/5 hover:text-white"}`}>
                {active && (
                  <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-gradient-to-r from-gold-300 to-gold-500" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                )}
                <it.icon size={18} className="relative" aria-hidden="true" />
                <span className="relative">{it.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 rounded-xl border border-white/10 p-4">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs tracking-widest text-gold-500">{role}</p>
          <div className="mt-3 flex gap-2">
            <Link href="/" className="btn-ghost !min-h-9 flex-1 !px-3 !py-1.5 text-xs">
              <Globe size={14} aria-hidden="true" /> Site
            </Link>
            <form action={logout} className="flex-1">
              <button className="btn-ghost !min-h-9 w-full !px-3 !py-1.5 text-xs">
                <LogOut size={14} aria-hidden="true" /> Logout
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-navy-950/85 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl lg:hidden print:hidden">
        <Link href="/" aria-label="Website home">
          <Logo size={30} />
        </Link>
        <form action={logout}>
          <button className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15" aria-label="Log out">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </form>
      </header>

      {/* mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-white/10 bg-navy-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden print:hidden" aria-label="Dashboard">
        {items.map((it) => {
          const active = isActive(it.href);
          return (
            <Link key={it.href} href={it.href} className={`relative flex min-h-[60px] min-w-[68px] flex-1 shrink-0 flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? "text-gold-400" : "text-mist"}`}>
              {active && <motion.span layoutId="tab-active" className="absolute top-0 h-0.5 w-10 rounded-full bg-gold-500" />}
              <it.icon size={20} aria-hidden="true" />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
