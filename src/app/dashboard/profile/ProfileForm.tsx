"use client";

import { useActionState } from "react";
import { updateProfile, type FormState } from "@/lib/actions";

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, undefined);
  return (
    <form action={action} className="grid gap-5">
      <div>
        <label className="label" htmlFor="p-name">Name</label>
        <input id="p-name" name="name" defaultValue={name} className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="p-phone">Phone / WhatsApp</label>
        <input id="p-phone" name="phone" type="tel" defaultValue={phone} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="p-pass">New password</label>
        <input id="p-pass" name="password" type="password" className="input" placeholder="Leave blank to keep current" autoComplete="new-password" />
      </div>
      {state?.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-emerald-300">{state.message}</p>}
      <button className="btn-gold justify-self-start" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
    </form>
  );
}
