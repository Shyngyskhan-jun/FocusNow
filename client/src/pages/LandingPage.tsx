import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/landing.css";

type Theme = "light" | "dark";

interface LandingPageProps {
  theme: Theme;
  onToggleTheme: () => void;
}

const FEATURES = [
  {
    icon: "📋",
    title: "Управление задачами",
    items: [
      "Создавай задачи и ставь дедлайны",
      "Разбивай большое дело на конкретные шаги",
      "Не теряй приоритеты и держи порядок",
    ],
  },
  {
    icon: "⏱",
    title: "Фокус-сессии",
    items: [
      "Работай по Pomodoro-таймеру",
      "Отслеживай время концентрации",
      "Делай паузы в правильный момент",
    ],
  },
  {
    icon: "📊",
    title: "Аналитика",
    items: [
      "Смотри реальную продуктивность",
      "Понимай, когда и почему прокрастинируешь",
      "Принимай решения на основе данных",
    ],
  },
  {
    icon: "🎮",
    title: "Геймификация",
    items: [
      "Зарабатывай XP за сессии",
      "Держи ежедневные стрики",
      "Повышай свой уровень",
    ],
  },
] as const;

const PROBLEMS = [
  "Ты постоянно откладываешь задачи",
  "Теряешь время в соцсетях",
  "Не понимаешь, с чего начать",
  "Быстро устаёшь и бросаешь дела",
] as const;

const DIFFERENTIATORS = [
  { icon: "🔍", text: "Не просто таймер — анализ твоего поведения" },
  { icon: "🧘", text: "Учитывает состояние: устал, нормально, в потоке" },
  { icon: "🧩", text: "Помогает понять причины прокрастинации" },
  { icon: "📈", text: "Мотивирует через прогресс, уровни и стрики" },
] as const;

const HOW_STEPS = [
  { num: "01", label: "Создаёшь задачу" },
  { num: "02", label: "Выбираешь своё состояние" },
  { num: "03", label: "Запускаешь фокус-сессию" },
  { num: "04", label: "Получаешь статистику" },
  { num: "05", label: "Улучшаешь результат" },
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
              <span>{isDark ? "Светлая тема" : "Тёмная тема"}</span>
            </button>

            <button className="btn btn--outline btn--sm" onClick={goToAuth} type="button">
              Войти
            </button>
          </div>
        </div>
      </nav>

      <section className="lp-hero">
        <div className="lp-hero__body container">
          <div className="lp-hero__badge">
            <span className="lp-hero__badge-dot" aria-hidden="true" />
            Скажи нет прокрастинации!
          </div>

          <h1 className="lp-hero__title">
            FocusNow —{" "}
            <span className="text-accent">перестань откладывать задачи</span>
            <br />
            уже сегодня
          </h1>

          <p className="lp-hero__subtitle">
            Приложение, которое помогает сосредоточиться, управлять задачами и
            бороться с прокрастинацией с помощью аналитики и геймификации.
          </p>

          <div className="lp-hero__actions">
            <button className="btn btn--primary btn--lg" onClick={goToAuth} type="button">
              🚀&nbsp; Начать
            </button>
            <button
              className="btn btn--ghost btn--lg"
              onClick={scrollToFeatures}
              type="button"
            >
              📊&nbsp; Посмотреть возможности
            </button>
          </div>

          <div className="lp-hero__stats" aria-label="Ключевые цифры">
            <div className="lp-stat">
              <span className="lp-stat__value">4</span>
              <span className="lp-stat__label">инструмента</span>
            </div>
            <div className="lp-stat__sep" aria-hidden="true" />
            <div className="lp-stat">
              <span className="lp-stat__value">Полностью</span>
              <span className="lp-stat__label">бесплатно</span>
            </div>
            <div className="lp-stat__sep" aria-hidden="true" />
            <div className="lp-stat">
              <span className="lp-stat__value">∞</span>
              <span className="lp-stat__label">мотивации</span>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-problem">
        <div className="container">
          <Reveal>
            <p className="section-label">Ты не один</p>
            <h2 className="section-title">Знакомо?</h2>
            <ul className="lp-problem__list" aria-label="Типичные проблемы">
              {PROBLEMS.map((text) => (
                <li key={text} className="lp-problem__item">
                  <span className="lp-problem__cross" aria-hidden="true">
                    ✗
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            <p className="lp-problem__note">
              Если хотя бы один пункт — про тебя, FocusNow создан именно для тебя.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="lp-section lp-features" ref={featuresRef}>
        <div className="container">
          <Reveal>
            <p className="section-label">Что внутри</p>
            <h2 className="section-title">FocusNow помогает взять контроль</h2>
          </Reveal>

          <div className="lp-features__grid">
            {FEATURES.map((feature) => (
              <Reveal key={feature.title} className="lp-feature-card">
                <div className="lp-feature-card__icon" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3 className="lp-feature-card__title">{feature.title}</h3>
                <ul className="lp-feature-card__list">
                  {feature.items.map((item) => (
                    <li key={item} className="lp-feature-card__item">
                      <span aria-hidden="true">→</span> {item}
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
            <p className="section-label">Почему мы</p>
            <h2 className="section-title">Чем мы отличаемся</h2>
            <div className="lp-diff__grid">
              {DIFFERENTIATORS.map((d) => (
                <div key={d.text} className="lp-diff__item">
                  <span className="lp-diff__icon" aria-hidden="true">
                    {d.icon}
                  </span>
                  <p className="lp-diff__text">{d.text}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="lp-section lp-how">
        <div className="container">
          <Reveal>
            <p className="section-label">Просто</p>
            <h2 className="section-title">Как это работает</h2>
            <ol className="lp-how__steps" aria-label="Шаги работы с приложением">
              {HOW_STEPS.map((step, index) => (
                <li key={step.num} className="lp-how__step">
                  <span className="lp-how__num" aria-label={`Шаг ${index + 1}`}>
                    {step.num}
                  </span>
                  <span className="lp-how__label">{step.label}</span>
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
              Начни прямо сейчас и возьми контроль
              <br />
              <span className="text-accent">над своим временем</span>
            </h2>
            <p className="lp-cta__sub">Бесплатно. Ничего лишнего.</p>
            <button className="btn btn--primary btn--xl" onClick={goToAuth} type="button">
              Начать
            </button>
          </Reveal>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="container lp-footer__inner">
          <span className="lp-footer__logo">FocusNow</span>
          <span className="lp-footer__copy">
            © {currentYear} FocusNow. Сделано с фокусом.
          </span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;