import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Circle,
  FileText,
  Link as LinkIcon,
  Lock,
  Mic,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileHeader, MobileNav } from "@/components/MobileNav";
import { useToast } from "@/hooks/use-toast";
import { useDataStore } from "@/lib/dataStore";
import {
  calculateContextCompletion,
  type AiAnalysis,
  type ProductContext,
  type ReferenceItem,
  type SourceMaterial,
  useContextStore,
} from "@/lib/contextStore";

type ModuleKey = "personality" | "audience_inputs" | "products" | "references" | "analyses";
type AnswerSection = "personalityAnswers" | "audienceAnswers" | "nicheAnswers";

const PERSONALITY_BLOCKS = [
  {
    id: "childhood",
    title: "Детство",
    description: "Первые воспоминания, мечты, занятия и важные события из детства.",
    fields: [
      ["childhood_place", "Где проходило твоё детство? И как?"],
      ["childhood_activities", "Чем ты чаще всего занимался в детстве?"],
      ["childhood_dream", "О чем ты мечтал в детстве? Кем хотел быть?"],
      ["childhood_result", "Получилось, нет? Ты рад этому?"],
      ["childhood_best_memory", "Самое приятное воспоминание из детства?"],
      ["childhood_worst_memory", "Самое негативное воспоминание."],
    ],
  },
  {
    id: "school",
    title: "Школа",
    description: "Социальная роль, страхи, отличия, истории, мечты и школьная среда.",
    fields: [
      ["school_social_role", "Ты был в школе общительным? Лидером или одиночкой?"],
      ["school_problems", "Какие главные проблемы у тебя были в школе?"],
      ["school_fears", "Чего опасался?"],
      ["school_difference", "Чем ты отличался от других в школе?"],
      ["school_wild_things", "Что шального ты делал в школе?"],
      ["school_contacts", "Продолжаешь ли ты общаться с теми людьми? Если нет, то почему?"],
      ["school_crazy_story", "Самая крейзи-история со времен школы."],
      ["school_dream", "О чем ты мечтал в этот период? Почему?"],
      ["school_nickname", "Было ли у тебя прозвище? Может тебя как-то дразнили?"],
      ["school_party", "Какая твоя самая яркая школьная тусовка?"],
    ],
  },
  {
    id: "sport_health",
    title: "Спорт и здоровье",
    description: "Опыт спорта, тело, привычки, цели и отношения со здоровьем.",
    fields: [
      ["sport_history", "Каким спортом ты занимался по жизни? Чему тебя он научил?"],
      ["sport_now", "Есть ли сейчас какой-то спорт в твоей жизни? Какую роль он выполняет?"],
      ["sport_why", "Почему именно этот спорт?"],
      ["sport_habits", "Есть ли вредные привычки? Как они появились?"],
      ["sport_problems", "Были ли когда-то проблемы связанные с этой темой? РПП, лишний вес?"],
      ["sport_goals", "Есть ли у тебя спортивные цели?"],
      ["sport_substances", "Пробовал наркотики? Какие? Как тебе?"],
    ],
  },
  {
    id: "relationships_context",
    title: "Отношения",
    description: "Любовь, роли, конфликты, благодарность, границы и семейные взгляды.",
    fields: [
      ["relationship_now", "Какие отношения сейчас? Как вы познакомились?"],
      ["relationship_hook", "Чем она тебя зацепила?"],
      ["relationship_differences", "В чем вы разные?"],
      ["relationship_gratitude", "За что ты ей благодарен?"],
      ["relationship_lessons", "Чему она тебя научила?"],
      ["relationship_roles", "Кто за что отвечает в вашей паре?"],
      ["relationship_work_view", "Должна ли девушка работать?"],
      ["relationship_romantic", "Что самое романтичное происходило у вас в жизни?"],
      ["relationship_conflicts", "Кто первый идет на встречу при конфликтах?"],
      ["relationship_love", "Что для тебя любовь? Как человек должен ее проявлять по твоему?"],
      ["relationship_unprepared", "К чему в отношениях тебя жизнь не готовила?"],
      ["relationship_unforgivable", "Чего бы ты никогда не смог простить?"],
      ["relationship_open", "Как ты относишься к свободным отношениям?"],
      ["relationship_family_plans", "Планируешь ли ты свадьбу? Планируешь детей?"],
      ["relationship_love_3_years", "Любовь живет 3 года?"],
      ["relationship_hierarchy", "В семье должна быть иерархия?"],
      ["relationship_jealousy", "Ревнивый ли ты человек? А она? Как боретесь, если оба ревнивые?"],
      ["relationship_breakup", "Тебя когда-нибудь бросали?"],
    ],
  },
  {
    id: "money",
    title: "Деньги и заработок",
    description: "Финансовый путь, ямы, прорывы, мышление, траты и правила денег.",
    fields: [
      ["money_stages", "Какие этапы ты прошел в заработке? Кем работал?"],
      ["money_start_hard", "Что было самое сложное на старте?"],
      ["money_biggest_hole", "Когда была самая большая яма? Расскажи про нее."],
      ["money_life_changed", "Как изменилась твоя жизнь после того, как ты стал зарабатывать?"],
      ["money_happiness_amount", "Сколько денег нужно для счастья?"],
      ["money_mindset", "Что изменилось в твоем мышлении, что позволило сделать твой результат?"],
      ["money_breakthrough", "В какой момент жизни был самый сильный финансовый прорыв? С чем это было связано?"],
      ["money_spending", "Сколько ты сейчас тратишь денег на жизнь?"],
      ["money_best_purchase", "Что самое крутое ты себе купил?"],
      ["money_luck_talent", "Какую роль сыграли талант и везение?"],
      ["money_wishlist", "Что ты еще хочешь купить?"],
      ["money_rules", "Как правильно обращаться с деньгами?"],
    ],
  },
  {
    id: "parents",
    title: "Родители",
    description: "Семья, поддержка, конфликты, уроки и изменение отношений.",
    fields: [
      ["parents_who", "Кто твои родители?"],
      ["parents_warm_memory", "Какое самое теплое воспоминание связано с ними?"],
      ["parents_proud", "Они гордятся тобой?"],
      ["parents_support", "Они поддерживали тебя в начале пути?"],
      ["parents_conflicts", "Какие у вас были конфликты?"],
      ["parents_lessons", "Чему они тебя научили? Или наоборот оставили что-то вредное в голове."],
      ["parents_now", "Какие у вас сейчас отношения?"],
      ["parents_change", "Когда отношения изменились сильнее всего?"],
    ],
  },
  {
    id: "learning",
    title: "Обучение",
    description: "Роль обучения, вложения, книги, университет и личные выводы.",
    fields: [
      ["learning_role", "Какую роль в твоей жизни сыграло обучение?"],
      ["learning_money", "Сколько денег ты потратил на обучение? Было ли это зря?"],
      ["learning_books", "Какие книги изменили твою жизнь?"],
      ["learning_university", "В каком универе ты учился? Доучился? Помогло ли это тебе?"],
    ],
  },
  {
    id: "hobbies",
    title: "Хобби",
    description: "Увлечения, эстетика, причины и связь с работой.",
    fields: [
      ["hobbies_what", "Чем еще ты увлекаешься?"],
      ["hobbies_why", "Почему именно этим? В чем красота?"],
      ["hobbies_work_link", "Имеют ли эти штуки что-то общее с твоей работой?"],
    ],
  },
  {
    id: "friends",
    title: "Друзья",
    description: "Близкие люди, совместные истории, уважение, помощь и смысл дружбы.",
    fields: [
      ["friends_closest", "Кто твой ближайший друг?"],
      ["friends_met", "Как вы познакомились?"],
      ["friends_silly_memory", "Самое нелепое совместное воспоминание."],
      ["friends_respect", "За что ты его уважаешь?"],
      ["friends_good_act", "Когда друг сделал тебе что-то очень крутое и приятное?"],
      ["friends_helped", "Были моменты, когда он тебя вытащил из ямы? Что за момент?"],
      ["friends_almost_lost", "Был момент когда вы почти перестали общаться? Что за момент?"],
      ["friends_interesting_story", "Какую самую интересную историю вы прошли вместе?"],
      ["friends_meaning", "Что для тебя дружба?"],
    ],
  },
  {
    id: "self_development",
    title: "Саморазвитие",
    description: "Рост, сильные этапы развития, советы и убеждения.",
    fields: [
      ["selfdev_when", "Когда по твоему человек сильнее всего развивается?"],
      ["selfdev_stage", "В какой этап своей жизни ты рос сильнее всего?"],
      ["selfdev_beliefs", "Какие главные советы и убеждения помогли тебе развиваться быстрее?"],
    ],
  },
  {
    id: "transformation",
    title: "Трансформация",
    description: "Главные изменения в личности за последние годы.",
    fields: [
      ["transformation_5_years", "Что сильнее всего изменилось в тебе за прошлые 5 лет?"],
    ],
  },
  {
    id: "inspiration",
    title: "Вдохновение",
    description: "Люди, музыка, фильмы и источники мотивации.",
    fields: [
      ["inspiration_now", "Что тебя мотивирует сейчас?"],
      ["inspiration_people", "Какие люди тебя вдохновляли раньше? И какие сейчас?"],
      ["inspiration_music", "Какая музыка тебя вдохновляет?"],
      ["inspiration_movies", "Топ 3 фильма, которые тебя изменили"],
    ],
  },
  {
    id: "values_context",
    title: "Ценности",
    description: "Представление о счастливой жизни и качествах людей.",
    fields: [
      ["values_happy_life", "Что самое важное для счастливой жизни?"],
      ["values_people", "Что ты больше всего ценишь в других людях?"],
    ],
  },
  {
    id: "future",
    title: "Будущее",
    description: "Цели, миссия, главная проблема, место жизни и помощь близким.",
    fields: [
      ["future_goals", "Какие твои главные цели сейчас?"],
      ["future_mission", "В чем ты видишь свою большую миссию?"],
      ["future_problem", "Какую главную проблему ты сейчас решаешь?"],
      ["future_place", "Где бы ты хотел жить?"],
      ["future_family_help", "Хочешь ли ты помочь близким? Есть цели в этом направлении?"],
    ],
  },
  {
    id: "personal_questions",
    title: "Личные вопросы",
    description: "Убеждения, победы, страхи, интересы и личные детали для контента.",
    fields: [
      ["personal_self_wins", "Какие топ-3 победы над собой, которыми ты гордишься?"],
      ["personal_life_lessons", "Каким 10 главным вещам ты научился в своей жизни?"],
      ["personal_ideal_day", "Как проходит твой идеальный день?"],
      ["personal_beliefs", "Назови 10 своих убеждений, в которых тебя нельзя переубедить."],
      ["personal_worst_act", "Худший поступок другого человека в твою сторону."],
      ["personal_good_act", "Очень хороший поступок человека в твою сторону."],
      ["personal_luck", "В чем тебе офигительно повезло?"],
      ["personal_contempt", "К каким людям ты испытываешь презрение?"],
      ["personal_biggest_fear", "Чего ты боишься больше всего в жизни?"],
      ["personal_blog_message", "Какие мысли ты хочешь донести до людей своим блогом?"],
      ["personal_near_death", "Когда ты был на волоске от смерти?"],
      ["personal_weird_facts", "Топ 3 странных фактов о тебе"],
      ["personal_alive_moment", "Опиши момент когда ты чувствовал себя живым"],
      ["personal_people_value", "Что ты больше всего ценишь в других людях?"],
      ["personal_advice_topics", "В каких вопросах ты хорошо разбираешься и к тебе можно обратиться за советом?"],
      ["personal_stress", "Что для тебя стресс и как часто ты в нем находишься?"],
      ["personal_regular_day", "Как проходит твой обычный день?"],
      ["personal_satisfaction", "На сколько ты доволен тем, чем обладаешь?"],
      ["personal_brain_or_heart", "Лучше слушать мозг или сердце?"],
      ["personal_gender_meaning", "Что для тебя значит быть мужчиной / женщиной?"],
      ["personal_best_gift", "Какой лучший подарок ты получал / дарил?"],
      ["personal_bad_thought", "О какой плохой вещи ты думаешь каждый день?"],
      ["personal_last_year_lesson", "Чему ты научился за последний год?"],
      ["personal_procrastination", "Что ты всеми силами откладываешь на потом?"],
      ["personal_dream_done", "Какую свою мечту ты уже воплотил?"],
      ["personal_interests_cloud", "Давай составим облако твоих интересов"],
      ["personal_week_insight", "Что самого крутого ты узнал на этой неделе?"],
    ],
  },
  {
    id: "attitudes",
    title: "Отношение к",
    description: "Позиции и взгляды, из которых собирается авторский голос.",
    fields: [
      ["attitude_alcohol", "Алкоголю"],
      ["attitude_spirituality", "Духовности"],
      ["attitude_investments", "Инвестициям"],
      ["attitude_clients", "Клиентам"],
      ["attitude_product", "Продукту"],
      ["attitude_students", "Ученикам"],
      ["attitude_poverty", "Бедности"],
      ["attitude_politics", "Политике"],
      ["attitude_travel", "Путешествиям"],
      ["attitude_home", "Твоему жилью"],
      ["attitude_clothes", "Одежде"],
      ["attitude_money", "Деньгам"],
      ["attitude_work", "Работе"],
      ["attitude_burnout", "Выгоранию"],
      ["attitude_competitors", "Конкурентам"],
      ["attitude_art", "Искусству"],
      ["attitude_blog", "Блогу"],
      ["attitude_parents", "Родителям"],
      ["attitude_friends", "Друзьям"],
      ["attitude_online_courses", "Онлайн-курсам"],
      ["attitude_open_relationships", "Свободным отношениям"],
      ["attitude_appearance", "Своей внешности"],
      ["attitude_team", "Своей команде"],
    ],
  },
  {
    id: "emotions",
    title: "Эмоции",
    description: "Ситуации под разные эмоциональные состояния для будущих контент-сцен.",
    fields: [
      ["emotion_determination", "Решительность"],
      ["emotion_risk", "Риск"],
      ["emotion_freedom", "Свобода"],
      ["emotion_despair", "Отчаянье"],
      ["emotion_diligence", "Старательность"],
      ["emotion_anger", "Злость, гнев"],
      ["emotion_offense", "Обида"],
      ["emotion_jubilation", "Ликование"],
      ["emotion_gratitude", "Благодарность"],
      ["emotion_weakness", "Слабость"],
      ["emotion_shame", "Стыд"],
      ["emotion_doubts", "Сомнения"],
      ["emotion_fear", "Страх"],
      ["emotion_excitement", "Азарт"],
      ["emotion_pride", "Гордость"],
      ["emotion_contempt", "Презрение"],
      ["emotion_motivation", "Мотивация"],
      ["emotion_laziness", "Лень"],
      ["emotion_spontaneity", "Спонтанность"],
    ],
  },
  {
    id: "hero",
    title: "Главный герой",
    description: "Короткий портрет героя: сила, черты, слабости и состояние.",
    fields: [
      ["hero_superpower", "Твоя супер-способность"],
      ["hero_good_traits", "5 главных хороших черт"],
      ["hero_negative_traits", "5 негативных черт"],
      ["hero_suffering_source", "Главный источник страданий"],
      ["hero_default_state", "Твое обычное состояние / настроение"],
    ],
  },
  {
    id: "plot_lines",
    title: "Поиск сюжетных линий",
    description: "Текущие мечты, задачи, угрозы, цели и препятствия.",
    fields: [
      ["plot_dream", "О чем ты сейчас мечтаешь?"],
      ["plot_tasks", "Какие задачи и проблемы ты сейчас решаешь?"],
      ["plot_last_week_time", "На что ты больше всего времени потратил на прошлой неделе?"],
      ["plot_threat", "Есть ли сейчас какая-то угроза, которая нависла над тобой? (например, депортация)"],
      ["plot_growth_areas", "В каких сферах жизни ты сейчас пытаешься расти?"],
      ["plot_goals_by_area", "Какие конкретно цели по каждой из этих сфер?"],
      ["plot_why_important", "Почему для тебя это важно?"],
      ["plot_obstacles", "Что мешает эти цели реализовать?"],
    ],
  },
  {
    id: "story",
    title: "История",
    description: "Путь в сфере: вход, обучение, страхи, этапы, провалы и победы.",
    fields: [
      ["story_entered_field", "Как ты попал в эту сферу?"],
      ["story_learning_time", "Как долго ты учился перед тем, как ворваться в сферу?"],
      ["story_start_fears", "Какие были страхи перед тем, как начать?"],
      ["story_first_project", "Расскажи о своем первом... (проекте, выступлении и т.д.)"],
      ["story_start_difficulties", "Какие главные трудности ты преодолевал в начале этого пути?"],
      ["story_support_or_criticism", "Тебя поддерживали, когда ты начинал или критиковали?"],
      ["story_first_results_timing", "Сколько времени прошло до первых результатов?"],
      ["story_stages", "Какие этапы ты прошел в своей сфере?"],
      ["story_key_decisions", "Какие ключевые решения были на каждом этапе?"],
      ["story_stage_difficulties", "Какие главные трудности были на каждом этапе?"],
      ["story_failures", "Расскажи про свои самые жесткие обломы и провалы в сфере"],
      ["story_almost_quit", "Расскажи про момент когда ты чуть не бросил"],
      ["story_first_big_win", "Расскажи про первую большую победу"],
      ["story_peak_success", "Расскажи про момент, когда чувствовал себя на пике успеха"],
    ],
  },
  {
    id: "topic_sale",
    title: "Продажа темы",
    description: "Как сфера изменила жизнь, быт, окружение, самоощущение и мечты.",
    fields: [
      ["sale_why_now", "Почему ты сейчас занимаешься именно этим?"],
      ["sale_life_quality", "Как изменилось качество быта? (квартира, еда, такси, уборка)"],
      ["sale_friends_changed", "Как изменилось твое окружение и отношения с друзьями?"],
      ["sale_self_feeling", "Как изменилось твое самоощущение?"],
      ["sale_personality_changed", "Как изменилась твоя личность?"],
      ["sale_purchases", "Что ты себе купил или позволил благодаря сфере?"],
      ["sale_relationships", "Что изменилось на личном фронте благодаря этой сфере?"],
      ["sale_parents_classmates", "Как родители и одноклассники теперь к тебе относятся?"],
      ["sale_day_routine", "Как изменился твой распорядок дня благодаря этой сфере?"],
      ["sale_travel", "Стал ли ты чаще путешествовать благодаря сфере? Куда?"],
      ["sale_not_for_nothing", "Опиши момент, когда ты понял, что все это не зря."],
      ["sale_why_field", "Почему стоит заниматься твоей сферой?"],
      ["sale_qualities", "Какие качества прокачивает твоя сфера?"],
      ["sale_dream", "Какую мечту ты воплотил благодаря сфере?"],
      ["sale_process", "Нравится ли тебе сам процесс работы в твоей сфере? Чем он лучше остальных сфер?"],
      ["sale_friends_transform", "Расскажи про 3-х друзей или коллег, чья жизнь сильно трансформировалась благодаря сфере"],
      ["sale_visible_success", "Как со стороны люди могут понять твой успех в сфере, если ты ничего не будешь говорить?"],
    ],
  },
  {
    id: "expertise",
    title: "Экспертность",
    description: "Прогрев: пазлы успеха, результаты, доказательства, страхи и методология.",
    fields: [
      ["expert_newbie_vs_pro", "Чем отличается новичок от профи?"],
      ["expert_success_puzzles", "Из каких 5-10 пазлов состоит успех в твоей сфере?"],
      ["expert_common_mistakes", "Какие 10 самых частых ошибок в каждом пазле?"],
      ["expert_simple_tip", "Расскажи 1 простую, применимую и полезную фишку из твоей сферы"],
      ["expert_happy_life_elements", "Какие главные элементы для счастливой жизни? (твои ценности)"],
      ["expert_values_link", "Как твоя сфера позволяет реализовать твои ценности?"],
      ["expert_step_plan", "Какой пошаговый план для достижения твоих результатов?"],
      ["expert_biggest_client", "Расскажи про самый большой и крутой проект / клиента"],
      ["expert_strange_project", "Расскажи про самый странный проект"],
      ["expert_funny_case", "Расскажи самый смешной случай за время работы"],
      ["expert_years_achievements", "Сколько лет ты уже в своей сфере? Какие главные достижения за это время?"],
      ["expert_numbers", "Как мы можем отобразить твои результаты в цифрах?"],
      ["expert_income", "Сколько ты сейчас на этом зарабатываешь? (если уместно)"],
      ["expert_credentials", "Есть ли у тебя какие-то дипломы, сертификаты, награды или регалии?"],
      ["expert_education", "Какие обучения ты проходил?"],
      ["expert_client_count", "Сколько у тебя было клиентов / учеников? Есть ли среди них известные?"],
      ["expert_student_problems", "Какие самые частые проблемы и трудности у твоих учеников?"],
      ["expert_solutions", "Как ты их решаешь?"],
      ["expert_student_fears", "Какие самые частые страхи твоих учеников?"],
      ["expert_student_results", "Какие лучшие результаты твоих учеников?"],
      ["expert_work_core", "Что самое главное в твоей работе?"],
      ["expert_teaching_core", "Что самое главное, чтобы хорошо обучать людей в твоей сфере?"],
      ["expert_why_you", "Почему стоит пойти учиться именно к тебе?"],
      ["expert_success_traits", "Какие личностные качества должен иметь успешный... (твоя сфера)"],
      ["expert_own_traits", "Какие из них есть у тебя?"],
    ],
  },
  {
    id: "course",
    title: "О курсе",
    description: "Упаковка курса: окупаемость, методы, отличия, спикеры, гарантии и любовь к ученикам.",
    fields: [
      ["course_payback", "Можно ли сказать, что твой курс окупается?"],
      ["course_methods", "Есть ли у тебя авторские методы и фишки, которым ты обучаешь?"],
      ["course_unique", "Что есть на твоем курсе чего нет у других?"],
      ["course_speakers", "Кто спикеры на твоем курсе?"],
      ["course_tech_solutions", "Какие 5 лучших технологических решений на твоем курсе?"],
      ["course_family_students", "Давал ли ты это обучение своим братьям, сестрам, родителям, друзьям?"],
      ["course_certificate", "Есть ли сертификат по итогу курса?"],
      ["course_guarantees", "Какие гарантии мы можем юридически зафиксировать?"],
      ["course_teacher_traits", "Какие качества должен иметь хороший учитель?"],
      ["course_traits_in_you", "Какие из них есть в тебе и как это проявляется?"],
      ["course_love_students", "В чем проявляется твоя любовь к ученикам?"],
    ],
  },
] as const;

