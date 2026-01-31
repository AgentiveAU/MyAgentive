# MyAgentive Project Overview

## Purpose
MyAgentive is an open-source personal AI agent for power users with Telegram and web interfaces, powered by the Claude Agent SDK. It runs locally and uses Claude Code subscription or Anthropic API for AI capabilities.

## Tech Stack
- **Runtime:** Bun (not Node.js)
- **Database:** bun:sqlite with WAL mode
- **Backend:** Express server with WebSocket support
- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui components
- **Telegram:** Grammy bot framework
- **AI:** @anthropic-ai/claude-agent-sdk

## Key Architecture Components

### Server (`server/`)
- `server/index.ts` - Entry point
- `server/server.ts` - Express + WebSocket server
- `server/config.ts` - Configuration
- `server/core/session-manager.ts` - Central orchestrator for chat sessions
- `server/core/ai-client.ts` - Claude Agent SDK wrapper
- `server/telegram/bot.ts` - Telegram bot
- `server/db/database.ts` - SQLite database

### Client (`client/`)
- `client/App.tsx` - Main React app
- `client/components/` - React components
- `client/components/ui/` - shadcn/ui components
- `client/components/chat/` - Chat-specific components

## Environment Variables
Required:
- `TELEGRAM_BOT_TOKEN` - From @BotFather
- `TELEGRAM_USER_ID` - Your Telegram user ID
- `WEB_PASSWORD` - For web interface login

Optional:
- `ANTHROPIC_API_KEY` - Leave empty to use Claude Code subscription
- `TELEGRAM_MONITORING_GROUP_ID` - For activity logging
- `PORT` - Server port (default: 3847)
