"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/ui/BackButton";
import SafeAvatar from "@/components/ui/SafeAvatar";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { errorMessage } from "@/lib/apiError";

interface ProductData {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  subscribed: boolean;
  isOwner: boolean;
  seller: { handle: string; full_name: string; avatar_url: string; verified: boolean } | null;
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { userId } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/products/${id}`).then(async (res) => {
      if (!res.ok) { setNotFound(true); return; }
      setProduct(await res.json());
    });
  }, [id]);

  async function subscribe() {
    if (!userId) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(`/products/${id}`)}`);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/products/${id}/subscribe`, { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
      return;
    }
    setError(await errorMessage(res));
    setLoading(false);
  }

  if (notFound) return <p className="text-gray-500 text-sm text-center pt-20">Not available.</p>;
  if (!product) return null;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <BackButton iconOnly className="text-gray-400 hover:text-white transition-colors" />

      {product.seller && (
        <Link href={`/profile/${product.seller.handle}`} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
          <SafeAvatar src={product.seller.avatar_url} alt={product.seller.handle} initials={product.seller.handle} className="w-6 h-6 rounded-full" />
          @{product.seller.handle}
          {product.seller.verified && <VerifiedBadge />}
        </Link>
      )}

      <h1 className="text-2xl font-bold text-white">{product.title}</h1>

      <div className="glass-card rounded-2xl p-5 space-y-3">
        {product.description && (
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{product.description}</p>
        )}
        <p className="text-xl font-bold text-[var(--green)]">
          ${(product.price_cents / 100).toFixed(2)}<span className="text-sm text-gray-500 font-normal">/month</span>
        </p>

        {error && <p className="text-xs text-red-400">{error}</p>}

        {product.isOwner ? (
          <p className="text-xs text-gray-500">This is your own product.</p>
        ) : product.subscribed ? (
          <Link
            href={`/products/${id}/thanks`}
            className="block text-center w-full py-3 rounded-xl bg-white/5 text-white font-semibold"
          >
            View access details
          </Link>
        ) : (
          <button
            onClick={subscribe}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-500 text-black font-semibold disabled:opacity-50"
          >
            {loading ? "Redirecting…" : "Subscribe — monthly"}
          </button>
        )}
      </div>
    </div>
  );
}
