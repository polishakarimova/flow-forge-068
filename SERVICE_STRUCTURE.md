# Flow Forge 068 / Content Map: Full Service Structure

Этот файл описывает сервис целиком: что это за продукт, какие в нем экраны, сущности, связи, данные, сценарии, текущие ограничения и правила дальнейшего развития. Его можно передавать в другой GPT-проект как контекст, чтобы модель понимала, что где находится, зачем нужно и как продолжать улучшение продукта.

## 1. Что Это За Сервис

Проект называется в интерфейсе `Content Map`, репозиторий `flow-forge-068`.

Это SaaS-инструмент для экспертов, предпринимателей и маркетологов, которые строят контент-воронки:

- создают продуктовую линейку;
- планируют контент по темам и платформам;
- связывают контент с CTA / кодовыми словами;
- собирают воронки из контента и продуктов;
- смотрят карту связей между контентом, CTA и продуктами;
- планируют публикации и события в календаре;
- видят профиль, обучение и админ-демо.

Главная идея: пользователь должен видеть не просто список постов или список продуктов, а всю систему продаж через контент. Продукты, темы, контент, кодовые слова и воронки связаны между собой.

Основной рабочий цикл:

```txt
Продукты -> Контент -> Воронки -> Карта -> Календарь -> Анализ/улучшение
```

## 2. Технологический Стек

Фронтенд:

- Vite;
- React 18;
- TypeScript;
- React Router;
- Tailwind CSS;
- shadcn/ui + Radix primitives;
- lucide-react icons;
- TanStack React Query подключен, но активно почти не используется;
- Supabase JS client.

Бэкенд / данные:

- Supabase Auth;
- Supabase Postgres tables;
- RLS policies по `auth.uid() = user_id`;
- часть данных пока моковая или хранится в `localStorage`.

Запуск:

```bash
npm ci
npm run dev
```

Локальный URL:

```txt
http://127.0.0.1:8080/
```

Vite base / React Router basename:

```txt
/
```

## 3. Глобальная Архитектура

Точка входа:

- `src/main.tsx`;
- `src/App.tsx`.

`App.tsx` оборачивает приложение в провайдеры:

```tsx
<QueryClientProvider>
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <AuthProvider>
      <DataStoreProvider>
        <BrowserRouter basename="/">
          <AppRoutes />
        </BrowserRouter>
      </DataStoreProvider>
    </AuthProvider>
  </TooltipProvider>
</QueryClientProvider>
```

Ключевые провайдеры:

- `AuthProvider` в `src/lib/authContext.tsx` отвечает за пользователя, сессию, регистрацию, логин, Google OAuth, logout.
- `DataStoreProvider` в `src/lib/dataStore.tsx` грузит и обновляет продукты, темы, контент, форматы, ключевые слова и воронки.
- `TourContext` в `App.tsx` позволяет запускать onboarding tour из сайдбара или мобильного header.

## 4. Роуты И Экраны

Роуты находятся в `AppRoutes`:

```txt
/          -> Welcome
/dashboard -> Index, список воронок
/content   -> Content, темы/контент/банк идей
/products  -> Products, продуктовая линейка
/map       -> FunnelMapPage, интерактивная карта связей
/calendar  -> Calendar, календарь публикаций и событий
/profile   -> Profile, личный кабинет
/register  -> Register
/login     -> Login
/admin     -> Admin
*          -> NotFound
```

Навигация:

- Desktop: `AppSidebar`;
- Mobile: `MobileHeader` сверху и `MobileNav` снизу.

Основные nav sections:

- Products;
- Content;
- Funnels / Dashboard;
- Map;
- Calendar;
- Profile;
- Admin.

## 5. Центральные Сущности

### User

Определен в `authContext.tsx`.

```ts
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: "email" | "google";
  emailVerified: boolean;
}
```

Источник: Supabase Auth user.

Маппинг:

- `id` из `supabase.auth.user.id`;
- `name` из `user_metadata.full_name`, `name` или email prefix;
- provider определяется через `app_metadata.provider`;
- email verification через `email_confirmed_at`.

### Product

Файл: `src/lib/productData.ts`.

