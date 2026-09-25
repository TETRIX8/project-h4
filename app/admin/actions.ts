'use server'

import { and, asc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import {
  administrators, applicationItems, applications, clients, comments, contracts, notifications, payments, settings, transactions, user,
  APPLICATION_STATUSES, CONTRACT_STATUSES, PAYMENT_METHODS, STAFF_ROLES,
  type ApplicationStatus, type ContractItem, type ContractStatus, type PaymentMethod, type StaffRole,
} from '@/lib/db/schema'
import { computeTerms, defaultMarkupBasisPoints, todayIso } from '@/lib/crm/finance'
import { applicationCode, rub } from '@/lib/crm/format'
import { ALL_PERMISSIONS, type Permission } from '@/lib/crm/permissions'
import { AccessError, getStaff, pushNotification, requirePermission, writeAudit } from '@/lib/crm/session'

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

async function run<T extends object>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, ...(await fn()) }
  } catch (error) {
    if (error instanceof AccessError || error instanceof ValidationError) return { ok: false, error: error.message }
    console.error('[admin action]', error)
    return { ok: false, error: 'Не удалось выполнить операцию. Попробуйте ещё раз.' }
  }
}

class ValidationError extends Error {}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ValidationError(message)
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/
const clean = (value: unknown, max = 300) => (typeof value === 'string' ? value.trim().slice(0, max) : '') || null
const toKopecks = (rubles: number) => Math.round(rubles * 100)

function refresh() {
  revalidatePath('/admin', 'layout')
  revalidatePath('/cabinet')
}

export type ClientInput = {
  fullName: string; phone: string; email?: string; birthDate?: string; address?: string
  passportNumber?: string; passportIssuedAt?: string; passportIssuedBy?: string; registrationAddress?: string; extraContacts?: string
}

export type ItemInput = { name: string; sku?: string; category?: string; quantity: number; unitPrice: number }

export type ApplicationInput = {
  clientId?: string | null
  client: ClientInput
  items: ItemInput[]
  deposit: number
  months: number
  markupPercent: number
  firstPaymentDate: string
  terms?: string
}

