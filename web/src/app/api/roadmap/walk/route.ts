import { NextRequest, NextResponse } from 'next/server';
import { getRoadmapIndex, walkGraph } from '@/lib/roadmap-index.server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const from = sp.get('from');

    if (!from) {
      return NextResponse.json(
        { error: '"from" query param is required' },
        { status: 400 },
      );
    }

    const idx = getRoadmapIndex();
    const direction = (sp.get('direction') ?? 'forward') as 'forward' | 'backward';
    if (direction !== 'forward' && direction !== 'backward') {
      return NextResponse.json(
        { error: '"direction" must be "forward" or "backward"' },
        { status: 400 },
      );
    }

    const edgeType = sp.get('edge_type') ?? undefined;
    const maxDepthRaw = sp.has('max_depth') ? Number(sp.get('max_depth')) : 5;
    const maxDepth = Number.isFinite(maxDepthRaw) ? maxDepthRaw : 5;

    const result = walkGraph(idx, from, direction, edgeType, maxDepth);

    return NextResponse.json({
      root: from,
      direction,
      edge_type: edgeType ?? 'all',
      node_count: result.nodes.length,
      edge_count: result.edges.length,
      nodes: result.nodes,
      edges: result.edges,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