```ts
interface Product {
  id: number;
  name: string;
  typeId: string;
  format: string;
  status: "draft" | "active" | "paused" | "archived";
  price: string;
  currency: string;
  description: string;
  link: string;
  createdDate: string;
  publishDate: string;
}
```

Типы продуктов:

```txt
lead_magnet  -> лид-магнит
tripwire     -> трипвайер
mid_ticket   -> средний чек
flagship     -> флагман
consultation -> консультация
private      -> личная работа
```

Продукты участвуют в:

- `/products` как самостоятельная база офферов;
- `/dashboard` как этапы воронки;
- `/map` как product nodes;
- `/calendar`, если заполнен `publishDate`;
- `ProductDrawer`, где видно, в каких воронках продукт используется.

### Topic

Файл: `src/lib/contentData.ts`.

```ts
interface Topic {
  id: number;
  title: string;
  thesisPlan: string;
  isIdeaBank: boolean;
  contentItems: ContentItemData[];
}
```

Тема группирует контентные единицы. Если `isIdeaBank = true`, это не активная тема, а идея в банке идей.

### ContentItemData

```ts
interface ContentItemData {
  id: number;
  platformId: string;
  status: "idea" | "in_progress" | "ready" | "published";
  title: string;
  body: string;
  createdDate: string;
  publishDate: string;
}
```

Платформы:

```txt
stories, tg_post, ig_post, carousel, reels, threads, youtube, article, vk
```

Статусы:

```txt
idea        -> серый
in_progress -> amber
ready       -> green
published   -> indigo
```

Контент участвует в:

- `/content`, где создается и редактируется;
- `/dashboard`, где выбирается для воронки;
- `/map`, где становится content/topic node;
- `/calendar`, если заполнен `publishDate`.

### Funnel

Файл: `src/lib/funnelData.ts`.

```ts
interface Funnel {
  id: string;
  keyword: string;
  badgeColor: "violet" | "amber" | "honey" | "lilac";
  product: string;
  productType: string;
  active: boolean;
  contentCount: number;
  leads: number;
  sales: number;
  hasNewActivity?: boolean;
  contentItemIds: number[];
  cta: string;
  leadMagnetId?: number;
  tripwireId?: number;
  midTicketId?: number;
  flagshipId?: number;
  consultationId?: number;
  conversions?: ConversionData[];
}
```

Воронка связывает:

- одно кодовое слово / CTA;
- набор контентных единиц;
- цепочку продуктов по уровням;
- метрики leads/sales;
- активность / паузу.

Связи воронки:

```txt
ContentItemData.id[] -> Funnel.contentItemIds
Product.id -> Funnel.leadMagnetId
Product.id -> Funnel.tripwireId
Product.id -> Funnel.midTicketId
Product.id -> Funnel.flagshipId
Product.id -> Funnel.consultationId
```

### Keyword

Кодовое слово для CTA.

Хранится как строка в:

- `keywords` table;
- `DataStore.keywords`;
- `Funnel.keyword`;
- `Funnel.cta`.

Логика:

- пользователь может добавить новое слово в модалке создания воронки;
- слово приводится к uppercase;
- удаление слова возможно, но если к нему привязаны воронки, показывается предупреждение.

### Format

Формат продукта:

```txt
PDF-гайд, чек-лист, мини-курс, видео-урок, вебинар, канал по подписке, марафон, интенсив, наставничество, разбор
```

Хранится в:

- `formats` table;
- `DataStore.formats`;
- используется в Create/Edit Product Modal и фильтрах.

## 6. DataStore: Как Все Связано

Файл: `src/lib/dataStore.tsx`.

`DataStoreProvider` содержит:

```txt
products
formats
topics
allContentItems
keywords
funnels
isDataLoading
```

И методы:

```txt
addProduct
updateProduct
addFormat
deleteFormat
addTopic
updateTopic
updateContentItem
addKeyword
deleteKeyword
funnelsForKeyword
addFunnel
updateFunnel
toggleFunnelActive
setFunnels
```

Загрузка данных:

- происходит при наличии `userId` и `isAuthenticated`;
- если пользователь не авторизован, store очищает products/topics/funnels/keywords;
- грузятся таблицы: `products`, `topics`, `content_items`, `funnels`, `keywords`, `formats`;
- content items группируются внутрь `Topic.contentItems` по `topic_id`;
- `allContentItems` вычисляется как flatten всех `topics.contentItems`.

