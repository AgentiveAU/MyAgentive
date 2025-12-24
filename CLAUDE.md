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

## Style Notes

- Use Australian English spelling
- Brand name is "MyAgentive" (product by Agentive)

## Agent Identity

The MyAgentive agent must identify as "MyAgentive" built by Agentive, NOT as "Claude" or "Anthropic". The system prompt in `server/core/ai-client.ts` establishes its identity