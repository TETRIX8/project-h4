import { bigint, boolean, date, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import type { InstallmentResult, Tariff } from '@/lib/installment'

export const APPLICATION_STATUSES = [
  'new', 'review', 'needs_info', 'approved', 'rejected', 'awaiting_contract', 'contract_signed', 'active', 'completed', 'cancelled',
] as const
export type ApplicationStatus = typeof APPLICATION_STATUSES[number]

export const CONTRACT_STATUSES = ['draft', 'prepared', 'active', 'overdue', 'suspended', 'paid', 'terminated'] as const
export type ContractStatus = typeof CONTRACT_STATUSES[number]

export const STAFF_ROLES = ['super_admin', 'admin', 'manager', 'cashier', 'viewer'] as const
export type StaffRole = typeof STAFF_ROLES[number]

export const PAYMENT_METHODS = ['cash', 'transfer', 'card', 'other'] as const
export type PaymentMethod = typeof PAYMENT_METHODS[number]

export type ContractItem = { name: string; sku: string | null; category: string | null; quantity: number; unitPriceKopecks: number }

export const clients = pgTable('crm_clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').unique(),
  fullName: text('full_name').notNull(),
  birthDate: date('birth_date'),
  phone: text('phone').notNull(),
  email: text('email'),
  address: text('address'),
  passportNumber: text('passport_number'),
  passportIssuedAt: date('passport_issued_at'),
  passportIssuedBy: text('passport_issued_by'),
  registrationAddress: text('registration_address'),
  extraContacts: text('extra_contacts'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const applications = pgTable('installment_applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  number: integer('number').generatedByDefaultAsIdentity(),
  userId: text('user_id'),
  clientId: uuid('client_id'),
  assignedAdminId: text('assigned_admin_id'),
  submissionKey: uuid('submission_key').notNull().unique(),
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  productName: text('product_name').notNull(),
  tariff: text('tariff').$type<Tariff>().notNull(),
  priceKopecks: integer('price_kopecks').notNull(),
  depositKopecks: integer('deposit_kopecks').notNull(),
  months: integer('months').notNull(),
  markupKopecks: integer('markup_kopecks').notNull(),
  markupBasisPoints: integer('markup_basis_points').notNull().default(0),
  firstPaymentDate: date('first_payment_date'),
  terms: text('terms'),
  calculation: jsonb('calculation').$type<InstallmentResult>().notNull(),
  status: text('status').$type<ApplicationStatus>().notNull().default('new'),
  consentAt: timestamp('consent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('installment_applications_user_created_idx').on(table.userId, table.createdAt)])

export const applicationItems = pgTable('crm_application_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull(),
  name: text('name').notNull(),
  sku: text('sku'),
  category: text('category'),
  quantity: integer('quantity').notNull(),
  unitPriceKopecks: integer('unit_price_kopecks').notNull(),
  position: integer('position').notNull().default(0),
})

export const contracts = pgTable('crm_contracts', {
  id: uuid('id').defaultRandom().primaryKey(),
  number: text('number').notNull().unique(),
  applicationId: uuid('application_id').notNull().unique(),
  clientId: uuid('client_id').notNull(),
  status: text('status').$type<ContractStatus>().notNull().default('prepared'),
  statusReason: text('status_reason'),
  signedAt: date('signed_at').notNull(),
  firstPaymentDate: date('first_payment_date').notNull(),
  items: jsonb('items').$type<ContractItem[]>().notNull(),
  goodsKopecks: integer('goods_kopecks').notNull(),
  depositKopecks: integer('deposit_kopecks').notNull(),
  principalKopecks: integer('principal_kopecks').notNull(),
  markupKopecks: integer('markup_kopecks').notNull(),
  financedKopecks: integer('financed_kopecks').notNull(),
  totalKopecks: integer('total_kopecks').notNull(),
  months: integer('months').notNull(),
  monthlyKopecks: integer('monthly_kopecks').notNull(),
  terms: text('terms'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const payments = pgTable('installment_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull(),
  contractId: uuid('contract_id'),
  userId: text('user_id'),
  installmentNumber: integer('installment_number').notNull(),
  amountKopecks: integer('amount_kopecks').notNull(),
  dueDate: date('due_date'),
  paidKopecks: integer('paid_kopecks').notNull().default(0),
  paidAt: date('paid_at'),
  recordedBy: text('recorded_by'),
  cancelled: boolean('cancelled').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('installment_payments_application_id_installment_number_key').on(table.applicationId, table.installmentNumber),
  index('installment_payments_user_application_idx').on(table.userId, table.applicationId),
])

export const transactions = pgTable('crm_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  receiptNumber: integer('receipt_number').generatedByDefaultAsIdentity(),
  contractId: uuid('contract_id').notNull(),
  paymentId: uuid('payment_id').notNull(),
  amountKopecks: integer('amount_kopecks').notNull(),
  paidOn: date('paid_on').notNull(),
  method: text('method').$type<PaymentMethod>().notNull(),
  comment: text('comment'),
  recordedBy: text('recorded_by'),
  recordedByName: text('recorded_by_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledBy: text('cancelled_by'),
  cancelReason: text('cancel_reason'),
})

export const auditLog = pgTable('crm_audit_log', {
  id: bigint('id', { mode: 'number' }).generatedByDefaultAsIdentity().primaryKey(),
  actorId: text('actor_id'),
  actorName: text('actor_name'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  entityLabel: text('entity_label'),
  ip: text('ip'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const comments = pgTable('crm_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  authorId: text('author_id'),
  authorName: text('author_name'),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const notifications = pgTable('crm_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  body: text('body'),
  href: text('href'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  readAt: timestamp('read_at', { withTimezone: true }),
})

export const settings = pgTable('crm_settings', {
  id: integer('id').primaryKey().default(1),
  orgName: text('org_name').notNull().default('ALLAHUMMA BARIK'),
  inn: text('inn'),
  ogrn: text('ogrn'),
  address: text('address'),
  phone: text('phone'),
  bankDetails: text('bank_details'),
  rolePermissions: jsonb('role_permissions').$type<Partial<Record<StaffRole, string[]>>>(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const administrators = pgTable('installment_admins', {
  userId: text('user_id').primaryKey(),
  role: text('role').$type<StaffRole>().notNull().default('super_admin'),
  active: boolean('active').notNull().default(true),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
})

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull(),
})
