import { useEffect, useId, useState } from "react";
import { Send, Loader2 } from "lucide-react";

type TelegramAuthUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthUser) => void;
  }
}

interface TelegramLoginButtonProps {
  onAuth: (user: TelegramAuthUser) => Promise<void>;
  disabled?: boolean;
}

export function TelegramLoginButton({ onAuth, disabled }: TelegramLoginButtonProps) {
  const containerId = useId().replace(/:/g, "");
  const [loading, setLoading] = useState(false);
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "";

  useEffect(() => {
    if (!botUsername || disabled) return;
    const container = document.getElementById(containerId);
    if (!container) return;

    window.onTelegramAuth = async (user) => {
      setLoading(true);
      try {
        await onAuth(user);
      } finally {
        setLoading(false);
      }
    };

    container.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [botUsername, containerId, disabled, onAuth]);

  if (!botUsername) {
    return (
      <button
        type="button"
        disabled
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-sky-50 border-2 border-sky-100 rounded-xl text-sm font-semibold text-sky-400 opacity-70"
      >
        <Send className="w-5 h-5" />
        Telegram не настроен
      </button>
    );
  }

  return (
    <div className="relative min-h-[44px]">
      <div id={containerId} className={disabled || loading ? "opacity-50 pointer-events-none" : ""} />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80">
          <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
        </div>
      )}
    </div>
  );
}
