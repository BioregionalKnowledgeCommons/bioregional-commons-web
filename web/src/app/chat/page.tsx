"use client";

import Link from "next/link";
import ChatTab from "@/components/node-card/ChatTab";
import UserMenu from "@/components/auth/UserMenu";

const SUGGESTED = [
  "What commitments are in the Victoria Landscape Hub Restoration Pool?",
  "Which organizations work on watershed restoration in the Salish Sea?",
  "How does the routing scorer match commitments to pools?",
];

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            &larr; Back
          </Link>
          <div className="h-4 w-px bg-gray-700" />
          <h1 className="text-base font-semibold flex-1">Ask Octo</h1>
          <span className="text-xs text-gray-500">
            Salish Sea Knowledge Graph — 2,759 entities
          </span>
          <UserMenu />
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 py-4 flex-1 flex flex-col">
        <p className="text-sm text-gray-400 mb-3">
          Ask the bioregional knowledge agent about commitments, organizations,
          practices, and relationships across the Salish Sea and Front Range.
        </p>

        <div className="flex gap-2 flex-wrap mb-4">
          {SUGGESTED.map((q) => (
            <button
              key={q}
              onClick={() => {
                const input = document.querySelector<HTMLInputElement>(
                  'input[type="text"]'
                );
                if (input) {
                  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype,
                    "value"
                  )?.set;
                  nativeInputValueSetter?.call(input, q);
                  input.dispatchEvent(new Event("input", { bubbles: true }));
                  input.focus();
                }
              }}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-full text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-300 transition-colors text-left"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-gray-900/30 border border-gray-800/50 rounded-xl overflow-hidden">
          <ChatTab
            nodeId="octo-salish-sea"
            nodeName="Octo"
            nodeColor="#10b981"
          />
        </div>
      </div>
    </div>
  );
}
