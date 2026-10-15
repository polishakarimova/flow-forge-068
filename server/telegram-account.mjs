import { randomBytes } from 'node:crypto';

// Caller supplies an interactive transaction: failures must not leave half-created users.
export async function saveTelegramAccount(tx, telegramUser, legacyId) {
  const telegramId = String(telegramUser.id);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${telegramId}, 0))`;
  const account = await tx.telegramAccount.findUnique({ where: { telegramId } });
  const identityKey = { provider: 'TELEGRAM', providerUserId: telegramId };
  const identity = await tx.authIdentity.findUnique({ where: { provider_providerUserId: identityKey } });
  if (account && identity && account.userId !== identity.userId) throw new Error('telegram_identity_conflict');
  const userId = account?.userId || identity?.userId || legacyId || randomBytes(16).toString('hex');
  const displayName = [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ').trim() || telegramUser.username || `Telegram ${telegramId}`;
  const user = await tx.user.upsert({
    where: { id: userId },
    update: { displayName, avatarUrl: telegramUser.photo_url || undefined },
    create: { id: userId, displayName, avatarUrl: telegramUser.photo_url || undefined },
  });
  await tx.authIdentity.upsert({
    where: { provider_providerUserId: identityKey },
    update: {}, create: { ...identityKey, userId },
  });
  const details = { username: telegramUser.username || null, firstName: telegramUser.first_name || null, lastName: telegramUser.last_name || null, photoUrl: telegramUser.photo_url || null, languageCode: telegramUser.language_code || null };
  await tx.telegramAccount.upsert({ where: { telegramId }, update: details, create: { ...details, telegramId, userId } });
  const code = randomBytes(12).toString('hex');
  const newUser = !account && !identity && !legacyId;
  await tx.$executeRaw`insert into cm_referral_accounts(user_id,code,new_user) values(${userId},${code},${newUser}) on conflict(user_id) do nothing`;
  return { ...user, telegramId, telegramUsername: telegramUser.username ? `@${telegramUser.username}` : '' };
}
