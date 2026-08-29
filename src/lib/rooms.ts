import { supabaseAdmin } from "@/lib/supabase-admin";

export interface Membership {
  role: "owner" | "mod" | "member";
  status: "active" | "past_due" | "canceled" | "banned";
}

/** The caller's membership row for a room, or null if they've never joined. */
export async function getMembership(
  roomId: string,
  userId: string
): Promise<Membership | null> {
  const { data } = await supabaseAdmin
    .from("room_members")
    .select("role, status")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Membership) ?? null;
}

/** Active membership is the single gate for reading or posting in a room. */
export function canParticipate(m: Membership | null): boolean {
  return !!m && m.status === "active";
}

export function canModerate(m: Membership | null): boolean {
  return canParticipate(m) && (m!.role === "owner" || m!.role === "mod");
}

/** URL-safe slug from a display name, with a short random suffix for uniqueness. */
export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 7);
  return base ? `${base}-${suffix}` : suffix;
}

/** True if either user has blocked the other. */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_blocks")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`
    )
    .limit(1);
  return !!data && data.length > 0;
}
