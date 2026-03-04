import { NextResponse } from 'next/server';
import { getRoadmapIndex, computeStats } from '@/lib/roadmap-index.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const idx = getRoadmapIndex();
    const stats = computeStats(idx);
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
