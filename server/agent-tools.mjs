import { z } from 'zod';

const id = z.number().int().positive();
const short = z.string().max(500);
const long = z.string().max(50000);
const link = z.string().max(4000);
const date = z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/);
const revisions = z.object({ main: z.string(), publications: z.string() }).strict();
const write = { requestId: z.string().uuid().describe('Новый UUID для нового действия; при повторе того же запроса используйте тот же UUID.'), revisions };
const blocks = z.array(z.object({ id: z.string().max(100).optional(), label: short.optional(), text: long, visual: long.optional(), motion: long.optional() }).strict()).max(100);
const assets = z.array(z.object({ id: z.string().max(100).optional(), label: short.optional(), url: link, kind: z.enum(['video','carousel','folder','other']).optional(), downloadUrl: link.optional() }).strict()).max(30);
const script = { title: short.optional(), body: long.optional(), blocks: blocks.optional(), visual: long.optional(), motion: long.optional(), resources: long.optional(), cta: long.optional(), assets: assets.optional(), productId: id.nullable().optional(), funnelId: z.string().max(100).nullable().optional(), funnelRole: z.enum(['entry','support','delivery']).optional(), status: z.enum(['in_progress','ready']).optional() };

export const agentTools = {
  karta_overview: { scope: 'read', description: 'Профиль подключения, количество материалов, форматы и текущие revisions для записи.', schema: z.object({}).strict() },
  karta_list: { scope: 'read', description: 'Список идей, постов, продуктов, воронок, календаря или фокусов. Постраничный поиск; полные тексты через karta_get.', schema: z.object({ kind: z.enum(['ideas','posts','products','funnels','calendar','focus']), query: short.optional(), offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(100).default(30), date: date.optional(), funnelId: z.string().optional(), platformId: z.string().optional() }).strict() },
  karta_get: { scope: 'read', description: 'Полный материал с текстом, экранами, ссылками и историей; контекст эксперта; текущие версии main/publications.', schema: z.object({ kind: z.enum(['idea','post','product','funnel','context']), id: z.union([id,z.string().max(100)]).optional() }).strict() },
  karta_save_idea: { scope: 'content', description: 'Создать или исправить идею; archived=true убирает её в архив. Новые материалы не удаляют прежние.', schema: z.object({ ...write, id: id.optional(), title: short.optional(), thesisPlan: long.optional(), source: z.string().max(2000).optional(), sourceKey: short.optional(), formatIds: z.array(z.string()).max(30).optional(), tags: z.array(z.string().max(80)).max(20).optional(), productId: id.nullable().optional(), archived: z.boolean().optional() }).strict() },
  karta_create_post: { scope: 'content', description: 'Атомарно создать заполненный пост/сценарий в существующей или новой идее. Доступные platformId: reels, carousel, tg_post, stories, threads, youtube, ig_post, article, vk. Сохраняется черновик.', schema: z.object({ ...write, ...script, title: short.min(1), ideaId: id.optional(), ideaTitle: short.optional(), platformId: z.enum(['reels','carousel','tg_post','stories','threads','youtube','ig_post','article','vk']) }).strict() },
  karta_update_post: { scope: 'content', description: 'Правки текста, экранов, CTA, готовых файлов и связей поста. Передаются только изменяемые поля. Зафиксированные опубликованные экраны защищены.', schema: z.object({ ...write, ...script, id, replaceFunnelLinks: z.boolean().optional() }).strict() },
  karta_schedule_post: { scope: 'planning', description: 'Поставить пост в календарь или снять дату (пустая строка). Это планирование, не отправка и не утверждение публикации.', schema: z.object({ ...write, id, date }).strict() },
  karta_save_product: { scope: 'products', description: 'Создать/исправить продукт: название, тип, формат, цена, ссылка и описание. status=archived сохраняет продукт в архиве.', schema: z.object({ ...write, id: id.optional(), name: short.optional(), typeId: z.string().max(100).optional(), format: z.string().max(200).optional(), price: z.string().max(100).optional(), currency: z.string().max(20).optional(), description: long.optional(), link: link.optional(), status: z.enum(['draft','active','paused','archived']).optional(), publishDate: date.optional() }).strict() },
  karta_save_funnel: { scope: 'funnels', description: 'Создать/исправить воронку, CTA, кодовое слово, продукты по этапам и связанные посты. active=false приостанавливает воронку.', schema: z.object({ ...write, id: z.string().max(100).optional(), keyword: z.string().max(100).optional(), cta: z.string().max(3000).optional(), active: z.boolean().optional(), badgeColor: z.enum(['violet','amber','honey','lilac']).optional(), contentItemIds: z.array(id).max(3000).optional(), leadMagnetId: id.nullable().optional(), tripwireId: id.nullable().optional(), midTicketId: id.nullable().optional(), flagshipId: id.nullable().optional(), consultationId: id.nullable().optional(), route: z.array(z.object({ id:z.string().max(100).optional(),label:z.string().max(250),url:link.optional(),note:z.string().max(2000).optional() }).strict()).max(20).optional() }).strict() },
  karta_save_focus: { scope: 'planning', description: 'Установить фокус недели/дня с целью, продуктом и воронкой; clear=true сбрасывает переопределение.', schema: z.object({ ...write, date, scope: z.enum(['week','day']), goal: z.string().max(1000).optional(), productId: id.nullable().optional(), funnelId: z.string().nullable().optional(), clear: z.boolean().optional() }).strict() },
  karta_save_variants: { scope: 'planning', description: 'Объединить альтернативы одного формата в место плана. Не утверждает и не выбирает пост за владельца.', schema: z.object({ ...write, id:z.string().max(100).optional(), title:short, variantIds:z.array(id).min(1).max(100), recommendedId:id.optional(), reason:z.string().max(3000).optional(), date:date.optional() }).strict() },
  karta_save_metrics: { scope: 'content', description: 'Внести фактические результаты поста. Числа не вычисляются и не придумываются агентом.', schema: z.object({ ...write, id, metrics:z.object({ reach:z.number().int().min(0).optional(),responses:z.number().int().min(0).optional(),leads:z.number().int().min(0).optional(),sales:z.number().int().min(0).optional(),publishedDate:date.optional(),url:link.optional() }).strict() }).strict() },
};

export function registerAgentTools(server, execute) {
  for (const [name, tool] of Object.entries(agentTools)) server.registerTool(name, {
    description: tool.description, inputSchema: tool.schema.shape,
    annotations: { readOnlyHint: tool.scope === 'read', destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async input => {
    try { const result = await execute(name, tool.schema.parse(input)); return { content:[{type:'text',text:JSON.stringify(result)}] }; }
    catch (error) { return { isError:true,content:[{type:'text',text:JSON.stringify({message:error.status?error.message:'Не удалось выполнить действие. Проверьте соединение.',status:error.status||500})}] }; }
  });
}
