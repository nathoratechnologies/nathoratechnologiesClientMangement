# Nathora Technologies — website + client app

A premium animated website that also installs on phones as an app (PWA). It has three roles:

| Role  | Can do |
|-------|--------|
| **User** (customer / client) | Send enquiries and chat. Clients also see their projects (status, updates, live URL), report bugs and follow each fix, and see hours worked and the amount due |
| **Staff** | Bugs assigned to them: change status, start/stop a timer, see their own hours. Also assigned enquiries |
| **Admin** | Everything: create client logins (username + password), projects with status and hourly rate, post updates, assign bugs to staff, time tracking for everyone, billing reports, users, WhatsApp log |

### Client portal

1. **Dashboard › Clients › New client login.** Give the client a username and password. They sign in at `/login` with either.
2. Open the client and choose **Add a project**. Set its status (Planning → Developing → Testing → Deploying → Live) and the **rate per hour**.
3. Under **Updates**, post what you built, fixed or deployed. The client sees it right away.
4. Clients report bugs from the project page, and the admin gets a WhatsApp alert. On the bug, assign it to a staff member. Status moves Reported → Assigned → Developing → Processing → Deploying → Fixed.
5. Press **Start timer** on a project or bug, then **Stop** when done. Each person runs one timer at a time, and starting a new one stops the old one. Starting work on a bug moves it to *Developing* and shows a green **Working now** badge that the client can see too.
6. **Hours & billing** on the project shows the total hours, the rate and the amount (hours × rate). It counts up live, can be filtered by month and printed or saved as a PDF. Clients see the same report; staff see hours only. Forgotten timers can be added in **Settings › Add time manually**.

7. **Payments.** When a client pays, open the project's **Payments** tab (or Dashboard › Payments, or the client's page) and choose **Record payment**: amount, date, UPI/bank/cash, reference and what it was for. The client sees every payment, the total paid and the balance (work done − paid, or "Paid in advance") on their Payments page and on the project.
8. **Quotations, invoices and receipts.** Upload them in the project's **Documents** tab and choose the **Type**, or use **Upload a quotation** on the Payments tab. The client finds them on the project and under **Payments**. PDFs have a **View** button that opens them in the browser.

Every new enquiry automatically sends a **WhatsApp confirmation to the customer** and a **WhatsApp alert to the admin** (via the WhatsApp Cloud API).

## Live site

**https://nathora-technologies.vercel.app** is hosted on Vercel (account nathoratechnologies). All data (users, enquiries, chat, WhatsApp log) is stored in Firebase **Firestore**, project `nathora-technologies` (nathoratechnologies@gmail.com).

- Admin login: **nathoratechnologies@gmail.com**. The password is `ADMIN_PASSWORD` in `.env`. Change it after you first sign in (Dashboard › Profile).
- Add staff accounts in Dashboard › Users. Customers sign up themselves.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000, uses the SAME live Firestore database
```

Local runs use `service-account.json`, the Firebase key, through `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env`. Never commit or share that file.

## Deploy an update

```bash
npx vercel deploy --prod
```

Live settings are in Vercel › Project › Settings › Environment Variables. On Vercel the Firebase key is stored in `FIREBASE_SERVICE_ACCOUNT_JSON`.

## Settings (`.env`)

| Variable | What it is |
|----------|-----------|
| `NEXT_PUBLIC_PHONE` | Number for the **Call** buttons, e.g. `+919876543210` |
| `NEXT_PUBLIC_WHATSAPP` | Number for the **WhatsApp** buttons, digits only, e.g. `919876543210` |
| `NEXT_PUBLIC_EMAIL` | Contact email |
| `AUTH_SECRET` | Long random string that signs login sessions |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | The first admin, created automatically on the first sign-in |
| `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_KEY` | Firestore access (`_JSON` holds the whole key on Vercel) |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | From Meta › WhatsApp › API Setup. While these are blank, messages are logged as *skipped*. |
| `WHATSAPP_ADMIN_NUMBER` | Number that receives new-enquiry alerts |
| `WHATSAPP_TEMPLATE_NAME` | Approved template for the customer confirmation (see below) |

### Turning on WhatsApp auto-messages

1. Go to <https://developers.facebook.com>, create an app, and add the **WhatsApp** product.
2. Copy the **Phone number ID** and create a **permanent access token** (a System User token in Business Settings).
3. WhatsApp only lets businesses message a customer first with an **approved template**. Create one in WhatsApp Manager, for example `enquiry_received` with the body
   `Hi {{1}}, thank you for contacting Nathora Technologies about {{2}}. Our team will contact you shortly.`
   Then set `WHATSAPP_TEMPLATE_NAME=enquiry_received`.
   For a quick test, use Meta's built-in `hello_world` template.
4. Admin alerts are plain text. They are delivered when the admin number has messaged your business number in the last 24 hours. For guaranteed delivery, use a template for these too.
5. Check results in **Dashboard › WhatsApp** (sent, failed and skipped, with the error text).

## Install as a mobile app

Open the site on a phone:
- **Android (Chrome):** menu › *Install app*
- **iPhone (Safari):** Share › *Add to Home Screen*

It opens full-screen with the Nathora icon and has a bottom tab bar.

## Tech

Next.js 16 (App Router, Server Actions), Firebase Firestore (firebase-admin), Tailwind CSS 4, Motion (animations), JWT session cookies with bcrypt password hashing. Chat updates every 3 seconds by polling, so no extra realtime service is needed.
