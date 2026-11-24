import { requireUser } from "@/lib/auth";
import { EnquiryForm } from "@/components/EnquiryForm";
import { PageTitle } from "@/components/dash/ui";

export default async function NewEnquiry() {
  const user = await requireUser(["USER"]);
  return (
    <>
      <PageTitle title="New enquiry" sub="Tell us what you need. You'll get a WhatsApp confirmation and can chat with us here." />
      <div className="card max-w-2xl p-6 sm:p-8">
        <EnquiryForm signedIn compact defaultPhone={user.phone ?? ""} />
      </div>
    </>
  );
}
