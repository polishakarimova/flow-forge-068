import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, ChevronLeft, X, GraduationCap, Sparkles, Package, FileText, GitBranch, Map, CalendarDays, Rocket } from "lucide-react";

/* ── Tour steps ──────────────────────────────────── */

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  targetPage?: string; // navigate here when step is shown
  highlight?: string;  // CSS selector to highlight
  position?: "center" | "bottom-left" | "bottom-right" | "top";
  accent: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Добро пожаловать в Content Map!",
    description: "Это ваш конструктор маркетинговых воронок. Давайте пройдём быстрый тур и разберёмся, как всё работает.",
    icon: <Sparkles className="w-8 h-8" />,
    position: "center",
    accent: "#8B5CF6",
  },
  {
    title: "1. Создайте продукты",
    description: "Начните с добавления продуктов: лид-магнитов, трипвайеров, флагманов. Это основа вашей воронки.",
    icon: <Package className="w-8 h-8" />,
    targetPage: "/products",
    accent: "#8B5CF6",
  },
  {
    title: "2. Добавьте контент",
    description: "Создайте темы и единицы контента для разных платформ: Telegram, Instagram, YouTube и других.",
    icon: <FileText className="w-8 h-8" />,
    targetPage: "/content",
    accent: "#6366f1",
  },
  {
    title: "3. Постройте воронки",
    description: "Соедините контент с продуктами в воронку. Укажите ключевое слово (CTA) и привяжите продукты к этапам.",
    icon: <GitBranch className="w-8 h-8" />,
    targetPage: "/dashboard",
    accent: "#f59e0b",
  },
  {
    title: "4. Смотрите на карте",
    description: "Визуальная карта покажет все связи: от контента через CTA до продуктов. Двигайте, масштабируйте, изучайте.",
    icon: <Map className="w-8 h-8" />,
    targetPage: "/map",
    accent: "#22c55e",
  },
  {
    title: "5. Планируйте в календаре",
    description: "Расставляйте даты публикаций контента и запусков продуктов. Добавляйте свои события.",
    icon: <CalendarDays className="w-8 h-8" />,
    targetPage: "/calendar",
    accent: "#0ea5e9",
  },
  {
    title: "Вы готовы!",
    description: "Начните с создания первого продукта. Помните: Продукты → Контент → Воронки. Режим обучения можно включить снова в любой момент.",
    icon: <Rocket className="w-8 h-8" />,
    targetPage: "/products",
    accent: "#8B5CF6",
  },
];

/* ── Storage ─────────────────────────────────────── */

const TOUR_KEY = "contentmap-tour-completed";

export function isTourCompleted(): boolean {
  return localStorage.getItem(TOUR_KEY) === "true";
}

export function resetTour() {
  localStorage.removeItem(TOUR_KEY);
}

function completeTour() {
  localStorage.setItem(TOUR_KEY, "true");
}

/* ── Component ───────────────────────────────────── */

export function OnboardingTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;
  const progress = ((step + 1) / TOUR_STEPS.length) * 100;

  const goTo = useCallback((nextStep: number) => {
    setIsAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      const target = TOUR_STEPS[nextStep];
      if (target.targetPage && location.pathname !== target.targetPage) {
        navigate(target.targetPage);
      }
      setIsAnimating(false);
    }, 200);
  }, [navigate, location.pathname]);

  const handleNext = () => {
    if (isLast) {
      completeTour();
      onClose();
      navigate("/products");
    } else {
      goTo(step + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) goTo(step - 1);
  };

  const handleSkip = () => {
    completeTour();
    onClose();
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-[420px] mx-4 transition-all duration-300 ${isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div
              className="h-full transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progress}%`, background: current.accent }}
            />
          </div>

          {/* Icon area */}
          <div className="pt-8 pb-4 flex justify-center">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${current.accent}, ${current.accent}dd)` }}
            >
              {current.icon}
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-4 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{current.title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{current.description}</p>
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-1.5 py-3">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="border-none cursor-pointer p-0 transition-all duration-300"
                style={{
                  width: i === step ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === step ? current.accent : "#e5e7eb",
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="px-6 pb-6 pt-2 flex items-center gap-3">
            {isFirst ? (
              <button
                onClick={handleSkip}
                className="flex-1 py-3 text-sm text-gray-400 font-medium bg-transparent border-none cursor-pointer hover:text-gray-600 transition-colors rounded-xl"
              >
                Пропустить
              </button>
            ) : (
              <button
                onClick={handlePrev}
                className="flex items-center justify-center gap-1 flex-1 py-3 text-sm text-gray-600 font-medium bg-gray-100 border-none cursor-pointer hover:bg-gray-200 transition-colors rounded-xl"
              >
                <ChevronLeft className="w-4 h-4" />
                Назад
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center justify-center gap-1 flex-[2] py-3 text-sm text-white font-semibold border-none cursor-pointer transition-all duration-200 rounded-xl shadow-lg hover:shadow-xl"
              style={{ background: `linear-gradient(135deg, ${current.accent}, ${current.accent}cc)` }}
            >
              {isLast ? (
                <>
                  <Rocket className="w-4 h-4" />
                  Начать работу
                </>
              ) : (
                <>
                  Продолжить
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-400 hover:text-gray-600 border-none cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ── Re-enable button (for sidebar/profile) ─────── */

export function TourButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors bg-transparent border-none cursor-pointer w-full"
    >
      <GraduationCap className="w-[18px] h-[18px] shrink-0" />
      <span>Обучение</span>
    </button>
  );
}