function normalizeClient(input: ClientInput) {
  const fullName = clean(input.fullName, 160)
  const phone = clean(input.phone, 32)
  assert(fullName && fullName.length >= 3, 'Укажите ФИО клиента')
  assert(phone && phone.replace(/\D/g, '').length >= 10, 'Укажите корректный телефон')
  const email = clean(input.email, 160)
  assert(!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Некорректный email')
  for (const field of [input.birthDate, input.passportIssuedAt]) assert(!field || isoDate.test(field), 'Некорректная дата')
  return {
    fullName, phone, email,
    birthDate: clean(input.birthDate, 10), address: clean(input.address), passportNumber: clean(input.passportNumber, 40),
    passportIssuedAt: clean(input.passportIssuedAt, 10), passportIssuedBy: clean(input.passportIssuedBy), registrationAddress: clean(input.registrationAddress),
    extraContacts: clean(input.extraContacts, 500),
  }
}

function normalizeTerms(input: ApplicationInput) {
  assert(Array.isArray(input.items) && input.items.length > 0 && input.items.length <= 50, 'Добавьте хотя бы один товар')
  const items = input.items.map((item, index) => {
    const name = clean(item.name, 200)
    assert(name, `Укажите название товара №${index + 1}`)
    assert(Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 1000, `Некорректное количество у «${name}»`)
    assert(Number.isFinite(item.unitPrice) && item.unitPrice >= 0 && item.unitPrice <= 10_000_000, `Некорректная цена у «${name}»`)
    return { name, sku: clean(item.sku, 60), category: clean(item.category, 80), quantity: item.quantity, unitPriceKopecks: toKopecks(item.unitPrice), position: index }
  })
  assert(Number.isInteger(input.months) && input.months >= 1 && input.months <= 36, 'Срок — от 1 до 36 месяцев')
  assert(Number.isFinite(input.markupPercent) && input.markupPercent >= 0 && input.markupPercent <= 100, 'Наценка — от 0 до 100%')
  assert(Number.isFinite(input.deposit) && input.deposit >= 0, 'Некорректный первоначальный взнос')
  assert(isoDate.test(input.firstPaymentDate), 'Укажите дату первого платежа')
  const markupBasisPoints = Math.round(input.markupPercent * 100)
  const terms = computeTerms({ items, depositKopecks: toKopecks(input.deposit), months: input.months, markupBasisPoints, firstPaymentDate: input.firstPaymentDate })
  assert(terms.goodsKopecks > 0, 'Общая стоимость товаров должна быть больше нуля')
  assert(terms.depositKopecks < terms.goodsKopecks, 'Взнос должен быть меньше стоимости товаров')
  return { items, markupBasisPoints, terms, firstPaymentDate: input.firstPaymentDate, extraTerms: clean(input.terms, 2000) }
}

function applicationValues(normalized: ReturnType<typeof normalizeTerms>, client: { fullName: string; phone: string }) {
  const { terms, items } = normalized
  return {
    customerName: client.fullName,
    phone: client.phone,
    productName: items.map((item) => item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name).join(', ').slice(0, 300),
    tariff: (terms.depositKopecks > 0 ? 'with-deposit' : 'without-deposit') as 'with-deposit' | 'without-deposit',
    priceKopecks: terms.goodsKopecks,
    depositKopecks: terms.depositKopecks,
    months: terms.months,
    markupKopecks: terms.markupKopecks,
    markupBasisPoints: normalized.markupBasisPoints,
    firstPaymentDate: normalized.firstPaymentDate,
    terms: normalized.extraTerms,
    calculation: {
      price: terms.goodsKopecks / 100, deposit: terms.depositKopecks / 100, principal: terms.principalKopecks / 100,
      markup: terms.markupKopecks / 100, markupPercent: normalized.markupBasisPoints / 100, financedTotal: terms.financedKopecks / 100,
      total: terms.totalKopecks / 100, monthly: terms.monthlyKopecks / 100,
      schedule: terms.schedule.map((line) => ({ month: line.number, amount: line.amountKopecks / 100 })),
    },
  }
}

export async function createApplicationAction(input: ApplicationInput, then: 'save' | 'approve' | 'contract' = 'save') {
  return run(async () => {
    const staff = await requirePermission('applications.edit')
    if (then !== 'save') assert(staff.permissions.includes('applications.approve'), 'Недостаточно прав для одобрения')
    if (then === 'contract') assert(staff.permissions.includes('contracts.create'), 'Недостаточно прав для формирования договора')
    const clientData = normalizeClient(input.client)
    const normalized = normalizeTerms(input)

    const created = await db.transaction(async (tx) => {
      let clientId = input.clientId ?? null
      if (clientId) {
        await tx.update(clients).set({ ...clientData, updatedAt: new Date() }).where(eq(clients.id, clientId))
      } else {
        const [client] = await tx.insert(clients).values(clientData).returning({ id: clients.id })
        clientId = client.id
        await writeAudit(staff, { action: 'Создан клиент', entityType: 'client', entityId: clientId, entityLabel: clientData.fullName, newValue: clientData }, tx)
      }
      const [app] = await tx.insert(applications).values({
        ...applicationValues(normalized, clientData),
        clientId, submissionKey: crypto.randomUUID(), assignedAdminId: staff.id,
        status: then === 'save' ? 'review' : 'approved',
      }).returning({ id: applications.id, number: applications.number })
      await tx.insert(applicationItems).values(normalized.items.map((item) => ({ ...item, applicationId: app.id })))
      await writeAudit(staff, {
        action: 'Создана заявка администратором', entityType: 'application', entityId: app.id, entityLabel: applicationCode(app.number),
        newValue: { клиент: clientData.fullName, товары: normalized.items.length, стоимость: rub(normalized.terms.goodsKopecks), срок: normalized.terms.months },
      }, tx)
      await pushNotification({ kind: 'application', title: `Новая заявка ${applicationCode(app.number)}`, body: `${clientData.fullName} · ${rub(normalized.terms.goodsKopecks)}`, href: `/admin/applications/${app.id}` }, tx)
      return app
    })

    let contractId: string | undefined
    if (then === 'contract') {
      const result = await formContract(created.id)
      contractId = result.contractId
    }
    refresh()
    return { applicationId: created.id, contractId }
  })
}

export async function updateApplicationAction(id: string, input: ApplicationInput) {
  return run(async () => {
    const staff = await requirePermission('applications.edit')
    const [existing] = await db.select().from(applications).where(eq(applications.id, id)).limit(1)
    assert(existing, 'Заявка не найдена')
    const [hasContract] = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.applicationId, id)).limit(1)
    assert(!hasContract, 'По заявке уже сформирован договор — изменения условий запрещены')
    const clientData = normalizeClient(input.client)
    const normalized = normalizeTerms(input)
    const oldItems = await db.select().from(applicationItems).where(eq(applicationItems.applicationId, id))

    await db.transaction(async (tx) => {
      let clientId = existing.clientId
      if (clientId) {
        await tx.update(clients).set({ ...clientData, updatedAt: new Date() }).where(eq(clients.id, clientId))
      } else {
        const [client] = await tx.insert(clients).values({ ...clientData, userId: existing.userId }).returning({ id: clients.id })
        clientId = client.id
      }
      await tx.update(applications).set({ ...applicationValues(normalized, clientData), clientId, updatedAt: new Date() }).where(eq(applications.id, id))
      await tx.delete(applicationItems).where(eq(applicationItems.applicationId, id))
      await tx.insert(applicationItems).values(normalized.items.map((item) => ({ ...item, applicationId: id })))
      await writeAudit(staff, {
        action: 'Изменены условия заявки', entityType: 'application', entityId: id, entityLabel: applicationCode(existing.number),
        oldValue: { стоимость: rub(existing.priceKopecks), взнос: rub(existing.depositKopecks), срок: existing.months, наценка: `${existing.markupBasisPoints / 100}%`, товары: oldItems.map((i) => `${i.name} ×${i.quantity}`) },
        newValue: { стоимость: rub(normalized.terms.goodsKopecks), взнос: rub(normalized.terms.depositKopecks), срок: normalized.terms.months, наценка: `${normalized.markupBasisPoints / 100}%`, товары: normalized.items.map((i) => `${i.name} ×${i.quantity}`) },
      }, tx)
    })
    refresh()
    return {}
  })
}

