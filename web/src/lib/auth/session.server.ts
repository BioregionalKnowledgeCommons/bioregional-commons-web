import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { authDb } from "./db.server";
import { jwtConfig } from "./config.server";
import type { SessionPayload } from "@/types/auth";

const COOKIE_NAME = "bkc_session";
const CHALLENGE_COOKIE = "bkc_challenge";

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSession(user: {
  id: string;
  username: string;
  displayName?: string;
}): Promise<void> {
  const cfg = jwtConfig();
  const expiresAt = new Date(Date.now() + cfg.ttlSeconds * 1000);

  const token = await new SignJWT({
    sub: user.id,
    username: user.username,
    displayName: user.displayName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(cfg.issuer)
    .setExpirationTime(expiresAt)
    .sign(cfg.secret);

  const tokenHash = await sha256(token);

  await authDb.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, tokenHash, expiresAt]
  );

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/commons",
    expires: expiresAt,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const cfg = jwtConfig();
    const { payload } = await jwtVerify(token, cfg.secret, {
      issuer: cfg.issuer,
    });

    const tokenHash = await sha256(token);
    const { rows } = await authDb.query(
      `SELECT 1 FROM sessions WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()`,
      [tokenHash]
    );
    if (rows.length === 0) return null;

    return {
      sub: payload.sub as string,
      username: payload.username as string,
      displayName: payload.displayName as string | undefined,
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;

  if (token) {
    const tokenHash = await sha256(token);
    await authDb.query(
      `UPDATE sessions SET revoked = true WHERE token_hash = $1`,
      [tokenHash]
    );
  }

  jar.delete(COOKIE_NAME);
}

export async function storeChallenge(
  challenge: string,
  type: "registration" | "authentication",
  userId?: string
): Promise<string> {
  const { rows } = await authDb.query(
    `INSERT INTO challenges (challenge, type, user_id) VALUES ($1, $2, $3) RETURNING id`,
    [challenge, type, userId ?? null]
  );
  const challengeId = rows[0].id as string;

  const jar = await cookies();
  jar.set(CHALLENGE_COOKIE, challengeId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/commons",
    maxAge: 300, // 5 minutes
  });

  return challengeId;
}

export async function consumeChallenge(
  expectedType: "registration" | "authentication"
): Promise<string | null> {
  const jar = await cookies();
  const challengeId = jar.get(CHALLENGE_COOKIE)?.value;
  if (!challengeId) return null;

  jar.delete(CHALLENGE_COOKIE);

  const { rows } = await authDb.query(
    `DELETE FROM challenges WHERE id = $1 AND type = $2 AND expires_at > NOW() RETURNING challenge`,
    [challengeId, expectedType]
  );
  if (rows.length === 0) return null;
  return rows[0].challenge as string;
}
