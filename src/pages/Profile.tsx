import { useState } from "react";
import { 
  User, 
  Settings, 
  BarChart3, 
  Calendar, 
  Target,
  TrendingUp,
  Award,
  Bell,
  CreditCard,
  Download,
  Upload
} from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav, MobileHeader } from "@/components/MobileNav";

export default function Profile() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Обзор", icon: BarChart3 },
    { id: "settings", label: "Настройки", icon: Settings },
    { id: "billing", label: "Подписка", icon: CreditCard },
  ];

  const stats = [
    { label: "Активных воронок", value: "4", change: "+2 за месяц", icon: Target },
    { label: "Продуктов создано", value: "10", change: "+3 за месяц", icon: Award },
    { label: "Единиц контента", value: "27", change: "+12 за месяц", icon: Calendar },
    { label: "Конверсия", value: "12.5%", change: "+3.2% к прошлому", icon: TrendingUp },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0 pt-8 md:pt-0">
          <header className="sticky top-0 z-50 surface-glass border-b border-border">
            <div className="w-full px-4 sm:px-6 max-w-[1400px] mx-auto">
              <div className="flex items-center justify-between h-14 sm:h-16">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="hidden md:flex" />
                  <h1 className="text-sm sm:text-base font-semibold text-foreground tracking-tight">
                    Личный кабинет
                  </h1>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 w-full mx-auto py-4 sm:py-6 px-4 sm:px-6 pb-20 md:pb-6 max-w-[1400px]">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6 sm:mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">Полина Каримова</h2>
                <p className="text-muted-foreground text-sm sm:text-base">polina@example.com</p>
                <div className="flex flex-col sm:flex-row items-center gap-2 mt-1">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-md">
                    Pro Plan
                  </span>
                  <span className="text-xs text-muted-foreground">до 15 мая 2026</span>
                </div>
              </div>
            </div>

            <div className="flex overflow-x-auto gap-1 mb-6 bg-muted p-1 rounded-lg w-full sm:w-fit">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label}</span>
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {stats.map((stat, index) => (
                    <div key={index} className="bg-card p-4 sm:p-6 rounded-xl border">
                      <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-foreground">
                          {stat.value}
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm font-medium text-foreground mb-1">
                        {stat.label}
                      </div>
                      <div className="text-xs text-green-600">
                        {stat.change}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-card p-6 rounded-xl border">
                  <h3 className="text-lg font-semibold mb-4">Последняя активность</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Target className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Создана воронка "КЕЙС"</p>
                        <p className="text-xs text-muted-foreground">2 часа назад</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Опубликован пост в Telegram</p>
                        <p className="text-xs text-muted-foreground">вчера</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <div className="bg-card p-6 rounded-xl border">
                  <h3 className="text-lg font-semibold mb-4">Профиль</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Имя</label>
                      <input 
                        type="text" 
                        defaultValue="Полина Каримова" 
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <input 
                        type="email" 
                        defaultValue="polina@example.com" 
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-xl border">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Уведомления
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Email уведомления</div>
                        <div className="text-sm text-muted-foreground">О новых лидах и продажах</div>
                      </div>
                      <input type="checkbox" defaultChecked className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-6">
                <div className="bg-card p-6 rounded-xl border">
                  <h3 className="text-lg font-semibold mb-4">Текущий план</h3>
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-lg">Pro Plan</div>
                      <div className="text-sm text-muted-foreground">3,990 ₽/месяц</div>
                      <div className="text-xs text-green-600 mt-1">Действует до 15 мая 2026</div>
                    </div>
                    <button className="px-4 py-2 border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100">
                      Изменить план
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="flex gap-3">
                <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                  Сохранить изменения
                </button>
                <button className="px-6 py-2 border rounded-lg hover:bg-muted">
                  Отмена
                </button>
              </div>
            )}
          </main>
        </div>

        <MobileHeader />
        <MobileNav />
      </div>
    </SidebarProvider>
  );
}