const STATUS_PERMISSION: Partial<Record<ApplicationStatus, Permission>> = { approved: 'applications.approve', rejected: 'applications.approve' }

export async function setApplicationStatusAction(id: string, status: ApplicationStatus, note?: string) {
  return run(async () => {
    assert(APPLICATION_STATUSES.includes(status), 'Неизвестный статус')
    const staff = await requirePermission(STATUS_PERMISSION[status] ?? 'applications.edit')
    const [existing] = await db.select().from(applications).where(eq(applications.id, id)).limit(1)
    assert(existing, 'Заявка не найдена')
    const reason = clean(note, 1000)
    if (status === 'rejected' || status === 'needs_info' || status === 'cancelled') assert(reason, 'Укажите причину или комментарий')
    await db.transaction(async (tx) => {
      await tx.update(applications).set({ status, updatedAt: new Date(), assignedAdminId: existing.assignedAdminId ?? staff.id }).where(eq(applications.id, id))
      if (reason) await tx.insert(comments).values({ entityType: 'application', entityId: id, authorId: staff.id, authorName: staff.name, body: reason })
      await writeAudit(staff, { action: 'Изменён статус заявки', entityType: 'application', entityId: id, entityLabel: applicationCode(existing.number), oldValue: { статус: existing.status }, newValue: { статус: status, комментарий: reason } }, tx)
      if (status === 'needs_info') await pushNotification({ kind: 'warning', title: 'Требуется проверка документов', body: `${applicationCode(existing.number)} · ${existing.customerName}`, href: `/admin/applications/${id}` }, tx)
    })
    refresh()
    return {}
  })
}

