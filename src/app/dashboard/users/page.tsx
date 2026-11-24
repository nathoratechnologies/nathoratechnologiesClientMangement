import Link from "next/link";
import { Pencil } from "lucide-react";
import { listEnquiries, listUsers } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { adminUpdateUser } from "@/lib/actions";
import { PageTitle } from "@/components/dash/ui";
import { AddUserForm } from "./AddUserForm";

const ROLE_ORDER = { ADMIN: 0, STAFF: 1, USER: 2 } as const;

export default async function UsersPage() {
  const me = await requireUser(["ADMIN"]);
  const [all, enquiries] = await Promise.all([listUsers(), listEnquiries()]);
  const users = all.sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || b.createdAt.getTime() - a.createdAt.getTime());
  const owned = (id: string) => enquiries.filter((e) => e.userId === id).length;
  const assigned = (id: string) => enquiries.filter((e) => e.assignedToId === id).length;

  return (
    <>
      <PageTitle title="Users" sub="Admins, staff and customers. Add staff here so you can assign enquiries to them." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <ul className="card divide-y divide-white/5 overflow-hidden">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  <Link href={`/dashboard/users/${u.id}`} className="hover:text-gold-300 hover:underline">{u.company ? `${u.company} · ${u.name}` : u.name}</Link>{" "}
                  {!u.active && <span className="ml-1 text-xs font-normal text-red-300">(disabled)</span>}
                </p>
                <p className="truncate text-sm text-mist">
                  {u.username ? `@${u.username}` : u.email}
                  {u.phone ? ` · ${u.phone}` : ""} · {u.role === "USER" ? `${owned(u.id)} enquiries` : `${assigned(u.id)} assigned`}
                </p>
              </div>
              <Link href={`/dashboard/users/${u.id}`} className="btn-ghost !min-h-10 !px-4 !py-2 text-sm">
                <Pencil size={14} aria-hidden="true" /> Edit
              </Link>
              {u.id === me.id ? (
                <span className="text-xs tracking-widest text-gold-500">YOU · ADMIN</span>
              ) : (
                <div className="flex items-center gap-2">
                  <form action={adminUpdateUser.bind(null, u.id)} className="flex items-center gap-2">
                    <label htmlFor={`role-${u.id}`} className="sr-only">Role for {u.name}</label>
                    <select id={`role-${u.id}`} name="role" defaultValue={u.role} className="input !w-auto !py-2 text-sm">
                      <option value="USER">User</option>
                      <option value="STAFF">Staff</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button className="btn-ghost !min-h-10 !px-4 !py-2 text-sm">Save</button>
                  </form>
                  <form action={adminUpdateUser.bind(null, u.id)}>
                    <input type="hidden" name="active" value={u.active ? "false" : "true"} />
                    <button className={`min-h-10 rounded-full border px-4 text-sm ${u.active ? "border-red-400/30 text-red-200 hover:bg-red-500/10" : "border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/10"}`}>
                      {u.active ? "Disable" : "Enable"}
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="card h-fit p-6">
          <h2 className="font-display mb-5 font-semibold">Add a user</h2>
          <AddUserForm />
        </div>
      </div>
    </>
  );
}
