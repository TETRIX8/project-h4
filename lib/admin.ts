import { db } from "@/lib/db"
import { administrators } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function isUserAdmin(userId: string): Promise<boolean> {
  if (!userId) return false
  const admin = await db.select().from(administrators).where(eq(administrators.userId, userId)).limit(1)
  return admin.length > 0
}
