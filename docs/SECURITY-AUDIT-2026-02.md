# Security Audit Report - February 2026

## Overview

This security audit was conducted to identify potential vulnerabilities similar to those found in the Clawdbot incident, which exposed thousands of users' AI agents to the public internet through misconfiguration and supply chain attacks.

---

## 🚨 CRITICAL Issues

### 1. Sensitive Credentials in Environment Files
- **Location:** `.env` file
- **Issue:** Production API keys and tokens are stored in the environment file. While not tracked in git, accidental exposure could compromise multiple services.
- **Affected Services:** Telegram, Deepgram, ElevenLabs, Gemini, LinkedIn, Twitter/X
- **Recommendation:**
  - Regularly rotate API keys
  - Use a secrets manager for production deployments
  - Audit git history to ensure .env was never committed

---

## ⚠️ HIGH Risk Issues

### 1. Prompt Injection via WebFetch
- **Location:** `server/core/ai-client.ts` (line 270)
- **Issue:** The agent can fetch arbitrary URLs via the `WebFetch` tool. Malicious websites could contain hidden instructions that override agent behaviour.
- **Recommendation:** Implement content sanitisation for fetched content; consider domain allowlisting.

### 2. Full System Access via Agent Tools
- **Location:** `server/core/ai-client.ts` (lines 255-277)
- **Issue:** The agent has access to powerful tools (Bash, Read, Write, Edit, Glob, Grep) providing full system access. Combined with prompt injection, this could be exploited.
- **Recommendation:** Consider implementing sandboxing or permission levels for different contexts.

### 3. Skills Loaded Without Verification
- **Location:** `server/core/ai-client.ts` (lines 8-22)
- **Issue:** Skills from `~/.claude/skills/` are loaded without code signing or integrity verification. Similar to the MoltHub supply chain attack vector.
- **Recommendation:** Implement skill signing or checksum verification.

---

## 🔶 MEDIUM Risk Issues

### 1. CORS Configuration Allows Any Origin
- **Location:** `server/server.ts` (line 77)
- **Code:** `app.use(cors({ credentials: true, origin: true }));`
- **Issue:** Setting `origin: true` reflects any request origin, allowing any website to make authenticated requests.
- **Recommendation:** Implement an explicit allowlist of trusted origins.

### 2. Plaintext Password Comparison
- **Location:** `server/auth/middleware.ts` (lines 74-75)
- **Issue:** Password is stored and compared in plaintext rather than using secure hashing.
- **Recommendation:** Use bcrypt or similar for password hashing.

### 3. API Key Accepted in URL Query Parameters
- **Location:** `server/server.ts` (lines 662-669)
- **Issue:** WebSocket authentication accepts API keys via `?api_key=` query parameter. URLs are often logged in web server access logs, potentially exposing credentials.
- **Recommendation:** Require API keys in headers only, not query parameters.

### 4. Password Logged During Setup
- **Location:** `server/setup-wizard.ts` (line 252)
- **Issue:** The setup wizard logs the generated password to console output.
- **Recommendation:** Use a more secure credential display method.

### 5. Token Storage in localStorage
- **Location:** `client/App.tsx` (line 79)
- **Issue:** Session tokens stored in localStorage are vulnerable to XSS attacks.
- **Note:** httpOnly cookies are also used as a fallback, which is good.
- **Recommendation:** Prefer httpOnly cookies exclusively for token storage.

### 6. X-Forwarded-Proto Header Trusted Without Validation
- **Location:** `server/server.ts` (lines 170-171)
- **Issue:** The code trusts X-Forwarded-Proto header without verifying it came from a trusted proxy.
- **Recommendation:** Configure Express `trust proxy` setting appropriately for deployment environment.

---

## 🔵 LOW Risk Issues

### 1. Server Binds to All Interfaces by Default
- **Location:** `server/server.ts` (line 721)
- **Issue:** No explicit bind address means server listens on all interfaces (0.0.0.0).
- **Recommendation:** Bind to `127.0.0.1` when deployed behind a reverse proxy.

### 2. Health Endpoint Exposes Internal Information
- **Location:** `server/server.ts` (lines 92-159)
- **Issue:** `/health` endpoint (no auth required) exposes agent ID, Telegram bot username, session count, and memory usage.
- **Recommendation:** Limit public health checks to basic status; require auth for detailed diagnostics.

---

## ✅ Good Security Practices Found

| Practice | Location |
|----------|----------|
| Path traversal protection | `server/utils/media-detector.ts` (lines 124-137) |
| Sensitive file filtering | `/api/files/*` endpoint blocks `.env`, credentials, etc. |
| Telegram user authentication | Proper user ID validation for private chats |
| Environment files in .gitignore | Credentials not tracked in version control |
| Session-based authentication | Proper token-based auth for web interface |

---

## Comparison to Clawdbot Vulnerabilities

| Clawdbot Issue | MyAgentive Status | Notes |
|----------------|-------------------|-------|
| Localhost bypass (X-Forwarded-For) | ⚠️ Partial risk | Trusts forwarded headers without validation |
| Default port exposure | ⚠️ Partial risk | Binds to all interfaces by default |
| Supply chain (malicious skills) | ⚠️ At risk | No skill signing/verification |
| API key theft | ⚠️ Partial risk | Could be extracted via prompt injection |
| Public control panel | ✅ Protected | Authentication required for web UI |

---

## Recommended Actions

### Immediate Priority
1. Audit git history to ensure no credentials were ever committed
2. Rotate any potentially exposed API keys
3. Bind server to `127.0.0.1` when behind reverse proxy

### Short-term (This Month)
4. Implement bcrypt for password storage
5. Remove API key acceptance from URL query parameters
6. Add CORS origin allowlist
7. Implement content sanitisation for WebFetch results

### Medium-term
8. Add skill signing/verification system
9. Implement sandboxing for agent tools
10. Add rate limiting to prevent brute force attacks

---

## References

- Clawdbot Security Incident Analysis (2026)
- OWASP Top 10 for LLM Applications
- Prompt Injection Attack Vectors

---

*Report generated: February 2026*
*By: Agentive (www.agentive.au)*