export async function assignApplicationAction(id: string, adminId: string | null) {
  return run(async () => {
    const staff = await requirePermission('applications.edit')
    const [existing] = await db.select().from(applications).where(eq(applications.id, id)).limit(1)
    assert(existing, 'Заявка не найдена')
    await db.update(applications).set({ assignedAdminId: adminId, updatedAt: new Date() }).where(eq(applications.id, id))
    await writeAudit(staff, { action: 'Назначен ответственный', entityType: 'application', entityId: id, entityLabel: applicationCode(existing.number), oldValue: { ответственный: existing.assignedAdminId }, newValue: { ответственный: adminId } })
    refresh()
    return {}
  })
}

export async function addCommentAction(entityType: 'application' | 'client' | 'contract', entityId: string, body: string) {
  return run(async () => {
    const staff = await requirePermission(entityType === 'client' ? 'clients.view' : entityType === 'contract' ? 'contracts.view' : 'applications.view')
    const text = clean(body, 2000)
    assert(text, 'Комментарий пуст')
    await db.insert(comments).values({ entityType, entityId, authorId: staff.id, authorName: staff.name, body: text })
    refresh()
    return {}
  })
}

export async function updateClientAction(id: string, input: ClientInput) {
  return run(async () => {
    const staff = await requirePermission('clients.edit')
    const [existing] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
    assert(existing, 'Клиент не найден')
    const data = normalizeClient(input)
    const changedOld: Record<string, unknown> = {}
    const changedNew: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if ((existing as Record<string, unknown>)[key] !== value) {
        changedOld[key] = (existing as Record<string, unknown>)[key]
        changedNew[key] = value
      }
    }
    await db.update(clients).set({ ...data, updatedAt: new Date() }).where(eq(clients.id, id))
    if (Object.keys(changedNew).length) await writeAudit(staff, { action: 'Изменены данные клиента', entityType: 'client', entityId: id, entityLabel: data.fullName, oldValue: changedOld, newValue: changedNew })
    refresh()
    return {}
  })
}

async function formContract(applicationId: string) {
  const staff = await requirePermission('contracts.create')
  const [app] = await db.select().from(applications).where(eq(applications.id, applicationId)).limit(1)
  assert(app, 'Заявка не найдена')
  assert(['approved', 'awaiting_contract'].includes(app.status), 'Договор можно сформировать только по одобренной заявке')
  assert(app.clientId, 'Заполните данные клиента в заявке')
  const items = await db.select().from(applicationItems).where(eq(applicationItems.applicationId, applicationId)).orderBy(asc(applicationItems.position))
  assert(items.length > 0, 'В заявке нет товаров')
  const [client] = await db.select().from(clients).where(eq(clients.id, app.clientId)).limit(1)
  assert(client, 'Клиент не найден')

  const signedAt = todayIso()
  const firstPaymentDate = app.firstPaymentDate ?? signedAt
  const terms = computeTerms({ items, depositKopecks: app.depositKopecks, months: app.months, markupBasisPoints: app.markupBasisPoints || defaultMarkupBasisPoints(app.months, app.depositKopecks > 0), firstPaymentDate })
  const snapshot: ContractItem[] = items.map((item) => ({ name: item.name, sku: item.sku, category: item.category, quantity: item.quantity, unitPriceKopecks: item.unitPriceKopecks }))

  const contractId = await db.transaction(async (tx) => {
    await tx.execute(sql`LOCK TABLE crm_contracts IN SHARE ROW EXCLUSIVE MODE`)
    const year = signedAt.slice(0, 4)
    const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(contracts).where(ilike(contracts.number, `AB-${year}-%`))
    const number = `AB-${year}-${String(count + 1).padStart(4, '0')}`
    const [contract] = await tx.insert(contracts).values({
      number, applicationId, clientId: client.id, status: 'prepared', signedAt, firstPaymentDate, items: snapshot,
      goodsKopecks: terms.goodsKopecks, depositKopecks: terms.depositKopecks, principalKopecks: terms.principalKopecks, markupKopecks: terms.markupKopecks,
      financedKopecks: terms.financedKopecks, totalKopecks: terms.totalKopecks, months: terms.months, monthlyKopecks: terms.monthlyKopecks,
      terms: app.terms, createdBy: staff.id,
    }).returning({ id: contracts.id })
    await tx.delete(payments).where(eq(payments.applicationId, applicationId))
    await tx.insert(payments).values([
      ...(terms.depositKopecks > 0 ? [{ applicationId, contractId: contract.id, userId: client.userId, installmentNumber: 0, amountKopecks: terms.depositKopecks, dueDate: signedAt }] : []),
      ...terms.schedule.map((line) => ({ applicationId, contractId: contract.id, userId: client.userId, installmentNumber: line.number, amountKopecks: line.amountKopecks, dueDate: line.dueDate })),
    ])
    await tx.update(applications).set({ status: 'contract_signed', updatedAt: new Date() }).where(eq(applications.id, applicationId))
    await writeAudit(staff, { action: 'Сформирован договор', entityType: 'contract', entityId: contract.id, entityLabel: number, newValue: { заявка: applicationCode(app.number), клиент: client.fullName, сумма: rub(terms.totalKopecks), платежей: terms.months } }, tx)
    await writeAudit(staff, { action: 'Сформирован договор', entityType: 'application', entityId: applicationId, entityLabel: applicationCode(app.number), newValue: { договор: number } }, tx)
    await pushNotification({ kind: 'contract', title: `Новый договор ${number}`, body: `${client.fullName} · ${rub(terms.totalKopecks)}`, href: `/admin/contracts/${contract.id}` }, tx)
    return contract.id
  })
  return { contractId }
}

