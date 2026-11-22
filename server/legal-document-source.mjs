import {createHash} from 'node:crypto';

// A Google copy can be edited or restricted after publication. Always keep the accepted edition available.
const edition = '2026-11-22';
const copies = new Map([
  ['terms', {fileId: '1mQdv30uZ3PebzjH7bVb5KeuEjAE01uq9jKXiDXwbxBE', digest: '9b4450b73ea6d1d4db45de6e5cfd370de1ce75c764338350b038b81f512a72c7'}],
  ['privacy', {fileId: '1QT8LiW7AdWoyLLsLUDj4Tt7CgIIaTUteLSUMB6VeK50', digest: '1e0b8b3c7812891ec9da71701b8d55b18bc0d4d3793d6926bae6649cbfad7363'}],
  ['personal-data', {fileId: '1HqqXqL-CaLECkdQyv_jhyT2131eK0N9JY_r2j8n849A', digest: 'a3bfbaad405de857c23805e9fc1cd868dfea2a978585caf7d63c3a98bcc2a2e8'}],
  ['advertising', {fileId: '19tqlHACHxKbqJDqfvt-aGrNFS_xtnHZY2CwSAsVGxAE', digest: 'cfa0d48938bef5ec57a499ac180f4cd29dbb20236e2883b66904207f9f3df5df'}],
]);
const checks = new Map();

export async function documentSource(document, version, fetchDocument = fetch) {
  const copy = copies.get(document.id);
  if (version !== edition || !copy) return document.href;

  const base = 'https://docs.google.com/document/d/' + copy.fileId;
  async function check() {
    try {
      const response = await fetchDocument(base + '/export?format=txt', {signal: AbortSignal.timeout(3000)});
      if (response.ok && response.headers.get('content-type')?.startsWith('text/plain')) {
        const text = (await response.text()).trim().replace(/\s+/gu, ' ');
        if (createHash('sha256').update(text).digest('hex') === copy.digest) return base + '/preview';
      }
    } catch {
      // The dated file also works when Google is unreachable.
    }
    return document.href;
  }

  let cached = checks.get(document.id);
  if (!cached || cached.until <= Date.now()) {
    cached = {until: Date.now() + 60_000, result: check()};
    checks.set(document.id, cached);
  }
  return cached.result;
}
