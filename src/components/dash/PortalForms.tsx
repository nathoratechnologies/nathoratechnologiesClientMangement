"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions";
import { Loader2, Play } from "lucide-react";
import { adminCreateClient, startTimer } from "@/lib/portal-actions";
import { CURRENCIES, PRIORITIES, PROJECT_STATUSES, PROJECT_STATUS_LABEL, UPDATE_KINDS, UPDATE_KIND_LABEL } from "@/lib/portal-config";

type Action = (state: FormState, f: FormData) => Promise<FormState>;

function Result({ state }: { state: FormState }) {
  if (state?.error) return <p role="alert" className="text-sm text-red-300">{state.error}</p>;
  if (state?.ok) return <p role="status" className="text-sm break-words text-emerald-300">{state.message}</p>;
  return null;
}

/** Wraps a form so it resets after a successful submit and shows the result. */
function useForm(action: Action) {
  const [state, run, pending] = useActionState<FormState, FormData>(action, undefined);
  return { state, run, pending, key: state?.ok ? state.message : "form" };
}

export function AddClientForm() {
  const { state, run, pending, key } = useForm(adminCreateClient);
  return (
    <form action={run} className="grid gap-4" key={key}>
      <div>
        <label className="label" htmlFor="c-name">Contact name</label>
        <input id="c-name" name="name" className="input" required />
      </div>
      <div>
        <label className="label" htmlFor="c-company">Company</label>
        <input id="c-company" name="company" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="c-username">Username (for login)</label>
        <input id="c-username" name="username" className="input" required minLength={3} autoCapitalize="none" spellCheck={false} placeholder="e.g. acme" />
      </div>
      <div>
        <label className="label" htmlFor="c-pass">Password</label>
        <input id="c-pass" name="password" type="text" className="input" required minLength={6} autoComplete="off" />
      </div>
      <div>
        <label className="label" htmlFor="c-email">Email (optional)</label>
        <input id="c-email" name="email" type="email" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="c-phone">Phone / WhatsApp (optional)</label>
        <input id="c-phone" name="phone" type="tel" className="input" />
      </div>
      <Result state={state} />
      <button className="btn-gold" disabled={pending}>{pending ? "Creating…" : "Create client login"}</button>
    </form>
  );
}

export function ResetPasswordForm({ action }: { action: Action }) {
  const { state, run, pending, key } = useForm(action);
  return (
    <form action={run} className="grid gap-3" key={key}>
      <label className="label !mb-0" htmlFor="rp-pass">New password</label>
      <div className="flex gap-2">
        <input id="rp-pass" name="password" type="text" className="input" required minLength={6} autoComplete="off" />
        <button className="btn-ghost !px-4 whitespace-nowrap" disabled={pending}>{pending ? "…" : "Set"}</button>
      </div>
      <Result state={state} />
    </form>
  );
}

type ProjectDefaults = { name: string; description: string; status: string; hourlyRate: number; currency: string; liveUrl: string | null };

