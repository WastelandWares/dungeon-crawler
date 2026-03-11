# Turtles — Dungeon Crawler

A D&D 3.5e-inspired web dungeon crawler with raycasting, procedural dungeons, and a hub town.

## Quick Start

```bash
npm install
npm run dev        # Vite dev server
npm run build      # Production build → dist/
```

## Project Structure

```
src/
├── engine/        # Raycasting renderer, pixel buffer, textures
├── game/          # Core game logic, entities, combat, loot
├── systems/       # Trigger system, bounty board, quests
├── ui/            # HUD, inventory, character sheet, shop, menus
├── content/       # Markdown content packs (monsters, items)
├── css/           # Stylesheets
├── public/        # Static assets
├── config.js      # Game constants and tuning
├── utils.js       # Shared utility functions
├── main.js        # Entry point
├── index.html     # Game page
├── changelog.html # In-game changelog
└── scoreboard.html
```

## Tech Stack

- **Renderer:** Canvas 2D raycasting with ImageData pixel buffer
- **Build:** Vite 6
- **Runtime:** Vanilla ES modules, zero frameworks
- **Audio:** Web Audio API for SFX
- **Storage:** localStorage for save/load

## CI/CD Pipeline

Two GitHub Actions workflows automate deployment via SSH + rsync:

| Workflow | Trigger | Target | URL |
|----------|---------|--------|-----|
| `deploy-dev.yml` | Push to `_dev` | `/var/www/turtles-dev/` | https://dev.turtles.wastelandwares.com |
| `deploy-prod.yml` | Push to `main` | `/var/www/turtles/` | https://turtles.wastelandwares.com |

**Build steps:** checkout → Node 20 + npm ci → `npx vite build` → rsync `dist/` to server.

**Required GitHub Secrets:**
- `DEPLOY_SSH_KEY` — Private SSH key for the deploy user
- `DEPLOY_SSH_HOST` — Hostname of the deployment server
- `DEPLOY_SSH_USER` — SSH username on the server

See [DEPLOYMENT.md](DEPLOYMENT.md) for full setup instructions.

## Branch Strategy

- `main` — production (auto-deploys on push)
- `_dev` — integration branch (auto-deploys on push)
- `feat/*`, `fix/*` — feature/fix branches, PR into `_dev`

## Commit Conventions

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `infra:` infrastructure/tooling
- `refactor:` code restructuring
- `test:` test additions/changes
- `chore:` maintenance tasks
