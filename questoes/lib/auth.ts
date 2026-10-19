import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getDatabase } from "@/lib/mongodb";

const SESSION_COOKIE = "trilha-session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
const DEVELOPMENT_SECRET = "trilha-local-development-secret-change-before-deploy";

function getSessionSecret() {
  const secret = process.env.AUTH_SECRET;

  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Configure AUTH_SECRET para habilitar sessões em produção.");
  }

  return DEVELOPMENT_SECRET;
}

function safeEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

type UserCredentialDocument = {
  user?: unknown;
  password?: unknown;
};

/** Read the current plaintext credential schema; replace the comparison with a password-hash verifier when migrating users. */
export async function authenticateUser(username: string, password: string) {
  const database = await getDatabase();
  const collectionName = process.env.MONGODB_USERS_COLLECTION?.trim() || "credentials";
  const user = await database.collection<UserCredentialDocument>(collectionName).findOne(
    { user: username.trim() },
    { projection: { _id: 0, user: 1, password: 1 } },
  );

  if (!user) {
    console.warn(`Login: usuário não encontrado em ${database.databaseName}.${collectionName}.`);
    return null;
  }

  if (typeof user.user !== "string" || typeof user.password !== "string") {
    console.warn(`Login: documento inválido em ${database.databaseName}.${collectionName}; confira os campos user e password.`);
    return null;
  }

  if (!safeEqual(password, user.password)) {
    console.warn(`Login: usuário encontrado em ${database.databaseName}.${collectionName}, mas a senha não confere.`);
    return null;
  }

  return { username: user.user };
}

export async function createSession(username: string) {
  const expiresAt = Date.now() + SESSION_DURATION_SECONDS * 1000;
  const payload = Buffer.from(JSON.stringify({ username, expiresAt })).toString("base64url");
  const value = `${payload}.${sign(payload)}`;
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;

  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return null;

  try {
    if (!safeEqual(signature, sign(payload))) return null;

    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      username?: unknown;
      expiresAt?: unknown;
    };

    // Session expiry is time-dependent, so evaluate it only for a real request,
    // never while Next.js is prerendering the page.
    await connection();

    if (typeof session.username !== "string" || typeof session.expiresAt !== "number" || session.expiresAt <= Date.now()) {
      return null;
    }

    return { username: session.username };
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
