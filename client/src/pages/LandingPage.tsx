import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/landing.css";
import { LangSwitcher } from "../components/LangSwitcher";
import { useTranslation } from 'react-i18next';
type Theme = "light" | "dark";

interface LandingPageProps {
  theme: Theme;
  onToggleTheme: () => void;
}
const FEATURES = [
  {
    icon: "📋",
    titleKey: "features.tasks.title",
    itemKeys: ["features.tasks.item0", "features.tasks.item1", "features.tasks.item2"],
  },
  {
    icon: "⏱",
    titleKey: "features.focus.title",
    itemKeys: ["features.focus.item0", "features.focus.item1", "features.focus.item2"],
  },
  {
    icon: "📊",
    titleKey: "features.analytics.title",
    itemKeys: ["features.analytics.item0", "features.analytics.item1", "features.analytics.item2"],
  },
  {
    icon: "🎮",
    titleKey: "features.gamification.title",
    itemKeys: ["features.gamification.item0", "features.gamification.item1", "features.gamification.item2"],
  },
] as const;

const PROBLEMS = [
  "problems.item0",
  "problems.item1",
  "problems.item2",
  "problems.item3",
] as const;

const DIFFERENTIATORS = [
  { icon: "🔍", key: "diff.item0" },
  { icon: "🧘", key: "diff.item1" },
  { icon: "🧩", key: "diff.item2" },
  { icon: "📈", key: "diff.item3" },
] as const;

