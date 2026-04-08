import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/authContext";

type Step = "form" | "verify";

export default function Register() {
  const navigate = useNavigate();
  const { registerWithEmail, registerWithGoogle, verifyEmail, resendVerification, isLoading } = useAuth();

  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Введите ваше имя"); return; }
    if (!email.trim()) { setError("Введите email"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Некорректный email"); return; }
    if (password.length < 6) { setError("Пароль минимум 6 символов"); return; }
    if (password !== confirmPassword) { setError("Пароли не совпадают"); return; }

    const result = await registerWithEmail(name, email, password);
    if (result.success) {
      setMessage(result.message);
      setStep("verify");
    } else {
      setError(result.message);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!verificationCode.trim()) { setError("Введите код подтверждения"); return; }

    const result = await verifyEmail(verificationCode, email);
    if (result.success) {
      setMessage(result.message);
      setTimeout(() => navigate("/products"), 1200);
    } else {
      setError(result.message);
    }
  };

  const handleResend = async () => {
    const result = await resendVerification(email);
    setMessage(result.message);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleGoogle = async () => {
    setError("");
    const result = await registerWithGoogle();
    if (result.success) {
      setMessage(result.message);
      setTimeout(() => navigate("/profile"), 1000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center px-4 py-8">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-48 h-48 bg-purple-200 rounded-full opacity-20 animate-pulse" />
        <div className="absolute bottom-20 right-10 w-56 h-56 bg-indigo-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/3 right-1/4 w-32 h-32 bg-pink-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>

      <div className="w-full max-w-[440px]">
        {/* Logo */}
        <button
          onClick={() => navigate("/")}
          className="logo-gradient text-[32px] md:text-[38px] leading-none cursor-pointer bg-transparent border-none p-0 block mx-auto mb-8"
        >
          Content Map
        </button>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl border border-white/50">
          {step === "form" ? (
            <>
              <div className="text-center mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Создать аккаунт</h1>
                <p className="text-sm text-gray-500">Начните управлять воронками прямо сейчас</p>
              </div>

              {/* Google button */}
              <button
                onClick={handleGoogle}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 mb-4 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Продолжить с Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">или по email</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Email form */}
              <form onSubmit={handleEmailRegister} className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ваше имя"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Пароль (мин. 6 символов)"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Подтвердите пароль"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-xs font-medium px-1">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-purple-200 hover:shadow-xl hover:shadow-purple-300 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  Зарегистрироваться
                </button>
              </form>

              <p className="text-center text-xs text-gray-400 mt-5">
                Уже есть аккаунт?{" "}
                <button
                  onClick={() => navigate("/login")}
                  className="text-purple-600 font-semibold hover:text-purple-700 bg-transparent border-none cursor-pointer"
                >
                  Войти
                </button>
              </p>
            </>
          ) : (
            <>
              {/* Email verification step */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Подтвердите email</h2>
                <p className="text-sm text-gray-500">
                  Мы отправили код подтверждения на{" "}
                  <span className="font-semibold text-gray-700">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="flex justify-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-48 text-center text-2xl font-bold tracking-[0.3em] py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-xs font-medium text-center">{error}</p>
                )}
                {message && !error && (
                  <div className="flex items-center justify-center gap-1.5 text-green-600 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || verificationCode.length < 4}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-purple-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Подтвердить
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  className="w-full py-2 text-sm text-purple-600 font-medium hover:text-purple-700 bg-transparent border-none cursor-pointer"
                >
                  Отправить код повторно
                </button>
              </form>
            </>
          )}
        </div>

        {/* Back to home */}
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