Обновление данных:

- UI сначала обновляется оптимистично в React state;
- затем вызывается Supabase insert/update/delete;
- при insert временный id создается через `Date.now()`, после ответа Supabase заменяется реальным id.

Важное ограничение:

- ошибки Supabase в большинстве методов не обрабатываются полноценно для пользователя;
- нет rollback при ошибке;
- часть фич все еще local-only или mock.

## 7. Supabase Schema

Файл: `supabase-schema.sql`.

Таблицы:

```txt
profiles
products
topics
content_items
funnels
custom_events
keywords
formats
```

Все пользовательские таблицы используют RLS.

Основные связи:

```txt
profiles.id -> auth.users.id
products.user_id -> auth.users.id
topics.user_id -> auth.users.id
content_items.user_id -> auth.users.id
content_items.topic_id -> topics.id
funnels.user_id -> auth.users.id
keywords.user_id -> auth.users.id
formats.user_id -> auth.users.id
custom_events.user_id -> auth.users.id
```

Важно:

- `funnels.content_item_ids` хранится как `bigint[]`;
- product references в funnels (`lead_magnet_id`, etc.) не объявлены foreign key в SQL, но логически ссылаются на `products.id`;
- custom calendar events есть в SQL, но текущий экран календаря хранит кастомные события в `localStorage`, не в Supabase.

Supabase client:

```ts
const SUPABASE_URL = "https://knwqhjutzlzckzjmbtto.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_...";
```

Файл: `src/lib/supabase.ts`.

## 8. Экран Welcome `/`

Файл: `src/pages/Welcome.tsx`.

Назначение:

- landing / entry page;
- объясняет продукт как конструктор маркетинговых воронок;
- ведет в регистрацию, логин или рабочую область.

Фичи:

- верхняя навигация с кнопками Login/Register или Profile;
- hero с CTA "начать работу";
- demo modal;
- стат-блоки;
- feature cards;
- фон с мягким purple/indigo gradient.

Статус:

- это более маркетинговый экран, стилистически отличается от плотных app screens;
- в нем есть декоративные blobs/pulse, которых лучше не переносить внутрь рабочего приложения.

## 9. Экран Products `/products`

Файл: `src/pages/Products.tsx`.

Назначение:

- база продуктов / офферов;
- пользователь создает продуктовую линейку, которая потом используется в воронках.

Фичи:

- список продуктов, сгруппированный по `createdDate`;
- фильтры: тип, формат, статус;
- счетчик filtered / total;
- создание продукта через `CreateProductModal`;
- редактирование через `EditProductModal`;
- управление кастомными форматами;
- empty state при отсутствии продуктов.

Ключевые компоненты:

- `ProductCard`;
- `ProductTypeIcon`;
- `ProductStatusSelect`;
- `FormatSelector`;
- `CreateProductModal`;
- `EditProductModal`.

Как связано:

- `products` берутся из `DataStore`;
- `addProduct` создает продукт со статусом `draft`;
- `updateProduct` меняет поля и статус;
- если продукт выбран в воронке, он появляется в `/dashboard` и `/map`;
- если у продукта есть `publishDate`, он появляется в `/calendar`.

## 10. Экран Content `/content`

Файл: `src/pages/Content.tsx`.

Назначение:

- управление темами, идеями и контентными единицами;
- превращение тем в набор контента под разные платформы.

Табы:

```txt
topics  -> активные темы
content -> плоский список всех единиц контента
ideas   -> банк идей
```

Фичи:

- создание темы через `CreateTopicModal`;
- выбор платформ при создании темы;
- автоматическое создание `ContentItemData[]` по выбранным платформам;
- раскрытие темы и просмотр вложенного контента;
- редактирование контентной единицы через `ContentDetailModal`;
- редактирование идеи через `EditIdeaModal`;
- превращение идеи в активную тему;
- фильтры по платформам и статусам;
- группировка контента по effective date: `publishDate || createdDate`;
- банк идей как отдельный поток.

Ключевые компоненты:

