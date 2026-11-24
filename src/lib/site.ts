export const site = {
  name: "Nathora Technologies",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://nathora-technologies.vercel.app").replace(/\/$/, ""),
  tagline: "Guiding your business into the digital era",
  phone: process.env.NEXT_PUBLIC_PHONE || "+910000000000",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP || "910000000000",
  email: process.env.NEXT_PUBLIC_EMAIL || "nathoratechnologies@gmail.com",
};

export const SERVICES = [
  "Website Development",
  "Mobile App (Android / iOS)",
  "Custom Software",
  "Cloud & DevOps",
  "UI / UX Design",
  "Maintenance & Support",
] as const;

export const STATUSES = ["NEW", "IN_PROGRESS", "QUOTED", "WON", "CLOSED"] as const;

export const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  IN_PROGRESS: "In progress",
  QUOTED: "Quoted",
  WON: "Won",
  CLOSED: "Closed",
};

export const waLink = (number: string, text = "") =>
  `https://wa.me/${number.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