const AUDIENCE_INPUT_BLOCKS = [
  {
    id: "audience_niche",
    title: "О нише",
    description: "Контекст рынка: проблемы, мифы, стереотипы, альтернативы и особый подход.",
    section: "nicheAnswers" as AnswerSection,
    fields: [
      ["audience_fact_niche", "В какой нише вы работаете?"],
      ["audience_fact_niche_tasks", "Какие задачи люди обычно решают в этой нише?"],
      ["audience_fact_niche_problems", "Какие главные проблемы есть в нише?"],
      ["audience_fact_result_barriers", "Какие трудности чаще всего мешают людям получить результат?"],
      ["audience_fact_niche_myths", "Какие мифы и ложные убеждения есть в нише?"],
      ["audience_fact_help_stereotypes", "Какие стереотипы мешают людям обратиться за помощью?"],
      ["audience_fact_underestimated", "Что люди обычно недооценивают в этой теме?"],
      ["audience_fact_alternatives", "Какие есть альтернативы вашему решению: конкуренты, бесплатный контент, самостоятельный путь?"],
      ["audience_fact_special_approach", "Почему в этой нише нужен особый подход?"],
    ],
  },
  {
    id: "audience_product_solution",
    title: "О продукте / решении",
    description: "Фактура про продукт: для кого, что решает, почему покупают и какие есть доказательства.",
    section: "audienceAnswers" as AnswerSection,
    fields: [
      ["audience_fact_offer", "Что именно вы предлагаете?"],
      ["audience_fact_product_for_whom", "Для кого этот продукт?"],
      ["audience_fact_main_problem", "Какую главную проблему он решает?"],
      ["audience_fact_extra_problems", "Какие дополнительные проблемы он закрывает?"],
      ["audience_fact_buying_situation", "В какой ситуации человек обычно покупает этот продукт?"],
      ["audience_fact_desired_result", "Какой результат человек хочет получить?"],
      ["audience_fact_inside_product", "Что входит в продукт?"],
      ["audience_fact_better_than_self", "Почему ваше решение лучше самостоятельного пути?"],
      ["audience_fact_better_than_others", "Почему ваше решение лучше других похожих решений?"],
      ["audience_fact_proof", "Какие доказательства результата у вас есть?"],
      ["audience_fact_purchase_objections", "Какие возражения чаще всего мешают купить этот продукт?"],
    ],
  },
  {
    id: "audience_from_experience",
    title: "О целевой аудитории из опыта",
    description: "Живая фактура из клиентов: боли, попытки, страхи, фразы, возражения и точка решения.",
    section: "audienceAnswers" as AnswerSection,
    fields: [
      ["audience_fact_clients", "Кто ваши клиенты?"],
      ["audience_fact_client_situation", "В какой ситуации они к вам приходят?"],
      ["audience_fact_client_problems", "Какие проблемы хотят решить?"],
      ["audience_fact_tried_before", "Что они уже пробовали до вас?"],
      ["audience_fact_why_failed_before", "Почему у них не получилось раньше?"],
      ["audience_fact_negative_experience", "Какой негативный опыт у них был?"],
      ["audience_fact_problem_thoughts", "Что они думают о своей проблеме?"],
      ["audience_fact_solution_view", "Как они видят решение?"],
      ["audience_fact_client_myths", "Какие мифы и ложные убеждения у них есть?"],
      ["audience_fact_client_fears", "Чего они боятся?"],
      ["audience_fact_true_desire", "Чего они хотят на самом деле?"],
      ["audience_fact_faq", "Какие вопросы они задают чаще всего?"],
      ["audience_fact_spoken_objections", "Какие возражения говорят перед покупкой?"],
      ["audience_fact_pain_phrases", "Какие фразы они используют, когда описывают свою боль?"],
      ["audience_fact_breaking_point", "Что для них является точкой “всё, я больше так не могу”?"],
      ["audience_fact_strong_result", "Что для них будет сильным результатом?"],
    ],
  },
] as const;

