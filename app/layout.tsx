import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Manrope, Cormorant_Garamond } from 'next/font/google'
import { SplashScreen } from '@/components/splash-screen'
import './globals.css'

const sans = Manrope({ subsets: ['latin', 'cyrillic'], variable: '--font-manrope' })
const serif = Cormorant_Garamond({ subsets: ['latin', 'cyrillic'], weight: ['400', '500'], variable: '--font-cormorant' })

export const metadata: Metadata = {
  title: 'Исламская рассрочка — покупайте с уверенностью',
  description: 'Прозрачная рассрочка с первоначальным взносом и без. Рассчитайте стоимость покупки, наценку и график платежей на срок от 2 до 12 месяцев.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#0c1b16',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`bg-background light ${sans.variable} ${serif.variable}`}>
      <body className="font-sans antialiased">
        <SplashScreen />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
