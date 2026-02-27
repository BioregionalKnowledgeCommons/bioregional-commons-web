import "server-only";

export function rpConfig() {
  return {
    rpName: process.env.AUTH_RP_NAME || "Bioregional Knowledge Commons",
    rpID: process.env.AUTH_RP_ID || "localhost",
    origin: process.env.AUTH_RP_ORIGIN || "http://localhost:3000",
  };
}

export function jwtConfig() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) throw new Error("AUTH_JWT_SECRET is required");
  return {
    secret: new TextEncoder().encode(secret),
    issuer: process.env.AUTH_JWT_ISSUER || "bkc-commons",
    ttlSeconds: 72 * 60 * 60, // 72 hours
  };
}
