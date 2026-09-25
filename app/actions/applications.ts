"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { applications, payments, administrators } from "@/lib/db/schema"
import { calculateInstallment } from "@/lib/installment"
import { isUserAdmin } from "@/lib/admin"
import { and, desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

export async function submitApplicationAction(data: {
  customerName: string
  phone: string
  productName: string
  tariff: "with-deposit" | "without-deposit"
  price: number
  depositPercent: number
  months: number
}) {
  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })
  
  if (!session?.user) {
    return { success: false, error: "Пожалуйста, авторизуйтесь перед отправкой заявки" }
  }

  const userId = session.user.id
  const calc = calculateInstallment({
    price: data.price,
    depositPercent: data.depositPercent,
    months: data.months,
    tariff: data.tariff,
  })

  const priceKopecks = Math.round(data.price * 100)
  const depositKopecks = Math.round(calc.deposit * 100)
  const markupKopecks = Math.round(calc.markup * 100)
  const submissionKey = crypto.randomUUID()

  const [inserted] = await db
    .insert(applications)
    .values({
      userId,
      submissionKey,
      customerName: data.customerName.trim(),
      phone: data.phone.trim(),
      productName: data.productName.trim(),
      tariff: data.tariff,
      priceKopecks,
      depositKopecks,
      months: data.months,
      markupKopecks,
      calculation: calc,
      status: "new",
      consentAt: new Date(),
    })
    .returning()

  // Generate payment schedule rows
  const today = new Date()
  const paymentRows = [
    ...(data.tariff === "with-deposit" ? [{
      applicationId: inserted.id,
      userId,
      installmentNumber: 0,
      amountKopecks: Math.round(calc.deposit * 100),
      dueDate: today.toISOString().slice(0, 10),
      paidKopecks: Math.round(calc.deposit * 100),
      paidAt: today.toISOString().slice(0, 10),
      recordedBy: "system",
    }] : []),
    ...calc.schedule.map((p) => {
      const dueDate = new Date()
      dueDate.setMonth(dueDate.getMonth() + p.month)
      return {
        applicationId: inserted.id,
        userId,
        installmentNumber: p.month,
        amountKopecks: Math.round(p.amount * 100),
        dueDate: dueDate.toISOString().slice(0, 10),
        paidKopecks: 0,
        paidAt: null,
        recordedBy: null,
      }
    })
  ]

  if (paymentRows.length > 0) {
    await db.insert(payments).values(paymentRows)
  }

  revalidatePath("/cabinet")
  revalidatePath("/admin")

  return { success: true, applicationId: inserted.id }
}

export async function getUserApplicationsAction() {
  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })
  if (!session?.user) return []

  const userId = session.user.id
  const apps = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.createdAt))

  const userPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.userId, userId))

  return apps.map((app) => ({
    ...app,
    payments: userPayments.filter((p) => p.applicationId === app.id),
  }))
}

export async function getAdminApplicationsAction() {
  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })
  if (!session?.user) throw new Error("Необходима авторизация")

  const admin = await isUserAdmin(session.user.id)
  if (!admin) throw new Error("Доступ запрещён")

  const apps = await db
    .select()
    .from(applications)
    .orderBy(desc(applications.createdAt))

  const allPayments = await db.select().from(payments)

  return apps.map((app) => ({
    ...app,
    payments: allPayments.filter((p) => p.applicationId === app.id),
  }))
}

export async function updateApplicationStatusAction(applicationId: string, newStatus: string) {
  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })
  if (!session?.user) throw new Error("Необходима авторизация")

  const admin = await isUserAdmin(session.user.id)
  if (!admin) throw new Error("Доступ запрещён")

  await db
    .update(applications)
    .set({ status: newStatus as any, updatedAt: new Date() })
    .where(eq(applications.id, applicationId))

  revalidatePath("/admin")
  revalidatePath("/cabinet")
  return { success: true }
}

export async function recordPaymentAction(paymentId: string, paidAmount: number) {
  const reqHeaders = await headers()
  const session = await auth.api.getSession({ headers: reqHeaders })
  if (!session?.user) throw new Error("Необходима авторизация")

  const admin = await isUserAdmin(session.user.id)
  if (!admin) throw new Error("Доступ запрещён")

  const paidKopecks = Math.round(paidAmount * 100)
  const today = new Date().toISOString().slice(0, 10)

  await db
    .update(payments)
    .set({
      paidKopecks,
      paidAt: today,
      recordedBy: session.user.email || session.user.id,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, paymentId))

  revalidatePath("/admin")
  revalidatePath("/cabinet")
  return { success: true }
}