export async function formContractAction(applicationId: string) {
  return run(async () => {
    const result = await formContract(applicationId)
    refresh()
    return result
  })
}

export async function setContractStatusAction(id: string, status: ContractStatus, reason?: string) {
  return run(async () => {
    assert(CONTRACT_STATUSES.includes(status) && status !== 'overdue' && status !== 'paid', 'Недопустимый статус')
    const staff = await requirePermission('contracts.edit')
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1)
    assert(contract, 'Договор не найден')
    assert(contract.status !== 'paid', 'Договор уже полностью оплачен')
    const note = clean(reason, 1000)
    if (status === 'suspended' || status === 'terminated') assert(note, 'Укажите причину')
    await db.transaction(async (tx) => {
      await tx.update(contracts).set({ status, statusReason: note, updatedAt: new Date() }).where(eq(contracts.id, id))
      const appStatus: Partial<Record<ContractStatus, ApplicationStatus>> = { active: 'active', terminated: 'cancelled' }
      if (appStatus[status]) await tx.update(applications).set({ status: appStatus[status], updatedAt: new Date() }).where(eq(applications.id, contract.applicationId))
      await writeAudit(staff, { action: 'Изменён статус договора', entityType: 'contract', entityId: id, entityLabel: contract.number, oldValue: { статус: contract.status }, newValue: { статус: status, причина: note } }, tx)
    })
    refresh()
    return {}
  })
}

async function syncContractStatus(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], contractId: string) {
  const [contract] = await tx.select().from(contracts).where(eq(contracts.id, contractId)).limit(1)
  const rows = await tx.select().from(payments).where(and(eq(payments.contractId, contractId), eq(payments.cancelled, false)))
  const fullyPaid = rows.length > 0 && rows.every((row) => row.paidKopecks >= row.amountKopecks)
  let next: ContractStatus = contract.status
  if (fullyPaid) next = 'paid'
  else if (contract.status === 'paid' || contract.status === 'prepared') next = 'active'
  if (next !== contract.status) {
    await tx.update(contracts).set({ status: next, updatedAt: new Date() }).where(eq(contracts.id, contractId))
    await tx.update(applications).set({ status: next === 'paid' ? 'completed' : 'active', updatedAt: new Date() }).where(eq(applications.id, contract.applicationId))
  }
  return { contract, next }
}