const HOW_STEPS = [
  { num: "01", key: "steps.item0" },
  { num: "02", key: "steps.item1" },
  { num: "03", key: "steps.item2" },
  { num: "04", key: "steps.item3" },
  { num: "05", key: "steps.item4" },
] as const;

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting) {
          el.classList.add("is-revealed");
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

interface RevealProps {
  className?: string;
  children: React.ReactNode;
}

const Reveal: React.FC<RevealProps> = ({ className = "", children }) => {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal ${className}`.trim()}>
      {children}
    </div>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ theme, onToggleTheme }) => {
  const { t } = useTranslation()
  const navigate = useNavigate();
  const featuresRef = useRef<HTMLElement>(null);
  const currentYear = new Date().getFullYear();

  const goToAuth = () => navigate("/auth");

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isDark = theme === "dark";

  return (
    <div className="lp">
      <nav className="lp-nav">
        <div className="lp-nav__inner container">
          <span className="lp-nav__logo">FocusNow</span>

          <div className="lp-nav__actions">
            <button
              className="btn btn--ghost btn--sm lp-theme-toggle"
              onClick={onToggleTheme}
              type="button"
              aria-label="Сменить тему"
              aria-pressed={isDark}
            >
              <span className="lp-theme-toggle__icon" aria-hidden="true">
                {isDark ? "☀️" : "🌙"}
              </span>
              <span>{t(`theme.${isDark ? 'light' : 'dark'}`)}</span>
            </button>
             <LangSwitcher></LangSwitcher>
            <button className="btn btn--outline btn--sm" onClick={goToAuth} type="button">
              {t('auth.login')}
            </button>
          </div>
        </div>
      </nav>

      <section className="lp-hero">
        <div className="lp-hero__body container">
          <div className="lp-hero__badge">
            <span className="lp-hero__badge-dot" aria-hidden="true" />
            {t('Moto')}
          </div>

          <h1 className="lp-hero__title">
            {t('main_text','Focusnow - перестань откладывать задачи уже сегодня')}

          </h1>

          <p className="lp-hero__subtitle">
            {t('desc',' Приложение, которое помогает сосредоточиться, управлять задачами и бороться с прокрастинацией с помощью аналитики и геймификации.')}
          </p>

          <div className="lp-hero__actions">
            <button className="btn btn--primary btn--lg" onClick={goToAuth} type="button">
              🚀&nbsp; {t('begin','Начать')}
            </button>
            <button
              className="btn btn--ghost btn--lg"
              onClick={scrollToFeatures}
              type="button"
            >
              📊&nbsp; {t('Oppr','Посмотреть возможности')}
            </button>
          </div>

          <div className="lp-hero__stats" aria-label="Ключевые цифры">
            <div className="lp-stat">
              <span className="lp-stat__value">4</span>
              <span className="lp-stat__label">{t('tools','инструмента')}</span>
            </div>
            <div className="lp-stat__sep" aria-hidden="true" />
            <div className="lp-stat">
              <span className="lp-stat__value">{t('completely','Полностью')}</span>
              <span className="lp-stat__label">{t('free','бесплатно')}</span>
            </div>
            <div className="lp-stat__sep" aria-hidden="true" />
            <div className="lp-stat">
              <span className="lp-stat__value">∞</span>
              <span className="lp-stat__label">{t('motivation','мотивации')}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-problem">
  <div className="container">
    <Reveal>
      {/* Теперь используем чистый вызов без дефолтных значений в коде, так как все в JSON */}
      <p className="section-label">{t('alone')}</p>
      <h2 className="section-title">{t('familiar')}</h2>
      
      <ul className="lp-problem__list" aria-label={t('familiar')}>
        {PROBLEMS.map((probKey) => (
          <li key={probKey} className="lp-problem__item">
            <span className="lp-problem__cross" aria-hidden="true">
              ✗
            </span>
            {/* Рендерим текст проблемы по её ключу */}
            {t(probKey)}
          </li>
        ))}
      </ul>
      <p className="lp-problem__note">
        {t('problems.note')}
      </p>
    </Reveal>
  </div>
</section>

<section className="lp-section lp-features" ref={featuresRef}>
  <div className="container">
    <Reveal>
      <p className="section-label">{t('features.label')}</p>
      <h2 className="section-title">{t('features.title')}</h2>
    </Reveal>

    <div className="lp-features__grid">
      {FEATURES.map((feature) => (
        /* В качестве key для React используем уникальное имя ключа заголовка */
        <Reveal key={feature.titleKey} className="lp-feature-card">
          <div className="lp-feature-card__icon" aria-hidden="true">
            {feature.icon}
          </div>
          {/* Переводим заголовок карточки фичи */}
          <h3 className="lp-feature-card__title">{t(feature.titleKey)}</h3>
          
          <ul className="lp-feature-card__list">
            {feature.itemKeys.map((itemKey) => (
              <li key={itemKey} className="lp-feature-card__item">
                <span aria-hidden="true">→</span> {t(itemKey)} {/* Переводим каждый пункт */}
              </li>
            ))}
          </ul>
        </Reveal>
      ))}
    </div>
  </div>
</section>

<section className="lp-section lp-diff">
  <div className="container">
    <Reveal>
      <p className="section-label">{t('diff.label')}</p>
      <h2 className="section-title">{t('diff.title')}</h2>
      <div className="lp-diff__grid">
        {DIFFERENTIATORS.map((d) => (
          <div key={d.key} className="lp-diff__item">
            <span className="lp-diff__icon" aria-hidden="true">
              {d.icon}
            </span>
            {/* Переводим отличительные особенности */}
            <p className="lp-diff__text">{t(d.key)}</p>
          </div>
        ))}
      </div>
    </Reveal>
  </div>
</section>

<section className="lp-section lp-how">
  <div className="container">
    <Reveal>
      <p className="section-label">{t('how.label')}</p>
      <h2 className="section-title">{t('how.title')}</h2>
      <ol className="lp-how__steps" aria-label={t('how.title')}>
        {HOW_STEPS.map((step, index) => (
          <li key={step.num} className="lp-how__step">
            <span className="lp-how__num" aria-label={`Step ${index + 1}`}>
              {step.num}
            </span>
            {/* Переводим название шага инструкции */}
            <span className="lp-how__label">{t(step.key)}</span>
            {index < HOW_STEPS.length - 1 && (
              <span className="lp-how__arrow" aria-hidden="true">
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </Reveal>
  </div>
</section>

      <section className="lp-section lp-cta">
  <div className="container">
    <Reveal>
      <h2 className="lp-cta__title">
        {t('cta.title_part1')}
        <br />
        <span className="text-accent">{t('cta.title_accent')}</span>
      </h2>
      <p className="lp-cta__sub">{t('cta.sub')}</p>
      <button className="btn btn--primary btn--xl" onClick={goToAuth} type="button">
        {t('cta.btn')}
      </button>
    </Reveal>
  </div>
</section>

<footer className="lp-footer">
  <div className="container lp-footer__inner">
    <span className="lp-footer__logo">FocusNow</span>
    <span className="lp-footer__copy">
      {/* Пробрасываем переменную текущего года прямо в перевод */}
      {t('footer.copy', { year: currentYear })}
    </span>
  </div>
</footer>
    </div>
  );
};

export default LandingPage;