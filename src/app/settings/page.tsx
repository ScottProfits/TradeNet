"use client";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { CheckCircle, Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";
import AvatarCropModal from "@/components/ui/AvatarCropModal";

export default function SettingsPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [handle, setHandle] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [brokerage, setBrokerage] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch("/api/profile/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setHandle(d.handle ?? "");
          setFullName(d.full_name ?? "");
          setBio(d.bio ?? "");
          setBrokerage(d.brokerage ?? "");
          setAvatarPreview(d.avatar_url ?? "");
        }
        setLoading(false);
      });
  }, [userId]);

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    e.target.value = "";
  }

  async function handleCropSave(blob: Blob) {
    if (!userId) return;
    setCropSrc(null);
    setUploadingAvatar(true);
    setError("");

    const path = `avatars/${userId}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("trade-images")
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      setError("Photo upload failed: " + uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage.from("trade-images").getPublicUrl(path);
    const url = data.publicUrl + `?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
    setAvatarPreview(url);
    setUploadingAvatar(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSaved(false);

    const res = await fetch("/api/profile/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle, full_name: fullName, bio, brokerage }),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(await res.text());
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto pt-20 text-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  const initials = handle.slice(0, 2).toUpperCase() || "?";

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Profile Settings</h1>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-6">

        {/* Avatar upload */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-[var(--green)]"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-3xl border-2 border-[var(--border)]">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 w-8 h-8 bg-[var(--green)] rounded-full flex items-center justify-center hover:bg-[var(--green)]/90 transition-colors shadow-lg"
            >
              <Camera className="w-4 h-4 text-black" />
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {uploadingAvatar ? "Uploading..." : "Tap the camera to change your photo"}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFilePick}
          />
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Handle</label>
            <div className="flex items-center bg-[var(--bg)] border border-[var(--border)] rounded-lg overflow-hidden focus-within:border-[var(--green)]">
              <span className="pl-3 text-gray-500 text-sm">@</span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="yourhandle"
                maxLength={30}
                required
                className="flex-1 bg-transparent px-2 py-2.5 text-white text-sm focus:outline-none"
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">Letters, numbers, underscores only</p>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Display name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your Name"
              maxLength={50}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)]"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Brokerage</label>
            <select
              value={brokerage}
              onChange={(e) => setBrokerage(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--green)]"
            >
              <option value="">Select your brokerage</option>
              <option>TD Ameritrade</option>
              <option>Interactive Brokers</option>
              <option>Webull</option>
              <option>Robinhood</option>
              <option>E*TRADE</option>
              <option>Charles Schwab</option>
              <option>Fidelity</option>
              <option>Tastytrade</option>
              <option>TradeStation</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell traders about your style..."
              maxLength={160}
              rows={3}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] resize-none"
            />
            <p className="text-xs text-gray-600 mt-1">{bio.length}/160</p>
          </div>

          {error && <p className="text-[var(--red)] text-sm">{error}</p>}

          {saved && (
            <div className="flex items-center gap-2 text-[var(--green)] text-sm">
              <CheckCircle className="w-4 h-4" />
              Profile saved!
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-[var(--green)] text-black font-bold rounded-lg hover:bg-[var(--green)]/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/profile/${handle}`)}
              className="px-4 py-2.5 border border-[var(--border)] text-gray-400 rounded-lg hover:text-white transition-colors text-sm"
            >
              View Profile
            </button>
          </div>
        </form>
      </div>

      {cropSrc && (
        <AvatarCropModal
          imageSrc={cropSrc}
          onSave={handleCropSave}
          onClose={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}
