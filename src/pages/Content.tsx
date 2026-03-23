import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import {
  PLATFORMS,
  STATUSES,
  STATUS_ORDER,
  getEffectiveDate,
  formatDateLabel,
  initialTopics,
  type Topic,
  type ContentItemData,
  type ContentStatusKey,
} from "@/lib/contentData";
import { TopicRow } from "@/components/content/TopicRow";
import { ContentCard } from "@/components/content/ContentCard";
import { CreateTopicModal } from "@/components/content/CreateTopicModal";
import { ContentDetailModal } from "@/components/content/ContentDetailModal";
import { EditIdeaModal } from "@/components/content/EditIdeaModal";
import { ContentDropdown } from "@/components/content/ContentDropdown";
import { ContentMultiDropdown } from "@/components/content/ContentMultiDropdown";

type TabKey = "topics" | "content" | "ideas";

const Content = () => {
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true });
  const [editingContent, setEditingContent] = useState<ContentItemData | null>(null);
  const [editingTopicTitle, setEditingTopicTitle] = useState("");
  const [editingIdea, setEditingIdea] = useState<Topic | null>(null);
  const [tab, setTab] = useState<TabKey>("topics");
  const [platformFilters, setPlatformFilters] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

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
    if (statusFilter) arr = arr.filter((c) => c.status === statusFilter);
    arr.sort((a, b) => {
      const da = getEffectiveDate(a) || "0000";
      const db = getEffectiveDate(b) || "0000";
      if (da !== db) return db.localeCompare(da);
      return (STATUSES[b.status]?.priority || 0) - (STATUSES[a.status]?.priority || 0);
    });
    return arr;
  }, [allContent, platformFilters, statusFilter]);

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
    setTopics([{ id: newId, title, thesisPlan, isIdeaBank, contentItems }, ...topics]);
    if (!isIdeaBank) setExpandedTopics((p) => ({ ...p, [newId]: true }));
  };

  const handleSaveContent = (updated: ContentItemData) => {
    setTopics(topics.map((t) => ({
      ...t,
      contentItems: t.contentItems.map((ci) => (ci.id === updated.id ? updated : ci)),
    })));
  };

  const handleSaveIdea = (updated: Topic) => {
    setTopics(topics.map((t) => (t.id === updated.id ? { ...t, title: updated.title, thesisPlan: updated.thesisPlan } : t)));
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
    setTopics(topics.map((t) =>
      t.id === topicId ? { ...t, title, thesisPlan: plan, isIdeaBank: false, contentItems } : t
    ));
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
      value: p.id, label: p.label, icon: p.icon, count: counts[p.id],
    }));
  }, [allContent]);

  const statusOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    allContent.forEach((ci) => { counts[ci.status] = (counts[ci.status] || 0) + 1; });
    return STATUS_ORDER.filter((k) => counts[k]).map((k) => ({
      value: k, label: STATUSES[k].label, dot: STATUSES[k].color, count: counts[k],
    }));
  }, [allContent]);

  const hasFilters = platformFilters.length > 0 || statusFilter;

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: "topics", label: "Темы", count: activeTopics.length },
    { key: "content", label: "Контент", count: totalContent },
    { key: "ideas", label: "💡 Банк идей", count: ideas.length },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background font-['DM_Sans',system-ui,sans-serif]">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-50 bg-white border-b border-border">
            <div className="max-w-[1040px] mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between h-14">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="hidden md:flex" />
                  <span className="text-[13px] font-extrabold text-foreground tracking-widest">КАРТА КОНТЕНТА</span>
                </div>
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold cursor-pointer text-white border-none shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                >
                  <Plus className="w-4 h-4" />
                  Новая тема
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className="flex items-center gap-2 px-4 py-2.5 pb-3 text-[14px] font-semibold cursor-pointer bg-transparent border-none transition-all duration-200"
                    style={{
                      borderBottom: tab === t.key ? "2.5px solid #6366f1" : "2.5px solid transparent",
                      color: tab === t.key ? "#6366f1" : "#94a3b8",
                    }}
                  >
                    {t.label}
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-lg font-bold"
                      style={{
                        background: tab === t.key ? "#6366f1" : "#e8ecf1",
                        color: tab === t.key ? "#fff" : "#94a3b8",
                      }}
                    >
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 max-w-[1040px] w-full mx-auto py-3 px-4 md:px-6 pb-20 md:pb-6">
            {/* Topics tab */}
            {tab === "topics" && (
              <div>
                {activeTopics.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-[13px]">Пока нет тем с контентом</div>
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
                <div className="flex gap-3 mb-4 items-center">
                  <ContentMultiDropdown
                    values={platformFilters}
                    onChange={setPlatformFilters}
                    options={platformOptions}
                    placeholder="Все площадки"
                    width={220}
                  />
                  <ContentDropdown
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={statusOptions}
                    placeholder="Все статусы"
                    width={180}
                  />
                  {hasFilters && (
                    <button
                      onClick={() => { setPlatformFilters([]); setStatusFilter(null); }}
                      className="text-[12px] text-muted-foreground bg-transparent border-none cursor-pointer underline hover:text-foreground transition-colors"
                    >
                      Сбросить
                    </button>
                  )}
                  <span className="ml-auto text-[13px] text-muted-foreground">
                    {filteredContent.length} из {allContent.length}
                  </span>
                </div>

                {groupedContent.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-[14px]">Ничего не найдено</div>
                ) : (
                  groupedContent.map((g) => (
                    <div key={g.date}>
                      <div className="flex items-center gap-3 pt-4 pb-2">
                        <span className="text-[13px] font-bold text-slate-500">{g.label}</span>
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[12px] text-slate-400">{g.items.length}</span>
                      </div>
                      <div className="flex flex-col gap-1 mb-1">
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
                    <div key={topic.id} className="mb-1">
                      <div
                        onClick={() => setEditingIdea(topic)}
                        className="flex items-center gap-3 bg-[#fffdf5] rounded-xl px-4 py-3 cursor-pointer border border-amber-200 transition-all duration-200 hover:bg-amber-50 hover:shadow-sm"
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
