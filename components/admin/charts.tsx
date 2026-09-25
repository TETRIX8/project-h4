'use client'

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SeriesPoint } from '@/lib/crm/analytics'
import { Panel } from '@/components/admin/ui'

const COLORS = { ink: 'var(--primary)', gold: 'var(--accent)', green: 'var(--tone-green)', red: 'var(--tone-red)', muted: 'var(--muted-foreground)' }
const moneyAxis = (value: number) => (value >= 100_000_00 ? `${Math.round(value / 100_000_00) / 10} млн` : value >= 100_000 ? `${Math.round(value / 100_000)} тыс` : `${Math.round(value / 100)}`)
const money = (value: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value / 100)

const axisProps = { tick: { fontSize: 11, fill: 'var(--muted-foreground)' }, tickLine: false, axisLine: false } as const
const tooltipStyle = { contentStyle: { background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }, labelStyle: { color: 'var(--muted-foreground)' } }

function Frame({ title, description, children }: { title: string; description?: string; children: React.ReactElement }) {
  return (
    <Panel title={title} description={description}>
      <div className="h-56 px-2 py-4">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </Panel>
  )
}

export type ChartKind = 'applications' | 'decisions' | 'payments' | 'overdue' | 'revenue' | 'active' | 'sales' | 'contracts'

export function CrmCharts({ series, kinds }: { series: SeriesPoint[]; kinds: ChartKind[] }) {
  const charts: Record<ChartKind, React.ReactNode> = {
    applications: (
      <Frame key="applications" title="Заявки по дням" description="Новые заявки за период">
        <BarChart data={series}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" {...axisProps} minTickGap={16} /><YAxis {...axisProps} allowDecimals={false} width={28} /><Tooltip {...tooltipStyle} /><Bar dataKey="applications" name="Заявки" fill={COLORS.ink} radius={[4, 4, 0, 0]} /></BarChart>
      </Frame>
    ),
    decisions: (
      <Frame key="decisions" title="Одобрения и отказы">
        <BarChart data={series}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" {...axisProps} minTickGap={16} /><YAxis {...axisProps} allowDecimals={false} width={28} /><Tooltip {...tooltipStyle} /><Bar dataKey="approved" name="Одобрено" stackId="d" fill={COLORS.green} /><Bar dataKey="rejected" name="Отклонено" stackId="d" fill={COLORS.red} radius={[4, 4, 0, 0]} /></BarChart>
      </Frame>
    ),
    payments: (
      <Frame key="payments" title="Платежи" description="Количество принятых платежей">
        <LineChart data={series}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" {...axisProps} minTickGap={16} /><YAxis {...axisProps} allowDecimals={false} width={28} /><Tooltip {...tooltipStyle} /><Line dataKey="paymentsCount" name="Платежей" stroke={COLORS.ink} strokeWidth={2} dot={false} /></LineChart>
      </Frame>
    ),
    overdue: (
      <Frame key="overdue" title="Просрочки" description="Просроченный остаток по дате платежа">
        <BarChart data={series}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" {...axisProps} minTickGap={16} /><YAxis {...axisProps} tickFormatter={moneyAxis} width={48} /><Tooltip {...tooltipStyle} formatter={(v) => money(Number(v))} /><Bar dataKey="overdueKopecks" name="Просрочено" fill={COLORS.red} radius={[4, 4, 0, 0]} /></BarChart>
      </Frame>
    ),
    revenue: (
      <Frame key="revenue" title="Поступления денег">
        <AreaChart data={series}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" {...axisProps} minTickGap={16} /><YAxis {...axisProps} tickFormatter={moneyAxis} width={48} /><Tooltip {...tooltipStyle} formatter={(v) => money(Number(v))} /><Area dataKey="paymentsKopecks" name="Получено" stroke={COLORS.gold} fill={COLORS.gold} fillOpacity={0.18} strokeWidth={2} /></AreaChart>
      </Frame>
    ),
    sales: (
      <Frame key="sales" title="Объём продаж" description="Сумма по новым договорам">
        <BarChart data={series}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" {...axisProps} minTickGap={16} /><YAxis {...axisProps} tickFormatter={moneyAxis} width={48} /><Tooltip {...tooltipStyle} formatter={(v) => money(Number(v))} /><Bar dataKey="salesKopecks" name="Продажи" fill={COLORS.gold} radius={[4, 4, 0, 0]} /></BarChart>
      </Frame>
    ),
    contracts: (
      <Frame key="contracts" title="Новые договоры">
        <BarChart data={series}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" {...axisProps} minTickGap={16} /><YAxis {...axisProps} allowDecimals={false} width={28} /><Tooltip {...tooltipStyle} /><Bar dataKey="contracts" name="Договоры" fill={COLORS.ink} radius={[4, 4, 0, 0]} /></BarChart>
      </Frame>
    ),
    active: (
      <Frame key="active" title="Активные договоры">
        <LineChart data={series}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" {...axisProps} minTickGap={16} /><YAxis {...axisProps} allowDecimals={false} width={28} /><Tooltip {...tooltipStyle} /><Line dataKey="activeContracts" name="Активных" stroke={COLORS.green} strokeWidth={2} dot={false} type="stepAfter" /></LineChart>
      </Frame>
    ),
  }
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{kinds.map((kind) => charts[kind])}</div>
}
