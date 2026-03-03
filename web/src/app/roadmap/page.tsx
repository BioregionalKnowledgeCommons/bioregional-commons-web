import { readFileSync } from 'fs';
import { join } from 'path';
import type { Roadmap } from '@/components/roadmap/roadmap-types';
import { RoadmapViz } from '@/components/roadmap/RoadmapViz';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Roadmap | Bioregional Knowledge Commons',
  description: 'Semantic roadmap: initiatives, work items, milestones, and dependencies.',
};

export default function RoadmapPage() {
  const filePath = join(process.cwd(), 'public', 'roadmap-data.json');
  const raw = readFileSync(filePath, 'utf-8');
  const roadmap: Roadmap = JSON.parse(raw);

  return <RoadmapViz roadmap={roadmap} />;
}
