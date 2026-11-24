import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { getUserById, isPlaceholderEmail } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { adminUpdateUser } from "@/lib/actions";
import { adminEditUser, adminResetPassword } from "@/lib/portal-actions";
import { PageTitle } from "@/components/dash/ui";
import { EditUserForm, ResetPasswordForm } from "@/components/dash/PortalForms";
import { PendingButton } from "@/components/dash/Live";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser(["ADMIN"]);
  const u = await getUserById(id);
  if (!u) notFound();
  const self = u.id === me.id;
  const isClient = u.role === "USER";

  return (
    <>
      <Link href={isClient ? `/dashboard/clients/${u.id}` : "/dashboard/users"} className="mb-6 inline-flex items-center gap-2 text-sm text-mist hover:text-white">
        <ArrowLeft size={16} aria-hidden="true" /> {isClient ? "Back to client" : "All users"}
      </Link>
      <PageTitle
        title={`Edit ${u.company || u.name}`}
        sub={`${u.role === "USER" ? "Client" : u.role === "STAFF" ? "Staff" : "Admin"}${u.active ? "" : " · disabled"}`}
        action={
          isClient ? (
            <Link href={`/dashboard/clients/${u.id}`} className="btn-ghost">
              <Building2 size={16} aria-hidden="true" /> Projects &amp; billing
            </Link>
          ) : undefined
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card p-6">
          <h2 className="font-display mb-5 font-semibold">Details</h2>
          <EditUserForm
            action={adminEditUser.bind(null, u.id)}
            isClient={isClient}
            user={{
              name: u.name,
              email: isPlaceholderEmail(u.email) ? "" : u.email,
              username: u.username ?? "",
              phone: u.phone ?? "",
              company: u.company ?? "",
              address: u.address ?? "",
              notes: u.notes ?? "",
            }}
          />
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-display mb-4 font-semibold">Password</h2>
            {self ? (
              <p className="text-sm text-mist">
                Change your own password in <Link href="/dashboard/profile" className="text-gold-300 underline">Profile</Link>.
              </p>
            ) : (
              <>
                <p className="mb-4 text-sm text-mist">Set a new password and send it to them. Their old password stops working at once.</p>
                <ResetPasswordForm action={adminResetPassword.bind(null, u.id)} />
              </>
            )}
          </div>

          {!self && (
            <div className="card space-y-4 p-6">
              <h2 className="font-display font-semibold">Access</h2>
              <form action={adminUpdateUser.bind(null, u.id)} className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="label" htmlFor="role">Role</label>
                  <select id="role" name="role" defaultValue={u.role} className="input">
                    <option value="USER">Client / customer</option>
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <PendingButton className="btn-ghost !px-4">Save</PendingButton>
              </form>
              <form action={adminUpdateUser.bind(null, u.id)}>
                <input type="hidden" name="active" value={u.active ? "false" : "true"} />
                <button className={`min-h-10 w-full rounded-full border px-4 text-sm ${u.active ? "border-red-400/30 text-red-200 hover:bg-red-500/10" : "border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/10"}`}>
                  {u.active ? "Disable login" : "Enable login"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
