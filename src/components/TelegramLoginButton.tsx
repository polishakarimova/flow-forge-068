import { Loader2, Send } from "lucide-react";

interface TelegramLoginButtonProps {
  onAuth: () => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

export function TelegramLoginButton({ onAuth, disabled, loading }: TelegramLoginButtonProps) {
  return (
    <button
      type="button"
      onClick={onAuth}
      disabled={disabled || loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-sky-500 border-2 border-sky-500 rounded-xl text-sm font-semibold text-white hover:bg-sky-600 hover:border-sky-600 transition-all duration-200 mb-4 disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
      {loading ? "Ждём подтверждение в Telegram..." : "Войти через Telegram"}
    </button>
  );
}
