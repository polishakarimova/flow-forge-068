import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav, MobileHeader } from "@/components/MobileNav";
import {
  PLATFORMS,
  STATUSES,
  STATUS_ORDER,
  getEffectiveDate,
  formatDateLabel,
  type Topic,
  type ContentItemData,
  type ContentStatusKey,
} from "@/lib/contentData";
import { useDataStore } from "@/lib/dataStore";
import { TopicRow } from "@/components/content/TopicRow";
import { ContentCard } from "@/components/content/ContentCard";
import { CreateTopicModal } from "@/components/content/CreateTopicModal";
import { ContentDetailModal } from "@/components/content/ContentDetailModal";
import { EditIdeaModal } from "@/components/content/EditIdeaModal";
import { ContentMultiDropdown } from "@/components/content/ContentMultiDropdown";

type TabKey = "topics" | "content" | "ideas";

const Content = () => {
  const { topics, addTopic, updateTopic, updateContentItem } = useDataStore();
  const [showCreate, setShowCreate] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true });
  const [editingContent, setEditingContent] = useState<ContentItemData | null>(null);
  const [editingTopicTitle, setEditingTopicTitle] = useState("");
  const [editingIdea, setEditingIdea] = useState<Topic | null>(null);
  const [tab, setTab] = useState<TabKey>("topics");
  const [platformFilters, setPlatformFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);

  // Derived data
  const allContent = useMemo(() => {
    const arr: (ContentItemData & { topicTitle: string; topicId: number })[] = [];
    topics.forEach((t) => {
      if (!t.isIdeaBank) {
        t.contentItems.forEach((ci) => arr.push({ ...ci, topicTitle: t.title, topicId: t.id }));
      }
    });
    return arr;
  }, [topics]);

  const filteredContent = useMemo(() => {
    let arr = allContent;
    if (platformFilters.length > 0) arr = arr.filter((c) => platformFilters.includes(c.platformId));
    if (statusFilters.length > 0) arr = arr.filter((c) => statusFilters.includes(c.status));
    arr.sort((a, b) => {
      const da = getEffectiveDate(a) || "0000";
      const db = getEffectiveDate(b) || "0000";
      if (da !== db) return db.localeCompare(da);
      return (STATUSES[b.status]?.priority || 0) - (STATUSES[a.status]?.priority || 0);
    });
    return arr;
  }, [allContent, platformFilters, statusFilters]);

  const groupedContent = useMemo(() => {
    const groups: { date: string; label: string; items: typeof filteredContent }[] = [];
    let currentDate: string | null = null;
    filteredContent.forEach((ci) => {
      const d = getEffectiveDate(ci) || "";
      if (d !== currentDate) {
        currentDate = d;
        groups.push({ date: d, label: formatDateLabel(d), items: [] });
      }
      groups[groups.length - 1].items.push(ci);
    });
    return groups;
  }, [filteredContent]);

  // Handlers
  const handleCreate = ({ title, thesisPlan, isIdeaBank, platforms }: { title: string; thesisPlan: string; isIdeaBank: boolean; platforms: string[] }) => {
    const newId = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const contentItems: ContentItemData[] = platforms.map((pId, i) => ({
      id: newId * 100 + i,
      platformId: pId,
      status: "idea" as ContentStatusKey,
      title,
      body: "",
      createdDate: today,
      publishDate: "",
    }));
    addTopic({ title, thesisPlan, isIdeaBank, contentItems });
    if (!isIdeaBank) setExpandedTopics((p) => ({ ...p, [newId]: true }));
  };

  const handleSaveContent = (updated: ContentItemData) => {
    updateContentItem(updated);
  };

  const handleSaveIdea = (updated: Topic) => {
    updateTopic({ ...updated });
  };

  const handleRealizeIdea = (topicId: number, title: string, plan: string, platforms: string[]) => {
    const today = new Date().toISOString().slice(0, 10);
    const newId = Date.now();
    const contentItems: ContentItemData[] = platforms.map((pId, i) => ({
      id: newId * 100 + i,
      platformId: pId,
      status: "idea" as ContentStatusKey,
      title,
      body: "",
      createdDate: today,
      publishDate: "",
    }));
    const topic = topics.find((t) => t.id === topicId);
    if (topic) {
      updateTopic({ ...topic, title, thesisPlan: plan, isIdeaBank: false, contentItems });
    }
    setExpandedTopics((p) => ({ ...p, [topicId]: true }));
    setTab("topics");
  };

  const activeTopics = topics.filter((t) => !t.isIdeaBank);
  const ideas = topics.filter((t) => t.isIdeaBank);
  const totalContent = allContent.length;

  // Filter options
  const platformOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    allContent.forEach((ci) => { counts[ci.platformId] = (counts[ci.platformId] || 0) + 1; });
    return PLATFORMS.filter((p) => counts[p.id]).map((p) => ({
      value: p.id, label: p.label, platformId: p.id, count: counts[p.id],
    }));
  }, [allContent]);

  const statusOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    allContent.forEach((ci) => { counts[ci.status] = (counts[ci.status] || 0) + 1; });
    return STATUS_ORDER.filter((k) => counts[k]).map((k) => ({
      value: k, label: STATUSES[k].label, dot: STATUSES[k].color, count: counts[k],
    }));
  }, [allContent]);

  const hasFilters = platformFilters.length > 0 || statusFilters.length > 0;

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: "topics", label: "Темы", count: activeTopics.length },
    { key: "content", label: "Контент", count: totalContent },
    { key: "ideas", label: "💡 Банк идей", count: ideas.length },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0 pt-10 md:pt-0">
          {/* Header */}
          <header className="sticky top-0 z-50 surface-glass border-b border-border">
            <div className="w-full px-4 md:px-6 max-w-[1400px] mx-auto">
              <div className="flex items-center justify-between h-14 md:h-16">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="hidden md:flex" />
                  <div className="flex items-baseline gap-2">
                    <h1 className="text-[15px] md:text-base font-semibold text-foreground tracking-tight">
                      Контент
                    </h1>
                    <span className="text-[13px] text-muted-foreground">
                      / {TABS.find((t) => t.key === tab)?.label} ({TABS.find((t) => t.key === tab)?.count})
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Новая тема</span>
                </button>
              </div>

              {/* Tabs as filter pills */}
              <div className="flex items-center gap-1.5 pb-3 overflow-x-auto scrollbar-none">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                      tab === t.key
                        ? "violet-surface text-primary"
                        : "text-muted-foreground hover:text-foreground/70"
                    }`}
                  >
                    {t.label} ({t.count})
                  </button>
                ))}
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 w-full mx-auto py-5 md:py-6 px-4 md:px-6 pb-20 md:pb-6 max-w-[1400px]">
            {/* Topics tab */}
            {tab === "topics" && (
              <div>
                {activeTopics.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-[40px] mb-3">✏️</div>
                    <div className="text-[15px] font-semibold text-foreground mb-1">Добавьте первую тему</div>
                    <div className="text-[13px] text-muted-foreground mb-4 max-w-xs mx-auto">Создайте тему и добавляйте контент: посты, сторис, статьи для разных платформ</div>
                    <button
                      onClick={() => setShowCreate(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors border-none cursor-pointer"
                    >
                      + Создать тему
                    </button>
                  </div>
                ) : (
                  activeTopics.map((topic) => (
                    <TopicRow
                      key={topic.id}
                      topic={topic}
                      expanded={!!expandedTopics[topic.id]}
                      onToggle={() => setExpandedTopics((p) => ({ ...p, [topic.id]: !p[topic.id] }))}
                      onOpenContent={(ci) => { setEditingContent(ci); setEditingTopicTitle(topic.title); }}
                    />
                  ))
                )}
              </div>
            )}

            {/* Content tab */}
            {tab === "content" && (
              <div>
                <div className="flex gap-2 mb-3 items-center">
                  <ContentMultiDropdown
                    values={platformFilters}
                    onChange={setPlatformFilters}
                    options={platformOptions}
                    placeholder="Все площадки"
                    width={190}
                  />
                  <ContentMultiDropdown
                    values={statusFilters}
                    onChange={setStatusFilters}
                    options={statusOptions}
                    placeholder="Все статусы"
                    width={160}
                  />
                  {hasFilters && (
                    <button
                      onClick={() => { setPlatformFilters([]); setStatusFilters([]); }}
                      className="text-[12px] text-muted-foreground bg-transparent border-none cursor-pointer underline hover:text-foreground transition-colors"
                    >
                      Сбросить
                    </button>
                  )}
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {filteredContent.length} из {allContent.length}
                  </span>
                </div>

                {groupedContent.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-[40px] mb-3">📝</div>
                    <div className="text-[15px] font-semibold text-foreground mb-1">Контент пока пуст</div>
                    <div className="text-[13px] text-muted-foreground mb-4 max-w-xs mx-auto">Создайте тему на вкладке "Темы" и добавьте туда единицы контента</div>
                  </div>
                ) : (
                  groupedContent.map((g) => (
                    <div key={g.date}>
                      <div className="flex items-center gap-3 pt-3 pb-1.5">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{g.label}</span>
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[12px] text-muted-foreground">{g.items.length}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 mb-0.5">
                        {g.items.map((ci) => (
                          <ContentCard
                            key={ci.id}
                            item={ci}
                            topicTitle={ci.topicTitle}
                            showTopic
                            onOpen={(c) => { setEditingContent(c); setEditingTopicTitle(ci.topicTitle); }}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Ideas tab */}
            {tab === "ideas" && (
              <div>
                {ideas.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <div className="text-[28px] mb-1.5">💡</div>
                    <div className="text-[13px]">Банк идей пуст</div>
                  </div>
                ) : (
                  ideas.map((topic) => (
                    <div key={topic.id} className="mb-3">
                      <div
                        onClick={() => setEditingIdea(topic)}
                        className="card-elevated flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 border-l-[3px] border-l-amber-400 hover:bg-[hsl(var(--primary)/0.04)]"
                      >
                        <span className="text-[11px] bg-amber-200 px-2 py-0.5 rounded-lg font-bold text-amber-800">
                          💡
                        </span>
                        <span className="text-[14px] font-semibold text-foreground flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                          {topic.title}
                        </span>
                        <span className="text-[12px] text-muted-foreground">→</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </main>
        </div>

        <MobileHeader />
        <MobileNav />
      </div>

      {/* Modals */}
      {showCreate && <CreateTopicModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {editingContent && (
        <ContentDetailModal
          item={editingContent}
          topicTitle={editingTopicTitle}
          onClose={() => setEditingContent(null)}
          onSave={handleSaveContent}
          onTopicRename={(newTitle) => {
            const topic = topics.find((t) => t.contentItems.some((ci) => ci.id === editingContent.id));
            if (topic) { updateTopic({ ...topic, title: newTitle }); setEditingTopicTitle(newTitle); }
          }}
        />
      )}
      {editingIdea && (
        <EditIdeaModal
          topic={editingIdea}
          onClose={() => setEditingIdea(null)}
          onSave={handleSaveIdea}
          onRealize={handleRealizeIdea}
        />
      )}
    </SidebarProvider>
  );
};

export default Content;
