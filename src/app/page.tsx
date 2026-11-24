import { Suspense } from "react";
import { getUser } from "@/lib/auth";
import { site, waLink, SERVICES } from "@/lib/site";
import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { Services, TechMarquee, Process, WhyUs, FAQ } from "@/components/site/Sections";
import { Contact } from "@/components/site/Contact";
import { Footer } from "@/components/site/Footer";
import { FloatingContact } from "@/components/site/FloatingContact";

async function NavbarWithUser() {
  const user = await getUser();
  return <Navbar signedIn={!!user} />;
}

export default function Home() {
  const wa = waLink(site.whatsapp, "Hi Nathora Technologies, I'd like to discuss a project.");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: site.name,
    alternateName: "Nathora",
    url: site.url,
    logo: `${site.url}/icon-192.png`,
    image: `${site.url}/icon-192.png`,
    description: "Websites, Android apps, custom software and cloud solutions built with Angular, .NET and Android.",
    slogan: site.tagline,
    telephone: site.phone,
    email: site.email,
    address: { "@type": "PostalAddress", addressLocality: "Alappuzha", addressRegion: "Kerala", addressCountry: "IN" },
    areaServed: ["IN", "Worldwide"],
    knowsAbout: [...SERVICES],
    sameAs: [] as string[],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={<Navbar signedIn={false} />}>
        <NavbarWithUser />
      </Suspense>
      <main>
        <Hero phone={site.phone} whatsappHref={wa} />
        <TechMarquee />
        <Services />
        <Process />
        <WhyUs />
        <FAQ />
        <Contact phone={site.phone} email={site.email} whatsappHref={wa} />
      </main>
      <Footer phone={site.phone} email={site.email} />
      <FloatingContact phone={site.phone} whatsappHref={wa} />
    </>
  );
}
