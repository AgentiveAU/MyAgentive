# MyAgentive Troubleshooting Guide

## Quick Diagnostics

### Health Check

```bash
curl http://localhost:3847/health
```

Returns JSON with component status (database, Telegram, sessions, memory). Status "ok" means healthy, "degraded" means some components have issues.

### Check If Running

```bash
# Using control script
myagentivectl status

# Manual check
ps aux | grep myagentive

# Check PID file
cat ~/.myagentive/myagentive.pid
```

### View Logs

```bash
# Binary mode (systemd)
myagentivectl logs

# Binary mode (standalone)
tail -f ~/.myagentive/myagentive.log

# Development mode (logs in terminal)
bun run dev
```

---

## Configuration Issues

### Config file not found

**Symptom:** Error message about missing config or setup wizard runs unexpectedly.

**Solution:**
```bash
# Check if config exists
ls -la ~/.myagentive/config

# If missing, run MyAgentive to trigger setup wizard
myagentive
# Or for development:
bun run dev
```

### View current configuration

```bash
cat ~/.myagentive/config
```

### Reset configuration

```bash
# Remove config to re-run setup wizard
rm ~/.myagentive/config

# Then start MyAgentive
myagentive
```

### Invalid config format

**Symptom:** Variables not being read correctly.

**Check for:**
- No quotes around values: `KEY=value` not `KEY="value"`
- No trailing spaces
- Each variable on its own line
- No blank lines with spaces
- Comments must start with `#`

### Config not loading after edit

Config changes require a restart:
```bash
myagentivectl restart
```

---

## Startup Issues

### EADDRINUSE (Port already in use)

**Symptom:** Server fails to start with "EADDRINUSE" error.

**Solutions:**
```bash
# Find what is using the port
lsof -i :3847

# Kill existing MyAgentive processes
pkill -f myagentive

# Or use the control script
myagentivectl stop

# Or change PORT in config
```

### Claude Code not found

**Symptom:** "Claude Code not found" or agent fails to process messages.

**Solution:**
```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Login
claude login

# Verify installation
which claude
claude --version
```

**Paths searched by MyAgentive:**
1. `$CLAUDE_CODE_PATH` (env var override)
2. `/usr/local/bin/claude`
3. `~/.local/bin/claude`
4. `~/.claude/local/claude`
5. nvm paths: `~/.nvm/versions/node/*/bin/claude`

**Tip:** Set `CLAUDE_CODE_PATH` in `~/.myagentive/config` to specify an exact path.

### Claude responses failing

**Possible causes:**

1. **Not logged in to Claude:**
   ```bash
   claude login
   ```

2. **Subscription expired:**
   - Check Claude subscription status
   - Consider adding `ANTHROPIC_API_KEY` for pay-per-use

3. **Rate limits:**
   - Wait and retry
   - Switch to a cheaper model: `/model haiku`

---

## Telegram Issues

### Bot not responding

**Possible causes:**

1. **Invalid bot token:**
   ```bash
   # Token must contain a colon (:)
   grep TELEGRAM_BOT_TOKEN ~/.myagentive/config
   ```
   - Get new token from @BotFather if needed

2. **Wrong user ID:**
   ```bash
   # Must be numeric, not @username
   grep TELEGRAM_USER_ID ~/.myagentive/config
   ```
   - Get correct ID from @userinfobot

3. **Bot not started:**
   - Open Telegram chat with your bot
   - Send `/start` command

4. **Server not running:**
   ```bash
   myagentivectl status
   curl http://localhost:3847/health
   ```

5. **Telegram not configured:**
   - Check health endpoint: if `telegram.status` is "not_configured", add Telegram variables to config

### "User not authorised" error

**Cause:** Your Telegram user ID does not match config.

**Solution:**
1. Get your numeric user ID from @userinfobot
2. Update config: edit `TELEGRAM_USER_ID` in `~/.myagentive/config`
3. Restart: `myagentivectl restart`

### Bot not responding in groups

**Cause:** Group access is restricted by default.

**Solution:**
1. Add group ID to allowed groups:
   ```
   TELEGRAM_ALLOWED_GROUPS=-100123456789
   ```
2. Or set open group policy:
   ```
   TELEGRAM_GROUP_POLICY=open
   ```
3. The bot only responds when @mentioned in groups

### Voice messages not transcribing

