'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowRight, FileText, Menu, Play, ShieldCheck, X, Zap } from 'lucide-react'
import { Calculator } from './calculator'
import { CallToAction, ProcessSection, TariffSection } from './sections'
import { SiteDialogs, type DialogView } from './site-dialogs'
import { DEFAULT_INPUT, type Tariff } from '@/lib/installment'

const benefits = [
  { icon: ShieldCheck, first: 'Без процентов', second: 'и риба' },
  { icon: FileText, first: 'Прозрачные', second: 'условия' },
  { icon: Zap, first: 'Быстрое', second: 'одобрение' },
  { icon: ShieldCheck, first: 'Надежность', second: 'и безопасность' },
]

export function InstallmentHome() {
  const [input, setInput] = useState(DEFAULT_INPUT)
  const [dialog, setDialog] = useState<DialogView>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  function showDialog(view: DialogView) { setMenuOpen(false); setDialog(view) }
  function selectTariff(tariff: Tariff) { setInput((current) => ({ ...current, tariff })); setDialog('tariff') }
  function focusCalculator() {
    setDialog(null)
    setMenuOpen(false)
    document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    document.getElementById('price')?.focus({ preventScroll: true })
  }

  return (
    <main>
      <section className="hero" id="about">
        <Image src="/images/arches-hero.png" alt="Мраморные арки, уютная гостиная и мечеть в лучах закатного солнца" fill priority sizes="100vw" className="hero-photo" />
        <div className="hero-shade" />
        <header className="site-container site-header">
          <a href="#" className="brand" aria-label="На главную">LOGO</a>
          <nav className="desktop-nav" aria-label="Основная навигация"><a href="#about">О нас</a><a href="#how-it-works">Как это работает</a><a href="#tariffs">Тарифы</a><button onClick={() => showDialog('faq')}>Вопросы</button><a href="#contacts">Контакты</a></nav>
          <div className="header-actions"><button className="gold-button header-apply" onClick={() => showDialog('apply')}>Подать заявку <ArrowRight size={17} strokeWidth={1.3} /></button><button className="menu-button" aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={menuOpen} aria-controls="site-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={22} strokeWidth={1.3} />}</button></div>
          {menuOpen && <nav className="menu-panel" id="site-menu" aria-label="Дополнительная навигация"><a href="#about" onClick={() => setMenuOpen(false)}>О нас</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>Как это работает</a><a href="#tariffs" onClick={() => setMenuOpen(false)}>Тарифы</a><button onClick={() => showDialog('faq')}>Вопросы и ответы</button><a href="#contacts" onClick={() => setMenuOpen(false)}>Контакты</a><button onClick={() => showDialog('account')}>Личный кабинет <ArrowRight size={16} /></button></nav>}
        </header>
        <div className="site-container hero-body">
          <div className="hero-copy">
            <p className="eyebrow">Исламская рассрочка</p>
            <h1 className="font-serif">Покупайте<br /><span>с уверенностью</span></h1>
            <p className="hero-description">Доступная и прозрачная рассрочка<br />в соответствии с исламскими принципами.</p>
            <div className="hero-actions"><button className="gold-button glowing" onClick={focusCalculator}>Рассчитать рассрочку <ArrowRight size={19} strokeWidth={1.3} /></button><button className="outline-button video-button" onClick={() => showDialog('guide')}><Play size={21} strokeWidth={1.1} />Смотреть видео</button></div>
            <ul className="benefits">{benefits.map(({ icon: Icon, first, second }) => <li key={first}><span className="benefit-icon"><Icon size={24} strokeWidth={1.15} /></span><span>{first}<br />{second}</span></li>)}</ul>
          </div>
          <Calculator input={input} onChange={setInput} onDetails={() => showDialog('schedule')} />
        </div>
      </section>
      <div className="content-section"><div className="site-container content-container"><TariffSection onCompare={() => showDialog('compare')} onTariff={selectTariff} /><ProcessSection /></div></div>
      <CallToAction onApply={() => showDialog('apply')} onQuestion={() => showDialog('faq')} />
      <SiteDialogs view={dialog} onClose={() => setDialog(null)} input={input} onApply={() => setDialog('apply')} onCalculate={focusCalculator} />
    </main>
  )
}
