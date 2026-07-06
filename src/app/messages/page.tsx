"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import SafeAvatar from "@/components/ui/SafeAvatar";

interface Conversation {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  partner: { id: string; handle: string; avatar_url: string; verified: boolean };
}

export default function MessagesPage() {
  const { userId } = useAuth();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/messages")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { setConvos(d); setLoading(false); });
  }, []);

  if (loading) return <div className="max-w-xl mx-auto pt-20 text-center"><p className="text-gray-500 text-sm">Loading...</p></div>;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-white">Messages</h1>

      <div className="glass-card rounded-2xl overflow-hidden">
        {convos.length === 0 && (
          <div className="p-12 text-center">
            <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No messages yet.</p>
            <p className="text-gray-600 text-xs mt-1">Visit someone&apos;s profile and hit Message to start a conversation.</p>
          </div>
        )}

        {convos.map((c) => {
          const partner = c.partner;
          const unread = !c.read && c.receiver_id === userId;

          return (
            <Link
              key={c.id}
              href={`/messages/${partner?.handle}`}
              className="flex items-center gap-3 p-4 hover:bg-[var(--bg)] transition-colors border-b border-[var(--border)] last:border-0"
            >
              <SafeAvatar src={partner?.avatar_url} alt={partner?.handle ?? ""} initials={partner?.handle ?? "?"} className="w-11 h-11" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`font-semibold text-sm ${unread ? "text-white" : "text-gray-300"}`}>@{partner?.handle}</span>
                  {partner?.verified && <VerifiedBadge className="w-3.5 h-3.5" />}
                </div>
                <p className={`text-xs truncate mt-0.5 ${unread ? "text-gray-200 font-medium" : "text-gray-500"}`}>{c.content}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="text-xs text-gray-600">{new Date(c.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                {unread && <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)]" />}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
