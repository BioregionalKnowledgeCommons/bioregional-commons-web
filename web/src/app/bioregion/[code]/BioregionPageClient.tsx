'use client';

import { useEffect, useState } from 'react';
import { useGlobeStore } from '@/stores/globeStore';
import { assetPath } from '@/lib/constants';
import type { BioregionLookup } from '@/types';
import HomePage from '@/app/page';

interface BioregionPageClientProps {
  code: string;
}

export default function BioregionPageClient({ code }: BioregionPageClientProps) {
  const setSelectedBioregion = useGlobeStore((s) => s.setSelectedBioregion);
  const flyTo = useGlobeStore((s) => s.flyTo);
  const [lookup, setLookup] = useState<BioregionLookup>({});

  useEffect(() => {
    fetch(assetPath('/data/bioregion-lookup.json'))
      .then((res) => res.json())
      .then((data: BioregionLookup) => setLookup(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSelectedBioregion(code);

    const bioregion = lookup[code];
    if (bioregion) {
      const [lng, lat] = bioregion.centroid;
      flyTo(lat, lng);
    }
  }, [code, setSelectedBioregion, flyTo, lookup]);

  return <HomePage />;
}
