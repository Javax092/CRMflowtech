import "server-only";

import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "flowcrm_session";

function sessionToken() {
  const email = process.env.ADMIN_EMAIL ?? "admin@flowtecham.com";
  const password = process.env.ADMIN_PASSWORD ?? "admin123";
  const secret = process.env.AUTH_SECRET ?? "flowcrm-dev-secret";
  return createHash("sha256").update(`${email}:${password}:${secret}`).digest("hex");
}

export async function signIn(email: string, password: string) {
  const expectedEmail = process.env.ADMIN_EMAIL ?? "admin@flowtecham.com";
  const expectedPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  if (email !== expectedEmail || password !== expectedPassword) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  return true;
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return false;
  const expected = sessionToken();
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function requireAuth() {
  if (!(await isAuthenticated())) redirect("/login");
}