export async function recordPaymentAction(input: { paymentId: string; amount: number; paidOn: string; method: PaymentMethod; comment?: string }) {
  return run(async () => {
    const staff = await requirePermission('payments.accept')
    assert(PAYMENT_METHODS.includes(input.method), 'Выберите способ оплаты')
    assert(isoDate.test(input.paidOn) && input.paidOn <= todayIso(), 'Некорректная дата оплаты')
    const amountKopecks = toKopecks(input.amount)
    assert(Number.isFinite(input.amount) && amountKopecks > 0, 'Сумма должна быть больше нуля')

    const result = await db.transaction(async (tx) => {
      const [row] = await tx.select().from(payments).where(eq(payments.id, input.paymentId)).for('update')
      assert(row && row.contractId && !row.cancelled, 'Платёж не найден')
      const [contract] = await tx.select().from(contracts).where(eq(contracts.id, row.contractId)).limit(1)
      assert(['prepared', 'active'].includes(contract.status), 'Приём платежей по договору в этом статусе невозможен')
      const remaining = row.amountKopecks - row.paidKopecks
      assert(remaining > 0, 'Этот платёж уже полностью оплачен')
      assert(amountKopecks <= remaining, `Сумма превышает остаток платежа (${rub(remaining)})`)
      const [transaction] = await tx.insert(transactions).values({
        contractId: row.contractId, paymentId: row.id, amountKopecks, paidOn: input.paidOn, method: input.method,
        comment: clean(input.comment, 500), recordedBy: staff.id, recordedByName: staff.name,
      }).returning({ id: transactions.id, receiptNumber: transactions.receiptNumber })
      const paidKopecks = row.paidKopecks + amountKopecks
      await tx.update(payments).set({ paidKopecks, paidAt: input.paidOn, recordedBy: staff.email, updatedAt: new Date() }).where(eq(payments.id, row.id))
      const { next } = await syncContractStatus(tx, row.contractId)
      await writeAudit(staff, {
        action: paidKopecks >= row.amountKopecks ? 'Принят платёж' : 'Принят частичный платёж', entityType: 'contract', entityId: contract.id, entityLabel: contract.number,
        oldValue: { платёж: `№${row.installmentNumber}`, оплачено: rub(row.paidKopecks) },
        newValue: { платёж: `№${row.installmentNumber}`, внесено: rub(amountKopecks), оплачено: rub(paidKopecks), способ: input.method, чек: transaction.receiptNumber },
      }, tx)
      await pushNotification({ kind: 'payment', title: 'Платёж успешно внесён', body: `${contract.number} · ${rub(amountKopecks)}`, href: `/admin/contracts/${contract.id}` }, tx)
      if (next === 'paid') await pushNotification({ kind: 'contract', title: `Договор ${contract.number} полностью оплачен`, href: `/admin/contracts/${contract.id}` }, tx)
      return { transactionId: transaction.id, receiptNumber: transaction.receiptNumber ?? 0, contractStatus: next }
    })
    refresh()
    return result
  })
}

