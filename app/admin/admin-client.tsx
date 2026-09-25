"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatMoney } from "@/lib/installment"
import { updateApplicationStatusAction, recordPaymentAction } from "@/app/actions/applications"
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  SearchIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FilterIcon,
  RefreshCwIcon
} from "lucide-react"

interface AdminClientProps {
  user: any
  initialApplications: any[]
}

export default function AdminClient({ user, initialApplications }: AdminClientProps) {
  const router = useRouter()
  const [applications, setApplications] = useState(initialApplications)
  const [filterStatus, setFilterStatus] = useState("all")
  const [search, setSearch] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(initialApplications[0]?.id || null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [paymentInputs, setPaymentInputs] = useState<Record<string, number>>({})

  const filteredApps = applications.filter((app) => {
    if (filterStatus !== "all" && app.status !== filterStatus) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = app.customerName.toLowerCase().includes(q)
      const matchPhone = app.phone.toLowerCase().includes(q)
      const matchProduct = app.productName.toLowerCase().includes(q)
      if (!matchName && !matchPhone && !matchProduct) return false
    }
    return true
  })

  const handleStatusChange = async (appId: string, newStatus: string) => {
    setUpdatingId(appId)
    try {
      await updateApplicationStatusAction(appId, newStatus)
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
      )
    } catch (e) {
      alert("Ошибка при изменении статуса")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRecordPayment = async (paymentId: string, amount: number) => {
    try {
      await recordPaymentAction(paymentId, amount)
      router.refresh()
      alert("Платёж успешно зафиксирован")
    } catch (e) {
      alert("Ошибка при проведении платежа")
    }
  }

  return (
    <div className="min-h-screen bg-[#0a1712] text-[#e8ded1] font-sans">
      {/* Top Admin Navigation */}
      <header className="border-b border-[#234237] bg-[#0d1c16]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/cabinet" className="text-sm text-[#caa278] hover:text-[#d4af7a] flex items-center gap-1.5">
              <ArrowLeftIcon className="size-4" /> Кабинет
            </Link>
            <span className="text-[#234237]">|</span>
            <div className="flex items-center gap-2 text-amber-300 font-serif text-xl font-medium">
              <ShieldCheckIcon className="size-5" /> Панель администратора
            </div>
          </div>

          <div className="text-xs text-[#8a9b82] flex items-center gap-2">
            <span>Вы вошли как: <strong className="text-white">{user.email}</strong></span>
          </div>
        </div>
      </header>

      {/* Main Admin Area */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="font-serif text-3xl text-white">Управление заявками и платежами</h1>
            <p className="text-xs text-[#a8b8a0] mt-1">Всего заявок в системе: {applications.length}</p>
          </div>

          <button
            onClick={() => router.refresh()}
            className="px-4 py-2 rounded-xl bg-[#132720] border border-[#234237] hover:bg-[#1b352c] text-xs text-[#caa278] flex items-center gap-2 transition-colors"
          >
            <RefreshCwIcon className="size-3.5" /> Обновить данные
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-[#132720]/80 border border-[#234237] rounded-2xl p-4 mb-8 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8a9b82]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по ФИО, телефону, товару..."
              className="w-full bg-[#0a1712] border border-[#234237] rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder:text-[#5a6b52] focus:outline-none focus:border-[#d4af7a]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <FilterIcon className="size-3.5 text-[#8a9b82] shrink-0" />
            {[
              { id: "all", label: "Все" },
              { id: "new", label: "Новые" },
              { id: "review", label: "На рассмотрении" },
              { id: "approved", label: "Одобрены" },
              { id: "rejected", label: "Отклонены" },
              { id: "completed", label: "Выплачены" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilterStatus(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                  filterStatus === st.id
                    ? "bg-[#d4af7a] text-[#0d1c16]"
                    : "bg-[#0a1712] border border-[#234237] text-[#a8b8a0] hover:text-white"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {filteredApps.length === 0 ? (
            <div className="text-center py-12 text-sm text-[#8a9b82]">
              Заявки с выбранными фильтрами не найдены
            </div>
          ) : (
            filteredApps.map((app) => {
              const isExpanded = expandedId === app.id
              const price = app.priceKopecks / 100

              return (
                <div key={app.id} className="bg-[#132720]/90 border border-[#234237] rounded-2xl overflow-hidden shadow-lg">
                  {/* Header Row */}
                  <div className="p-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-white text-base">{app.customerName}</span>
                        <span className="text-xs text-[#d4af7a] bg-[#1a382d] px-2.5 py-0.5 rounded-md border border-[#2c5847]">
                          {app.phone}
                        </span>
                      </div>
                      <div className="text-xs text-[#a8b8a0]">
                        Товар: <strong className="text-white">{app.productName}</strong> ({formatMoney(price)}) •{" "}
                        Тариф: {app.tariff === "with-deposit" ? "С взносом" : "Без взноса"} • {app.months} месяцев
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Status Selector */}
                      <select
                        value={app.status}
                        disabled={updatingId === app.id}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        className="bg-[#0a1712] border border-[#2c5847] text-xs text-[#caa278] rounded-xl px-3 py-1.5 focus:outline-none focus:border-[#d4af7a]"
                      >
                        <option value="new">Новая</option>
                        <option value="review">На рассмотрении</option>
                        <option value="approved">Одобрена</option>
                        <option value="rejected">Отклонена</option>
                        <option value="completed">Выплачена</option>
                      </select>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : app.id)}
                        className="p-2 text-[#caa278] hover:bg-[#1a382d] rounded-xl transition-colors"
                      >
                        {isExpanded ? <ChevronUpIcon className="size-5" /> : <ChevronDownIcon className="size-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Payment Schedule Admin Controls */}
                  {isExpanded && (
                    <div className="border-t border-[#234237] bg-[#0a1712] p-5 space-y-4">
                      <h3 className="text-xs uppercase tracking-wider text-[#d4af7a] font-medium">
                        Управление графиком платежей клиента
                      </h3>

                      <div className="border border-[#234237] rounded-xl overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#132720] text-[#caa278] border-b border-[#234237]">
                            <tr>
                              <th className="p-3">№</th>
                              <th className="p-3">Тип</th>
                              <th className="p-3">Сумма к оплате</th>
                              <th className="p-3">Статус</th>
                              <th className="p-3">Фиксация поступления</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#183329]">
                            {(app.payments || []).map((p: any) => {
                              const amount = p.amountKopecks / 100
                              const paid = p.paidKopecks / 100
                              const isPaid = paid >= amount
                              const currentInput = paymentInputs[p.id] ?? amount

                              return (
                                <tr key={p.id}>
                                  <td className="p-3 text-[#a8b8a0]">
                                    {p.installmentNumber === 0 ? "Взнос" : `#${p.installmentNumber}`}
                                  </td>
                                  <td className="p-3 text-white">
                                    {p.installmentNumber === 0
                                      ? "Первоначальный взнос"
                                      : p.dueDate
                                      ? `До ${new Date(p.dueDate).toLocaleDateString("ru-RU")}`
                                      : `Месяц ${p.installmentNumber}`}
                                  </td>
                                  <td className="p-3 text-[#e8ded1] font-medium">{formatMoney(amount)}</td>
                                  <td className="p-3">
                                    {isPaid ? (
                                      <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                                        <CheckCircle2Icon className="size-3.5" /> Оплачен ({formatMoney(paid)})
                                      </span>
                                    ) : (
                                      <span className="text-amber-400">Ожидает</span>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    {!isPaid && (
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          value={currentInput}
                                          onChange={(e) =>
                                            setPaymentInputs((prev) => ({
                                              ...prev,
                                              [p.id]: Number(e.target.value),
                                            }))
                                          }
                                          className="w-28 bg-[#132720] border border-[#234237] rounded-lg px-2 py-1 text-xs text-white"
                                        />
                                        <button
                                          onClick={() => handleRecordPayment(p.id, currentInput)}
                                          className="bg-emerald-800 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                                        >
                                          Отметить оплату
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
