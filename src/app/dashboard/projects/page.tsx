import Link from "next/link";
import { listBugs, listProjects } from "@/lib/portal";
import { requireUser } from "@/lib/auth";
import { OPEN_BUG_STATUSES } from "@/lib/portal-config";
import { PageTitle } from "@/components/dash/ui";
import { ProjectList } from "@/components/dash/portal-ui";

export default async function ProjectsPage() {
  const user = await requireUser();
  const bugs = await listBugs(user.role === "ADMIN" ? {} : user.role === "STAFF" ? { assignedToId: user.id } : { clientId: user.id });
  let projects = await listProjects(user.role === "USER" ? { clientId: user.id } : {});
  if (user.role === "STAFF") {
    const mine = new Set(bugs.map((b) => b.projectId));
    projects = projects.filter((p) => mine.has(p.id));
  }
  const open = bugs.filter((b) => OPEN_BUG_STATUSES.includes(b.status));
  const openByProject = Object.fromEntries(projects.map((p) => [p.id, open.filter((b) => b.projectId === p.id).length]));

  return (
    <>
      <PageTitle
        title={user.role === "USER" ? "My projects" : "Projects"}
        sub={
          user.role === "USER"
            ? "Status, updates, bugs and hours for each of your projects"
            : user.role === "STAFF"
              ? "Projects where you have bugs assigned"
              : "All client projects"
        }
        action={user.role === "ADMIN" ? <Link href="/dashboard/clients" className="btn-gold">New project for a client</Link> : undefined}
      />
      <ProjectList items={projects} showClient={user.role !== "USER"} openBugs={openByProject} />
    </>
  );
}
