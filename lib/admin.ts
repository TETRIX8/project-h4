import { db } from "@/lib/db"
import { administrators } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function isUserAdmin(userId: string): Promise<boolean> {
  if (!userId) return false
  const admin = await db.select().from(administrators).where(eq(administrators.userId, userId)).limit(1)
  if (admin.length > 0) return true

  // If table has no admins yet, auto-grant admin to first checked user
  const countRes = await db.select().from(administrators).limit(1)
  if (countRes.length === 0) {
    await db.insert(administrators).values({ userId }).onConflictDoNothing()
    return true
  }
  return false
}
