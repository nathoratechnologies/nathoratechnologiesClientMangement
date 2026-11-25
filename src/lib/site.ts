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

/** Portfolio shown in the "Our work" section. Add a new object here to show another project. */
export const PROJECTS = [
  {
    name: "Gramaseva",
    localName: "ഗ്രാമസേവ",
    type: "Village services app · Web + Android (PWA)",
    description:
      "A village services platform: find local workers like plumbers, electricians and coconut climbers, book an auto or car, and read village news. One codebase runs the website, the installable phone app and the coordinator admin panel.",
    features: ["Worker & ride booking", "Phone OTP and WhatsApp login", "Malayalam & English", "Coordinator admin panel"],
    tech: ["React", "TypeScript", "Firebase", "PWA", "Leaflet maps"],
    url: "https://gramaseva-b2724.web.app",
    logo: "/projects/gramaseva.png",
    logoBg: "from-[#2f7d3a] to-[#1b4d24]",
  },
  {
    name: "Thilakkam Lifestyle Store",
    localName: "തിളക്കം",
    type: "E-commerce store · Web",
    description:
      "An online store for fashion ornaments. Customers browse, add to bag and send their order straight to WhatsApp, while staff and the owner manage orders, stock and products from a dashboard.",
    features: ["Order on WhatsApp", "Customer order tracking", "Stock & product management", "Customer, staff and admin logins"],
    tech: ["React", "Vite", "Firebase Auth", "Firestore"],
    url: "https://thilakkam-store.web.app",
    logo: "/projects/thilakkam.png",
    logoBg: "from-[#3a1834] to-[#2b1226]",
  },
  {
    name: "Kada Billing",
    localName: "കട ബില്ലിംഗ്",
    type: "Shop billing app · Web + Android",
    description:
      "Billing for small shops. Any shop can register, add staff with roles and bill from any phone or browser, with stock, purchases and daily to yearly reports.",
    features: ["Tick-to-bill with PDF bills", "Stock & purchase tracking", "Daily to yearly reports", "Owner, admin and sales roles"],
    tech: ["JavaScript", "Capacitor (Android)", "Firebase", "jsPDF"],
    url: "https://kada-billing-upas.web.app",
    logo: "/projects/kada-billing.png",
    logoBg: "from-[#2f8a47] to-[#1d5a2e]",
  },
] as const;

export const STATUSES =["NEW", "IN_PROGRESS", "QUOTED", "WON", "CLOSED"] as const;

export const STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  IN_PROGRESS: "In progress",
  QUOTED: "Quoted",
  WON: "Won",
  CLOSED: "Closed",
};

export const waLink = (number: string, text = "") =>
  `https://wa.me/${number.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
