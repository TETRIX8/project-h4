"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { ArrowLeftIcon, LockIcon, MailIcon, UserIcon } from "lucide-react"

export default function SignUpPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await authClient.signUp.email({
      name,
      email,
      password,
    })

    if (res.error) {
      setError(res.error.message || "Ошибка при регистрации. Проверьте данные.")
      setLoading(false)
    } else {
      router.push("/cabinet")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1c16] text-[#e8ded1] flex flex-col justify-between p-4 md:p-8 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,122,0.15),transparent_50%)] pointer-events-none" />
      
      <header className="flex justify-between items-center z-10 max-w-5xl mx-auto w-full">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#caa278] hover:text-[#d4af7a] transition-colors">
          <ArrowLeftIcon className="size-4" /> На главную
        </Link>
        <span className="font-serif text-xl tracking-wider text-[#d4af7a]">EVLOEVFILM</span>
      </header>

      <main className="my-auto py-12 z-10 max-w-md mx-auto w-full">
        <div className="bg-[#132720]/90 border border-[#234237] backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-2xl">
          <h1 className="font-serif text-3xl font-medium text-white text-center mb-2">Создание аккаунта</h1>
          <p className="text-sm text-[#a8b8a0] text-center mb-6">Зарегистрируйтесь для оформления исламской рассрочки</p>

          {error && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#a8b8a0] mb-1.5" htmlFor="name">ФИО / Имя</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8a9b82]" />
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Иван Иванов"
                  className="w-full bg-[#0a1712] border border-[#234237] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-[#5a6b52] focus:outline-none focus:border-[#d4af7a] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#a8b8a0] mb-1.5" htmlFor="email">Email</label>
              <div className="relative">
                <MailIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8a9b82]" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#0a1712] border border-[#234237] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-[#5a6b52] focus:outline-none focus:border-[#d4af7a] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#a8b8a0] mb-1.5" htmlFor="password">Пароль (мин. 8 символов)</label>
              <div className="relative">
                <LockIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8a9b82]" />
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0a1712] border border-[#234237] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-[#5a6b52] focus:outline-none focus:border-[#d4af7a] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#d4af7a] to-[#c29862] hover:from-[#e2be8b] hover:to-[#d0a772] text-[#0d1c16] font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-lg font-sans disabled:opacity-50 mt-2"
            >
              {loading ? "Создание аккаунта..." : "Зарегистрироваться"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#234237] text-center text-xs text-[#a8b8a0]">
            Уже есть аккаунт?{" "}
            <Link href="/sign-in" className="text-[#d4af7a] hover:underline font-medium">
              Войти
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-[#5a6b52] z-10 py-2">
        Исламская рассрочка © {new Date().getFullYear()} — Все условия соответствуют шариату
      </footer>
    </div>
  )
}
