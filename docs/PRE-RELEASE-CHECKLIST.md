# Pre-Release Checklist

Use this checklist before tagging a release. This is a **full test**, not a quick check.

For quick checks before each commit, see `PRE-PUSH-CHECKLIST.md`.

---

## 1. Build & Startup

- [ ] `bun install` succeeds without errors
- [ ] `bun run build` succeeds without errors or warnings
- [ ] `bun run dev` starts server without crashes
- [ ] No errors in server console on startup
- [ ] Health endpoint responds: `curl http://localhost:3847/health`

---

## 2. Database

- [ ] Migrations run successfully on fresh database (delete existing DB and restart)
- [ ] Existing database migrates without data loss
- [ ] Database file created in correct location (`~/.myagentive/` or configured path)

---

## 3. Authentication

### Web
- [ ] Login page loads
- [ ] Correct password logs in successfully
- [ ] Wrong password shows error (not 500)
- [ ] Session persists after page refresh
- [ ] Logout works and redirects to login

### Telegram
- [ ] Bot responds to authorised user (your TELEGRAM_USER_ID)
- [ ] Bot ignores or rejects unauthorised users

### API
- [ ] API key authentication works for `/api/` endpoints
- [ ] Invalid API key returns 401 (not 500)

---

## 4. Web UI - Basic

- [ ] App loads without blank screen
- [ ] No console errors in browser DevTools
- [ ] Sidebar shows session list
- [ ] Can create new session
- [ ] Can switch between sessions
- [ ] Can rename a session
- [ ] Can archive a session
- [ ] Can unarchive a session
- [ ] Can delete an archived session
- [ ] Dark/light theme toggle works

---

## 5. Web UI - Chat

- [ ] Can send a text message
- [ ] AI responds (not stuck on "thinking")
- [ ] Response streams in real-time (not all at once)
- [ ] Message appears in chat history after refresh
- [ ] Empty message blocked or handled gracefully
- [ ] Very long messages handled properly
- [ ] Markdown renders correctly (bold, code blocks, lists)
- [ ] Code syntax highlighting works
- [ ] Copy code button works

---

## 6. Web UI - File Uploads

- [ ] Can attach an image via button
- [ ] Can attach a file via button
- [ ] Can drag-and-drop files into chat
- [ ] Can paste image from clipboard
- [ ] Upload progress indicator shows
- [ ] Attached files appear in message
- [ ] AI can see and reference uploaded files
- [ ] Large file upload (e.g. 10MB) works
- [ ] Rejected file types handled gracefully

---

## 7. Web UI - Search & Export

- [ ] Cmd/Ctrl+K opens search
- [ ] Search finds messages
- [ ] Can navigate between search results
- [ ] Export to Markdown works
- [ ] Export to JSON works
- [ ] Exported file contains correct content

---

## 8. Web UI - Mobile/Responsive

- [ ] App loads on mobile browser
- [ ] Chat is readable (not cut off)
- [ ] Can type and send messages
- [ ] Sidebar opens/closes properly
- [ ] No horizontal scroll issues

---

## 9. Telegram Bot - Commands

- [ ] `/help` shows command list
- [ ] `/session <name>` switches session
- [ ] `/new` creates new session
- [ ] `/new <name>` creates named session
- [ ] `/list` shows all sessions
- [ ] `/status` shows current session info
- [ ] `/model` shows current model
- [ ] `/model opus|sonnet|haiku` switches model
- [ ] `/usage` shows usage stats (if applicable)

---

## 10. Telegram Bot - Messaging

- [ ] Text message gets AI response
- [ ] Response streams (edits in place)
- [ ] Long responses don't get cut off
- [ ] Markdown formatting works (bold, code)
- [ ] Empty message handled gracefully
- [ ] Very long message handled properly

---

## 11. Telegram Bot - Media

- [ ] Can send a photo, AI can see it
- [ ] Can send a document, AI can access it
- [ ] Can send a voice message
- [ ] Voice message gets transcribed (if Deepgram configured)
- [ ] Transcription shown before AI response
- [ ] Can send video file
- [ ] AI-generated files are sent back to chat

---

## 12. Real-time & Multi-client

- [ ] Open same session in two browser tabs
- [ ] Message sent in one tab appears in the other
- [ ] Telegram and web show same conversation
- [ ] Message from Telegram appears in web UI
- [ ] Message from web appears in Telegram

---

## 13. Binary Build

- [ ] `bun run build:binary` or `bun run build:binary:linux` succeeds
- [ ] Binary file is created and reasonable size
- [ ] Binary runs from a **different directory** than source
- [ ] Binary runs as a **different user account** (critical!)
- [ ] Config file read from `~/.myagentive/config` (not hardcoded path)
- [ ] Database created in correct location
- [ ] Media files saved to correct location

---

## 14. Configuration

- [ ] App works with minimal config (required vars only)
- [ ] Missing required config shows helpful error
- [ ] `ANTHROPIC_API_KEY` works when set
- [ ] App works without `ANTHROPIC_API_KEY` (Claude Code mode)
- [ ] Custom `PORT` works
- [ ] Custom `DATABASE_PATH` works
- [ ] Custom `MEDIA_PATH` works
- [ ] `AGENT_ID` shows in web UI header

---

## 15. Error Handling

- [ ] Network disconnect shows reconnecting indicator
- [ ] Auto-reconnect works after brief disconnect
- [ ] API error shows user-friendly message (not 500 trace)
- [ ] AI timeout handled gracefully
- [ ] Invalid session name handled gracefully

---

## Release Process

1. All pre-push checks passed during development
2. Complete sections 1-15 above
3. Create PR from `next` to `main`
4. Review diff one more time
5. Merge and tag release
6. **Test the released binary one more time on a clean environment**

---

## Notes

- For beta releases: test on `next` branch before merging to `main`
- For stable releases: full checklist required
- When in doubt, test on a clean environment (new user, fresh install)
- Section 13 (Binary Build) catches hardcoded path bugs - never skip it
