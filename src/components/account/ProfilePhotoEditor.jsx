import React from "react";

// Profile photo upload is temporarily disabled.
// Users are identified by their display name initials in the Vibe Room.
export default function ProfilePhotoEditor({ name, rtPrimary }) {
  const initials = name?.[0]?.toUpperCase() || "U";

  return (
    <div className="flex items-center gap-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center font-heading font-black text-2xl flex-shrink-0"
        style={{
          background: `linear-gradient(135deg,rgba(${rtPrimary},0.2),rgba(${rtPrimary},0.05))`,
          border: `2px solid rgba(${rtPrimary},0.3)`,
          color: `rgb(${rtPrimary})`,
        }}
      >
        {initials}
      </div>
      <div>
        <p className="text-sm font-bold text-white/60">Default Avatar</p>
        <p className="text-xs text-white/30 mt-0.5 leading-relaxed">
          Your avatar displays your initials. Custom profile photos coming soon.
        </p>
      </div>
    </div>
  );
}