**Cause:** Missing Deepgram API key.

**Solution:**
1. Create account at https://deepgram.com ($200 free credit)
2. Get API key from Console > API Keys
3. Add to config:
   ```bash
   echo "DEEPGRAM_API_KEY=your_key" >> ~/.myagentive/config
   ```
4. Restart MyAgentive

### Messages delayed or slow

- Check internet connectivity
- MyAgentive may be processing a long task (isProcessing flag prevents concurrent messages)
- Reduce model for faster responses: `/model haiku`
- Telegram API throttler limits to 1 msg/sec per chat

---

## Web Interface Issues

### Cannot access web interface

**Check server is running:**
```bash
curl http://localhost:3847/health
```

**Check correct port:**
```bash
grep PORT ~/.myagentive/config
# Default is 3847
```

**Check dist files exist:**
```bash
ls ~/.myagentive/dist/index.html
```

If missing, reinstall: `./install.sh`

**Try different browser or incognito mode** (cookie issues)

### Login not working

**Verify password:**
```bash
grep WEB_PASSWORD ~/.myagentive/config
```

**Reset password:**
1. Edit config: `nano ~/.myagentive/config`
2. Change `WEB_PASSWORD=newpassword`
3. Restart MyAgentive

### WebSocket connection failed

**Symptom:** Chat loads but messages do not appear or real-time updates stop.

**Solutions:**
1. Check browser console for errors (F12 > Console)
2. Ensure no firewall blocking WebSocket on the port
3. Refresh the page
4. Clear browser cache and cookies

**Cloudflare Tunnel users:**
- Cloudflare has a ~60 second idle timeout for WebSocket connections
- MyAgentive sends application-level ping/pong messages to keep connections alive
- If issues persist, check Cloudflare tunnel configuration

### Session list not updating

WebSocket may have disconnected. Refresh the page to reconnect.

---

## Session Issues

### Session stuck processing

**Symptom:** "Please wait for the current request to complete" error.

**Cause:** A previous message is still being processed (isProcessing flag).

**Solutions:**
1. Wait for the current operation to complete
2. If stuck indefinitely, restart:
   ```bash
   myagentivectl restart
   ```

### Session not resuming after restart

**Symptom:** Fresh context after server restart (no memory of previous conversation).

**Cause:** SDK session ID may not have been captured, or the SDK session expired.

**What happens normally:**
1. MyAgentive captures the SDK session ID from the first response
2. Stores it in the database
3. On restart, passes it as `resume` parameter to the SDK
4. If resume fails, clears the ID and starts fresh

**Check SDK session ID:**
```bash
sqlite3 ~/.myagentive/data/myagentive.db "SELECT name, sdk_session_id FROM sessions;"
```

### Context getting too large

**Symptom:** Responses slow down, or you hit context limits.

**Solutions:**
1. Use `/compact` in Telegram to manually compact context
2. Create a new session: `/new`
3. The SDK automatically compacts when approaching limits
4. Web UI shows context usage percentage

---

## Database Issues

### Database corruption

**Symptom:** Errors about database or messages not loading.

**Solution - Reset database:**
```bash
# Stop MyAgentive first
myagentivectl stop

rm ~/.myagentive/data/myagentive.db

# Restart - database recreates automatically
myagentivectl start
```

**Note:** This deletes all chat history and session data.

### Database locked

**Symptom:** "database is locked" or "SQLITE_BUSY" error.

**Cause:** Multiple processes accessing database.

**Solution:**
```bash
# Find and kill duplicate processes
pkill -f myagentive

# Restart
myagentivectl start
```

### Messages not persisting

**Check database path:**
```bash
grep DATABASE_PATH ~/.myagentive/config
# Default: ./data/myagentive.db (relative to ~/.myagentive/)
```

**Verify database exists:**
```bash
ls -la ~/.myagentive/data/myagentive.db
```

### Migration errors on startup

**Symptom:** Error during database migration on startup.

**Solutions:**
1. Check logs for specific migration error
2. If safe to reset, delete and recreate:
   ```bash
   rm ~/.myagentive/data/myagentive.db
   myagentive  # Recreates with latest schema
   ```

---

## Media Issues

### Media files not found

**Check media path:**
```bash
grep MEDIA_PATH ~/.myagentive/config
ls -la ~/.myagentive/media/
```

