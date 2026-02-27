"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { register, login } from "@/lib/auth/client";
import { useAuth } from "./AuthProvider";

type Tab = "signin" | "create";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthDialog({ open, onClose }: AuthDialogProps) {
  const { refresh } = useAuth();
  const [tab, setTab] = useState<Tab>("signin");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setError("");
    setBusy(true);
    try {
      await login(username || undefined);
      await refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate() {
    setError("");
    if (!username.trim()) {
      setError("Username is required");
      return;
    }
    setBusy(true);
    try {
      await register(username.trim(), displayName.trim() || undefined);
      await refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "signin") handleSignIn();
    else handleCreate();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-label="Authentication"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/40 shadow-2xl shadow-black/40 p-6 w-[380px] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-6 h-6 rounded-md bg-gray-800/80 border border-gray-700/40 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 bg-gray-800/50 rounded-lg p-1">
              <button
                onClick={() => { setTab("signin"); setError(""); }}
                className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
                  tab === "signin"
                    ? "bg-gray-700/80 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setTab("create"); setError(""); }}
                className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${
                  tab === "create"
                    ? "bg-gray-700/80 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === "signin" ? (
                <>
                  <p className="text-sm text-gray-400 mb-3">
                    Use your passkey to sign in. Leave username blank for discoverable passkeys.
                  </p>
                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                      Username (optional)
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="your-username"
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                      autoComplete="username webauthn"
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-400 mb-3">
                    Create a passkey — no passwords needed.
                  </p>
                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="your-username"
                      required
                      minLength={2}
                      maxLength={64}
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                      autoComplete="username"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                      Display Name (optional)
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your Name"
                      maxLength={128}
                      className="w-full bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                      autoComplete="name"
                    />
                  </div>
                </>
              )}

              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 rounded-lg text-sm font-medium transition-colors bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy
                  ? "Waiting for passkey..."
                  : tab === "signin"
                    ? "Sign In with Passkey"
                    : "Create Passkey"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
