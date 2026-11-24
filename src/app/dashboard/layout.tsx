import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { DashNav } from "@/components/dash/DashNav";
import { LogoMark } from "@/components/Logo";

async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <DashNav role={user.role as "USER" | "STAFF" | "ADMIN"} name={user.name} />
      <div className="pb-24 lg:pb-10 lg:pl-64 print:!p-0">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">{children}</main>
      </div>
    </>
  );
}

function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
      <div className="animate-pulse">
        <LogoMark size={72} />
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-navy-950">
      <Suspense fallback={<Loading />}>
        <Shell>{children}</Shell>
      </Suspense>
    </div>
  );
}