- `TopicRow`;
- `ContentCard`;
- `StatusSelect`;
- `PlatformIcon`;
- `ContentMultiDropdown`;
- `ContentDropdown`;
- `CreateTopicModal`;
- `ContentDetailModal`;
- `EditIdeaModal`.

Как связано:

- темы хранят вложенные content items;
- content items могут быть выбраны в воронку;
- content items с `publishDate` попадают в календарь;
- topic node в карте может группировать несколько content items одной темы.

## 11. Экран Dashboard / Funnels `/dashboard`

Файл: `src/pages/Index.tsx`.

Назначение:

- основной список воронок;
- показывает активные и неактивные воронки;
- позволяет создать/редактировать воронку и раскрыть мини-карту.

Фичи:

- фильтры по keyword и product;
- разделение active/inactive;
- создание воронки через `CreateFunnelModal`;
- редактирование воронки через ту же модалку;
- `toggleFunnelActive`;
- `PathRow` для каждой воронки;
- раскрываемая мини-карта `FunnelMap`;
- контекстное меню воронки: pause/activate, edit, duplicate, archive, delete.

Важно:

- duplicate/archive/delete в меню визуально присутствуют, но полноценная логика не реализована;
- active toggle работает;
- edit работает через `CreateFunnelModal`.

### CreateFunnelModal

Файл: `src/components/funnels/CreateFunnelModal.tsx`.

Поля:

- keyword / кодовое слово;
- badge color;
- product tiers:
  - lead magnet;
  - tripwire;
  - mid ticket;
  - flagship;
  - consultation/private;
- content items для воронки.

Поведение:

- keyword выбирается из списка или создается inline;
- keyword добавляется uppercase;
- контент ищется по названию content item или topic;
- selected content хранится в `Set<number>`;
- при save создается `Funnel`;
- `product` и `productType` в Funnel берутся в основном из lead magnet для обратной совместимости;
- `cta` генерируется как `Напиши KEYWORD в директ`.

Как связано:

```txt
Funnel.keyword -> keywords
Funnel.contentItemIds -> ContentItemData.id[]
Funnel.*ProductId -> Product.id
```

## 12. PathRow И Mini Funnel Map

`PathRow` показывает воронку в компактной строке:

- контекстное меню;
- active status dot;
- keyword badge;
- mini badges по продуктовым этапам;
- раскрытие `FunnelMap`;
- inactive state = opacity + grayscale;
- expanded state = left border primary.

`FunnelMap` используется внутри строки. Он визуально раскрывает цепочку конкретной воронки. Полная карта находится на `/map`.

## 13. Экран Map `/map`

Файл: `src/pages/FunnelMapPage.tsx`.

Назначение:

- интерактивная визуальная карта всех связей;
- показывает путь от контента и тем через CTA к продуктам.

Граф строится функцией `buildGraph(funnels, allContentItems, products, topics)`.

Типы узлов:

```txt
content -> отдельная единица контента
topic   -> группа content items одной темы
keyword -> CTA / кодовое слово
product -> продуктовый этап
```

Колонки:

```txt
CONTENT -> CTA -> LEAD MAGNET -> TRIPWIRE -> MID TICKET -> FLAGSHIP -> CONSULTATION
```

Колонки продуктов создаются динамически: если ни одна воронка не использует tier, колонка не показывается.

Фичи:

- SVG-граф;
- drag canvas / pan;
- mouse wheel zoom;
- touch pan;
- pinch zoom;
- drag nodes;
- сохранение позиций nodes в `localStorage`;
- сохранение pan/zoom в `localStorage`;
- hover highlight connected path;
- mobile tap highlight;
- double click / double tap opens entity;
- reset view and positions;
- topic modal раскрывает content items внутри topic node;
- content picker позволяет добавить content item в funnel прямо с карты;
- редактирование продукта через `EditProductModal`;
- редактирование контента через `ContentDetailModal`.

LocalStorage keys:

```txt
contentmap-map-positions
contentmap-map-view
```

Важное ограничение:

- при добавлении content item в funnel с карты используется `setFunnels`, но это не вызывает `updateFunnel` в Supabase. Значит связь может быть local-only до перезагрузки, если отдельно не сохранить.

## 14. Экран Calendar `/calendar`

Файл: `src/pages/Calendar.tsx`.

Назначение:

- планирование публикаций, запусков продуктов и кастомных событий.

