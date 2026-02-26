'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import type { ChatMessage } from '@/types';

interface ChatTabProps {
  nodeId: string;
  nodeName: string;
  nodeColor: string;
}

export default function ChatTab({ nodeId, nodeName, nodeColor }: ChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatMutation = useChat(nodeId);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || text.length > 500 || chatMutation.isPending) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    try {
      const result = await chatMutation.mutateAsync(text);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
        intent: result.intent,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Something went wrong. Try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div
              className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ backgroundColor: `${nodeColor}15` }}
            >
              <svg className="w-5 h-5" style={{ color: nodeColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">
              Ask about {nodeName}&apos;s knowledge base
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Searches across entities, relationships, and documents
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-gray-700/60 text-gray-200'
                  : 'bg-gray-800/50 border border-gray-700/30 text-gray-300'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                    {msg.sources.length} source{msg.sources.length !== 1 ? 's' : ''}
                  </summary>
                  <div className="mt-1.5 space-y-1">
                    {msg.sources.map((s, si) => (
                      <div
                        key={si}
                        className="text-xs text-gray-500 bg-gray-900/50 rounded px-2 py-1"
                      >
                        <span className="text-gray-400">{s.label}</span>
                        <span className="text-gray-600 ml-1.5">{s.entity_type}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        ))}

        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-gray-800/50 border border-gray-700/30 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                Searching knowledge base...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-700/30 p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 500))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Ask ${nodeName}...`}
            className="flex-1 bg-gray-800/60 border border-gray-700/40 rounded-lg px-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-600"
            disabled={chatMutation.isPending}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: `${nodeColor}20`,
              color: nodeColor,
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <div className="text-[10px] text-gray-600 mt-1 text-right">
          {input.length}/500
        </div>
      </div>
    </div>
  );
}
