// Prisma 6 has different TLS parameters from node-postgres/libpq.
export function prismaDatabaseUrl(rawUrl,caPath=''){
 const parsed=new URL(rawUrl),mode=parsed.searchParams.get('sslmode');
 if(mode&&mode!=='disable'){
  parsed.searchParams.set('sslmode','require');
  parsed.searchParams.set('sslaccept','strict');
  parsed.searchParams.set('sslnegotiation','direct');
  if(caPath)parsed.searchParams.set('sslcert',caPath);
 }
 return parsed.toString();
}
