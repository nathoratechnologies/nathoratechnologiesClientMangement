import { SignJWT, jwtVerify } from "jose";

import type { Role } from "./db";
export type { Role };
export type SessionPayload = { uid: string; role: Role; name: string };

export const SESSION_COOKIE = "nathora_session";
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");

export async function signSession(p: SessionPayload) {
  return new SignJWT(p).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(key());
}

export async function verifySession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
