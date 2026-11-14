// Shift Terakhir — Worker: static assets + /api/gemini proxy.
// Semua path selain /api/gemini dilayani dari aset statis (index.html dkk).
// API key Gemini TIDAK PERNAH ada di kode: dibaca dari secret env GEMINI_API_KEY.

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

async function handleGemini(request, env) {
  if (!env.GEMINI_API_KEY) return json({ error: 'GEMINI_API_KEY belum diset di server.' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Body bukan JSON.' }, 400); }

  const text = String(body.text || '').slice(0, 500).trim();
  if (!text) return json({ error: 'Pesan kosong.' }, 400);
  const speaker = String(body.speaker || 'Dita · Admin').slice(0, 40);
  const ctx = (body.ctx && typeof body.ctx === 'object') ? body.ctx : {};
  const chapter = ctx.chapter === 2 ? 2 : 1;
  const clock = String(ctx.clock || '23:5x').slice(0, 8);
  const scene = String(ctx.scene || 'di tengah percakapan grup kantor').slice(0, 200);
  const trust = (typeof ctx.trust === 'number') ? Math.max(0, Math.min(10, ctx.trust)) : null;
  const player = String(ctx.player || '').replace(/[<>\n]/g, '').slice(0, 24);

  const system = [
    `Kamu adalah ${speaker}, karakter dalam game horor chat berbahasa Indonesia "Shift Terakhir".`,
    `Situasi: Bab ${chapter}, jam ${clock} — ${scene}. Pemain adalah pegawai shift malam yang sedang chatting denganmu lewat grup kantor.`,
    trust !== null ? `Tingkat kepercayaan kelompok pada pemain saat ini: ${trust}/10. Sesuaikan kehangatan/kecurigaanmu dengan angka itu.` : '',
    player ? `Nama pemain: ${player}. Sesekali sapa dia dengan nama itu secara natural, jangan di setiap balasan.` : '',
    'Balas pesan pemain berikut sebagai chat biasa: 1-2 kalimat pendek, gaya chat WhatsApp santai tapi tegang, bahasa Indonesia informal.',
    'ATURAN KERAS: jangan mengubah lokasi siapa pun, jangan memutuskan ending, jangan membunuh atau menghilangkan karakter, jangan menciptakan kejadian besar baru, jangan mengaku bahwa kamu AI.',
    'Akhiri balasanmu dengan satu pertanyaan atau konfirmasi singkat yang mendorong pemain memilih salah satu jawaban yang tersedia.'
  ].filter(Boolean).join('\n');

  const model = /^[a-zA-Z0-9._-]{3,60}$/.test(String(env.GEMINI_MODEL || '')) ? String(env.GEMINI_MODEL) : 'gemini-flash-lite-latest';

  let upstream;
  try {
    upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text }] }],
          generationConfig: { temperature: 0.9, topP: 0.95, maxOutputTokens: 180 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
          ]
        })
      }
    );
  } catch { return json({ error: 'Gagal menghubungi Gemini.' }, 502); }

  if (!upstream.ok) return json({ error: 'Gemini menolak permintaan.' }, 502);
  let data;
  try { data = await upstream.json(); } catch { return json({ error: 'Respons Gemini tidak valid.' }, 502); }
  const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
  const reply = Array.isArray(parts) ? parts.map(p => p.text || '').join('').trim() : '';
  if (!reply) return json({ error: 'Gemini tidak membalas.' }, 502);
  return json({ reply: reply.slice(0, 400) });
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function syncAuth(request) {
  const id = request.headers.get('X-Sync-Id') || '';
  const key = request.headers.get('X-Sync-Key') || '';
  if (!/^[A-Za-z0-9-]{16,64}$/.test(id) || key.length < 16 || key.length > 128) return null;
  return { id, key };
}

const SCHEMA_SQL = 'CREATE TABLE IF NOT EXISTS saves (player_id TEXT PRIMARY KEY, key_hash TEXT NOT NULL, save TEXT NOT NULL, updated_at INTEGER NOT NULL)';
let schemaReady = false;
async function withTable(env, fn) {
  try { return await fn(); }
  catch (e) {
    if (!schemaReady && /no such table/i.test(String(e && e.message || e))) {
      await env.DB.prepare(SCHEMA_SQL).run();
      schemaReady = true;
      return await fn();
    }
    throw e;
  }
}

async function handleSync(request, env) {
  if (!env.DB) return json({ error: 'Sinkronisasi belum aktif di server.' }, 503);
  const auth = syncAuth(request);
  if (!auth) return json({ error: 'Identitas sinkron tidak valid.' }, 401);
  const keyHash = await sha256Hex(auth.key);
  try { return await handleSyncInner(request, env, auth, keyHash); }
  catch { return json({ error: 'Database error.' }, 500); }
}

async function handleSyncInner(request, env, auth, keyHash) {

  if (request.method === 'GET') {
    const row = await withTable(env, () => env.DB.prepare('SELECT save, updated_at, key_hash FROM saves WHERE player_id = ?').bind(auth.id).first());
    if (!row) return json({ save: null, updatedAt: 0 });
    if (row.key_hash !== undefined && row.key_hash !== keyHash) return json({ error: 'Kunci tidak cocok.' }, 403);
    let save = null;
    try { save = JSON.parse(row.save); } catch { save = null; }
    return json({ save, updatedAt: row.updated_at || 0 });
  }

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Body bukan JSON.' }, 400); }
    if (!body || typeof body !== 'object' || !body.save || typeof body.save !== 'object') return json({ error: 'Save tidak valid.' }, 400);
    const raw = JSON.stringify(body.save);
    if (raw.length > 600000) return json({ error: 'Save terlalu besar.' }, 413);
    const updatedAt = Date.now();
    await withTable(env, () => env.DB.prepare('INSERT INTO saves (player_id, key_hash, save, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(player_id) DO UPDATE SET save = excluded.save, updated_at = excluded.updated_at WHERE saves.key_hash = excluded.key_hash')
      .bind(auth.id, keyHash, raw, updatedAt).run());
    const check = await env.DB.prepare('SELECT key_hash FROM saves WHERE player_id = ?').bind(auth.id).first();
    if (!check || check.key_hash !== keyHash) return json({ error: 'Kunci tidak cocok.' }, 403);
    return json({ ok: true, updatedAt });
  }

  if (request.method === 'DELETE') {
    await withTable(env, () => env.DB.prepare('DELETE FROM saves WHERE player_id = ? AND key_hash = ?').bind(auth.id, keyHash).run());
    return json({ ok: true });
  }

  return json({ error: 'Method tidak diizinkan.' }, 405);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/gemini') {
      if (request.method !== 'POST') return json({ error: 'Method tidak diizinkan.' }, 405);
      return handleGemini(request, env);
    }
    if (url.pathname === '/api/sync') return handleSync(request, env);
    return env.ASSETS.fetch(request);
  }
};
