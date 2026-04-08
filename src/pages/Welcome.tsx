import { useState } from "react";
import { ArrowRight, Play, BarChart3, Zap, Target, Users, Mail, Check, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);
  const [regMode, setRegMode] = useState<"choice" | "email" | "confirm">("choice");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regError, setRegError] = useState("");

  const features = [
    {
      icon: Target,
      title: "Создавай продукты",
      description: "Лид-магниты, трипвайеры, флагманы — вся продуктовая линейка в одном месте"
    },
    {
      icon: Zap,
      title: "Планируй контент",
      description: "От идеи до публикации — управляй контентом по темам и платформам"
    },
    {
      icon: BarChart3,
      title: "Стройй воронки",
      description: "Соединяй контент с продуктами и отслеживай путь клиента визуально"
    },
    {
      icon: Users,
      title: "Анализируй результаты",
      description: "Конверсии, лиды, продажи — вся аналитика в удобном формате"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-12 sm:pb-16">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
              Карта <span className="text-purple-600">воронок</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
              Конструктор маркетинговых воронок для экспертов и предпринимателей. 
              Создавайте продукты, планируйте контент, стройте воронки — всё в одном инструменте.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12 px-4 sm:px-0">
              <button
                onClick={() => navigate("/products")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
              >
                Начать работу
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              <button
                onClick={() => setShowDemo(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 border-2 border-purple-600 text-purple-600 font-semibold rounded-xl hover:bg-purple-50 transition-all duration-200 text-sm sm:text-base"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                Смотреть демо
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-4xl mx-auto px-4 sm:px-0">
              <div className="text-center bg-white/50 backdrop-blur-sm rounded-xl p-4 sm:p-6">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-2">1-5 мин</div>
                <div className="text-gray-600 text-sm sm:text-base">Создать воронку</div>
              </div>
              <div className="text-center bg-white/50 backdrop-blur-sm rounded-xl p-4 sm:p-6">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-2">+200%</div>
                <div className="text-gray-600 text-sm sm:text-base">Конверсия в продажи</div>
              </div>
              <div className="text-center bg-white/50 backdrop-blur-sm rounded-xl p-4 sm:p-6">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-2">24/7</div>
                <div className="text-gray-600 text-sm sm:text-base">Автоматическая работа</div>
              </div>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-32 h-32 bg-purple-200 rounded-full opacity-30 animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-indigo-200 rounded-full opacity-30 animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-pink-200 rounded-full opacity-30 animate-pulse delay-500"></div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-3 sm:mb-4">
            Как это работает
          </h2>
          <p className="text-base sm:text-lg text-gray-600 text-center mb-12 sm:mb-16 max-w-2xl mx-auto px-4 sm:px-0">
            Простой 4-шаговый процесс от создания продуктов до готовой воронки продаж
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center group bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="relative mb-4 sm:mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors duration-200">
                    <feature.icon className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                  </div>
                  <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-purple-600 text-white text-xs sm:text-sm font-bold rounded-full flex items-center justify-center">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 sm:mt-16 px-4 sm:px-0">
            <button
              onClick={() => navigate("/products")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all duration-200 shadow-lg text-sm sm:text-base"
            >
              Создать первую воронку
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Registration Section */}
      <div className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="max-w-md mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center text-gray-900 mb-3 sm:mb-4">
            Создайте <span className="text-purple-600">аккаунт</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 text-center mb-8 sm:mb-10">
            Зарегистрируйтесь, чтобы получить доступ к личному кабинету
          </p>

          <div className="bg-white rounded-2xl shadow-lg border border-purple-100 p-6 sm:p-8">
            {regMode === "choice" && (
              <div className="space-y-4">
                {/* Google Sign-Up */}
                <button
                  onClick={() => {
                    // Simulate Google OAuth redirect
                    navigate("/profile");
                  }}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3.5 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 text-sm sm:text-base"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Продолжить с Google
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">или</span>
                  </div>
                </div>

                {/* Email Sign-Up */}
                <button
                  onClick={() => setRegMode("email")}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base"
                >
                  <Mail className="w-5 h-5" />
                  Регистрация через Email
                </button>
              </div>
            )}

            {regMode === "email" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setRegError("");
                  if (!regName.trim()) {
                    setRegError("Введите ваше имя");
                    return;
                  }
                  if (!regEmail.trim() || !regEmail.includes("@")) {
                    setRegError("Введите корректный email");
                    return;
                  }
                  if (regPassword.length < 6) {
                    setRegError("Пароль должен быть не менее 6 символов");
                    return;
                  }
                  setRegMode("confirm");
                }}
                className="space-y-4"
              >
                <button
                  type="button"
                  onClick={() => { setRegMode("choice"); setRegError(""); }}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium mb-2 flex items-center gap-1"
                >
                  ← Назад
                </button>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Имя</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ваше имя"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm sm:text-base"
                  />
                </div>

                {regError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {regError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base"
                >
                  Зарегистрироваться
                </button>
              </form>
            )}

            {regMode === "confirm" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  Подтвердите email
                </h3>
                <p className="text-gray-600 text-sm sm:text-base">
                  Мы отправили письмо с ссылкой для подтверждения на
                </p>
                <p className="font-semibold text-purple-700 break-all">
                  {regEmail}
                </p>
                <p className="text-gray-500 text-sm">
                  Проверьте папку «Входящие» и нажмите на ссылку в письме, чтобы завершить регистрацию
                </p>

                <div className="pt-2 space-y-3">
                  <button
                    onClick={() => navigate("/profile")}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 text-sm sm:text-base"
                  >
                    <Check className="w-5 h-5" />
                    Я подтвердил email
                  </button>
                  <button
                    onClick={() => setRegMode("email")}
                    className="w-full px-6 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-all text-sm"
                  >
                    Изменить email
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Demo Modal */}
      {showDemo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl sm:text-2xl font-bold mb-4">Демо: Как создать воронку</h3>
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <div className="text-center p-4">
                <Play className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm sm:text-base">Видео-демонстрация</p>
                <p className="text-xs sm:text-sm text-gray-500">Создание воронки за 3 минуты</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowDemo(false)}
                className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Закрыть
              </button>
              <button
                onClick={() => {
                  setShowDemo(false);
                  navigate("/products");
                }}
                className="w-full sm:w-auto px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base"
              >
                Начать сейчас
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}