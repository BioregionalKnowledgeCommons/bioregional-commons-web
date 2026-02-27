"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import AuthDialog from "./AuthDialog";

export default function UserMenu() {
  const { user, loading, logout } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  if (loading) return null;

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowDialog(true)}
          className="
            px-3 py-1.5 rounded-lg text-xs font-medium
            bg-blue-600/80 hover:bg-blue-500/90
            border border-blue-500/30
            text-white transition-colors
          "
        >
          Sign In
        </button>
        <AuthDialog open={showDialog} onClose={() => setShowDialog(false)} />
      </>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="
          flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs
          bg-gray-800/60 hover:bg-gray-700/60
          border border-gray-700/40 hover:border-gray-600
          text-gray-300 hover:text-white transition-colors
        "
      >
        <div className="w-5 h-5 rounded-full bg-blue-500/30 border border-blue-400/40 flex items-center justify-center text-[10px] font-bold text-blue-300">
          {user.username[0].toUpperCase()}
        </div>
        <span className="hidden sm:inline">{user.displayName || user.username}</span>
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-[91] w-48 bg-gray-900/95 backdrop-blur-xl rounded-xl border border-gray-700/40 shadow-2xl shadow-black/40 py-1">
            <div className="px-3 py-2 border-b border-gray-800/60">
              <p className="text-xs font-medium text-white truncate">
                {user.displayName || user.username}
              </p>
              <p className="text-[10px] text-gray-500 truncate">
                @{user.username}
              </p>
            </div>
            <button
              onClick={async () => {
                setShowDropdown(false);
                await logout();
              }}
              className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
