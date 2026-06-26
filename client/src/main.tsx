import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/globals.css";
import "./i18n"; // 1. Импортируем конфигурацию i18n, чтобы она инициализировалась при старте

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* 2. Оборачиваем App в Suspense. 
              fallback — это то, что покажется пользователю на долю секунды, 
              пока i18next-http-backend скачивает файлы локализации. */}
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500 font-medium">
          Loading...
        </div>
      }>
        <App />
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
);