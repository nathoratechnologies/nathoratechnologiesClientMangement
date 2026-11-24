import { cert, getApps, initializeApp, refreshToken, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * On Firebase App Hosting the Admin SDK finds its credentials automatically.
 * Locally it uses, in order:
 *   1. FIREBASE_SERVICE_ACCOUNT_KEY (path to a service-account JSON), or
 *   2. your `firebase login` session (dev only, so no key file is needed).
 */
function init(): App {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

  // Vercel / other hosts: the whole service-account JSON pasted into one env var.
  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (keyJson) {
    const sa = JSON.parse(keyJson);
    return initializeApp({ credential: cert(sa), projectId: projectId || sa.project_id });
  }

  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (keyPath) return initializeApp({ credential: cert(JSON.parse(fs.readFileSync(keyPath, "utf8"))), projectId });

  if (process.env.NODE_ENV !== "production" && !process.env.K_SERVICE) {
    const cfg = path.join(os.homedir(), ".config", "configstore", "firebase-tools.json");
    const token = fs.existsSync(cfg) ? JSON.parse(fs.readFileSync(cfg, "utf8"))?.tokens?.refresh_token : undefined;
    if (token) {
      return initializeApp({
        projectId,
        credential: refreshToken({
          type: "authorized_user",
          // Public OAuth client of the Firebase CLI (same values the CLI itself uses).
          client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
          client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
          refresh_token: token,
        }),
      });
    }
  }
  return initializeApp(projectId ? { projectId } : undefined);
}

const g = globalThis as unknown as { firestore?: FirebaseFirestore.Firestore };
export const firestore = g.firestore ?? getFirestore(init());
if (!g.firestore) {
  firestore.settings({ ignoreUndefinedProperties: true });
  g.firestore = firestore;
}
