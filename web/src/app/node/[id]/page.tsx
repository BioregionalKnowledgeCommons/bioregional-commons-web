import type { Metadata } from 'next';
import { LIVE_ONLY } from '@/lib/feature-flags';
import { redirect } from 'next/navigation';

const seedImports = LIVE_ONLY
  ? null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  : require('@/data/seed-registry') as typeof import('@/data/seed-registry');

interface NodePageProps {
  params: Promise<{ id: string }>;
}

/** Pre-generate pages for all seed nodes (required for static export) */
export function generateStaticParams() {
  if (LIVE_ONLY || !seedImports) return [];
  return seedImports.seedNodes.map((node: { node_id: string }) => ({ id: node.node_id }));
}

export async function generateMetadata({
  params,
}: NodePageProps): Promise<Metadata> {
  if (LIVE_ONLY || !seedImports) {
    return {
      title: 'Bioregional Knowledge Commons',
      description: 'A federated network of KOI nodes sharing ecological knowledge across bioregions.',
    };
  }

  const { id } = await params;
  const node = seedImports.seedNodes.find((n: { node_id: string }) => n.node_id === id);

  if (!node) {
    return {
      title: 'Node Not Found | Bioregional Knowledge Commons',
      description: 'The requested knowledge commons node could not be found.',
    };
  }

  const bioregion = seedImports.getBioregionForCode(node.bioregion_codes[0]);
  const bioregionName = bioregion?.name ?? node.bioregion_codes[0];
  const domainLabel = node.thematic_domain.replace(/-/g, ' ');
  const tagList = node.topic_tags.join(', ');
  const description = `${node.display_name} — a ${domainLabel} knowledge commons in the ${bioregionName} bioregion. Topics: ${tagList}.`;

  return {
    title: `${node.display_name} | Bioregional Knowledge Commons`,
    description,
  };
}

export default async function NodePage({ params }: NodePageProps) {
  if (LIVE_ONLY) {
    redirect('/');
  }
  const NodePageClient = (await import('./NodePageClient')).default;
  const { id } = await params;
  return <NodePageClient nodeId={id} />;
}
