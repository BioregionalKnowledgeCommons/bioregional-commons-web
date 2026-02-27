import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { rpConfig } from "@/lib/auth/config.server";
import { authDb } from "@/lib/auth/db.server";
import { storeChallenge } from "@/lib/auth/session.server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { username, displayName } = await request.json();

    if (!username || typeof username !== "string" || username.length < 2 || username.length > 64) {
      return NextResponse.json(
        { error: "Username must be 2-64 characters" },
        { status: 400 }
      );
    }

    // Check if username already taken
    const { rows: existing } = await authDb.query(
      `SELECT id FROM users WHERE username = $1`,
      [username]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    const rp = rpConfig();

    const options = await generateRegistrationOptions({
      rpName: rp.rpName,
      rpID: rp.rpID,
      userName: username,
      userDisplayName: displayName || username,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    await storeChallenge(options.challenge, "registration");

    return NextResponse.json(options);
  } catch (err) {
    console.error("Registration options error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
