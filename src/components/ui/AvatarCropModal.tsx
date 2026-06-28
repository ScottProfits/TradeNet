"use client";
import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { X, ZoomIn, ZoomOut, Check } from "lucide-react";

interface Area { x: number; y: number; width: number; height: number; }

interface Props {
  imageSrc: string;
  onSave: (blob: Blob) => void;
  onClose: () => void;
}

async function getCroppedImg(src: string, crop: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, 400, 400);
  return new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.9));
}

export default function AvatarCropModal({ imageSrc, onSave, onClose }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedArea(croppedPixels);
  }, []);

  async function handleSave() {
    if (!croppedArea) return;
    setSaving(true);
    const blob = await getCroppedImg(imageSrc, croppedArea);
    onSave(blob);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="font-bold text-white">Adjust Photo</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop area */}
        <div className="relative w-full" style={{ height: 320 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom slider */}
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-gray-400" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-[#00C896]"
            />
            <ZoomIn className="w-4 h-4 text-gray-400" />
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-[var(--border)] text-gray-400 rounded-lg text-sm hover:text-white transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-[var(--green)] text-black font-bold rounded-lg text-sm hover:bg-[var(--green)]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {saving ? "Saving..." : "Save Photo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
