import { requireUser } from "@/lib/auth";
import { PageTitle } from "@/components/dash/ui";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <>
      <PageTitle title="Profile" sub={`${user.email} · ${user.role.toLowerCase()}`} />
      <div className="card max-w-lg p-6 sm:p-8">
        <ProfileForm name={user.name} phone={user.phone ?? ""} />
      </div>
    </>
  );
}
