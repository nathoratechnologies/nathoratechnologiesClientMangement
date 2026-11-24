"use client";

import { useActionState } from "react";
import { adminCreateUser, type FormState } from "@/lib/actions";

export function AddUserForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(adminCreateUser, undefined);
  return (
    <form action={action} className="grid gap-4" key={state?.ok ? state.message : "form"}>
      <div>
        <label className="label" htmlFor="u-name">Name</label>
        <input id="u-name" name="name" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="u-email">Email</label>
        <input id="u-email" name="email" type="email" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="u-phone">Phone</label>
        <input id="u-phone" name="phone" type="tel" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="u-pass">Temporary password</label>
        <input id="u-pass" name="password" type="text" className="input" required minLength={6} />
      </div>
      <div>
        <label className="label" htmlFor="u-role">Role</label>
        <select id="u-role" name="role" defaultValue="STAFF" className="input">
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">User</option>
        </select>
      </div>
      {state?.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-emerald-300">{state.message}</p>}
      <button className="btn-gold" disabled={pending}>{pending ? "Adding…" : "Add user"}</button>
    </form>
  );
}
