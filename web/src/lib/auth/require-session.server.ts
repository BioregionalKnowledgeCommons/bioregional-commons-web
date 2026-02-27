import "server-only";
import { getSession } from "./session.server";
import { authDb } from "./db.server";
import type { SessionPayload } from "@/types/auth";

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new AuthError(401, "Authentication required");
  return session;
}

export async function requireSteward(
  nodeId: string
): Promise<SessionPayload> {
  const session = await requireSession();

  const { rows } = await authDb.query(
    `SELECT 1 FROM commons_memberships
     WHERE user_id = $1 AND node_id = $2 AND role = 'steward'
     UNION
     SELECT 1 FROM users
     WHERE id = $1 AND role = 'admin'`,
    [session.sub, nodeId]
  );

  if (rows.length === 0)
    throw new AuthError(403, "Steward role required for this node");

  return session;
}