View modes:

```txt
month
week
day
```

События формируются из:

- `topics[].contentItems[]`, если есть `publishDate`;
- `products[]`, если есть `publishDate`;
- custom events из `localStorage`.

Типы событий:

```ts
type: "content" | "product" | "custom"
```

Фичи:

- month grid;
- week view;
- day view;
- переключение месяц/неделя/день;
- month/year/day picker dropdowns;
- arrows navigation;
- добавление кастомного события;
- удаление custom event;
- grouping в day view: события, контент, продукты;
- event pills с цветом platform/product/custom.

LocalStorage key:

```txt
contentmap-custom-events
```

Важное ограничение:

- SQL-таблица `custom_events` есть, но экран пока не использует Supabase для custom events.

## 15. Экран Profile `/profile`

Файл: `src/pages/Profile.tsx`.

Назначение:

- личный кабинет пользователя.

Табы:

```txt
overview
settings
billing
```

Фичи:

- avatar placeholder;
- имя/email/plan;
- overview stat cards;
- recent activity;
- settings form;
- notification setting checkbox;
- billing card with current plan.

Статус:

- данные в основном моковые / статические;
- не использует `useAuth()` для реального пользователя;
- настройки не сохраняются;
- billing не интегрирован.

## 16. Экраны Auth `/login` И `/register`

Файлы:

- `src/pages/Login.tsx`;
- `src/pages/Register.tsx`;
- `src/lib/authContext.tsx`.

Login:

- email/password;
- Google login;
- validation: email required, password required;
- successful email login redirects to `/profile`;
- errors выводятся текстом.

Register:

- step `form`;
- step `verify`;
- email/password registration;
- Google registration;
- email validation;
- password min 6 chars;
- confirm password;
- OTP verification via `supabase.auth.verifyOtp`;
- resend verification;
- success redirects to `/products`.

Supabase auth:

- `signUp`;
- `signInWithPassword`;
- `signInWithOAuth({ provider: "google" })`;
- `verifyOtp`;
- `resend`;
- `signOut`;
- `getSession`;
- `onAuthStateChange`.

Redirect URL:

```txt
window.location.origin + "/"
```

## 17. Экран Admin `/admin`

Файл: `src/pages/Admin.tsx`.

Назначение:

- демо-админка для просмотра пользователей и агрегатов.

Фичи:

- mock users;
- aggregate stats;
- plan breakdown;
- search;
- plan filter;
- sortable table;
- expandable user details;
- mobile card layout;
- online indicator.

Статус:

- полностью mock;
- не связан с Supabase profiles;
- нет реального admin auth / permissions.

## 18. Onboarding Tour

Файл: `src/components/OnboardingTour.tsx`.

Назначение:

- обучить пользователя потоку продукта.

Шаги:

```txt
Welcome
Products
Content
Funnels
Map
Calendar
Finish -> Products
```

Фичи:

- modal tour;
- progress bar;
- step dots;
- next/back/skip;
- keyboard: ArrowRight, Enter, ArrowLeft, Escape;
- auto-navigation between pages;
- saved completion in localStorage.

LocalStorage key:

```txt
contentmap-tour-completed
```

Запуск:

- автоматически после первого login, если tour не completed;
- из desktop sidebar;
- из mobile header.

## 19. Навигация И Layout

Общий layout почти всех app screens:

```tsx
<SidebarProvider>
  <div className="min-h-screen flex w-full bg-background">
    <div className="hidden md:block"><AppSidebar /></div>
    <div className="flex-1 flex flex-col min-w-0 pt-8 md:pt-0">
      <header className="sticky top-0 z-50 surface-glass border-b border-border">...</header>
      <main className="flex-1 ... max-w-[1400px]">...</main>
    </div>
    <MobileHeader />
    <MobileNav />
  </div>
</SidebarProvider>
```

Desktop:

- left sidebar;
- sticky top header;
- content max width 1400px.

Mobile:

- no sidebar;
- fixed mini top header;
- fixed bottom tab nav;
- content gets top padding and bottom padding.

## 20. UI / Component Inventory

Domain components:

```txt
AppSidebar
MobileNav
MobileHeader
OnboardingTour
PathRow
FunnelMap
ProductDrawer
ContentDrawer
CreateFunnelModal
ProductCard
CreateProductModal
EditProductModal
FormatSelector
ProductStatusSelect
ProductTypeIcon
ContentCard
TopicRow
CreateTopicModal
EditIdeaModal
ContentDetailModal
ContentDropdown
ContentMultiDropdown
PlatformIcon
StatusSelect
```

Generic UI components:

- shadcn/ui set in `src/components/ui/*`;
- includes button, input, card, dialog, sheet, popover, select, tabs, table, toast, tooltip, sidebar, etc.

Drawer note:

- `ProductDrawer` and `ContentDrawer` exist, but some flows use edit modals instead;
- these drawers are useful for future read-only detail panels.

## 21. Важные Бизнес-Связи

### Product -> Funnel

Продукт может быть привязан к разным этапам воронки:

```txt
leadMagnetId
tripwireId
midTicketId
flagshipId
consultationId
```

Один продукт может использоваться в нескольких воронках.

### Topic -> Content

Тема содержит набор content items. Создание темы может сразу создать контент под несколько платформ.

```txt
Topic.contentItems -> ContentItemData[]
```

### Content -> Funnel

Воронка содержит массив content item ids:

```txt
Funnel.contentItemIds -> ContentItemData.id[]
```

Одна единица контента может потенциально быть в нескольких воронках, потому что связь хранится в funnel, а не в content item.

### Keyword -> Funnel

Keyword не является foreign key, это строковая связка:

```txt
Funnel.keyword = keyword string
```

Удаление keyword не удаляет воронки. Сейчас UI предупреждает, что воронки потеряют привязку.

### Calendar

Calendar берет даты из разных сущностей:

```txt
ContentItemData.publishDate -> content event
Product.publishDate -> product event
CustomEvent.date -> custom event
```

## 22. Текущие Ограничения И Technical Debt

Критичные / важные:

- Нет route protection: экраны приложения доступны без явной проверки авторизации, но DataStore очищается без пользователя.
- `Profile` использует статические данные, не реальный `AuthProvider.user`.
- `Admin` полностью mock.
- `custom_events` есть в SQL, но Calendar использует localStorage.
- Добавление content item в funnel с `/map` через `setFunnels` не сохраняет Supabase.
- Duplicate/archive/delete в `PathRow` пока UI-only.
- Ошибки Supabase почти нигде не показываются пользователю.
- Нет loading/empty/error states для загрузки данных из Supabase на большинстве экранов.
- Seed data в `productData`, `contentData`, `funnelData` есть, но DataStore при неавторизованном пользователе очищает данные; фактический демо-режим зависит от текущей логики/сессии.
- В коде есть mojibake/битая кириллица в строках из-за кодировки исходников. В браузере может отображаться некорректно, если файлы реально повреждены.

Средние:

- `Funnel.product` и `Funnel.productType` дублируют данные продукта и нужны для backward compatibility; лучше постепенно перейти на product ids.
- Product tier mapping для `private` частично сведен к `consultation`.
- Не все SQL logical references объявлены foreign keys.
- Нет полноценной аналитики leads/sales/conversions, метрики ручные или моковые.
- Нет server-side permissions для admin.
- Нет тестов основных пользовательских сценариев.

## 23. Что Улучшать Дальше

Самые полезные следующие шаги:

1. Починить кодировку русских строк в исходниках.
2. Добавить protected routes и onboarding flow для неавторизованных пользователей.
3. Подключить `Profile` к реальному `AuthProvider.user` и `profiles`.
4. Перевести custom calendar events с localStorage на Supabase.
5. Сделать save в Supabase при добавлении контента в funnel на `/map`.
6. Реализовать duplicate/archive/delete funnel.
7. Добавить удаление/архивацию продуктов и тем с проверкой связей.
8. Добавить нормальные toast/error states для Supabase операций.
9. Сделать demo seed для нового пользователя.
10. Добавить реальные метрики и аналитику по воронкам.
11. Сделать admin через реальные profiles/stats и role-based access.
12. Покрыть тестами DataStore и ключевые flows.

## 24. Правила Развития Продукта

Нельзя ломать основную логику:

```txt
Продукты -> Контент -> Воронки -> Карта -> Календарь
```

