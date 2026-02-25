/**
 * Cloudflare Worker + Durable Object for live visitor counting.
 *
 * Endpoints:
 * - POST /heartbeat  { id: string }
 * - GET  /online     -> { online: number, totalVisitors: number, windowSeconds: number }
 *
 * Required binding:
 * - VISITOR_COUNTER (Durable Object binding)
 *
 * Optional vars:
 * - ALLOWED_ORIGIN (default "*")
 * - VISITOR_TTL_SECONDS (default 180)
 */

function corsHeaders(env) {
  return {
    'access-control-allow-origin': env.ALLOWED_ORIGIN || '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'content-type': 'application/json; charset=utf-8'
  };
}

function json(data, status, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(env)
  });
}

function withCors(response, env) {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(env);
  for (const [key, value] of Object.entries(cors)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export class VisitorCounterDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.seenCache = new Set();
    this.active = new Map();
    this.totalVisitors = 0;
    this.initPromise = this.initialize();
  }

  async initialize() {
    const rawTotal = await this.state.storage.get('totalVisitors');
    const parsed = Number.parseInt(String(rawTotal || '0'), 10);
    this.totalVisitors = Number.isFinite(parsed) ? parsed : 0;
  }

  pruneActive(ttlMs) {
    const threshold = Date.now() - ttlMs;
    for (const [id, lastSeen] of this.active.entries()) {
      if (lastSeen < threshold) {
        this.active.delete(id);
      }
    }
  }

  async fetch(request) {
    await this.initPromise;

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const ttlSeconds = Number(this.env.VISITOR_TTL_SECONDS || 180);
    const ttlMs = Math.max(1, ttlSeconds) * 1000;

    if (path === '/heartbeat' && request.method === 'POST') {
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: 'invalid request body' }), { status: 400 });
      }

      const id = String(body?.id || '').trim();
      if (!id || id.length > 128) {
        return new Response(JSON.stringify({ ok: false, error: 'invalid visitor id' }), { status: 400 });
      }

      this.active.set(id, Date.now());
      this.pruneActive(ttlMs);

      if (!this.seenCache.has(id)) {
        const key = `seen:${id}`;
        const seenBefore = await this.state.storage.get(key);
        if (!seenBefore) {
          await this.state.storage.put(key, 1);
          this.totalVisitors += 1;
          await this.state.storage.put('totalVisitors', this.totalVisitors);
        }
        this.seenCache.add(id);
      }

      return new Response(JSON.stringify({ ok: true, totalVisitors: this.totalVisitors }), { status: 200 });
    }

    if (path === '/online' && request.method === 'GET') {
      this.pruneActive(ttlMs);
      return new Response(
        JSON.stringify({
          online: this.active.size,
          totalVisitors: this.totalVisitors,
          windowSeconds: ttlSeconds
        }),
        { status: 200 }
      );
    }

    return new Response(JSON.stringify({ ok: false, error: 'not found' }), { status: 404 });
  }
}

export default {
  async fetch(request, env) {
    if (!env?.VISITOR_COUNTER) {
      return json({ ok: false, error: 'Durable Object binding VISITOR_COUNTER is missing' }, 500, env);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    const id = env.VISITOR_COUNTER.idFromName('global');
    const stub = env.VISITOR_COUNTER.get(id);
    const response = await stub.fetch(request);
    return withCors(response, env);
  }
};
