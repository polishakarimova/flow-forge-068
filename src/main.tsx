import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./telegram-viewport.css";
import { setupTelegramViewport, type TelegramViewport } from './lib/telegramViewport';

// GitHub Pages SPA fix
if (sessionStorage.redirect) {
  const redirect = sessionStorage.redirect;
  delete sessionStorage.redirect;
  history.replaceState(null, '', redirect);
}

createRoot(document.getElementById("root")!).render(<App />);
const telegram = (window as Window & { Telegram?: { WebApp?: TelegramViewport } }).Telegram;
const releaseViewport = setupTelegramViewport(telegram?.WebApp, document.documentElement);
if (import.meta.hot) import.meta.hot.dispose(releaseViewport);