const PRODUCT_CONTEXT_FIELDS = [
  ["audience", "Для кого продукт"],
  ["problem", "Какую проблему решает"],
  ["result", "Какой результат дает"],
  ["offerDetails", "Что входит внутрь"],
  ["differentiators", "Чем отличается от конкурентов"],
  ["objections", "Главные возражения"],
  ["proof", "Почему покупают / кейсы / доказательства"],
] as const;

const REFERENCE_TYPES = ["Telegram-пост", "Instagram-пост", "Reels-сценарий", "Stories", "Карусель", "Threads", "Email", "Другое"];
const MATERIAL_TYPES = ["описание продукта", "кастдев", "отзывы", "кейсы", "старые посты", "скрипты продаж", "заметки", "другое"];

const ANALYSIS_TEMPLATES: AiAnalysis[] = [
  { type: "audience", title: "Анализ ЦА", status: "draft", inputSnapshot: {}, result: {}, summary: "Станет доступен после заполнения вводных для анализа аудитории." },
  { type: "personality", title: "Распаковка личности", status: "draft", inputSnapshot: {}, result: {}, summary: "Будущий анализ ситуаций, историй и контентных опор." },
  { type: "content_strategy", title: "Контент-стратегия", status: "draft", inputSnapshot: {}, result: {}, summary: "Будущая стратегия тем, рубрик, прогревов и форматов." },
  { type: "sales_funnel", title: "Воронка продаж", status: "draft", inputSnapshot: {}, result: {}, summary: "Будущая сборка связок контент -> CTA -> продукты." },
  { type: "product_line", title: "Продуктовая линейка", status: "draft", inputSnapshot: {}, result: {}, summary: "Будущая диагностика офферов и ступеней линейки." },
];

