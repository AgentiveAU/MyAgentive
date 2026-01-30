# Pre-Push Checklist

Run through this checklist before every commit/push. Focus only on **changed code**.

---

## 1. Build Check

- [ ] `bun install` succeeds (if dependencies changed)
- [ ] `bun run build` succeeds without errors
- [ ] Server starts without crashes: `bun run dev:server`

---

## 2. Code Review (Diff Only)

Review `git diff` for these common issues in **new/changed code only**:

### Hardcoded Values
- [ ] No hardcoded paths (`/home/username`, `/Users/username`, absolute paths)
- [ ] No hardcoded secrets, API keys, or tokens
- [ ] No hardcoded port numbers (use config)
- [ ] No hardcoded URLs that should be configurable

### Edge Cases
- [ ] Empty string inputs handled (don't send empty content to APIs)
- [ ] Null/undefined inputs handled
- [ ] Missing optional parameters handled
- [ ] Array bounds checked where applicable

### Runtime vs Compile-time
- [ ] Module-level constants don't evaluate environment variables at import time
- [ ] Use getter functions for values that depend on runtime environment
- [ ] No side effects at module load time

### Code Quality
- [ ] No `console.log` debugging statements left in
- [ ] No commented-out code blocks
- [ ] No TODO comments for things that should be done now
- [ ] Error messages are user-friendly (no raw stack traces to users)

### Security
- [ ] No SQL injection vulnerabilities (use parameterised queries)
- [ ] No path traversal vulnerabilities (validate file paths)
- [ ] No XSS vulnerabilities (sanitise user input in UI)
- [ ] Sensitive data not logged

---

## 3. Quick Smoke Test (Changed Features Only)

Test only what you changed:

| If You Changed... | Quick Test |
|-------------------|------------|
| Authentication | Login, logout works |
| Session management | Create, switch, delete session |
| Chat/messaging | Send message, get response |
| File uploads | Upload a file, AI can see it |
| Telegram bot | Send a message via Telegram |
| Database/migrations | Fresh DB works, existing DB migrates |
| Config handling | App starts with minimal config |
| WebSocket | Real-time updates work |
| UI components | Visual check, no console errors |

---

## 4. Regression Sanity Check

If your change touched core systems, do a 30-second check:

- [ ] Can send a message and get AI response (web)
- [ ] Server doesn't crash after a few interactions

---

## How to Use

Before committing, ask Claude:

```
Review this diff for the pre-push checklist:
- Any hardcoded paths?
- Any empty/null edge cases?
- Any compile-time vs runtime issues?
- What should I quick-test?
```

Then run the quick smoke test for affected features.

---

## Note

This is NOT a full test. Full testing happens before releases (see PRE-RELEASE-CHECKLIST.md).
