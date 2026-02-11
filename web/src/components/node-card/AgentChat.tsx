'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NodeEntry } from '@/types';
import { DOMAIN_COLORS } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: Array<{ path: string; section?: string }>;
}

interface AgentChatProps {
  node: NodeEntry;
}

// Node-specific demo knowledge bases
const NODE_KNOWLEDGE: Record<
  string,
  { name: string; topics: string[]; responses: Record<string, { text: string; sources: Array<{ path: string; section?: string }> }> }
> = {
  'colorado-plateau-water': {
    name: 'Colorado Plateau Watershed Commons',
    topics: ['water rights', 'prior appropriation', 'drought management', 'Colorado River Compact'],
    responses: {
      water: {
        text: `In the Colorado Plateau, water governance is based on the Prior Appropriation Doctrine, modified by the Colorado River Compact of 1922. Key principles include:\n\n• **"First in time, first in right"** - Senior water rights take precedence\n• **Beneficial use** - Water must be put to productive use\n• **Compact allocations** - The Colorado River Compact divides water between Upper and Lower Basin states\n\nOur vault contains detailed documentation on allocation procedures and recent drought contingency plans.`,
        sources: [
          { path: 'governance/water-rights.md', section: 'Prior Appropriation' },
          { path: 'governance/colorado-river-compact.md' },
        ],
      },
      maintain: {
        text: `This commons is maintained by volunteer stewards from across the Colorado Plateau bioregion. Current maintainers include representatives from:\n\n• Water conservation districts\n• Indigenous water rights advocates\n• Agricultural water users\n• Municipal water authorities\n\nMonthly coordination calls and GitHub-based collaboration keep the knowledge current.`,
        sources: [
          { path: 'community/maintainers.md' },
          { path: 'governance/stewardship-roles.md' },
        ],
      },
      contribute: {
        text: `There are several ways to contribute:\n\n1. **Document local knowledge** - Water agreements, historical records, maps\n2. **Improve existing pages** - Add missing context or fix outdated info\n3. **Join governance discussions** - Participate in decision-making\n4. **Become a steward** - Help review and curate contributions\n\nAll contributions go through peer review by domain experts.`,
        sources: [
          { path: 'contributing.md' },
          { path: 'governance/review-process.md' },
        ],
      },
    },
  },
  'sierra-nevada-water': {
    name: 'Sierra Nevada Water Systems',
    topics: ['snowpack monitoring', 'water allocation', 'reservoir management', 'riparian ecosystems'],
    responses: {
      water: {
        text: `Sierra Nevada water management centers on snowpack - our natural reservoir. Key knowledge areas include:\n\n• **Snow water equivalent (SWE) monitoring** - Tracking seasonal snowpack\n• **Reservoir operations** - Managing releases for multiple uses\n• **Riparian ecosystem health** - Balancing water needs with habitat\n• **Climate adaptation** - Adjusting to changing snowmelt patterns\n\nOur vault tracks real-time data and historical trends.`,
        sources: [
          { path: 'ecology/snowpack-monitoring.md', section: 'SWE Trends' },
          { path: 'practice/reservoir-operations.md' },
        ],
      },
      maintain: {
        text: `This commons is maintained by water scientists, land managers, and community members throughout the Sierra Nevada. We collaborate with:\n\n• University research stations\n• National Forest staff\n• Local watershed councils\n• Indigenous stewardship organizations`,
        sources: [{ path: 'community/partners.md' }],
      },
      contribute: {
        text: `Contributions are welcome! You can:\n\n1. **Share monitoring data** - Snow surveys, stream gauges, wildlife observations\n2. **Document traditional practices** - Historical water management knowledge\n3. **Update forecasts** - Help maintain seasonal predictions\n4. **Translate content** - Make knowledge accessible to more communities`,
        sources: [{ path: 'contributing.md' }],
      },
    },
  },
  default: {
    name: 'Bioregional Knowledge Commons',
    topics: ['local ecology', 'governance', 'community practices'],
    responses: {
      water: {
        text: `This bioregional commons contains knowledge about local water systems, including:\n\n• Watershed boundaries and hydrology\n• Water governance frameworks\n• Conservation practices\n• Climate adaptation strategies\n\nExplore our vault to learn more about water in this bioregion.`,
        sources: [{ path: 'ecology/watersheds.md' }],
      },
      maintain: {
        text: `Each knowledge commons is maintained by local stewards who understand the bioregion's unique characteristics. Stewards are responsible for:\n\n• Reviewing contributions for accuracy\n• Keeping information current\n• Connecting with other nodes in the network\n• Facilitating community discussions`,
        sources: [{ path: 'community/stewards.md' }],
      },
      contribute: {
        text: `You can contribute to this commons by:\n\n1. **Adding local knowledge** - Documents, maps, or historical records\n2. **Improving existing pages** - Fix errors or add missing information\n3. **Joining discussions** - Participate in governance conversations\n4. **Becoming a steward** - Help maintain and curate the commons`,
        sources: [{ path: 'contributing.md' }],
      },
    },
  },
};