export async function cancelTransactionAction(transactionId: string, reason: string) {
  return run(async () => {
    const staff = await requirePermission('payments.cancel')
    const note = clean(reason, 1000)
    assert(note && note.length >= 5, 'Укажите причину отмены (не менее 5 символов)')
    await db.transaction(async (tx) => {
      const [transaction] = await tx.select().from(transactions).where(eq(transactions.id, transactionId)).for('update')
      assert(transaction, 'Операция не найдена')
      assert(!transaction.cancelledAt, 'Операция уже отменена')
      const [row] = await tx.select().from(payments).where(eq(payments.id, transaction.paymentId)).for('update')
      const [contract] = await tx.select().from(contracts).where(eq(contracts.id, transaction.contractId)).limit(1)
      await tx.update(transactions).set({ cancelledAt: new Date(), cancelledBy: staff.name, cancelReason: note }).where(eq(transactions.id, transactionId))
      const paidKopecks = Math.max(0, row.paidKopecks - transaction.amountKopecks)
      const [lastActive] = await tx.select({ paidOn: transactions.paidOn }).from(transactions)
        .where(and(eq(transactions.paymentId, row.id), isNull(transactions.cancelledAt))).orderBy(sql`${transactions.paidOn} desc`).limit(1)
      await tx.update(payments).set({ paidKopecks, paidAt: paidKopecks > 0 ? lastActive?.paidOn ?? null : null, updatedAt: new Date() }).where(eq(payments.id, row.id))
      await syncContractStatus(tx, contract.id)
      await writeAudit(staff, {
        action: 'Отменён платёж (корректировка)', entityType: 'contract', entityId: contract.id, entityLabel: contract.number,
        oldValue: { чек: transaction.receiptNumber, сумма: rub(transaction.amountKopecks), оплачено: rub(row.paidKopecks) },
        newValue: { оплачено: rub(paidKopecks), причина: note },
      }, tx)
    })
    refresh()
    return {}
  })
}

export async function markNotificationsReadAction(ids?: string[]) {
  return run(async () => {
    const staff = await getStaff()
    if (!staff) throw new AccessError('Необходима авторизация')
    const where = ids?.length ? and(inArray(notifications.id, ids), isNull(notifications.readAt)) : isNull(notifications.readAt)
    await db.update(notifications).set({ readAt: new Date() }).where(where)
    revalidatePath('/admin', 'layout')
    return {}
  })
}

export async function saveSettingsAction(input: { orgName: string; inn?: string; ogrn?: string; address?: string; phone?: string; bankDetails?: string }) {
  return run(async () => {
    const staff = await requirePermission('settings.manage')
    const orgName = clean(input.orgName, 200)
    assert(orgName, 'Укажите название организации')
    const values = { orgName, inn: clean(input.inn, 20), ogrn: clean(input.ogrn, 20), address: clean(input.address), phone: clean(input.phone, 40), bankDetails: clean(input.bankDetails, 1000) }
    const [old] = await db.select().from(settings).where(eq(settings.id, 1))
    await db.update(settings).set({ ...values, updatedAt: new Date() }).where(eq(settings.id, 1))
    await writeAudit(staff, { action: 'Изменены реквизиты организации', entityType: 'settings', entityId: '1', oldValue: { orgName: old?.orgName, inn: old?.inn, address: old?.address }, newValue: { orgName: values.orgName, inn: values.inn, address: values.address } })
    refresh()
    return {}
  })
}

export async function saveRolePermissionsAction(matrix: Partial<Record<StaffRole, string[]>>) {
  return run(async () => {
    const staff = await requirePermission('staff.manage')
    const next: Partial<Record<StaffRole, string[]>> = {}
    for (const role of STAFF_ROLES) {
      if (role === 'super_admin') continue
      next[role] = (matrix[role] ?? []).filter((permission) => ALL_PERMISSIONS.includes(permission as Permission))
    }
    const [old] = await db.select({ rolePermissions: settings.rolePermissions }).from(settings).where(eq(settings.id, 1))
    await db.update(settings).set({ rolePermissions: next, updatedAt: new Date() }).where(eq(settings.id, 1))
    await writeAudit(staff, { action: 'Изменены права ролей', entityType: 'settings', entityId: 'roles', oldValue: old?.rolePermissions, newValue: next })
    refresh()
    return {}
  })
}

export async function addStaffAction(email: string, role: StaffRole) {
  return run(async () => {
    const staff = await requirePermission('staff.manage')
    assert(STAFF_ROLES.includes(role), 'Неизвестная роль')
    const normalized = email.trim().toLowerCase()
    const [account] = await db.select({ id: user.id, name: user.name }).from(user).where(sql`lower(${user.email}) = ${normalized}`).limit(1)
    assert(account, 'Пользователь с таким email не зарегистрирован. Попросите сотрудника сначала зарегистрироваться на сайте.')
    await db.insert(administrators).values({ userId: account.id, role, active: true })
      .onConflictDoUpdate({ target: administrators.userId, set: { role, active: true } })
    await writeAudit(staff, { action: 'Добавлен сотрудник', entityType: 'staff', entityId: account.id, entityLabel: normalized, newValue: { роль: role } })
    refresh()
    return {}
  })
}

