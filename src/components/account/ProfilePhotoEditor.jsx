import React, { useRef, useState } from "react";
import { Camera, ImagePlus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Compress/resize image to max 600px, JPEG 0.82 quality
async function compressImage(file, maxWidth = 600, quality = 0.82) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfilePhotoEditor({ name, currentAvatarUrl, rtPrimary, onUpdated }) {
  const libraryRef = useRef(null);
  const cameraRef  = useRef(null);
  const [preview, setPreview]   = useState(null); // local blob URL for preview
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess]   = useState(false);

  const processFile = async (file) => {
    if (!file) return;
    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setSuccess(false);
    setUploading(true);
    const compressed = await compressImage(file);
    const uploadFile = new File([compressed], "avatar.jpg", { type: "image/jpeg" });
    const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadFile });
    await base44.auth.updateMe({ vibe_avatar_url: file_url });
    onUpdated(file_url);
    setUploading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleRemove = async () => {
    setUploading(true);
    setPreview(null);
    await base44.auth.updateMe({ vibe_avatar_url: null });
    onUpdated(null);
    setUploading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const displayUrl = preview || currentAvatarUrl;
  const initials = name?.[0]?.toUpperCase() || "U";

  return (
    <div className="flex items-center gap-5">
      {/* Avatar preview */}
      <div className="relative flex-shrink-0">
        <div
          className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center font-heading font-black text-2xl flex-shrink-0"
          style={{
            background: displayUrl ? "transparent" : `linear-gradient(135deg,rgba(${rtPrimary},0.2),rgba(${rtPrimary},0.05))`,
            border: `2px solid rgba(${rtPrimary},0.3)`,
            color: `rgb(${rtPrimary})`,
          }}
        >
          {displayUrl
            ? <img src={displayUrl} alt="Profile" className="w-full h-full object-cover" />
            : initials
          }
        </div>
        {uploading && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.55)" }}>
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
        {success && !uploading && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.45)" }}>
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2 flex-1">
        {/* Take Photo — uses camera on mobile */}
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all active:scale-95 disabled:opacity-50"
          style={{
            background: `rgba(${rtPrimary},0.1)`,
            border: `1px solid rgba(${rtPrimary},0.3)`,
            color: `rgb(${rtPrimary})`,
          }}>
          <Camera className="w-3.5 h-3.5" />
          Take Photo
        </button>

        {/* Choose from library */}
        <button
          onClick={() => libraryRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all active:scale-95 disabled:opacity-50"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)",
          }}>
          <ImagePlus className="w-3.5 h-3.5" />
          Choose from Library
        </button>

        {/* Remove photo */}
        {displayUrl && (
          <button
            onClick={handleRemove}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
            style={{ color: "rgba(239,68,68,0.6)" }}>
            <Trash2 className="w-3 h-3" />
            Remove Photo
          </button>
        )}
      </div>

      {/* Hidden inputs */}
      {/* Camera input — triggers native camera on iOS/Android */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => processFile(e.target.files?.[0])}
      />
      {/* Library input — no capture attr so it opens photo library */}
      <input
        ref={libraryRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => processFile(e.target.files?.[0])}
      />
    </div>
  );
}