Любая новая фича должна усиливать эту систему, а не превращать продукт в обычный task manager.

Правила:

- Если добавляется новая сущность, определить, как она связана с Product, Topic, ContentItem или Funnel.
- Если добавляется дата, подумать, должна ли она попадать в Calendar.
- Если добавляется новый тип продукта, обновить:
  - `PRODUCT_TYPES`;
  - `CreateFunnelModal` tier steps;
  - `FunnelMapPage` tier order/labels/colors/fields;
  - SQL schema, если нужен отдельный id field.
- Если добавляется новая платформа, обновить:
  - `PLATFORMS`;
  - `PlatformIcon`;
  - calendar colors;
  - create topic modal platform selector.
- Если меняется Funnel model, обновить:
  - DataStore mapping;
  - Supabase schema;
  - CreateFunnelModal;
  - PathRow;
  - FunnelMapPage;
  - Calendar only if new date/product relationship appears.
- Не хранить новые persistent данные только в localStorage, если они относятся к пользовательскому проекту.
- Не дублировать derived data в SQL без причины.
- Не добавлять новый визуальный стиль без сверки с `DESIGN_SYSTEM.md`.

## 25. Mental Model Для GPT, Который Продолжает Проект

Если GPT получает этот проект, он должен думать так:

1. Это не просто React-приложение, а конструктор контент-воронок.
2. Центральная ценность в связях между сущностями.
3. Продуктовая линейка нужна до создания воронок.
4. Контент создается по темам и платформам.
5. Воронка связывает content items, CTA keyword и product chain.
6. Карта визуализирует эти связи и должна оставаться интерактивной.
7. Календарь собирает даты из контента, продуктов и событий.
8. Auth/DataStore/Supabase должны быть главным слоем данных.
9. Mobile должен сохранять функциональность, а не становиться урезанной версией.
10. Любое улучшение должно сохранять плотный SaaS-стиль и операционную ясность.

## 26. Файловая Карта

```txt
src/App.tsx
  routes, providers, onboarding context

src/lib/authContext.tsx
  Supabase auth, user session, login/register/google/logout

src/lib/dataStore.tsx
  central app state and Supabase persistence

src/lib/productData.ts
  product types, product statuses, initial product data

src/lib/contentData.ts
  platforms, content statuses, topics/content model

src/lib/funnelData.ts
  funnel model, conversion helpers, resolving content/products

src/lib/supabase.ts
  Supabase client

src/pages/Welcome.tsx
  landing / entry

src/pages/Products.tsx
  product database

src/pages/Content.tsx
  topics, content, idea bank

src/pages/Index.tsx
  funnels dashboard

src/pages/FunnelMapPage.tsx
  full interactive SVG map

src/pages/Calendar.tsx
  content/product/custom event calendar

src/pages/Profile.tsx
  profile/settings/billing mock

src/pages/Admin.tsx
  mock admin analytics

src/pages/Login.tsx
src/pages/Register.tsx
  auth screens

src/components/funnels/CreateFunnelModal.tsx
  create/edit funnel flow

src/components/PathRow.tsx
  funnel row in dashboard

src/components/FunnelMap.tsx
  mini funnel map

src/components/products/*
  product cards, icons, modals, format/status controls

src/components/content/*
  topic rows, content cards, detail modals, platform/status/filter controls

src/components/ui/*
  shadcn/Radix base components

supabase-schema.sql
  database schema and RLS policies

DESIGN_SYSTEM.md
  visual system handoff
```

## 27. Расширение: Strategic Context

Добавлен фундаментальный раздел `Контекст`.

Новая продуктовая модель:

```txt
Контекст -> Целевая аудитория -> Продукты -> Контент -> Воронки -> Карта -> Календарь -> Аналитика
```

Новый route:

```txt
/context -> ContextPage
```

Новые файлы:

```txt
src/pages/ContextPage.tsx
  экран стратегического профиля эксперта

src/lib/contextStore.tsx
  отдельный ContextProvider рядом с DataStoreProvider
```

Навигация:

- `AppSidebar` получил пункт `Контекст`;
- `MobileNav` получил нижнюю вкладку `Контекст`;
- иконка: `Brain` из lucide-react.

