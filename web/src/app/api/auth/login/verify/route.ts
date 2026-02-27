import { NextRequest, NextResponse } from "next/server";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import { rpConfig } from "@/lib/auth/config.server";
import { authDb } from "@/lib/auth/db.server";
import {
  consumeChallenge,
  createSession,
} from "@/lib/auth/session.server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { credential } = await request.json();

    if (!credential) {
      return NextResponse.json({ error: "Missing credential" }, { status: 400 });
    }

    const expectedChallenge = await consumeChallenge("authentication");
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Challenge expired or missing" },
        { status: 400 }
      );
    }

    // Look up the credential
    const { rows: credRows } = await authDb.query(
      `SELECT c.id, c.user_id, c.public_key, c.counter, c.transports,
              u.username, u.display_name
       FROM credentials c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = $1`,
      [credential.id]
    );

    if (credRows.length === 0) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 400 }
      );
    }

    const stored = credRows[0];
    const rp = rpConfig();

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      credential: {
        id: stored.id,
        publicKey: new Uint8Array(stored.public_key),
        counter: Number(stored.counter),
        transports: stored.transports,
      },
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 }
      );
    }

    // Update counter and last_used
    await authDb.query(
      `UPDATE credentials SET counter = $1, last_used = NOW() WHERE id = $2`,
      [verification.authenticationInfo.newCounter, stored.id]
    );

    // Issue session
    await createSession({
      id: stored.user_id,
      username: stored.username,
      displayName: stored.display_name,
    });

    return NextResponse.json({
      verified: true,
      user: {
        id: stored.user_id,
        username: stored.username,
        displayName: stored.display_name,
      },
    });
  } catch (err) {
    console.error("Login verify error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