**Structure should be:**
```
~/.myagentive/media/
├── audio/
├── voice/
├── videos/
├── photos/
└── documents/
```

### Files too large

**Upload limit:** 50MB (MAX_MEDIA_SIZE in code).
**Deepgram transcription limit:** 25MB.
**Telegram limit:** 50MB for downloads.

**Solution:** Compress or split large files before sending.

### File delivery not working

**Symptom:** Agent saves files but they do not appear in chat.

**Possible causes:**
1. File not saved in `~/.myagentive/media/` directory
2. No subscribers connected to the session
3. File saved after the result event (outbox detection happens at result)

**Solution:** Use `send-file` CLI tool for explicit delivery:
```bash
send-file ~/.myagentive/media/filename.ext
```

### Media not downloading from Telegram

**Check permissions:**
```bash
ls -la ~/.myagentive/media/
# Should be writable by your user
chmod -R u+rwX ~/.myagentive/media/
```

---

## API Key Issues

### Key not working

**Verify key is in config:**
```bash
grep KEY_NAME ~/.myagentive/config
```

**Check format:**
- No quotes: `KEY=value` not `KEY="value"`
- No trailing spaces or newlines
- Key on its own line

### Key not loading

Config must be proper format. Restart required after adding keys:
```bash
myagentivectl restart
```

### Verifying configured keys

```bash
# List all configured keys (values hidden)
grep -E "_KEY|_TOKEN|_SECRET|_SID" ~/.myagentive/config | cut -d'=' -f1
```

---

## Binary / Service Issues

### myagentivectl commands not found

**Cause:** `~/.local/bin` not in PATH.

**Solution:**
```bash
export PATH="$HOME/.local/bin:$PATH"
# Add to ~/.bashrc or ~/.zshrc for persistence
```

### Service fails to start after upgrade

```bash
# Check logs
myagentivectl logs

# Common causes:
# - New config variable required
# - Database migration issue
# - Permission change

# Try running in foreground to see errors
myagentive
```

### systemd service issues

```bash
# Check service status
sudo systemctl status myagentive

# View detailed logs
sudo journalctl -u myagentive -n 50 --no-pager

# Restart service
sudo systemctl restart myagentive
```

### Old installation layout

If you upgraded from an older version, the binary may be at `~/.myagentive/myagentive` instead of `~/.myagentive/bin/myagentive`. The installer handles migration automatically, but if you see issues:

```bash
# Reinstall
cd /path/to/downloaded/MyAgentive
./install.sh
```

---

## Skills Issues

### Skills not loading

**Cause:** SDK cannot find `.claude/skills/` directory.

**Check symlink:**
```bash
ls -la ~/.myagentive/.claude/skills
# Should point to: ../skills
```

**Fix:**
```bash
mkdir -p ~/.myagentive/.claude
rm -rf ~/.myagentive/.claude/skills
ln -sf ../skills ~/.myagentive/.claude/skills
```

### Missing skills after upgrade

**Check backup:**
```bash
ls ~/.myagentive/backups/
```

Skills are backed up before each upgrade. To restore:
```bash
cd ~/.myagentive
unzip backups/skills-backup-YYYYMMDD-HHMMSS.zip
```

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `EADDRINUSE` | Port already in use | Kill existing process or change PORT |
| `ECONNREFUSED` | Server not running | Start MyAgentive |
| `SQLITE_BUSY` | Database locked | Kill duplicate processes |
| `Invalid bot token` | Wrong Telegram token | Get new token from @BotFather |
| `User not authorised` | Wrong user ID | Get ID from @userinfobot |
| `API key not found` | Missing key in config | Add key to ~/.myagentive/config |
| `Claude Code not found` | CLI not installed | `npm install -g @anthropic-ai/claude-code` |
| `Please wait for the current request` | Concurrent message | Wait for processing to complete |
| `Session error` | SDK crash | Session auto-recovers on next message |
| `File too large` | Exceeds 50MB limit | Compress the file |

---

## Getting Help

1. **Check this guide** for common issues
2. **Review architecture** in `references/architecture.md`
3. **Check API key setup** in `references/api-keys.md`
4. **Health check:** `curl http://localhost:3847/health`
5. **GitHub Issues:** https://github.com/AgentiveAU/MyAgentive/issues
6. **Website:** https://MyAgentive.ai
