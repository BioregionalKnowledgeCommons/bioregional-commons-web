import { NextRequest, NextResponse } from 'next/server';
import { getRoadmapIndex, filterNodes } from '@/lib/roadmap-index.server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const idx = getRoadmapIndex();

    const tags = sp.get('tags');
    const nodes = filterNodes(idx, {
      status: sp.get('status') ?? undefined,
      kind: sp.get('kind') ?? undefined,
      owner: sp.get('owner') ?? undefined,
      horizon: sp.get('horizon') ?? undefined,
      priority: sp.get('priority') ?? undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()) : undefined,
      limit: sp.has('limit') ? (Number(sp.get('limit')) || undefined) : undefined,
      offset: sp.has('offset') ? (Number(sp.get('offset')) || 0) : undefined,
    });

    return NextResponse.json({ count: nodes.length, nodes });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
