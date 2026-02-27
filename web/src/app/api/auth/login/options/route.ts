import { NextRequest, NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { rpConfig } from "@/lib/auth/config.server";
import { authDb } from "@/lib/auth/db.server";
import { storeChallenge } from "@/lib/auth/session.server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = body?.username as string | undefined;

    const rp = rpConfig();

    let allowCredentials:
      | { id: string; transports?: AuthenticatorTransportFuture[] }[]
      | undefined;

    if (username) {
      const { rows: userRows } = await authDb.query(
        `SELECT id FROM users WHERE username = $1`,
        [username]
      );
      if (userRows.length === 0) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      const userId = userRows[0].id;

      const { rows: credRows } = await authDb.query(
        `SELECT id, transports FROM credentials WHERE user_id = $1`,
        [userId]
      );
      allowCredentials = credRows.map((r) => ({
        id: r.id as string,
        transports: r.transports as AuthenticatorTransportFuture[] | undefined,
      }));
    }

    const options = await generateAuthenticationOptions({
      rpID: rp.rpID,
      userVerification: "preferred",
      allowCredentials,
    });

    await storeChallenge(options.challenge, "authentication");

    return NextResponse.json(options);
  } catch (err) {
    console.error("Login options error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
