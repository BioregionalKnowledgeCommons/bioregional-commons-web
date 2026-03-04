import { NextRequest, NextResponse } from "next/server";
import {
  translateNLtoDSL,
  summarizeResults,
  validateDSL,
} from "@/lib/roadmap-dsl";
import { executeDSL } from "@/lib/roadmap-index.server";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = new Set([
  "https://darrenzal.github.io",
  "https://bioregionalknowledgecommons.github.io",
]);

function corsHeaders(origin?: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function jsonWithCors(body: unknown, origin?: string | null, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders(origin) });
}

// ---------------------------------------------------------------------------
// Rate limiting — 10 req/min per IP
// ---------------------------------------------------------------------------

const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Lazy cleanup: remove expired entries when map grows large
  if (hits.size > 500) {
    hits.forEach((entry, key) => {
      if (entry.resetAt <= now) hits.delete(key);
    });
  }

  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function clientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const ip = clientIP(request);
  if (isRateLimited(ip)) {
    return jsonWithCors({ error: "Rate limit exceeded" }, origin, 429);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonWithCors({ error: "Invalid JSON body" }, origin, 400);
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query || query.length > 500) {
    return jsonWithCors(
      { error: "Missing or invalid query (max 500 chars)" },
      origin,
      400,
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return jsonWithCors({ error: "Roadmap query service unavailable" }, origin, 503);
  }

  try {
    // NL -> DSL
    const dsl = await translateNLtoDSL(query, apiKey);
    if (!dsl) {
      return jsonWithCors(
        { error: "Could not interpret the query as a roadmap question" },
        origin,
        422,
      );
    }

    // Validate
    const validation = validateDSL(dsl);
    if (!validation.valid) {
      return jsonWithCors({ error: validation.error }, origin, 422);
    }

    // Execute
    const results = executeDSL(validation.dsl);

    // Summarize
    const answer = await summarizeResults(query, results, apiKey);

    // Extract sources
    const sources: Array<Record<string, unknown>> = [];
    const extractNodes = (data: unknown) => {
      if (!data || typeof data !== "object") return;
      const d = data as Record<string, unknown>;

      if (Array.isArray(data)) {
        for (const node of data) {
          if (node && typeof node === "object" && "id" in node) {
            sources.push({
              uri: `roadmap:${(node as { id: string }).id}`,
              title:
                (node as { title?: string }).title ??
                (node as { id: string }).id,
            });
          }
        }
      }

      if ("nodes" in d && Array.isArray(d.nodes)) {
        for (const node of d.nodes) {
          if (node && typeof node === "object" && "id" in node) {
            sources.push({
              uri: `roadmap:${(node as { id: string }).id}`,
              title:
                (node as { title?: string }).title ??
                (node as { id: string }).id,
            });
          }
        }
      }

      if ("path" in d && Array.isArray(d.path)) {
        for (const node of d.path) {
          if (node && typeof node === "object" && "id" in node) {
            sources.push({
              uri: `roadmap:${(node as { id: string }).id}`,
              title:
                (node as { title?: string }).title ??
                (node as { id: string }).id,
            });
          }
        }
      }
    };
    extractNodes(results);

    return jsonWithCors({
      answer,
      sources,
      dsl: validation.dsl,
    }, origin);
  } catch (err) {
    console.error("[roadmap/chat]", err);
    return jsonWithCors({ error: "Roadmap query failed" }, origin, 500);
  }
}
