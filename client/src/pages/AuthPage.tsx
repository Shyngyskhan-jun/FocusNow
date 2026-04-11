import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../services/api";
import "../styles/auth.css";

type Theme = "light" | "dark";

interface AuthPageProps {
  onLogin: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}


interface AuthResponse {
  token: string;
  name?: string;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, theme, onToggleTheme }) => {
  const navigate = useNavigate();

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isDark = theme === "dark";

  const isFormValid = useMemo(() => {
    if (!email.trim() || !password.trim()) return false;
    if (!isLoginMode && !name.trim()) return false;
    if (password.length < 6) return false;
    return true;
  }, [email, password, name, isLoginMode]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!isFormValid) {
        setError("Проверьте корректность данных");
        return;
      }

      setIsLoading(true);

      try {
        const endpoint = isLoginMode ? "/auth/login" : "/auth/register";

        const bodyData = isLoginMode
          ? { email: email.trim(), password }
          : { name: name.trim(), email: email.trim(), password };


        const data = await apiFetch(endpoint, {
          method: "POST",
          body: JSON.stringify(bodyData),
        }) as AuthResponse;

        if (!data?.token) {
          throw new Error("Сервер не вернул токен");
        }

        localStorage.setItem("focusnow_token", data.token);
        localStorage.setItem("focusnow_user_name", data.name || email.trim());

        setPassword("");
        onLogin();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Ошибка сети");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoginMode, email, password, name, isFormValid, onLogin]
  );

  const toggleMode = useCallback(() => {
    setIsLoginMode((prev) => !prev);
    setError("");
    setName("");
    setPassword("");
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <main className="auth-page">
      <header className="auth-page__topbar">
        <button
          className="btn btn--ghost btn--sm auth-page__back"
          onClick={() => navigate("/")}
          type="button"
          aria-label="Вернуться на главную"
        >
          ← FocusNow
        </button>

        <button
          className="btn btn--ghost btn--sm auth-theme-toggle"
          onClick={onToggleTheme}
          type="button"
          aria-label="Сменить тему"
          aria-pressed={isDark}
        >
          <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
          <span>{isDark ? "Светлая" : "Тёмная"}</span>
        </button>
      </header>

      <div className="auth-card">
        <div className="auth-card__eyebrow">
          {isLoginMode ? "Вход в аккаунт" : "Создание аккаунта"}
        </div>

        <header className="auth-card__header">
          <h1 className="auth-card__title">
            {isLoginMode ? "Добро пожаловать" : "Создай аккаунт"}
          </h1>
          <p className="auth-card__subtitle">
            {isLoginMode
              ? "Войди и продолжи работу над собой"
              : "Начни бороться с прокрастинацией прямо сейчас"}
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="auth-form__error" role="alert">
              {error}
            </div>
          )}

          {!isLoginMode && (
            <div className="form-group auth-form__group">
              <label htmlFor="auth-name" className="form-label">
                Имя
              </label>
              <input
                id="auth-name"
                type="text"
                className="form-input"
                placeholder="Как к тебе обращаться?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group auth-form__group">
            <label htmlFor="auth-email" className="form-label">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              className="form-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="email"
              autoFocus={isLoginMode}
            />
          </div>

          <div className="form-group auth-form__group">
            <label htmlFor="auth-password" className="form-label">
              Пароль
            </label>
            <input
              id="auth-password"
              type="password"
              className="form-input"
              placeholder="Минимум 6 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              autoComplete={isLoginMode ? "current-password" : "new-password"}
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--lg btn--block auth-form__submit"
            disabled={isLoading || !isFormValid}
          >
            {isLoading
              ? "Загрузка..."
              : isLoginMode
                ? "Войти"
                : "Зарегистрироваться"}
          </button>
        </form>

        <div className="auth-card__switch">
          <span className="auth-card__switch-text">
            {isLoginMode ? "Нет аккаунта?" : "Уже есть аккаунт?"}
          </span>
          <button
            type="button"
            className="btn btn--link"
            onClick={toggleMode}
            disabled={isLoading}
          >
            {isLoginMode ? "Зарегистрироваться" : "Войти"}
          </button>
        </div>
      </div>

      <footer className="auth-page__footer">
        <p>© {currentYear} FocusNow</p>
      </footer>
    </main>
  );
};

export default AuthPage;