Контекстный слой не заменяет существующие Products/Content/Funnels. Он добавляет стратегическую базу знаний, из которой в будущем AI сможет брать материал для генерации контента, анализа ЦА, офферов, прогревов и воронок.

### ContextStore

`ContextProvider` подключен в `App.tsx` внутри `DataStoreProvider`.

Состояния:

```txt
expertProfile
productContexts
references
sourceMaterials
aiAnalyses
isContextLoading
```

Методы:

```txt
loadExpertProfile
updateExpertProfile
loadProductContexts
upsertProductContext
loadReferences
addReference
updateReference
deleteReference
loadSourceMaterials
addSourceMaterial
updateSourceMaterial
deleteSourceMaterial
loadAiAnalyses
```

### ContextPage

Главные модули экрана:

```txt
Распаковка личности
Данные для анализа аудитории
Продукты и офферы
Референсы и материалы
Аналитика
```

`Распаковка личности` построена по Notion-шаблону пользователя. Внутри есть отдельные прогресс-блоки:

```txt
Детство
Школа
Спорт и здоровье
Отношения
Деньги и заработок
Родители
Обучение
Хобби
Друзья
Саморазвитие
Трансформация
Вдохновение
Ценности
Будущее
Личные вопросы
Отношение к
Эмоции
Главный герой
Поиск сюжетных линий
История
Продажа темы
Экспертность
О курсе
```

`Данные для анализа аудитории` отделены от личной распаковки. Это фактура, которую эксперт дает перед будущим AI-анализом ЦА:

```txt
О нише
О продукте / решении
О целевой аудитории из опыта
```

Каждый блок показывает процент заполнения. В распаковке и в фактуре для анализа открытым является первый незавершенный блок и все уже завершенные блоки; следующие блоки визуально заблокированы. Внутри блока показывается один вопрос за раз в модальном окне с кнопками `Сохранить и далее` и `Сохранить и выйти`, чтобы экран не превращался в длинную анкету. Когда блок заполнен на 100%, рядом появляется зеленая галочка.

Кнопка `Подготовить анализ ЦА` пока работает как UI-заглушка и в будущем должна создавать `ai_analysis` со статусом `queued`.

Верх страницы:

- заголовок `Контекст`;
- подзаголовок о базе для контента, воронок и стратегии;
- общий completion score;
- CTA `Продолжить заполнение`;
- кнопка `Загрузить материалы`;
- горизонтальный прогресс.

Прогресс считается по весам:

```txt
Распаковка личности — 20%
Данные для анализа аудитории — 45%
Продукты — 20%
Референсы — 15%
```

### Связь С Products

Вкладка `Продукты и офферы` показывает существующие продукты из `DataStore.products`, но не дублирует раздел Products. Products остается базой офферов, а Context хранит маркетинговый смысл продукта:

```txt
для кого продукт
какую проблему решает
какой результат дает
что входит внутрь
чем отличается
возражения
доказательства / кейсы
почему не покупают
```

Связь:

```txt
product_contexts.product_id -> products.id
```

### References

Новая сущность `Reference` хранит примеры стиля:

```txt
title
type
content
url
notes
tags
```

Типы:

```txt
Telegram-пост, Instagram-пост, Reels-сценарий, Stories, Карусель, Threads, Email, Другое
```

### Materials

`SourceMaterial` хранит источники контекста:

```txt
title
type
sourceKind: text | link | file | voice
content
fileUrl
metadata
```

На первом этапе реализовано текстовое добавление. Файл и голос показаны как disabled/coming soon.

### Analyses

`AiAnalysis` подготовлен под будущие async jobs:

```txt
draft -> queued -> processing -> completed / failed
```

Сейчас AI-генерация не запускается. Экран показывает структуру будущих анализов:

```txt
Анализ ЦА
Распаковка личности
Контент-стратегия
Воронка продаж
Продуктовая линейка
```

### Новые Таблицы Supabase

Добавлены в `supabase-schema.sql`:

```txt
expert_profiles
product_contexts
references
source_materials
ai_analyses
```

Все таблицы имеют RLS по `auth.uid() = user_id`.

Важное правило развития: не хранить новый стратегический контекст только в localStorage. Эти данные являются ядром будущей AI-логики и должны жить в Supabase.
