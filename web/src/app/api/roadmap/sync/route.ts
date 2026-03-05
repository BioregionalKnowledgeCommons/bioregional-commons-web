import { execSync } from "node:child_process";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.ROADMAP_SYNC_SECRET;
  if (!secret) return Response.json({ error: "Not configured" }, { status: 503 });

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delegate to systemd — no privileged commands in app code
  // --no-block: returns immediately after systemd accepts the job
  try {
    execSync("systemctl start --no-block roadmap-sync-webhook.service", {
      timeout: 5000,
    });
    return Response.json({ status: "accepted" }, { status: 202 });
  } catch (err) {
    console.error(
      "[roadmap/sync] systemctl start failed:",
      (err as Error).message
    );
    return Response.json({ error: "Service start failed" }, { status: 500 });
  }
}
