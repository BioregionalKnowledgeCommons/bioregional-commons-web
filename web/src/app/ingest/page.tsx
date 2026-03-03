'use client';

import Link from 'next/link';
import { IngestPanel } from '@/components/ingest/IngestPanel';

export default function IngestPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              ← Back
            </Link>
            <div className="h-4 w-px bg-gray-700" />
            <div>
              <h1 className="text-base font-semibold text-white">Knowledge Ingest</h1>
              <p className="text-xs text-gray-500">Add a URL to extract entities into the knowledge commons</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <IngestPanel />
      </div>
    </div>
  );
}
