import React, { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import VibeAvatar from "./VibeAvatar";

// Compress image to max 600px wide, JPEG quality 0.75
async function compressImage(file, maxWidth = 600, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function AvatarUpload({ name, currentAvatarUrl, onUploaded }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const compressedFile = new File([compressed], "avatar.jpg", { type: "image/jpeg" });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressedFile });
      await base44.auth.updateMe({ vibe_avatar_url: file_url });
      onUploaded(file_url);
    } catch (_) {
      // silently fail
    }
    setUploading(false);
  };

  return (
    <div className="relative inline-block">
      <VibeAvatar name={name} avatarUrl={currentAvatarUrl} size={72} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
        style={{
          background: "linear-gradient(135deg,#7C3AED,#9B7EFF)",
          border: "2px solid #0d0d22",
          boxShadow: "0 2px 8px rgba(155,126,255,0.4)",
        }}>
        {uploading
          ? <Loader2 className="w-3 h-3 text-white animate-spin" />
          : <Camera className="w-3 h-3 text-white" />}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}