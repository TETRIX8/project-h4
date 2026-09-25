import { date, index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import type { InstallmentResult, Tariff } from '@/lib/installment'

export const APPLICATION_STATUSES = ['new', 'review', 'approved', 'rejected', 'awaiting_payment', 'overdue', 'completed'] as const
export type ApplicationStatus = typeof APPLICATION_STATUSES[number]

export const applications = pgTable('installment_applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  submissionKey: uuid('submission_key').notNull().unique(),
  customerName: text('customer_name').notNull(),
  phone: text('phone').notNull(),
  productName: text('product_name').notNull(),
  tariff: text('tariff').$type<Tariff>().notNull(),
  priceKopecks: integer('price_kopecks').notNull(),
  depositKopecks: integer('deposit_kopecks').notNull(),
  months: integer('months').notNull(),
  markupKopecks: integer('markup_kopecks').notNull(),
  calculation: jsonb('calculation').$type<InstallmentResult>().notNull(),
  status: text('status').$type<ApplicationStatus>().notNull().default('new'),
  consentAt: timestamp('consent_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('installment_applications_user_created_idx').on(table.userId, table.createdAt)])

export const payments = pgTable('installment_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull(),
  userId: text('user_id').notNull(),
  installmentNumber: integer('installment_number').notNull(),
  amountKopecks: integer('amount_kopecks').notNull(),
  dueDate: date('due_date'),
  paidKopecks: integer('paid_kopecks').notNull().default(0),
  paidAt: date('paid_at'),
  recordedBy: text('recorded_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('installment_payments_application_id_installment_number_key').on(table.applicationId, table.installmentNumber),
  index('installment_payments_user_application_idx').on(table.userId, table.applicationId),
])

export const administrators = pgTable('installment_admins', {
  userId: text('user_id').primaryKey(),
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
})
