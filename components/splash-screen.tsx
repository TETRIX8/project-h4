'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const MAX_DURATION_MS = 8000
const FADE_MS = 700

export function SplashScreen() {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin')) return null
  return <SplashVideo />
}

function SplashVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [leaving, setLeaving] = useState(false)
  const [hidden, setHidden] = useState(false)

  const finish = () => setLeaving(true)

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(finish, reduceMotion ? 600 : MAX_DURATION_MS)
    videoRef.current?.play().catch(finish)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!leaving) return
    document.documentElement.style.overflow = ''
    const timer = window.setTimeout(() => setHidden(true), FADE_MS)
    return () => window.clearTimeout(timer)
  }, [leaving])

  if (hidden) return null

  return (
    <div
      role="status"
      aria-label="Загрузка сайта"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-primary transition-opacity duration-700 ease-out ${leaving ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      <video
        ref={videoRef}
        src="/videos/loading.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        aria-hidden="true"
        className="h-full w-full object-cover"
      />
      <button
        type="button"
        onClick={finish}
        className="absolute bottom-6 right-6 rounded-full border border-primary-foreground/30 bg-primary/40 px-5 py-2 text-sm text-primary-foreground backdrop-blur transition-colors hover:bg-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/60"
      >
        Пропустить
      </button>
    </div>
  )
}
