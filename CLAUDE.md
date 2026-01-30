# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MyAgentive is an open-source personal AI agent for power users, with Telegram and web interfaces, powered by the Claude Agent SDK. It runs on your laptop and uses Claude Code subscription or Anthropic API for AI capabilities.

**Website:** [MyAgentive.ai](https://MyAgentive.ai) | **Parent Company:** [Agentive](https://TheAgentiveGroup.com)

## Development Commands

```bash
# Install dependencies
bun install

# Run development (server + client with hot reload)
bun run dev

# Run server only
bun run dev:server

# Run client only
bun run dev:client

# Build frontend
bun run build

# Build standalone binary (macOS)
bun run build:binary

# Build standalone binary (Linux)
bun run build:binary:linux

# Run database migrations
bun run db:migrate
```

## Architecture

### Runtime
- Uses **Bun** runtime (not Node.js/tsx) for server execution
- Uses **bun:sqlite** for database (not better-sqlite3)
- Frontend uses Vite dev server with React

### Core Components

**Session Manager** (`server/core/session-manager.ts`)
- Central orchestrator managing all chat sessions
- Maintains active `AgentSession` instances per named session
- Handles WebSocket client subscriptions and message routing
- Emits activity events for monitoring

**AI Client** (`server/core/ai-client.ts`)
- Wraps Claude Agent SDK's `query()` function
- Uses async `MessageQueue` for multi-turn conversations
- Supports runtime model switching (opus/sonnet/haiku)

**Server** (`server/server.ts`)
- Express server with REST API and WebSocket upgrade
- Serves built frontend in production
- WebSocket handles real-time chat and streaming responses

### Interfaces

**Web** (`client/`)
- React + Tailwind CSS
- WebSocket connection for real-time updates
- Session-based authentication via cookies

**Telegram** (`server/telegram/`)
- Grammy bot framework
- Auth middleware restricts to configured user ID
- Handlers for commands, messages, and media uploads
- Activity monitoring sends events to a Telegram group

### Data Layer

**Database** (`server/db/`)
- SQLite with WAL mode
- Repositories: `session-repo.ts`, `message-repo.ts`
- Migrations in `server/db/migrations/`

## Key Patterns

- Sessions are identified by name (e.g., "default", "project-x")
- Messages persist to SQLite; sessions survive restarts
- WebSocket clients subscribe to sessions and receive all output
- Telegram and web share the same session namespace

## Environment Variables

Required in `.env`:
- `TELEGRAM_BOT_TOKEN` - From @BotFather
- `TELEGRAM_USER_ID` - Your Telegram user ID
- `WEB_PASSWORD` - For web interface login

Optional:
- `ANTHROPIC_API_KEY` - Leave empty to use Claude Code subscription
- `TELEGRAM_MONITORING_GROUP_ID` - For activity logging
- `PORT` - Server port (default: 3847)

## Branching and Releases

- **Never push directly to `main`.** Always use feature branches and PRs.
- Two release channels: **stable** (`main`) and **testing** (`next`).
- Feature branches merge into `next` for testing, then `next` merges into `main` for stable release.
- Testing releases use prerelease versions (e.g., `v0.7.0-beta.1`) with `gh release create --prerelease`.
- See `docs/RELEASE.md` for the full release process.

## Quality Checklists (MANDATORY)

### Before Every Commit

**You MUST complete these checks before any commit.** Review `git diff` for issues in changed code only:

1. **Check for hardcoded paths** - Search diff for `/home/`, `/Users/`, or absolute paths
2. **Check for edge cases** - Verify empty strings, null, undefined are handled in new code
3. **Check for runtime issues** - Module-level constants must not evaluate env vars at import time
4. **Check for mistakes** - No secrets, no `console.log`, no commented-out code
5. **Verify build works** - Run `bun run build` before committing
6. **Report findings** - Tell the user what you checked and any issues found

If any issues are found, fix them before committing. See `docs/PRE-PUSH-CHECKLIST.md` for full details.

### Before Releases (Beta or Stable)

**You MUST remind the user to complete the pre-release checklist.** Before tagging any release:

1. Tell the user: "Before releasing, please run through `docs/PRE-RELEASE-CHECKLIST.md`"
2. Key items that catch common bugs:
   - Test the binary on a **different user account** (catches hardcoded paths)
   - Test with a **fresh database** (catches migration issues)
   - Test **empty message** edge case (catches API errors)
3. Only proceed with release after user confirms testing is complete

## Style Notes

- Use Australian English spelling
- Brand name is "MyAgentive" (product by Agentive)

## Agent Identity

The MyAgentive agent must identify as "MyAgentive" built by Agentive, NOT as "Claude" or "Anthropic". The system prompt in `server/core/ai-client.ts` establishes its identity