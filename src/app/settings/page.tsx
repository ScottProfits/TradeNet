"use client";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { CheckCircle, Camera, ShieldCheck, Zap } from "lucide-react";
import RithmicConnectModal from "@/components/brokers/RithmicConnectModal";
import AlpacaConnectModal from "@/components/brokers/AlpacaConnectModal";
import { supabase } from "@/lib/supabase";
import AvatarCropModal from "@/components/ui/AvatarCropModal";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

export default function SettingsPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [handle, setHandle] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [brokerage, setBrokerage] = useState("");
  const [tradingStyle, setTradingStyle] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [discord, setDiscord] = useState("");
  const [youtube, setYoutube] = useState("");
  const [website, setWebsite] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [rithmicModalOpen, setRithmicModalOpen] = useState(false);
  const [alpacaModalOpen, setAlpacaModalOpen] = useState(false);
  const [alpacaConnected, setAlpacaConnected] = useState(false);
  const [disconnectingAlpaca, setDisconnectingAlpaca] = useState(false);
  const [verifyRequest, setVerifyRequest] = useState<{ status: string; reason: string } | null>(null);
  const [verifyReason, setVerifyReason] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
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
          setTradingStyle(d.trading_style ?? "");
          setAvatarPreview(d.avatar_url ?? "");
          setInstagram(d.instagram ?? "");
          setTiktok(d.tiktok ?? "");
          setDiscord(d.discord ?? "");
          setYoutube(d.youtube ?? "");
          setWebsite(d.website ?? "");

        }
        setLoading(false);
      });
    fetch("/api/verify-request").then((r) => r.ok ? r.json() : null).then((d) => {
      if (d) { setVerifyRequest(d); setVerifyReason(d.reason ?? ""); }
    });
    fetch("/api/brokers/alpaca").then((r) => r.ok ? r.json() : null).then((d) => {
      if (d) setAlpacaConnected(!!d.connected);
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
    await fetch("/api/profile/avatar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar_url: url }),
    });
    setAvatarPreview(url);
    setUploadingAvatar(false);
  }

  async function handleDisconnectAlpaca() {
    setDisconnectingAlpaca(true);
    await fetch("/api/brokers/alpaca", { method: "DELETE" });
    setAlpacaConnected(false);
    setDisconnectingAlpaca(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSaved(false);

    const res = await fetch("/api/profile/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle, full_name: fullName, bio, brokerage, trading_style: tradingStyle, instagram, tiktok, discord, youtube, website }),
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

  const isNewUser = handle.startsWith("user_");

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {isNewUser && (
        <div className="bg-[var(--green)]/10 border border-[var(--green)]/30 rounded-xl px-4 py-3">
          <p className="text-green-400 text-sm font-semibold">Welcome to Ryzr! 👋</p>
          <p className="text-gray-400 text-sm mt-0.5">Set your handle and display name to complete your profile.</p>
        </div>
      )}
      <h1 className="text-2xl font-bold text-white">{isNewUser ? "Complete Your Profile" : "Profile Settings"}</h1>

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
            <label className="text-sm text-gray-400 mb-1 block">Trading Style</label>
            <select
              value={tradingStyle}
              onChange={(e) => setTradingStyle(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--green)]"
            >
              <option value="">Select your trading style</option>
              <option value="Day Trader">Day Trader</option>
              <option value="Swing Trader">Swing Trader</option>
              <option value="Scalper">Scalper</option>
              <option value="Position Trader">Position Trader</option>
              <option value="Options Trader">Options Trader</option>
              <option value="Investor">Investor</option>
            </select>
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

          {/* Social Links */}
          <div className="space-y-3 pt-2">
            <p className="text-sm font-semibold text-white">Social Links</p>
            {[
              { label: "Instagram", icon: "📸", value: instagram, set: setInstagram, placeholder: "instagram.com/yourhandle" },
              { label: "TikTok", icon: "🎵", value: tiktok, set: setTiktok, placeholder: "tiktok.com/@yourhandle" },
              { label: "Discord", icon: "🎮", value: discord, set: setDiscord, placeholder: "discord.gg/yourserver" },
              { label: "YouTube", icon: "▶️", value: youtube, set: setYoutube, placeholder: "youtube.com/@yourchannel" },
              { label: "Website", icon: "🌐", value: website, set: setWebsite, placeholder: "yoursite.com" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span className="text-lg w-7 shrink-0">{s.icon}</span>
                <div className="flex-1">
                  <input
                    value={s.value}
                    onChange={(e) => s.set(e.target.value)}
                    placeholder={s.placeholder}
                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)]"
                  />
                </div>
              </div>
            ))}
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

      {/* Verification request */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <VerifiedBadge className="w-5 h-5" />
          <h2 className="font-bold text-white">Request Verification</h2>
        </div>
        <p className="text-sm text-gray-400">
          Verified traders receive the bullish candle badge next to their name. Tell us who you are and why you should be verified.
        </p>

        {verifyRequest?.status === "pending" && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3">
            <p className="text-yellow-400 text-sm font-medium">Request pending review</p>
            <p className="text-gray-400 text-xs mt-1">We'll notify you once reviewed.</p>
          </div>
        )}

        {verifyRequest?.status === "approved" && (
          <div className="bg-[var(--green)]/10 border border-[var(--green)]/30 rounded-lg px-4 py-3 flex items-center gap-2">
            <VerifiedBadge className="w-4 h-4" />
            <p className="text-[var(--green)] text-sm font-medium">You are verified!</p>
          </div>
        )}

        {verifyRequest?.status === "rejected" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
            <p className="text-red-400 text-sm font-medium">Request not approved</p>
            <p className="text-gray-400 text-xs mt-1">You can submit a new request below.</p>
          </div>
        )}

        {verifyRequest?.status !== "pending" && verifyRequest?.status !== "approved" && (
          <div className="space-y-3">
            <textarea
              value={verifyReason}
              onChange={(e) => setVerifyReason(e.target.value)}
              placeholder="Tell us about yourself — social media following, trading experience, why you'd be a good fit for verification..."
              rows={4}
              maxLength={500}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[var(--green)] resize-none"
            />
            <button
              onClick={async () => {
                if (!verifyReason.trim()) return;
                setSendingRequest(true);
                await fetch("/api/verify-request", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ reason: verifyReason }),
                });
                setVerifyRequest({ status: "pending", reason: verifyReason });
                setSendingRequest(false);
              }}
              disabled={sendingRequest || !verifyReason.trim()}
              className="w-full py-2.5 border border-[var(--green)]/40 text-[var(--green)] font-medium rounded-lg hover:bg-[var(--green)]/10 transition-colors disabled:opacity-50 text-sm"
            >
              {sendingRequest ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        )}
      </div>

      {/* Broker Connections */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[var(--green)]" />
          <h2 className="font-bold text-white">Broker Connections</h2>
        </div>
        <p className="text-sm text-gray-400">
          Connect your broker to auto-import your trade history. Imported trades show a verified badge on your profile.
        </p>
        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.2)" }}>
              <Zap className="w-4 h-4 text-[#00C896]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Rithmic</p>
              <p className="text-[11px] text-gray-500">Futures — verified fills</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={() => setRithmicModalOpen(true)}
              className="text-[10px] tracking-[0.12em] font-semibold uppercase px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: "rgba(0,200,150,0.12)",
                border: "1px solid rgba(0,200,150,0.3)",
                color: "#00C896",
              }}
            >
              Connect
            </button>
            <img src="/brokers/rithmic-logo-white.png" alt="Market Data by Rithmic" className="h-3 opacity-25" />
          </div>
        </div>

        <div
          className="rounded-xl p-4 flex items-center justify-between"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(0,200,150,0.1)", border: "1px solid rgba(0,200,150,0.2)" }}>
              <ShieldCheck className="w-4 h-4 text-[#00C896]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Alpaca</p>
              <p className="text-[11px] text-gray-500">Stocks — verify trade P&amp;L</p>
            </div>
          </div>
          {alpacaConnected ? (
            <button
              onClick={handleDisconnectAlpaca}
              disabled={disconnectingAlpaca}
              className="text-[10px] tracking-[0.12em] font-semibold uppercase px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
              style={{
                background: "rgba(255,77,77,0.1)",
                border: "1px solid rgba(255,77,77,0.3)",
                color: "var(--red)",
              }}
            >
              {disconnectingAlpaca ? "..." : "Disconnect"}
            </button>
          ) : (
            <button
              onClick={() => setAlpacaModalOpen(true)}
              className="text-[10px] tracking-[0.12em] font-semibold uppercase px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: "rgba(0,200,150,0.12)",
                border: "1px solid rgba(0,200,150,0.3)",
                color: "#00C896",
              }}
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {rithmicModalOpen && (
        <RithmicConnectModal onClose={() => setRithmicModalOpen(false)} />
      )}
      {alpacaModalOpen && (
        <AlpacaConnectModal onClose={() => setAlpacaModalOpen(false)} onSuccess={() => setAlpacaConnected(true)} />
      )}

      <div className="flex items-center justify-center gap-4 pt-2 pb-4">
        <a href="/privacy" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Privacy Policy</a>
        <span className="text-gray-700">·</span>
        <a href="/terms" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Terms of Service</a>
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
