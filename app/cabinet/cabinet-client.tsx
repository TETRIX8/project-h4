"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { formatMoney } from "@/lib/installment"
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ClockIcon,
  PlusIcon,
  ShieldCheckIcon,
  LogOutIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AlertCircleIcon,
  SparklesIcon
} from "lucide-react"

interface CabinetClientProps {
  user: {
    id: string
    email: string
    name: string
  }
  applications: any[]
  isAdmin: boolean
}

export default function CabinetClient({ user, applications, isAdmin }: CabinetClientProps) {
  const router = useRouter()
  const [expandedAppId, setExpandedAppId] = useState<string | null>(applications[0]?.id || null)

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-950/80 border border-blue-800 text-blue-300"><ClockIcon className="size-3.5" /> Новая заявка</span>
      case "review":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-950/80 border border-amber-800 text-amber-300"><ClockIcon className="size-3.5" /> На рассмотрении</span>
      case "approved":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/80 border border-emerald-800 text-emerald-300"><CheckCircle2Icon className="size-3.5" /> Одобрена</span>
      case "rejected":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-950/80 border border-rose-800 text-rose-300"><AlertCircleIcon className="size-3.5" /> Отклонена</span>
      case "completed":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-teal-950/80 border border-teal-800 text-teal-300"><SparklesIcon className="size-3.5" /> Полностью выплачена</span>
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-stone-800 border border-stone-700 text-stone-300">{status}</span>
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1c16] text-[#e8ded1] font-sans">
      {/* Header */}
      <header className="border-b border-[#234237] bg-[#0c1b16]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-[#caa278] hover:text-[#d4af7a] flex items-center gap-1.5 transition-colors">
              <ArrowLeftIcon className="size-4" /> Сайт
            </Link>
            <span className="text-[#234237]">|</span>
            <span className="font-serif text-xl font-medium tracking-wider text-[#d4af7a]">Личный кабинет</span>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="px-3.5 py-1.5 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs font-medium hover:bg-amber-900/60 transition-all flex items-center gap-1.5"
              >
                <ShieldCheckIcon className="size-3.5" /> Панель администратора
              </Link>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-[#234237]">
              <div className="size-8 rounded-full bg-[#1b352c] border border-[#2e5246] flex items-center justify-center text-xs text-[#d4af7a] font-medium">
                {user.name ? user.name[0].toUpperCase() : <UserIcon className="size-4" />}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-medium text-white">{user.name || "Клиент"}</div>
                <div className="text-[10px] text-[#8a9b82]">{user.email}</div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl text-[#8a9b82] hover:text-white hover:bg-[#132720] transition-colors"
              title="Выйти"
            >
              <LogOutIcon className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl text-white font-normal">Мои заявки на рассрочку</h1>
            <p className="text-sm text-[#a8b8a0] mt-1">Отслеживайте статус рассмотрения и график ежемесячных платежей</p>
          </div>

          <Link
            href="/#calculator"
            className="inline-flex items-center gap-2 bg-[#d4af7a] hover:bg-[#e2be8b] text-[#0d1c16] px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md font-sans"
          >
            <PlusIcon className="size-4" /> Рассчитать новую заявку
          </Link>
        </div>

        {applications.length === 0 ? (
          <div className="bg-[#132720]/80 border border-[#234237] rounded-2xl p-12 text-center max-w-xl mx-auto my-12">
            <div className="size-16 rounded-full bg-[#1b352c] border border-[#2e5246] flex items-center justify-center mx-auto mb-4 text-[#d4af7a]">
              <ClockIcon className="size-8" />
            </div>
            <h2 className="font-serif text-2xl text-white font-normal mb-2">У вас пока нет активных заявок</h2>
            <p className="text-sm text-[#a8b8a0] mb-6">
              Воспользуйтесь нашим калькулятором на главной странице, чтобы подобрать удобные условия и подать заявку за пару минут.
            </p>
            <Link
              href="/#calculator"
              className="inline-flex items-center gap-2 bg-[#d4af7a] hover:bg-[#e2be8b] text-[#0d1c16] px-6 py-3 rounded-xl text-sm font-medium transition-all shadow-lg font-sans"
            >
              Перейти к калькулятору
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map((app) => {
              const isExpanded = expandedAppId === app.id
              const price = app.priceKopecks / 100
              const deposit = app.depositKopecks / 100
              const markup = app.markupKopecks / 100
              const calc = app.calculation
              const totalPaid = (app.payments || [])
                .filter((p: any) => p.paidKopecks > 0)
                .reduce((acc: number, p: any) => acc + p.paidKopecks / 100, 0)
              const totalDue = calc ? calc.totalAmount : price + markup

              return (
                <div
                  key={app.id}
                  className="bg-[#132720]/90 border border-[#234237] rounded-2xl overflow-hidden shadow-xl transition-all"
                >
                  {/* Card Header Bar */}
                  <div
                    onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                    className="p-5 md:p-6 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-[#183027] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-medium text-white">{app.productName}</h2>
                        {getStatusBadge(app.status)}
                      </div>
                      <div className="text-xs text-[#a8b8a0] flex items-center gap-3">
                        <span>Заявка № {app.id.slice(0, 8)}</span>
                        <span>•</span>
                        <span>{new Date(app.createdAt).toLocaleDateString("ru-RU")}</span>
                        <span>•</span>
                        <span className="text-[#caa278]">
                          {app.tariff === "with-deposit" ? "С взносом" : "Без взноса"} ({app.months} мес.)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-[#8a9b82]">Ежемесячный платёж</div>
                        <div className="text-lg font-serif font-medium text-[#d4af7a]">
                          {formatMoney(calc?.monthlyPayment || 0)}
                        </div>
                      </div>

                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-[#8a9b82]">Выплачено</div>
                        <div className="text-sm text-emerald-400 font-medium">
                          {formatMoney(totalPaid)} / {formatMoney(totalDue)}
                        </div>
                      </div>

                      <button className="p-2 rounded-xl text-[#caa278] hover:bg-[#203f34] transition-colors">
                        {isExpanded ? <ChevronUpIcon className="size-5" /> : <ChevronDownIcon className="size-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Schedule and Details */}
                  {isExpanded && (
                    <div className="border-t border-[#234237] bg-[#0e1d17] p-6 space-y-6">
                      {/* Grid Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#132720] border border-[#234237] rounded-xl text-xs">
                        <div>
                          <div className="text-[#8a9b82]">Стоимость товара</div>
                          <div className="text-sm font-medium text-white mt-0.5">{formatMoney(price)}</div>
                        </div>
                        <div>
                          <div className="text-[#8a9b82]">Первоначальный взнос</div>
                          <div className="text-sm font-medium text-white mt-0.5">{formatMoney(deposit)}</div>
                        </div>
                        <div>
                          <div className="text-[#8a9b82]">Наценка (торговая)</div>
                          <div className="text-sm font-medium text-white mt-0.5">{formatMoney(markup)}</div>
                        </div>
                        <div>
                          <div className="text-[#8a9b82]">Итоговая стоимость</div>
                          <div className="text-sm font-medium text-[#d4af7a] mt-0.5">{formatMoney(totalDue)}</div>
                        </div>
                      </div>

                      {/* Payment Schedule Table */}
                      <div>
                        <h3 className="font-serif text-lg text-white mb-3 flex items-center justify-between">
                          <span>График платежей по договору</span>
                          <span className="text-xs font-sans text-[#a8b8a0] font-normal">
                            Телефон клиента: {app.phone}
                          </span>
                        </h3>

                        <div className="border border-[#234237] rounded-xl overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-[#152e25] text-[#caa278] border-b border-[#234237] font-medium">
                              <tr>
                                <th className="p-3">№</th>
                                <th className="p-3">Тип / Срок</th>
                                <th className="p-3">Сумма к оплате</th>
                                <th className="p-3">Статус оплаты</th>
                                <th className="p-3">Дата внесения</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1e3b31]">
                              {(app.payments || []).map((p: any) => {
                                const amount = p.amountKopecks / 100
                                const paid = p.paidKopecks / 100
                                const isPaid = paid >= amount

                                return (
                                  <tr key={p.id} className={isPaid ? "bg-emerald-950/20" : "hover:bg-[#132720]"}>
                                    <td className="p-3 text-[#a8b8a0]">
                                      {p.installmentNumber === 0 ? "Взнос" : `Платёж ${p.installmentNumber}`}
                                    </td>
                                    <td className="p-3 text-white">
                                      {p.installmentNumber === 0
                                        ? "Первоначальный взнос"
                                        : p.dueDate
                                        ? `До ${new Date(p.dueDate).toLocaleDateString("ru-RU")}`
                                        : `Месяц ${p.installmentNumber}`}
                                    </td>
                                    <td className="p-3 font-medium text-[#e8ded1]">{formatMoney(amount)}</td>
                                    <td className="p-3">
                                      {isPaid ? (
                                        <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                                          <CheckCircle2Icon className="size-3.5" /> Оплачено ({formatMoney(paid)})
                                        </span>
                                      ) : (
                                        <span className="text-amber-400">Ожидает оплаты</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-[#8a9b82]">
                                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString("ru-RU") : "—"}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