type AnswerMap = Record<string, unknown>;
type QuestionBlock = {
  section?: keyof Pick<ExpertProfile, "personalityAnswers" | "nicheAnswers" | "audienceAnswers">;
  fields: readonly (readonly [string, string])[];
};

function getBlockProgress(fields: readonly (readonly [string, string])[], answers: AnswerMap) {
  const filled = fields.filter(([key]) => String(answers?.[key] || "").trim().length > 0).length;
  const total = fields.length;
  const percent = total ? Math.round((filled / total) * 100) : 0;
  return { filled, total, percent };
}

function getGroupProgress(blocks: readonly QuestionBlock[], answersBySection: Record<string, AnswerMap>) {
  const items = blocks.map((block) => {
    const section = block.section || "personalityAnswers";
    return getBlockProgress(block.fields, answersBySection[section] || {});
  });
  const filled = items.reduce((sum, item) => sum + item.filled, 0);
  const total = items.reduce((sum, item) => sum + item.total, 0);
  return { filled, total, percent: total ? Math.round((filled / total) * 100) : 0 };
}

function ModuleButton({
  active,
  title,
  description,
  percent,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  percent: number;
  onClick: () => void;
}) {
  const done = percent >= 100;
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
        active ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]" : "border-border hover:border-primary/30"
      } bg-card`}
    >
      <div className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-500" style={{ width: `${percent}%` }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-foreground">{title}</div>
          <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{description}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[16px] font-bold text-primary">{percent}%</span>
          {done ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-muted-foreground/60" />}
        </div>
      </div>
    </button>
  );
}

function StepCard({
  title,
  description,
  percent,
  active,
  disabled = false,
  onClick,
}: {
  title: string;
  description: string;
  percent: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const done = percent >= 100;
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
        active ? "border-primary" : "border-border hover:border-primary/30"
      } ${disabled ? "opacity-55 cursor-not-allowed hover:border-border" : ""} bg-card`}
    >
      <div className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-500" style={{ width: `${percent}%` }} />
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-foreground">{title}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{description}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[13px] font-bold text-primary">{percent}%</span>
          {disabled ? <Lock className="w-4 h-4 text-muted-foreground/60" /> : done ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-muted-foreground/60" />}
        </div>
      </div>
    </button>
  );
}

function FieldCard({
  title,
  value,
  onSave,
}: {
  title: string;
  value: string;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value || "");
  useEffect(() => setDraft(value || ""), [value]);
  const filled = draft.trim().length > 0;

  return (
    <div className="card-elevated p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
            {filled ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Circle className="w-3.5 h-3.5" />}
            {filled ? "Заполнено" : "Нужно заполнить"}
          </div>
        </div>
        <button onClick={() => onSave(draft)} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors">
          Сохранить
        </button>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Ответьте своими словами. Можно коротко, главное начать."
        className="w-full min-h-[112px] resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] leading-relaxed outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
      />
    </div>
  );
}

