"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BackButton from "@/components/ui/BackButton";

export default function ProductThanksPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ title: string; delivery_instructions: string | null } | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${id}/thanks`).then(async (res) => {
      if (res.status === 403 || res.status === 401) { setForbidden(true); return; }
      if (res.ok) setData(await res.json());
    });
  }, [id]);

  if (forbidden) {
    return <p className="text-gray-500 text-sm text-center pt-20">You don&apos;t have an active subscription to this.</p>;
  }
  if (!data) return null;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <BackButton iconOnly className="text-gray-400 hover:text-white transition-colors" />
      <h1 className="text-2xl font-bold text-white">✅ You&apos;re in!</h1>
      <div className="glass-card rounded-2xl p-5 space-y-2">
        <p className="text-sm text-gray-400">{data.title}</p>
        {data.delivery_instructions ? (
          <p className="text-sm text-gray-200 whitespace-pre-wrap">{data.delivery_instructions}</p>
        ) : (
          <p className="text-sm text-gray-500">The seller hasn&apos;t added access instructions yet.</p>
        )}
      </div>
    </div>
  );
}