export function ProjectForm({ action, defaults, submit }: { action: Action; defaults?: ProjectDefaults; submit: string }) {
  const [state, run, pending] = useActionState<FormState, FormData>(action, undefined);
  const d = defaults ?? { name: "", description: "", status: "PLANNING", hourlyRate: 0, currency: "INR", liveUrl: "" };
  return (
    <form action={run} className="grid gap-4">
      <div>
        <label className="label" htmlFor="p-name">Project name</label>
        <input id="p-name" name="name" className="input" required defaultValue={d.name} />
      </div>
      <div>
        <label className="label" htmlFor="p-desc">Description</label>
        <textarea id="p-desc" name="description" rows={3} className="input resize-none" defaultValue={d.description} />
      </div>
      <div>
        <label className="label" htmlFor="p-status">Status</label>
        <select id="p-status" name="status" className="input" defaultValue={d.status}>
          {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{PROJECT_STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-[1fr_110px] gap-3">
        <div>
          <label className="label" htmlFor="p-rate">Rate per hour</label>
          <input id="p-rate" name="hourlyRate" type="number" min={0} step="0.01" inputMode="decimal" className="input" defaultValue={d.hourlyRate || ""} placeholder="0" />
        </div>
        <div>
          <label className="label" htmlFor="p-cur">Currency</label>
          <select id="p-cur" name="currency" className="input" defaultValue={d.currency}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="p-url">Live / staging URL (optional)</label>
        <input id="p-url" name="liveUrl" type="url" className="input" defaultValue={d.liveUrl ?? ""} placeholder="https://" />
      </div>
      <Result state={state} />
      <button className="btn-gold" disabled={pending}>{pending ? "Saving…" : submit}</button>
    </form>
  );
}

export function ReportBugForm({ action }: { action: Action }) {
  const [state, run, pending] = useActionState<FormState, FormData>(action, undefined);
  return (
    <form action={run} className="grid gap-4">
      <div>
        <label className="label" htmlFor="b-title">What&apos;s wrong? (short title)</label>
        <input id="b-title" name="title" className="input" required minLength={4} placeholder="e.g. Checkout button does nothing" />
      </div>
      <div>
        <label className="label" htmlFor="b-desc">Details</label>
        <textarea
          id="b-desc"
          name="description"
          rows={5}
          className="input resize-y"
          required
          minLength={10}
          placeholder={"Which page? What did you do? What happened, and what did you expect?\nYou can paste links to screenshots here."}
        />
      </div>
      <div>
        <label className="label" htmlFor="b-pri">How urgent?</label>
        <select id="b-pri" name="priority" className="input" defaultValue="MEDIUM">
          {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
        </select>
      </div>
      <Result state={state} />
      <button className="btn-gold" disabled={pending}>{pending ? "Sending…" : "Report bug"}</button>
    </form>
  );
}

export function PostUpdateForm({ action }: { action: Action }) {
  const { state, run, pending, key } = useForm(action);
  return (
    <form action={run} className="grid gap-4" key={key}>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        <div>
          <label className="label" htmlFor="u-kind">Type</label>
          <select id="u-kind" name="kind" className="input" defaultValue="FEATURE">
            {UPDATE_KINDS.map((k) => <option key={k} value={k}>{UPDATE_KIND_LABEL[k]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="u-title">What changed?</label>
          <input id="u-title" name="title" className="input" required minLength={3} placeholder="e.g. Added online payment page" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="u-body">Details (optional)</label>
        <textarea id="u-body" name="body" rows={3} className="input resize-y" />
      </div>
      <Result state={state} />
      <button className="btn-gold justify-self-start" disabled={pending}>{pending ? "Posting…" : "Post update"}</button>
    </form>
  );
}

/** Start-timer form. "Started at" lets you back-date it when you forgot to press Start. */
export function TimerStartForm({ projectId, bugId, compact }: { projectId: string; bugId?: string | null; compact?: boolean }) {
  const [state, run, pending] = useActionState<FormState, FormData>(startTimer, undefined);
  const id = bugId ?? projectId;
  const button = (
    <button className={compact ? "btn-gold !min-h-10 !px-4 !py-2 text-sm" : "btn-gold w-full"} disabled={pending} aria-busy={pending}>
      {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Play size={compact ? 12 : 16} fill="currentColor" aria-hidden="true" />}
      {pending ? "Starting…" : compact ? "Start" : "Start timer"}
    </button>
  );
  return (
    <form action={run} className={compact ? "grid justify-items-end gap-1" : "grid gap-3"}>
      <input type="hidden" name="projectId" value={projectId} />
      {bugId && <input type="hidden" name="bugId" value={bugId} />}
      {!compact && (
        <>
          <label htmlFor={`note-${id}`} className="sr-only">What are you working on?</label>
          <input id={`note-${id}`} name="note" className="input" placeholder="What are you working on? (optional)" />
          <div className="flex items-center gap-3">
            <label htmlFor={`start-${id}`} className="text-sm whitespace-nowrap text-mist">Started at</label>
            <input id={`start-${id}`} name="startAt" type="time" className="input !py-2" aria-describedby={`start-help-${id}`} />
          </div>
          <p id={`start-help-${id}`} className="-mt-1 text-xs text-mist/70">Leave empty to start now. Forgot to press Start? Enter when you began, e.g. 07:30.</p>
        </>
      )}
      {button}
      {state?.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
    </form>
  );
}

export function ManualTimeForm({ action, people, bugs, meId, defaultBugId }: { action: Action; people?: { id: string; name: string }[]; bugs: { id: string; title: string }[]; meId: string; defaultBugId?: string }) {
  const { state, run, pending, key } = useForm(action);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return (
    <form action={run} className="grid gap-4" key={key}>
      <div className={`grid gap-3 ${people?.length ? "sm:grid-cols-2" : ""}`}>
        {people && people.length > 0 && (
          <div>
            <label className="label" htmlFor="m-user">Who worked</label>
            <select id="m-user" name="userId" className="input" defaultValue={meId}>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="label" htmlFor="m-date">Date</label>
          <input id="m-date" name="date" type="date" className="input" defaultValue={today} max={today} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="m-from">From</label>
          <input id="m-from" name="from" type="time" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="m-to">To</label>
          <input id="m-to" name="to" type="time" className="input" required />
        </div>
      </div>
      {defaultBugId ? (
        <input type="hidden" name="bugId" value={defaultBugId} />
      ) : (
        <div>
          <label className="label" htmlFor="m-bug">Bug (optional)</label>
          <select id="m-bug" name="bugId" className="input" defaultValue="">
            <option value="">General project work</option>
            {bugs.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="label" htmlFor="m-note">Note</label>
        <input id="m-note" name="note" className="input" placeholder="What was done" />
      </div>
      <Result state={state} />
      <button className="btn-ghost justify-self-start" disabled={pending}>{pending ? "Adding…" : "Add time"}</button>
    </form>
  );
}
