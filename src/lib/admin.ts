/** Clerk user id of the single platform admin. */
export const ADMIN_ID = "user_3FjHwLbvzd59NATWEJDb6dwguxh";

export function isAdmin(userId: string | null | undefined): boolean {
  return userId === ADMIN_ID;
}
