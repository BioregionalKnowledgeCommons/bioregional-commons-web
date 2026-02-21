import type { Metadata } from 'next';
import { LIVE_ONLY } from '@/lib/feature-flags';
import BioregionPageClient from './BioregionPageClient';

const seedImports = LIVE_ONLY
  ? null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  : require('@/data/seed-registry') as typeof import('@/data/seed-registry');

interface BioregionPageProps {
  params: Promise<{ code: string }>;
}

export function generateStaticParams() {
  if (LIVE_ONLY || !seedImports) return [];
  return Object.keys(seedImports.bioregionLookup).map((code) => ({ code }));
}

export async function generateMetadata({
  params,
}: BioregionPageProps): Promise<Metadata> {
  const { code } = await params;

  if (!seedImports) {
    return {
      title: 'Bioregional Knowledge Commons',
      description: 'A federated network of KOI nodes sharing ecological knowledge across bioregions.',
    };
  }

  const bioregion = seedImports.bioregionLookup[code];
  if (!bioregion) {
    return {
      title: 'Bioregion Not Found | Bioregional Knowledge Commons',
      description: 'The requested bioregion could not be found.',
    };
  }

  const nodeCount = seedImports.seedNodes.filter((n: { bioregion_codes: string[] }) =>
    n.bioregion_codes.includes(code)
  ).length;
  const nodeLabel = nodeCount === 1 ? '1 knowledge commons node' : `${nodeCount} knowledge commons nodes`;
  const description = `${bioregion.name} (${bioregion.code}) — a bioregion in the ${bioregion.realm} realm (${bioregion.subrealm}). Home to ${nodeLabel}.`;

  return {
    title: `${bioregion.name} | Bioregional Knowledge Commons`,
    description,
  };
}

export default async function BioregionPage({ params }: BioregionPageProps) {
  const { code } = await params;
  return <BioregionPageClient code={code} />;
}
