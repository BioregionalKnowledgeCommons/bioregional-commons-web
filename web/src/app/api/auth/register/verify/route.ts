import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import { rpConfig } from "@/lib/auth/config.server";
import { authDb } from "@/lib/auth/db.server";
import {
  consumeChallenge,
  createSession,
} from "@/lib/auth/session.server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { credential, username, displayName } = await request.json();

    if (!credential || !username) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const expectedChallenge = await consumeChallenge("registration");
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Challenge expired or missing" },
        { status: 400 }
      );
    }

    const rp = rpConfig();

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 }
      );
    }

    const { credential: cred, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    // Create user + credential in one transaction
    const client = await authDb.connect();
    let userId: string;
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `INSERT INTO users (username, display_name) VALUES ($1, $2) RETURNING id`,
        [username, displayName || username]
      );
      userId = rows[0].id as string;

      await client.query(
        `INSERT INTO credentials (id, user_id, public_key, counter, transports, device_type, backed_up)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          cred.id,
          userId,
          Buffer.from(cred.publicKey),
          cred.counter,
          credential.response?.transports ?? [],
          credentialDeviceType,
          credentialBackedUp,
        ]
      );

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      // unique_violation on username
      if ((txErr as { code?: string }).code === "23505") {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 409 }
        );
      }
      throw txErr;
    } finally {
      client.release();
    }

    // Issue session (outside transaction — cookie + session table, non-critical)
    await createSession({
      id: userId,
      username,
      displayName: displayName || username,
    });

    return NextResponse.json({
      verified: true,
      user: { id: userId, username, displayName: displayName || username },
    });
  } catch (err) {
    console.error("Registration verify error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
