import { useState } from "react";
import { ArrowRight, Play, BarChart3, Zap, Target, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);

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