const diagnosticPages = new Set(['home','profile','legal','admin','calendar','context','products','map','dashboard','ideas','funnels','agents','content','publications','stories','settings']);
const allowedNames = new Set(['TypeError','RangeError','ReferenceError','SyntaxError','ChunkLoadError']);

export function startClientDiagnostics() {
  const originalFetch = window.fetch;
  const reported = new Map<string,number>();
  function report(reason: string, sourceLine = 0) {
    const section=window.location.pathname.split('/')[1];
    const page=diagnosticPages.has(section)?'/'+section:'/';
    const key = page+' '+reason+' '+sourceLine;
    if (Date.now()-(reported.get(key)||0)<60_000) return;
    reported.set(key,Date.now());
    void originalFetch.call(window,'/api/diagnostics/client',{method:'POST',credentials:'same-origin',keepalive:true,
      headers:{'Content-Type':'application/json'},body:JSON.stringify({reason,page,sourceLine})}).catch(()=>{});
  }
  const category = (value: unknown) => value instanceof Error && allowedNames.has(value.name) ? value.name : 'Error';
  const onError = (event: ErrorEvent) => { if (event.error) report(category(event.error),event.filename?.startsWith(location.origin+'/assets/') ? event.lineno : 0); };
  const onRejected = (event: PromiseRejectionEvent) => {
    if (event.reason instanceof Error && event.reason.name !== 'AbortError') report(category(event.reason));
  };
  window.addEventListener('error',onError);
  window.addEventListener('unhandledrejection',onRejected);
  window.fetch = async function(input,init) {
    try { return await originalFetch.call(window,input,init); }
    catch (error) {
      const url = new URL(input instanceof Request ? input.url : String(input),location.href);
      const signal = init?.signal || (input instanceof Request ? input.signal : null);
      if (url.origin===location.origin && url.pathname.startsWith('/api/') && !signal?.aborted && navigator.onLine) report('network');
      throw error;
    }
  };
  return () => {
    window.fetch=originalFetch;
    window.removeEventListener('error',onError);
    window.removeEventListener('unhandledrejection',onRejected);
  };
}
