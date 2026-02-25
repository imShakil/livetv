# BD IPTV

Static Next.js site that aggregates live channels from:

- Remote M3U8 playlist
- GitHub-managed custom channels JSON

## Setup

```bash
npm install
npm run build
npx serve@latest out
```

Use `.env.local` (see `.env.example`) for runtime variables like:

```bash
NEXT_PUBLIC_VISITORS_API=<visitor-count-api>
NEXT_PUBLIC_PLAYLIST_URL=<bdixtv-public-m3u8-playlist>
NEXT_PUBLIC_WORLD_PLAYLIST_URL=<world-iptv-m3u8-playlist>
```

## Docker Compose

```bash
docker compose --env-file .env.local up --build -d
```

This builds the static site in a Node stage and serves it from Nginx.
Then open `http://localhost:3000`.

Use Node `20.19.0+` to avoid engine warnings (`.nvmrc` included).

## Build

```bash
npm run build
```

The static site is exported to `out/` and deployed with GitHub Pages workflow.
If deployed under a subpath (example `/bdixtv`), set `NEXT_PUBLIC_BASE_PATH=/bdixtv` during build.

## Custom channel management

Edit `public/data/custom-channels.json` with entries like:

```json
{
  "id": "custom-1",
  "name": "Channel Name",
  "logo": "https://example.com/logo.png",
  "type": "m3u8",
  "source": "https://example.com/stream.m3u8",
  "category": "News",
  "language": "en"
}
```

Supported `type` values:

- `m3u8`
- `iframe` (URL or iframe snippet with `src`)
- `custom` (generic URL handled by React Player)

## Disclaimer

See [docs/disclaimer.md](docs/disclaimer.md).

## Observability (Static Hosting)

Because this is a static GitHub Pages site, there is no backend health endpoint by default.

Implemented client-side observability:

- Event logs in browser console (`[bdiptv:event]`)
- Basic metrics in browser console (`[bdiptv:metric]`)
- Recent telemetry stored in `localStorage` key: `bdiptv_telemetry`

## Realtime Visitor Count (Cloudflare Worker)

This project includes a client footer counter (`Online now (approx)`) that works with a free Cloudflare Worker + KV backend.

- Worker script: `cloudflare/visitor-counter-worker.js`
- Setup guide: [docs/cloudflare-visitors.md](docs/cloudflare-visitors.md)

Set `NEXT_PUBLIC_VISITORS_API` to your deployed worker URL during build/deploy.

## Live URL

The site is live at: [https://bdixtv.mhosen.com](https://bdixtv.mhosen.com)
