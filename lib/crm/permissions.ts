import type { StaffRole } from '@/lib/db/schema'

export const PERMISSIONS = {
  'applications.view': 'Просмотр заявок',
  'applications.edit': 'Создание и изменение заявок',
  'applications.approve': 'Одобрение и отклонение заявок',
  'clients.view': 'Просмотр клиентов',
  'clients.edit': 'Создание и изменение клиентов',
  'contracts.view': 'Просмотр договоров',
  'contracts.create': 'Формирование договоров',
  'contracts.edit': 'Изменение статуса договоров',
  'payments.accept': 'Приём платежей',
  'payments.cancel': 'Отмена платежей (с причиной)',
  'receipts.print': 'Печать чеков',
  'analytics.view': 'Аналитика',
  'audit.view': 'Журнал аудита',
  'staff.manage': 'Управление сотрудниками',
  'settings.manage': 'Настройки организации',
} as const

export type Permission = keyof typeof PERMISSIONS
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[]

export const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  cashier: 'Cashier',
  viewer: 'Viewer',
}

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  super_admin: 'Полный доступ ко всей системе',
  admin: 'Управление операциями, без сотрудников и настроек',
  manager: 'Заявки, клиенты, формирование договоров',
  cashier: 'Приём платежей и печать чеков',
  viewer: 'Только просмотр',
}

export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  super_admin: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS.filter((p) => p !== 'staff.manage' && p !== 'settings.manage'),
  manager: ['applications.view', 'applications.edit', 'applications.approve', 'clients.view', 'clients.edit', 'contracts.view', 'contracts.create', 'receipts.print', 'analytics.view'],
  cashier: ['applications.view', 'clients.view', 'contracts.view', 'payments.accept', 'receipts.print'],
  viewer: ['applications.view', 'clients.view', 'contracts.view', 'analytics.view'],
}

export function resolvePermissions(role: StaffRole, overrides?: Partial<Record<StaffRole, string[]>> | null): Permission[] {
  if (role === 'super_admin') return ALL_PERMISSIONS
  const custom = overrides?.[role]
  if (!custom) return DEFAULT_ROLE_PERMISSIONS[role]
  return custom.filter((p): p is Permission => p in PERMISSIONS)
}