export async function updateStaffAction(userId: string, patch: { role?: StaffRole; active?: boolean }) {
  return run(async () => {
    const staff = await requirePermission('staff.manage')
    assert(userId !== staff.id, 'Нельзя изменить собственную роль или доступ')
    if (patch.role) assert(STAFF_ROLES.includes(patch.role), 'Неизвестная роль')
    const [existing] = await db.select().from(administrators).where(eq(administrators.userId, userId)).limit(1)
    assert(existing, 'Сотрудник не найден')
    await db.update(administrators).set(patch).where(eq(administrators.userId, userId))
    await writeAudit(staff, { action: 'Изменён доступ сотрудника', entityType: 'staff', entityId: userId, oldValue: { роль: existing.role, активен: existing.active }, newValue: { роль: patch.role ?? existing.role, активен: patch.active ?? existing.active } })
    refresh()
    return {}
  })
}

export type SearchHit = { type: 'client' | 'application' | 'contract' | 'item'; id: string; title: string; subtitle: string; href: string }

export async function globalSearchAction(query: string): Promise<SearchHit[]> {
  const staff = await getStaff()
  if (!staff) return []
  const q = query.trim().slice(0, 80)
  if (q.length < 2) return []
  const pattern = `%${q.replace(/[%_\\]/g, (char) => `\\${char}`)}%`
  const digits = q.replace(/\D/g, '')
  const numberMatch = Number(q.replace(/^з-?/i, ''))

  const [clientHits, appHits, contractHits, itemHits] = await Promise.all([
    db.select().from(clients).where(or(
      ilike(clients.fullName, pattern), ilike(clients.email, pattern), ilike(clients.passportNumber, pattern),
      digits.length >= 4 ? sql`regexp_replace(${clients.phone}, '\\D', '', 'g') like ${`%${digits}%`}` : sql`false`,
    )).limit(6),
    db.select().from(applications).where(or(
      ilike(applications.customerName, pattern), ilike(applications.productName, pattern),
      Number.isInteger(numberMatch) && numberMatch > 0 ? eq(applications.number, numberMatch) : sql`false`,
      sql`${applications.id}::text ilike ${`${q}%`}`,
    )).limit(6),
    db.select({ id: contracts.id, number: contracts.number, clientName: clients.fullName, total: contracts.totalKopecks })
      .from(contracts).leftJoin(clients, eq(clients.id, contracts.clientId))
      .where(or(ilike(contracts.number, pattern), ilike(clients.fullName, pattern))).limit(6),
    db.select({ id: applicationItems.id, name: applicationItems.name, sku: applicationItems.sku, applicationId: applicationItems.applicationId })
      .from(applicationItems).where(or(ilike(applicationItems.name, pattern), ilike(applicationItems.sku, pattern))).limit(6),
  ])

  return [
    ...clientHits.map((c) => ({ type: 'client' as const, id: c.id, title: c.fullName, subtitle: [c.phone, c.passportNumber].filter(Boolean).join(' · '), href: `/admin/clients/${c.id}` })),
    ...contractHits.map((c) => ({ type: 'contract' as const, id: c.id, title: `Договор ${c.number}`, subtitle: `${c.clientName ?? ''} · ${rub(c.total)}`, href: `/admin/contracts/${c.id}` })),
    ...appHits.map((a) => ({ type: 'application' as const, id: a.id, title: `Заявка ${applicationCode(a.number)}`, subtitle: `${a.customerName} · ${a.productName}`, href: `/admin/applications/${a.id}` })),
    ...itemHits.map((i) => ({ type: 'item' as const, id: i.id, title: i.name, subtitle: i.sku ? `Артикул ${i.sku}` : 'Товар в заявке', href: `/admin/applications/${i.applicationId}` })),
  ]
}
