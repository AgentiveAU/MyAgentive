# Suggested Commands

## Development
```bash
# Install dependencies
bun install

# Run development (server + client with hot reload)
bun run dev

# Run server only
bun run dev:server

# Run client only (Vite on port 5173)
bun run dev:client

# Start production server
bun run start
```

## Building
```bash
# Build frontend
bun run build

# Build standalone binary (macOS)
bun run build:binary

# Build standalone binary (Linux)
bun run build:binary:linux
```

## Database
```bash
# Run database migrations
bun run db:migrate
```

## Skills Setup
```bash
# Setup Python virtual environment for skills
bun run setup:skills
```

## System Commands (Darwin/macOS)
```bash
# Git operations
git status
git diff
git add .
git commit -m "message"
git push

# File system
ls -la
find . -name "*.ts"
grep -r "pattern" .
```