function PersonalityQuestionnaire({
  block,
  answers,
  questionIndex,
  onQuestionIndexChange,
  onSaveAnswer,
  onBack,
  onSaveAndExit,
  onComplete,
}: {
  block: (typeof PERSONALITY_BLOCKS)[number];
  answers: AnswerMap;
  questionIndex: number;
  onQuestionIndexChange: (index: number) => void;
  onSaveAnswer: (key: string, value: string) => void;
  onBack: () => void;
  onSaveAndExit: (key: string, value: string) => void;
  onComplete: () => void;
}) {
  const safeIndex = Math.min(questionIndex, block.fields.length - 1);
  const [key, title] = block.fields[safeIndex];
  const [draft, setDraft] = useState(String(answers[key] || ""));
  const progress = getBlockProgress(block.fields, answers);
  const isLast = safeIndex >= block.fields.length - 1;

  useEffect(() => {
    setDraft(String(answers[key] || ""));
  }, [answers, key]);

  const goNext = () => {
    onSaveAnswer(key, draft);
    if (isLast) {
      onComplete();
      return;
    }
    onQuestionIndexChange(safeIndex + 1);
  };

  const goPrevious = () => {
    onSaveAnswer(key, draft);
    onQuestionIndexChange(Math.max(0, safeIndex - 1));
  };

  return (
    <section className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden w-full max-w-3xl max-h-[calc(100vh-2rem)] flex flex-col">
      <div className="border-b border-border p-4 md:p-5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-semibold text-foreground">{block.title}</h2>
            <p className="text-[12px] text-muted-foreground mt-1">{block.description}</p>
          </div>
          <div className="flex items-start justify-between sm:justify-end gap-3 shrink-0">
            <div className="text-left sm:text-right">
              <div className="text-[18px] font-bold text-primary">{progress.percent}%</div>
              <div className="text-[11px] text-muted-foreground">{progress.filled}/{progress.total} ответов</div>
            </div>
            <button
              onClick={() => onSaveAndExit(key, draft)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>

      <div className="p-4 md:p-6 overflow-y-auto">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold">
            Вопрос {safeIndex + 1} из {block.fields.length}
          </span>
          {String(answers[key] || "").trim() && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Уже есть ответ
            </span>
          )}
        </div>

        <h3 className="text-[18px] md:text-[20px] font-semibold text-foreground leading-snug max-w-3xl">{title}</h3>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ответьте своими словами. Можно коротко, главное зафиксировать смысл."
          className="mt-4 w-full min-h-[220px] resize-y rounded-2xl border border-border bg-background px-4 py-3 text-[14px] leading-relaxed outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
        />

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={goPrevious}
              disabled={safeIndex === 0}
              className="px-4 py-2 rounded-xl border border-border bg-card text-[13px] font-medium text-foreground hover:bg-muted/50 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              Назад
            </button>
            <button
              onClick={() => onSaveAndExit(key, draft)}
              className="px-4 py-2 rounded-xl border border-border bg-card text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              Сохранить и выйти
            </button>
          </div>
          <button
            onClick={goNext}
            disabled={!draft.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
          >
            {isLast ? "Завершить блок" : "Сохранить и далее"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function AudienceFactQuestionnaire({
  block,
  answers,
  questionIndex,
  onQuestionIndexChange,
  onSaveAnswer,
  onSaveAndExit,
  onComplete,
}: {
  block: (typeof AUDIENCE_INPUT_BLOCKS)[number];
  answers: AnswerMap;
  questionIndex: number;
  onQuestionIndexChange: (index: number) => void;
  onSaveAnswer: (key: string, value: string) => void;
  onSaveAndExit: (key: string, value: string) => void;
  onComplete: () => void;
}) {
  const safeIndex = Math.min(questionIndex, block.fields.length - 1);
  const [key, title] = block.fields[safeIndex];
  const [draft, setDraft] = useState(String(answers[key] || ""));
  const progress = getBlockProgress(block.fields, answers);
  const isLast = safeIndex >= block.fields.length - 1;

  useEffect(() => {
    setDraft(String(answers[key] || ""));
  }, [answers, key]);

  const goNext = () => {
    onSaveAnswer(key, draft);
    if (isLast) {
      onComplete();
      return;
    }
    onQuestionIndexChange(safeIndex + 1);
  };

  const goPrevious = () => {
    onSaveAnswer(key, draft);
    onQuestionIndexChange(Math.max(0, safeIndex - 1));
  };

  return (
    <section className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden w-full max-w-3xl max-h-[calc(100vh-2rem)] flex flex-col">
      <div className="border-b border-border p-4 md:p-5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-semibold text-foreground">{block.title}</h2>
            <p className="text-[12px] text-muted-foreground mt-1">{block.description}</p>
          </div>
          <div className="flex items-start justify-between sm:justify-end gap-3 shrink-0">
            <div className="text-left sm:text-right">
              <div className="text-[18px] font-bold text-primary">{progress.percent}%</div>
              <div className="text-[11px] text-muted-foreground">{progress.filled}/{progress.total} ответов</div>
            </div>
            <button
              onClick={() => onSaveAndExit(key, draft)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>

      <div className="p-4 md:p-6 overflow-y-auto">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold">
            Вопрос {safeIndex + 1} из {block.fields.length}
          </span>
          {String(answers[key] || "").trim() && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-green-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Уже есть ответ
            </span>
          )}
        </div>

        <h3 className="text-[18px] md:text-[20px] font-semibold text-foreground leading-snug max-w-3xl">{title}</h3>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ответьте фактами из опыта: как говорят клиенты, что они пробовали, чего боятся, почему покупают."
          className="mt-4 w-full min-h-[220px] resize-y rounded-2xl border border-border bg-background px-4 py-3 text-[14px] leading-relaxed outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
        />

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={goPrevious}
              disabled={safeIndex === 0}
              className="px-4 py-2 rounded-xl border border-border bg-card text-[13px] font-medium text-foreground hover:bg-muted/50 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              Назад
            </button>
            <button
              onClick={() => onSaveAndExit(key, draft)}
              className="px-4 py-2 rounded-xl border border-border bg-card text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              Сохранить и выйти
            </button>
          </div>
          <button
            onClick={goNext}
            disabled={!draft.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
          >
            {isLast ? "Завершить блок" : "Сохранить и далее"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center">
      <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
      <div className="text-[14px] font-semibold text-foreground mb-1">{title}</div>
      <div className="text-[12px] text-muted-foreground max-w-md mx-auto leading-relaxed">{description}</div>
    </div>
  );
}

function statusStyle(status: string) {
  if (status === "completed") return "bg-green-100 text-green-700";
  if (status === "processing") return "bg-indigo-100 text-indigo-700";
  if (status === "queued") return "bg-amber-100 text-amber-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  return "bg-muted text-muted-foreground";
}

export default function ContextPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { products } = useDataStore();
  const {
    expertProfile,
    productContexts,
    references,
    sourceMaterials,
    aiAnalyses,
    isContextLoading,
    updateExpertProfile,
    upsertProductContext,
    addReference,
    deleteReference,
    addSourceMaterial,
    deleteSourceMaterial,
  } = useContextStore();

  const [module, setModule] = useState<ModuleKey>("personality");
  const [personalityBlock, setPersonalityBlock] = useState<string | null>(null);
  const [personalityQuestionIndex, setPersonalityQuestionIndex] = useState(0);
  const [audienceBlock, setAudienceBlock] = useState<string | null>(null);
  const [audienceQuestionIndex, setAudienceQuestionIndex] = useState(0);
  const [referenceFilter, setReferenceFilter] = useState("Все");
  const [newReference, setNewReference] = useState<ReferenceItem>({ title: "", type: REFERENCE_TYPES[0], content: "", url: "", notes: "", tags: [] });
  const [newMaterial, setNewMaterial] = useState<SourceMaterial>({ title: "", type: MATERIAL_TYPES[0], sourceKind: "text", content: "", metadata: {} });

  const answersBySection = useMemo(
    () => ({
      personalityAnswers: expertProfile.personalityAnswers,
      audienceAnswers: expertProfile.audienceAnswers,
      nicheAnswers: expertProfile.nicheAnswers,
    }),
    [expertProfile.audienceAnswers, expertProfile.nicheAnswers, expertProfile.personalityAnswers],
  );

  const personalityProgress = useMemo(() => getGroupProgress(PERSONALITY_BLOCKS, answersBySection), [answersBySection]);
  const personalityBlockProgresses = useMemo(
    () => PERSONALITY_BLOCKS.map((block) => getBlockProgress(block.fields, expertProfile.personalityAnswers)),
    [expertProfile.personalityAnswers],
  );
  const firstIncompletePersonalityIndex = personalityBlockProgresses.findIndex((progress) => progress.percent < 100);
  const audienceInputProgress = useMemo(() => getGroupProgress(AUDIENCE_INPUT_BLOCKS, answersBySection), [answersBySection]);
  const audienceBlockProgresses = useMemo(
    () => AUDIENCE_INPUT_BLOCKS.map((block) => getBlockProgress(block.fields, expertProfile[block.section])),
    [expertProfile],
  );
  const firstIncompleteAudienceIndex = audienceBlockProgresses.findIndex((progress) => progress.percent < 100);
  const productProgress = useMemo(() => {
    const filled = productContexts.filter((p) => [p.audience, p.problem, p.result, p.offerDetails, p.objections, p.differentiators, p.proof].some((v) => v.trim())).length;
    const total = Math.max(products.length, 1);
    return { filled, total, percent: Math.round((filled / total) * 100) };
  }, [productContexts, products.length]);
  const referenceProgress = useMemo(() => ({ filled: Math.min(references.length, 3), total: 3, percent: Math.min(100, references.length * 34) }), [references.length]);

  const completionScore = useMemo(
    () => calculateContextCompletion(expertProfile, productContexts, references),
    [expertProfile, productContexts, references],
  );

  const modules = [
    {
      key: "personality" as ModuleKey,
      title: "Распаковка личности",
      description: "Большая база ситуаций, историй, голоса и контентных опор.",
      percent: personalityProgress.percent,
    },
    {
      key: "audience_inputs" as ModuleKey,
      title: "Данные для анализа аудитории",
      description: "О себе, о моей ЦА и о нише. После заполнения можно готовить анализ.",
      percent: audienceInputProgress.percent,
    },
    {
      key: "products" as ModuleKey,
      title: "Продукты и офферы",
      description: "Маркетинговый контекст продуктов из текущей линейки.",
      percent: productProgress.percent,
    },
    {
      key: "references" as ModuleKey,
      title: "Референсы и материалы",
      description: "Примеры стиля, тексты, ссылки и ручные материалы.",
      percent: referenceProgress.percent,
    },
    {
      key: "analyses" as ModuleKey,
      title: "Аналитика",
      description: "Будущие AI-анализы и async jobs.",
      percent: aiAnalyses.some((a) => a.status === "completed") ? 100 : 0,
    },
  ];

  const saveAnswer = (section: AnswerSection, key: string, value: string) => {
    updateExpertProfile({
      [section]: {
        ...expertProfile[section],
        [key]: value,
      },
    });
    toast({ title: "Сохранено", description: "Контекст обновлен." });
  };

  const savePersonalityAnswer = (key: string, value: string) => {
    updateExpertProfile({
      personalityAnswers: {
        ...expertProfile.personalityAnswers,
        [key]: value,
      },
    });
  };

  const firstEmptyQuestionIndex = (block: (typeof PERSONALITY_BLOCKS)[number]) => {
    const index = block.fields.findIndex(([key]) => !String(expertProfile.personalityAnswers[key] || "").trim());
    return index >= 0 ? index : 0;
  };

  const openPersonalityBlock = (blockId: string, blockIndex: number) => {
    const unlocked = firstIncompletePersonalityIndex === -1 || blockIndex <= firstIncompletePersonalityIndex;
    if (!unlocked) {
      toast({
        title: "Блок пока закрыт",
        description: "Сначала завершите предыдущий блок распаковки.",
      });
      return;
    }

    const block = PERSONALITY_BLOCKS[blockIndex];
    setPersonalityBlock(blockId);
    setPersonalityQuestionIndex(firstEmptyQuestionIndex(block));
  };

  const firstEmptyAudienceQuestionIndex = (block: (typeof AUDIENCE_INPUT_BLOCKS)[number]) => {
    const index = block.fields.findIndex(([key]) => !String(expertProfile[block.section][key] || "").trim());
    return index >= 0 ? index : 0;
  };

  const saveAudienceFactAnswer = (block: (typeof AUDIENCE_INPUT_BLOCKS)[number], key: string, value: string) => {
    updateExpertProfile({
      [block.section]: {
        ...expertProfile[block.section],
        [key]: value,
      },
    });
  };

  const openAudienceBlock = (blockId: string, blockIndex: number) => {
    const unlocked = firstIncompleteAudienceIndex === -1 || blockIndex <= firstIncompleteAudienceIndex;
    if (!unlocked) {
      toast({
        title: "Блок пока закрыт",
        description: "Сначала завершите предыдущий блок с фактурой.",
      });
      return;
    }

    const block = AUDIENCE_INPUT_BLOCKS[blockIndex];
    setAudienceBlock(blockId);
    setAudienceQuestionIndex(firstEmptyAudienceQuestionIndex(block));
  };

  const productContextFor = (productId: number): ProductContext => {
    return productContexts.find((ctx) => ctx.productId === productId) || {
      productId,
      title: products.find((p) => p.id === productId)?.name || "",
      audience: "",
      problem: "",
      result: "",
      offerDetails: "",
      objections: "",
      differentiators: "",
      proof: "",
      rawData: {},
    };
  };

  const saveProductField = (productId: number, field: keyof ProductContext, value: ProductContext[keyof ProductContext]) => {
    const ctx = productContextFor(productId);
    upsertProductContext({ ...ctx, [field]: value });
    toast({ title: "Продуктовый контекст сохранен" });
  };

  const createReference = () => {
    if (!newReference.title.trim()) {
      toast({ title: "Добавьте название референса", variant: "destructive" });
      return;
    }
    addReference(newReference);
    setNewReference({ title: "", type: REFERENCE_TYPES[0], content: "", url: "", notes: "", tags: [] });
    toast({ title: "Референс добавлен" });
  };

  const createMaterial = () => {
    if (!newMaterial.title.trim() || !newMaterial.content.trim()) {
      toast({ title: "Заполните название и текст материала", variant: "destructive" });
      return;
    }
    addSourceMaterial(newMaterial);
    setNewMaterial({ title: "", type: MATERIAL_TYPES[0], sourceKind: "text", content: "", metadata: {} });
    toast({ title: "Материал добавлен" });
  };

  const continueFromGap = () => {
    const next = modules.find((item) => item.percent < 100);
    if (!next) return;
    setModule(next.key);
    if (next.key === "personality") {
      const index = firstIncompletePersonalityIndex >= 0 ? firstIncompletePersonalityIndex : 0;
      openPersonalityBlock(PERSONALITY_BLOCKS[index].id, index);
    }
    if (next.key === "audience_inputs") {
      const index = firstIncompleteAudienceIndex >= 0 ? firstIncompleteAudienceIndex : 0;
      openAudienceBlock(AUDIENCE_INPUT_BLOCKS[index].id, index);
    }
  };

  const activePersonality = personalityBlock ? PERSONALITY_BLOCKS.find((block) => block.id === personalityBlock) || null : null;
  const activeAudience = audienceBlock ? AUDIENCE_INPUT_BLOCKS.find((block) => block.id === audienceBlock) || null : null;
  const filteredReferences = referenceFilter === "Все" ? references : references.filter((r) => r.type === referenceFilter);
  const analyses = aiAnalyses.length > 0 ? aiAnalyses : ANALYSIS_TEMPLATES;
  const canPrepareAudienceAnalysis = audienceInputProgress.percent >= 100;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0 pt-8 md:pt-0">
          <header className="sticky top-0 z-50 surface-glass border-b border-border">
            <div className="w-full px-4 md:px-6 max-w-[1400px] mx-auto">
              <div className="flex items-center justify-between min-h-16 py-3 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <SidebarTrigger className="hidden md:flex" />
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h1 className="text-[15px] md:text-base font-semibold text-foreground tracking-tight">Контекст</h1>
                      <span className="text-[12px] text-muted-foreground">{isContextLoading ? "загрузка..." : `Заполнено ${completionScore}%`}</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground hidden sm:block">
                      Стратегическая база для анализа аудитории, контента, офферов и воронок
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={continueFromGap} className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[12px] sm:text-[13px] font-medium hover:bg-primary/90 transition-colors shadow-sm">
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Продолжить заполнение</span>
                  </button>
                  <button onClick={() => document.getElementById("context-materials")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    Загрузить материалы
                  </button>
                </div>
              </div>
              <div className="pb-3">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${completionScore}%` }} />
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 w-full mx-auto py-5 md:py-6 px-4 md:px-6 pb-20 md:pb-6 max-w-[1400px]">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
              {modules.map((item) => (
                <ModuleButton
                  key={item.key}
                  active={module === item.key}
                  title={item.title}
                  description={item.description}
                  percent={item.percent}
                  onClick={() => setModule(item.key)}
                />
              ))}
            </div>

            {module === "personality" && (
              <div className="space-y-5">
                <section className="card-elevated p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <h2 className="text-[16px] font-semibold text-foreground">Распаковка личности</h2>
                      <p className="text-[12px] text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                        Проходите блоки по порядку. Снаружи виден только прогресс, а вопросы открываются внутри выбранного блока по одному.
                      </p>
                    </div>
                    <div className="shrink-0 md:text-right">
                      <div className="text-[22px] font-bold text-primary">{personalityProgress.percent}%</div>
                      <div className="text-[11px] text-muted-foreground">{personalityProgress.filled}/{personalityProgress.total} ответов</div>
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${personalityProgress.percent}%` }} />
                  </div>
                </section>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {PERSONALITY_BLOCKS.map((block, index) => {
                    const progress = personalityBlockProgresses[index];
                    const unlocked = firstIncompletePersonalityIndex === -1 || index <= firstIncompletePersonalityIndex;
                    return (
                      <StepCard
                        key={block.id}
                        title={`${index + 1}. ${block.title}`}
                        description={unlocked ? `${progress.filled}/${progress.total} вопросов` : "Откроется после предыдущего блока"}
                        percent={progress.percent}
                        active={personalityBlock === block.id}
                        disabled={!unlocked}
                        onClick={() => openPersonalityBlock(block.id, index)}
                      />
                    );
                  })}
                </div>

                {!activePersonality && (
                  <EmptyState
                    title="Выберите первый доступный блок"
                    description="Начните с детства. После клика анкета откроется поверх экрана, а не где-то ниже списка."
                  />
                )}
              </div>
            )}

            {module === "audience_inputs" && (
              <div className="space-y-5">
                <section className="card-elevated p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <h2 className="text-[16px] font-semibold text-foreground">Фактура для анализа аудитории</h2>
                      <p className="text-[12px] text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                        Это не распаковка личности, а входные данные для сильного анализа ЦА: ниша, решение и живой опыт клиентов.
                      </p>
                    </div>
                    <div className="shrink-0 md:text-right">
                      <div className="text-[22px] font-bold text-primary">{audienceInputProgress.percent}%</div>
                      <div className="text-[11px] text-muted-foreground">{audienceInputProgress.filled}/{audienceInputProgress.total} ответов</div>
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${audienceInputProgress.percent}%` }} />
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {AUDIENCE_INPUT_BLOCKS.map((block, index) => {
                    const progress = audienceBlockProgresses[index];
                    const unlocked = firstIncompleteAudienceIndex === -1 || index <= firstIncompleteAudienceIndex;
                    return (
                      <StepCard
                        key={block.id}
                        title={`${index + 1}. ${block.title}`}
                        description={unlocked ? `${progress.filled}/${progress.total} вопросов` : "Откроется после предыдущего блока"}
                        percent={progress.percent}
                        active={audienceBlock === block.id}
                        disabled={!unlocked}
                        onClick={() => openAudienceBlock(block.id, index)}
                      />
                    );
                  })}
                </div>

                {!activeAudience && (
                  <EmptyState
                    title="Выберите первый доступный блок"
                    description="Начните с ниши. Вопросы откроются поверх экрана по одному, чтобы собрать фактуру без каши."
                  />
                )}

                <button
                  onClick={() => toast({
                    title: canPrepareAudienceAnalysis ? "Анализ будет доступен позже" : "Сначала заполните фактуру",
                    description: canPrepareAudienceAnalysis ? "Следующий шаг будет создавать ai_analysis со статусом queued." : "Когда все три блока будут на 100%, можно будет готовить анализ.",
                  })}
                  className={`rounded-xl px-4 py-3 text-[13px] font-semibold transition-colors ${
                    canPrepareAudienceAnalysis ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground"
                  }`}
                >
                  Подготовить анализ ЦА
                </button>
              </div>
            )}

            {module === "products" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => navigate("/products")} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    Добавить продукт
                  </button>
                  <button onClick={() => toast({ title: "Связь уже заложена", description: "Контекст привязывается к продуктам из раздела Products." })} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-[13px] font-medium hover:bg-muted/50 transition-colors">
                    <Target className="w-3.5 h-3.5" />
                    Связать с продуктовой линейкой
                  </button>
                </div>
                {products.length === 0 ? (
                  <EmptyState title="Пока нет продуктов" description="Products остается базой офферов. Здесь появится стратегическое описание каждого продукта." />
                ) : (
                  products.map((product) => {
                    const ctx = productContextFor(product.id);
                    return (
                      <div key={product.id} className="card-elevated p-4">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <h3 className="text-[14px] font-semibold text-foreground">{product.name}</h3>
                            <div className="text-[11px] text-muted-foreground mt-1">
                              {product.format || "без формата"} · {product.price ? `${product.price} ${product.currency}` : "бесплатно/без цены"}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] font-semibold">Контекст оффера</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {PRODUCT_CONTEXT_FIELDS.map(([field, label]) => (
                            <FieldCard key={field} title={label} value={String(ctx[field] || "")} onSave={(value) => saveProductField(product.id, field, value)} />
                          ))}
                          <FieldCard title="Почему не покупают" value={ctx.rawData?.why_not_buy || ""} onSave={(value) => saveProductField(product.id, "rawData", { ...ctx.rawData, why_not_buy: value })} />
                          <FieldCard title="Какие кейсы связаны с продуктом" value={ctx.rawData?.cases || ""} onSave={(value) => saveProductField(product.id, "rawData", { ...ctx.rawData, cases: value })} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {module === "references" && (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
                <section className="space-y-4">
                  <div className="card-elevated p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h3 className="text-[14px] font-semibold text-foreground">Добавить референс</h3>
                      <button onClick={createReference} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90">Добавить</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input value={newReference.title} onChange={(e) => setNewReference((p) => ({ ...p, title: e.target.value }))} placeholder="Название" className="rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary" />
                      <select value={newReference.type} onChange={(e) => setNewReference((p) => ({ ...p, type: e.target.value }))} className="rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary">
                        {REFERENCE_TYPES.map((type) => <option key={type}>{type}</option>)}
                      </select>
                      <input value={newReference.url} onChange={(e) => setNewReference((p) => ({ ...p, url: e.target.value }))} placeholder="Ссылка" className="rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary" />
                      <input value={newReference.tags.join(", ")} onChange={(e) => setNewReference((p) => ({ ...p, tags: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))} placeholder="Теги через запятую" className="rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary" />
                      <textarea value={newReference.content} onChange={(e) => setNewReference((p) => ({ ...p, content: e.target.value }))} placeholder="Текст референса" className="md:col-span-2 min-h-[100px] rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary" />
                      <textarea value={newReference.notes} onChange={(e) => setNewReference((p) => ({ ...p, notes: e.target.value }))} placeholder="Что нравится в этом референсе" className="md:col-span-2 min-h-[80px] rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto">
                    {["Все", ...REFERENCE_TYPES].map((type) => (
                      <button key={type} onClick={() => setReferenceFilter(type)} className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${referenceFilter === type ? "violet-surface text-primary" : "text-muted-foreground hover:bg-muted/50"}`}>
                        {type}
                      </button>
                    ))}
                  </div>
                  {references.length === 0 ? (
                    <EmptyState title="Добавьте примеры текстов, которые вам нравятся" description="Это поможет сервису попадать в ваш стиль." />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredReferences.map((ref) => (
                        <div key={ref.id} className="card-elevated p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-[13px] font-semibold text-foreground">{ref.title}</h3>
                              <div className="text-[11px] text-primary mt-1">{ref.type}</div>
                            </div>
                            {ref.id && <button onClick={() => deleteReference(ref.id!)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>}
                          </div>
                          {ref.url && <div className="mt-3 text-[11px] text-muted-foreground truncate">{ref.url}</div>}
                          <p className="mt-3 text-[12px] text-foreground/80 line-clamp-4 whitespace-pre-wrap">{ref.content || ref.notes}</p>
                          {ref.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-3">{ref.tags.map((tag) => <span key={tag} className="px-2 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground">{tag}</span>)}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                <aside id="context-materials" className="card-elevated p-4 h-fit scroll-mt-28">
                  <div className="flex items-center gap-2 mb-3">
                    <Paperclip className="w-4 h-4 text-primary" />
                    <h3 className="text-[13px] font-semibold text-foreground">Материалы</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl violet-surface text-primary text-[11px] font-semibold"><FileText className="w-3.5 h-3.5" />Текст</button>
                    <button className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-muted text-muted-foreground text-[11px] font-semibold"><LinkIcon className="w-3.5 h-3.5" />Ссылка</button>
                    <button disabled className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-muted/60 text-muted-foreground/70 text-[11px] font-semibold cursor-not-allowed"><Upload className="w-3.5 h-3.5" />Файл</button>
                    <button disabled className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-muted/60 text-muted-foreground/70 text-[11px] font-semibold cursor-not-allowed"><Mic className="w-3.5 h-3.5" />Голос</button>
                  </div>
                  <div className="text-[11px] text-muted-foreground mb-3">Скоро: загрузка файлов и голосовых заметок.</div>
                  <div className="space-y-2">
                    <input value={newMaterial.title} onChange={(e) => setNewMaterial((p) => ({ ...p, title: e.target.value }))} placeholder="Название материала" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-primary" />
                    <select value={newMaterial.type} onChange={(e) => setNewMaterial((p) => ({ ...p, type: e.target.value }))} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-primary">
                      {MATERIAL_TYPES.map((type) => <option key={type}>{type}</option>)}
                    </select>
                    <textarea value={newMaterial.content} onChange={(e) => setNewMaterial((p) => ({ ...p, content: e.target.value }))} placeholder="Вставьте текст, ссылку или заметку" className="w-full min-h-[92px] rounded-xl border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-primary" />
                    <button onClick={createMaterial} className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary/90">Добавить материал</button>
                  </div>
                  {sourceMaterials.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {sourceMaterials.slice(0, 5).map((material) => (
                        <div key={material.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/40">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="flex-1 truncate text-[11px] text-foreground">{material.title}</span>
                          {material.id && <button onClick={() => deleteSourceMaterial(material.id!)} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-3 h-3" /></button>}
                        </div>
                      ))}
                    </div>
                  )}
                </aside>
              </div>
            )}

            {module === "analyses" && (
              <div className="space-y-3">
                {analyses.map((analysis) => (
                  <div key={`${analysis.type}-${analysis.id || "template"}`} className="card-elevated p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[14px] font-semibold text-foreground">{analysis.title}</h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusStyle(analysis.status)}`}>{analysis.status}</span>
                      </div>
                      <p className="text-[12px] text-muted-foreground">{analysis.summary || "Анализ появится здесь после обработки."}</p>
                    </div>
                    <button onClick={() => toast({ title: "AI-анализ будет доступен позже", description: "В будущем здесь откроется сохраненный результат из ai_analyses.result." })} className="px-4 py-2 rounded-xl border border-border bg-card text-[13px] font-medium hover:bg-muted/50">
                      Открыть
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 card-elevated p-4">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-primary" />
                <h3 className="text-[13px] font-semibold text-foreground">Как это будет использоваться дальше</h3>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Распаковка личности дает ситуации, истории и голос для контента. Данные для анализа аудитории готовят будущий async-анализ ЦА и сегменты. После этого система сможет предлагать темы, прогревы, CTA и воронки на базе уже заполненного контекста.
              </p>
            </div>
          </main>

          {module === "personality" && activePersonality && (
            <div className="fixed inset-0 z-[80] flex items-start justify-center bg-foreground/35 px-3 py-4 md:py-8 backdrop-blur-sm">
              <PersonalityQuestionnaire
                key={activePersonality.id}
                block={activePersonality}
                answers={expertProfile.personalityAnswers}
                questionIndex={personalityQuestionIndex}
                onQuestionIndexChange={setPersonalityQuestionIndex}
                onSaveAnswer={savePersonalityAnswer}
                onBack={() => setPersonalityBlock(null)}
                onSaveAndExit={(key, value) => {
                  savePersonalityAnswer(key, value);
                  setPersonalityBlock(null);
                  toast({ title: "Сохранено", description: "Можно продолжить распаковку позже." });
                }}
                onComplete={() => {
                  const currentIndex = PERSONALITY_BLOCKS.findIndex((block) => block.id === activePersonality.id);
                  const nextIndex = currentIndex + 1;
                  toast({ title: "Блок сохранен", description: nextIndex < PERSONALITY_BLOCKS.length ? "Можно перейти к следующему блоку." : "Распаковка полностью пройдена." });
                  if (nextIndex < PERSONALITY_BLOCKS.length) {
                    setPersonalityBlock(PERSONALITY_BLOCKS[nextIndex].id);
                    setPersonalityQuestionIndex(firstEmptyQuestionIndex(PERSONALITY_BLOCKS[nextIndex]));
                  } else {
                    setPersonalityBlock(null);
                  }
                }}
              />
            </div>
          )}

          {module === "audience_inputs" && activeAudience && (
            <div className="fixed inset-0 z-[80] flex items-start justify-center bg-foreground/35 px-3 py-4 md:py-8 backdrop-blur-sm">
              <AudienceFactQuestionnaire
                key={activeAudience.id}
                block={activeAudience}
                answers={expertProfile[activeAudience.section]}
                questionIndex={audienceQuestionIndex}
                onQuestionIndexChange={setAudienceQuestionIndex}
                onSaveAnswer={(key, value) => saveAudienceFactAnswer(activeAudience, key, value)}
                onSaveAndExit={(key, value) => {
                  saveAudienceFactAnswer(activeAudience, key, value);
                  setAudienceBlock(null);
                  toast({ title: "Сохранено", description: "Можно продолжить фактуру для анализа позже." });
                }}
                onComplete={() => {
                  const currentIndex = AUDIENCE_INPUT_BLOCKS.findIndex((block) => block.id === activeAudience.id);
                  const nextIndex = currentIndex + 1;
                  toast({ title: "Блок сохранен", description: nextIndex < AUDIENCE_INPUT_BLOCKS.length ? "Можно перейти к следующему блоку." : "Фактура для анализа ЦА заполнена." });
                  if (nextIndex < AUDIENCE_INPUT_BLOCKS.length) {
                    setAudienceBlock(AUDIENCE_INPUT_BLOCKS[nextIndex].id);
                    setAudienceQuestionIndex(firstEmptyAudienceQuestionIndex(AUDIENCE_INPUT_BLOCKS[nextIndex]));
                  } else {
                    setAudienceBlock(null);
                  }
                }}
              />
            </div>
          )}
        </div>

        <MobileHeader />
        <MobileNav />
      </div>
    </SidebarProvider>
  );
}
