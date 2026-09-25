import Image from 'next/image'
import { ArrowRight, Check, FilePenLine, FileUser, Package, UserRound } from 'lucide-react'
import type { Tariff } from '@/lib/installment'

const sharedConditions = ['Срок от 2 до 12 месяцев', 'Один поручитель', 'Возраст от 21 года']

export function TariffSection({ onCompare, onTariff }: { onCompare: () => void; onTariff: (tariff: Tariff) => void }) {
  return (
    <section className="tariffs-section" id="tariffs">
      <div className="section-heading">
        <div><p className="eyebrow">Два удобных тарифа</p><h2 className="font-serif">Выберите подходящий<br />вариант рассрочки</h2></div>
        <p className="section-intro">Гибкие условия для ваших целей.<br />Оба тарифа соответствуют исламским<br className="desktop-break" /> принципам.</p>
        <button className="text-link" onClick={onCompare}>Сравнить тарифы <ArrowRight size={18} strokeWidth={1.2} /></button>
      </div>
      <div className="tariff-cards">
        {[true, false].map((deposit) => (
          <article className={`tariff-card ${deposit ? 'tariff-dark' : 'tariff-light'}`} key={String(deposit)}>
            <Image src="/images/tariff-interior.png" alt="" fill sizes="(max-width: 700px) 100vw, 50vw" className="tariff-photo" />
            <div className="tariff-card-content">
              <span className="tariff-index">{deposit ? '01' : '02'}</span>
              <h3 className="font-serif">{deposit ? 'С первоначальным' : 'Без первоначального'}<br />{deposit ? 'взносом' : 'взноса'}</h3>
              <p className="tariff-description">{deposit ? <>Меньшая наценка —<br />выгодные условия</> : 'Максимальная доступность'}</p>
              <ul className="tariff-conditions">
                {[deposit ? 'Первоначальный взнос от 20% до 80%' : 'Первоначальный взнос 0 ₽', sharedConditions[0], deposit ? 'Наценка от 9% до 48%' : 'Наценка 3,6% в месяц', ...sharedConditions.slice(1)].map((condition) => <li key={condition}><span className="condition-check"><Check size={13} strokeWidth={2} /></span>{condition}</li>)}
              </ul>
              <div className="tariff-card-actions"><button className="gold-button" onClick={() => onTariff(deposit ? 'with-deposit' : 'without-deposit')}>Подробнее <ArrowRight size={18} strokeWidth={1.3} /></button><button className="round-arrow" aria-label={deposit ? 'Рассчитать тариф со взносом' : 'Рассчитать тариф без взноса'} onClick={() => {
                onTariff(deposit ? 'with-deposit' : 'without-deposit')
              }}><ArrowRight size={23} strokeWidth={1.2} /></button></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

const steps = [
  { icon: FileUser, title: 'Оставляете заявку', description: 'Онлайн, за пару минут' },
  { icon: UserRound, title: 'Проходите проверку', description: 'Мы быстро рассматриваем вашу заявку' },
  { icon: FilePenLine, title: 'Подписываете договор', description: 'Все условия прозрачны и понятны' },
  { icon: Package, title: 'Получаете товар', description: 'И начинаете платить частями' },
]

export function ProcessSection() {
  return (
    <section className="process-section" id="how-it-works">
      <div className="process-heading"><h2 className="font-serif">Как это работает</h2><span className="heading-line" /><p>Простой и понятный процесс —<br />от заявки до покупки.</p></div>
      <ol className="process-steps">{steps.map(({ icon: Icon, title, description }, index) => (
        <li key={title}><span className="step-icon"><Icon size={29} strokeWidth={1.2} /></span><div className="step-content"><div className="step-top"><span>0{index + 1}</span></div><span className="step-rule"><ArrowRight size={13} /></span><h3>{title}</h3><p>{description}</p></div></li>
      ))}</ol>
    </section>
  )
}

export function CallToAction({ onApply, onQuestion }: { onApply: () => void; onQuestion: () => void }) {
  return (
    <section className="cta-section" id="contacts">
      <Image src="/images/approval-scene.png" alt="Смартфон на мраморном столе в солнечной гостиной" fill sizes="100vw" className="cta-photo" />
      <div className="cta-shade" />
      <div className="site-container cta-inner"><div className="cta-copy"><p className="eyebrow">Ваши важные покупки</p><h2 className="font-serif">Стали ближе</h2><p className="cta-description">Оставьте заявку и получите индивидуальные<br className="desktop-break" /> условия рассрочки.</p><div className="cta-actions"><button className="gold-button" onClick={onApply}>Подать заявку <ArrowRight size={18} strokeWidth={1.3} /></button><button className="outline-button" onClick={onQuestion}>Задать вопрос</button></div></div></div>
      <div className="phone-message" aria-hidden="true"><Check size={35} strokeWidth={1} /><span>Ваша заявка<br />одобрена</span></div>
    </section>
  )
}
