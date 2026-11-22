export function miniAppData(): string {
  return (window as Window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData || '';
}


export async function authRequest(path: string, body?: object) {
  const response = await fetch(path, {
    credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(20000),
    ...(body && { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'request_failed'), { status: response.status });
  return data;
}
