import { jwtVerify } from "jose";

export async function verifySessionEdge(
  token: string
): Promise<{ sub: string; username: string } | null> {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { issuer: process.env.AUTH_JWT_ISSUER || "bkc-commons" }
    );
    return {
      sub: payload.sub as string,
      username: payload.username as string,
    };
  } catch {
    return null;
  }
}