export default function AgentChat({ node }: AgentChatProps) {
  const domainColor = DOMAIN_COLORS[node.thematic_domain];
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'system',
      content: `Welcome to the ${node.display_name} knowledge commons. Ask me anything about ${node.topic_tags.slice(0, 3).join(', ')}, or local knowledge in this bioregion.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get demo response based on message content
  const getDemoResponse = useCallback(
    (message: string): { text: string; sources: Array<{ path: string; section?: string }> } => {
      const knowledge = NODE_KNOWLEDGE[node.node_id] || NODE_KNOWLEDGE.default;
      const lowercaseMessage = message.toLowerCase();

      // Match keywords to responses
      if (
        lowercaseMessage.includes('water') ||
        lowercaseMessage.includes('rights') ||
        lowercaseMessage.includes('river') ||
        lowercaseMessage.includes('snow') ||
        lowercaseMessage.includes('drought')
      ) {
        return knowledge.responses.water;
      }

      if (
        lowercaseMessage.includes('maintain') ||
        lowercaseMessage.includes('who') ||
        lowercaseMessage.includes('steward')
      ) {
        return knowledge.responses.maintain;
      }

      if (
        lowercaseMessage.includes('contribute') ||
        lowercaseMessage.includes('help') ||
        lowercaseMessage.includes('add') ||
        lowercaseMessage.includes('join')
      ) {
        return knowledge.responses.contribute;
      }

      // Default response
      return {
        text: `The ${knowledge.name} contains knowledge about ${knowledge.topics.join(', ')}. Try asking about specific topics like water governance, how to contribute, or who maintains this commons.\n\n*This is a demo response. In the full system, I would search the vault using RAG to find relevant information.*`,
        sources: [{ path: 'index.md' }],
      };
    },
    [node.node_id]
  );

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate network delay for demo responses
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400));

    const response = getDemoResponse(userMessage.content);

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: response.text,
      timestamp: new Date(),
      sources: response.sources,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  }, [input, isLoading, getDemoResponse]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    `What ${node.topic_tags[0]} knowledge is available here?`,
    `Who maintains this commons?`,
    `How can I contribute?`,
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="space-y-3"
    >
      {/* Section Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 flex items-center gap-2">
          AI Agent Chat
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 font-medium normal-case tracking-normal">
            Demo
          </span>
        </h3>
      </div>

      {/* Chat Container */}
      <div
        className="rounded-xl overflow-hidden border border-gray-700/30"
        style={{ backgroundColor: `${domainColor}04` }}
      >
        {/* Messages Area */}
        <div className="h-[280px] overflow-y-auto p-3 space-y-3">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                domainColor={domainColor}
              />
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2"
            >
              <div
                className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: `${domainColor}30` }}
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: domainColor }}
                />
              </div>
              <div className="bg-gray-800/60 rounded-xl px-3 py-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                      className="w-1.5 h-1.5 rounded-full bg-gray-400"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions (shown when no user messages yet) */}
        {messages.filter((m) => m.role === 'user').length === 0 && (
          <div className="px-3 pb-2 space-y-1.5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">
              Suggested questions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                  className="text-[11px] px-2 py-1 rounded-lg bg-gray-800/60 border border-gray-700/30 text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-3 border-t border-gray-700/20">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              disabled={isLoading}
              className="flex-1 h-9 px-3 rounded-lg bg-gray-800/60 border border-gray-700/30 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              style={{
                backgroundColor: input.trim() ? `${domainColor}30` : 'rgba(255,255,255,0.05)',
                border: `1px solid ${input.trim() ? `${domainColor}40` : 'rgba(255,255,255,0.1)'}`,
              }}
              aria-label="Send message"
            >
              <svg
                className="w-4 h-4"
                style={{ color: input.trim() ? domainColor : '#6B7280' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Message Bubble Component ────────────────────────────────────────
interface MessageBubbleProps {
  message: Message;
  domainColor: string;
}

function MessageBubble({ message, domainColor }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div
          className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{
            backgroundColor: isSystem ? 'rgba(255,255,255,0.1)' : `${domainColor}30`,
          }}
        >
          {isSystem ? (
            <svg
              className="w-3 h-3 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-3 h-3"
              style={{ color: domainColor }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1 max-w-[85%]">
        <div
          className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
            isUser
              ? 'bg-gray-700/60 text-white'
              : isSystem
                ? 'bg-gray-800/40 text-gray-400'
                : 'bg-gray-800/60 text-gray-200'
          }`}
          style={
            !isUser && !isSystem
              ? { borderLeft: `2px solid ${domainColor}40` }
              : undefined
          }
        >
          {message.content}
        </div>

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.sources.map((source, i) => (
              <span
                key={i}
                className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800/40 text-gray-500 border border-gray-700/20"
              >
                {source.section || source.path.split('/').pop()}
              </span>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-6 h-6 rounded-full bg-gray-600/40 flex-shrink-0 flex items-center justify-center">
          <svg
            className="w-3 h-3 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      )}
    </motion.div>
  );
}
