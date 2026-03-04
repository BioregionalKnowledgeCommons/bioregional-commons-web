import { NextRequest, NextResponse } from 'next/server';
import { getRoadmapIndex, findShortestPath } from '@/lib/roadmap-index.server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const from = sp.get('from');
    const to = sp.get('to');

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Both "from" and "to" query params are required' },
        { status: 400 },
      );
    }

    const idx = getRoadmapIndex();
    const edgeTypesRaw = sp.get('edge_types');
    const edgeTypes = edgeTypesRaw
      ? new Set(edgeTypesRaw.split(',').map((t) => t.trim()))
      : undefined;
    const maxDepthRaw = sp.has('max_depth') ? Number(sp.get('max_depth')) : 6;
    const maxDepth = Number.isFinite(maxDepthRaw) ? maxDepthRaw : 6;

    const result = findShortestPath(idx, from, to, edgeTypes, maxDepth);

    // Enrich path with node details
    const pathNodes = result.path.map((id) => idx.nodeById.get(id)).filter(Boolean);

    return NextResponse.json({
      found: result.found,
      path: pathNodes,
      edges: result.edges,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
