import "server-only";
import { addLog } from "./db";

const GRAPH = "https://graph.facebook.com/v21.0";

/** Normalise to digits with country code (defaults to India 91 for 10-digit numbers). */
export function toWaNumber(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return "91" + d;
  return d.replace(/^0+/, "");
}

type Kind = "CUSTOMER_CONFIRMATION" | "ADMIN_ALERT" | "BUG_ALERT" | "BILL" | "MANUAL";

/** True when the WhatsApp Cloud API keys are set, so the app can send messages itself. */
export const whatsAppConfigured = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);

/** Plain-text message to any number (e.g. a work bill to a client). */
export async function sendText(phone: string, body: string, kind: Kind = "BILL") {
  return send(toWaNumber(phone), body.slice(0, 4000), kind);
}

async function send(to: string, body: string, kind: Kind, enquiryId?: string, template?: { name: string; lang: string; params: string[] }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const log = (status: string, detail?: string) =>
    addLog({ to, kind, body, status, detail, enquiryId });

  if (!token || !phoneId || !to) return log("SKIPPED", "WhatsApp Cloud API not configured");

  const payload = template
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template.name,
          language: { code: template.lang },
          components: template.params.length
            ? [{ type: "body", parameters: template.params.map((text) => ({ type: "text", text })) }]
            : undefined,
        },
      }
    : { messaging_product: "whatsapp", to, type: "text", text: { preview_url: false, body } };

  try {
    const res = await fetch(`${GRAPH}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return log("FAILED", JSON.stringify(json).slice(0, 500));
    return log("SENT", json?.messages?.[0]?.id);
  } catch (err) {
    return log("FAILED", String(err).slice(0, 500));
  }
}

/** Auto messages fired when a new enquiry arrives: confirmation to the customer + alert to the admin. */
export async function notifyNewEnquiry(e: { id: string; name: string; phone: string; service: string; message: string; email: string }) {
  const first = e.name.split(" ")[0];
  const customerText =
    `Hi ${first}, thank you for contacting Nathora Technologies! ` +
    `We have received your enquiry about "${e.service}" (ref #${e.id.slice(-6).toUpperCase()}). ` +
    `Our team will get back to you shortly. Reply here anytime to chat with us.`;
  const tpl = process.env.WHATSAPP_TEMPLATE_NAME;

  await send(
    toWaNumber(e.phone),
    customerText,
    "CUSTOMER_CONFIRMATION",
    e.id,
    tpl ? { name: tpl, lang: process.env.WHATSAPP_TEMPLATE_LANG || "en", params: tpl === "hello_world" ? [] : [first, e.service] } : undefined,
  );

  const admin = process.env.WHATSAPP_ADMIN_NUMBER;
  if (admin) {
    await send(
      toWaNumber(admin),
      `New enquiry on nathora.tech\n${e.name} · ${e.phone}\n${e.email}\nService: ${e.service}\n\n${e.message.slice(0, 600)}`,
      "ADMIN_ALERT",
      e.id,
    );
  }
}

export async function sendManual(enquiryId: string, phone: string, body: string) {
  return send(toWaNumber(phone), body, "MANUAL", enquiryId);
}

/** Plain-text alert to the admin number (e.g. a client reported a bug). */
export async function notifyAdmin(text: string, kind: Kind = "BUG_ALERT") {
  const admin = process.env.WHATSAPP_ADMIN_NUMBER;
  if (admin) await send(toWaNumber(admin), text.slice(0, 1000), kind);
}
