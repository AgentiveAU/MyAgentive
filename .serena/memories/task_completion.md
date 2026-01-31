# Task Completion Checklist

When completing a task, ensure:

## Before Committing
1. Code compiles without errors: `bun run build`
2. Server starts without errors: `bun run start` (quick check)
3. No TypeScript errors in modified files

## Code Quality
- Follow existing code patterns in the codebase
- Use Australian English in comments and documentation
- Avoid introducing security vulnerabilities (OWASP top 10)

## Git Commits
- Use descriptive commit messages
- Do NOT include Claude/Anthropic traces
- Sign with: "By Agentive www.agentive.au"

## No Linting/Formatting Tools
This project does not have explicit ESLint or Prettier configuration. Follow existing code style by example.
