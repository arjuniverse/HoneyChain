# 🐝 Honey Chain — KVIC Honey Traceability & Smart Beekeeping

AI + IoT + Blockchain + QR platform for rural beekeepers (Smart India Hackathon prototype).

## Run locally

Requires **Node.js ≥ 22** (uses the built-in `node:sqlite`, no PostgreSQL server needed).

```bash
# 1) Install everything (root + backend + frontend) — one time
npm run install:all

# 2) Run both servers together
npm run dev
```

That starts:

| Service  | URL                              |
| -------- | -------------------------------- |
| Frontend | http://localhost:5173            |
| Backend  | http://localhost:8787 (REST API) |

### Or run each server separately (two terminals)

```bash
# Terminal 1 — backend
node backend/src/server.js          # http://localhost:8787

# Terminal 2 — frontend
cd frontend
npm run dev                         # http://localhost:5173
```

> The frontend proxies `/api` → `http://localhost:8787` (see `frontend/vite.config.js`). The backend auto-seeds demo data and starts the IoT simulator on boot.

## Portals

- **Beekeeper dashboard** — `/beekeeper`
- **Guided 14-step demo** — `/beekeeper/flow`
- **Live hive detail** (charts, simulate, stress) — `/beekeeper/hives/:id`
- **Batches + traceability passport** — `/batches` and `/batch/HC-KA-2026-000127`
- **Lab quality module** — `/lab`
- **Consumer QR verification** — `/consumer`
- **KVIC Command Centre** — `/admin`
- **Marketplace** — `/market`
- **Voice assistant** (English / हिन्दी / ಕನ್ನಡ) — `/assistant`

Everything is live and stateful: simulated IoT telemetry streams every ~4s, AI alerts fire against real readings, and blockchain events are hash-chained in `backend/data/honeychain.db`.

## Useful commands

```bash
npm run build       # production build of the frontend
npm run dev:frontend
npm run dev:backend
```

**Reset demo data** — stop the servers, delete the DB, restart:

```bash
Remove-Item -Recurse -Force backend/data   # PowerShell
rm -rf backend/data                        # bash
```

## Presentation assets

- `HoneyChain-Architecture.html` / `.png` — 16:9 system architecture diagram for your SIH slide.

## Stock architecture note

The production diagram shows **Django REST Framework + PostgreSQL + Hyperledger Fabric**; this runnable prototype implements the same API surface with **Node + Express + node:sqlite + a hash-chained ledger**, so the demo works offline with zero services. The mobile beekeeper layer is offline-first via a local sync queue.