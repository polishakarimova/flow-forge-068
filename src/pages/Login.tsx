import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { TelegramLoginButton } from "@/components/TelegramLoginButton";

export default function Login() {
  const navigate = useNavigate();
  const { loginWithTelegram, isLoading } = useAuth();
  const [error, setError] = useState("");
  const [isTelegramLoading, setIsTelegramLoading] = useState(false);

  const handleTelegram = async () => {
    setError("");
    setIsTelegramLoading(true);
    const result = await loginWithTelegram();
    setIsTelegramLoading(false);
    if (result.success) {
      navigate("/products");
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[420px]">
        <button
          onClick={() => navigate("/")}
          className="logo-gradient text-[32px] md:text-[38px] leading-none cursor-pointer bg-transparent border-none p-0 block mx-auto mb-8"
        >
          Content Map
        </button>

        <div className="bg-white/85 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl border border-white/60">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/[0.08] text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Вход через Telegram</h1>
            <p className="text-sm text-gray-500">
              В мини-приложении вход выполнится автоматически. В браузере откроется бот с одноразовой ссылкой.
            </p>
          </div>

          <TelegramLoginButton onAuth={handleTelegram} disabled={isLoading} loading={isTelegramLoading} />

          {error && <p className="mt-3 text-center text-xs font-medium text-red-500">{error}</p>}

          <div className="mt-5 rounded-2xl bg-gray-50 px-3 py-2.5 text-[12px] leading-5 text-gray-500">
            Пароли и SMS в этом проекте не используются. Сессия сохраняется в защищённой cookie.
          </div>
        </div>

        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mx-auto mt-6 bg-transparent border-none cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          На главную
        </button>
      </div>
    </div>
  );
}
