# Code Style and Conventions

## Language
- Use **Australian English** spelling in all documentation and code comments
- Never use em dash (—), use alternatives like comma, colon, semicolon, or new sentences

## TypeScript
- ES2022 target with ESNext modules
- Strict mode enabled
- Use `.ts` for server code, `.tsx` for React components
- Path alias: `@/*` maps to `./client/*`

## Naming Conventions
- Files: kebab-case (e.g., `session-manager.ts`, `media-handler.ts`)
- Components: PascalCase (e.g., `ChatWindow.tsx`, `MessageList.tsx`)
- Functions/variables: camelCase

## Project Structure
- Server code in `server/`
- Client code in `client/`
- Database migrations in `server/db/migrations/`
- UI components use shadcn/ui pattern in `client/components/ui/`

## Agent Identity
- The agent identifies as "MyAgentive" built by Agentive
- Never identify as "Claude" or "Anthropic"
- Brand: MyAgentive (product by Agentive)

## Git/GitHub
- Do not use traces of Claude Code or Anthropic in commits/PRs
- Instead use: "By Agentive www.agentive.au"
