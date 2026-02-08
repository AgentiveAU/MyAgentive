---
name: myagentive-onboarding
description: Onboard new MyAgentive users, explain capabilities, and help set up integrations. Use when welcoming new users, explaining what MyAgentive can do, checking integration status, helping configure API keys and services, or when users ask "what can you do" or "how do I get started".
---

# MyAgentive Onboarding

Use this skill when onboarding new users, explaining MyAgentive capabilities, or helping users set up integrations.

## What is MyAgentive?

MyAgentive (https://MyAgentive.ai) is your personal AI agent built by Agentive (https://agentive.au). Unlike chatbots that only provide information, MyAgentive runs on your machine (or a cloud server) and can perform real tasks autonomously. It has full access to your system, files, and the internet through a powerful tool set including Bash, file operations, web search, and more.

**Access it from:**
- **Web interface** (always available): Open `http://localhost:3847` (or your configured port/domain) in a browser
- **Telegram** (optional): Chat with your bot from any device, anywhere
- Both interfaces share the same sessions, so you can start on one and continue on the other
- MyAgentive works perfectly in web-only mode; Telegram is an optional add-on

## Getting Started (First Run)

When you first start MyAgentive, the setup wizard will ask:

1. **Web password** (required): For logging into the web interface
2. **Telegram** (optional): Bot token and your user ID; skip if you want web-only mode
3. **Monitoring group** (optional): A Telegram group for activity notifications
4. **Agent ID** (optional): A label shown in the web UI (useful for multiple instances)
5. **Port** (optional): Server port, defaults to 3847

After setup, your config is saved to `~/.myagentive/config`. Start using MyAgentive by:
- Opening `http://localhost:3847` in a browser (always available)
- Opening your Telegram bot and sending a message (if Telegram was configured)

## Core Capabilities (Built-in)

These work immediately, no setup required:

| Capability | How |
|------------|-----|
| Run bash commands | Full terminal access |
| Read, write, and edit files | On your machine or server |
| Search the web | Real-time web search and page fetching |
| Create documents | Word (.docx), Excel (.xlsx), PowerPoint (.pptx), PDF skills |
| File delivery | Save files to `~/.myagentive/media/` and they are delivered to all interfaces |
| Session management | Multiple named conversations that persist across restarts |
| Context persistence | SDK session resume means conversations survive server restarts |
| Model switching | Switch between opus (powerful), sonnet (balanced), haiku (fast) |

## Sessions: How Conversations Work

MyAgentive organises conversations into **sessions**. Each session has its own context and history.

**Web interface:** Click sessions in the sidebar to switch, or create new ones. The web UI also shows context usage, allows archiving/pinning sessions, and supports model switching.

**Telegram commands** (if configured):
- `/session <name>` - Switch to a session
- `/new [name]` - Create a new session
- `/list` - See all sessions
- `/status` - Current session info
- `/model <opus|sonnet|haiku>` - Change AI model
- `/compact` - Compress context when conversations get long

If both interfaces are configured, sessions are shared between them. You can start a conversation on Telegram and continue it on the web, or vice versa.

## File Delivery: Sending Files to You

When MyAgentive creates a file and saves it to `~/.myagentive/media/` (or subdirectories), the file is automatically delivered:
- **Web**: Shows inline in the chat (images, audio, video, documents)
- **Telegram**: Sent as a file attachment

Just ask: "Create a chart of...", "Generate a document for...", "Download this file for me" and the result will appear in your chat.

**CLI tools available:**
- `send-file <path>` - Explicitly send any file to all connected clients
- `save-for-download <path>` - Move a file to the media directory for web download

## Managing MyAgentive

```bash
myagentivectl start        # Start in background
myagentivectl stop         # Stop the service
myagentivectl restart      # Restart (needed after config changes)
myagentivectl status       # Check if running
myagentivectl logs         # Follow log output
myagentivectl config       # Edit config file
```

**Health check:**
```bash
curl http://localhost:3847/health
```

Returns JSON showing status of database, Telegram, sessions, and memory.

## Capability Categories (with Integrations)

### 1. Communication

| Capability | Skill | Setup Required |
|------------|-------|----------------|
| Phone calls with AI voice | `twilio-phone` | Twilio + ElevenLabs |
| SMS messages | `twilio-phone` | Twilio |
| Email (read/send) | `email-himalaya` | himalaya CLI |
| Telegram mobile access | Core | Telegram bot token + user ID (optional) |

### 2. Content Creation

| Capability | Skill | Setup Required |
|------------|-------|----------------|
| Image generation | `gemini-imagen` | Gemini API key |
| Audio/video transcription | `deepgram-transcription` | Deepgram API key |
| Voice synthesis | `twilio-phone` | ElevenLabs API key |
| Word documents (.docx) | `docx` | None |
| Excel spreadsheets (.xlsx) | `xlsx` | None |
| PowerPoint presentations (.pptx) | `pptx` | None |
| PDF manipulation | `pdf` | None |

### 3. Social Media

| Capability | Skill | Setup Required |
|------------|-------|----------------|
| LinkedIn posts | `social-media-poster` | LinkedIn API |
| Twitter/X posts | `social-media-poster` | Twitter API |

### 4. Device Control

| Capability | Skill | Setup Required |
|------------|-------|----------------|
| Android phone control | `android-use` | ADB + USB connection |

### 5. Web Hosting (External)

| Capability | Provider | Setup Required |
|------------|----------|----------------|
| Static websites | Cloudflare Pages | Cloudflare account |
| Serverless functions | Cloudflare Workers | Cloudflare account |
| Custom domains | Cloudflare DNS | Cloudflare account |

---

## Quick Start: Check Integration Status

To see what is configured, check the config file:

```bash
# List configured API keys (values hidden)
grep -E "_KEY|_TOKEN|_SECRET|_SID" ~/.myagentive/config | cut -d'=' -f1
```

---

## Telegram Setup (Optional)

Telegram is completely optional. MyAgentive works perfectly with just the web interface. However, Telegram gives you mobile access from anywhere and enables features like voice message transcription, file sharing, and activity monitoring.

### Checking Current Telegram Status

To check whether Telegram is already configured, run:

```bash
grep -E "TELEGRAM_BOT_TOKEN|TELEGRAM_USER_ID" ~/.myagentive/config
```

Or check the health endpoint:
```bash
curl -s http://localhost:3847/health | grep -A2 telegram
```

If `telegram.status` is `"not_configured"`, Telegram is not set up. If both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_USER_ID` have values, Telegram is configured.

### Step 1: Create a Telegram Bot

If `TELEGRAM_BOT_TOKEN` is already in the config with a value containing `:`, the bot is already created. Skip to Step 2.

If not:

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Choose a display name (e.g., "My Personal Agent")
4. Choose a unique username ending in `bot` (e.g., `my_agent_xyz_bot`)
5. BotFather sends the bot token, which looks like: `7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxx`
6. Add to config:
   ```bash
   echo "TELEGRAM_BOT_TOKEN=7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxx" >> ~/.myagentive/config
   ```

**Optional bot customisation** (via @BotFather):
- `/setdescription` - Set bot description
- `/setabouttext` - Set "About" text
- `/setuserpic` - Set bot profile picture

### Step 2: Get Your Telegram User ID

If `TELEGRAM_USER_ID` is already in the config with a numeric value, skip this step.

If not:

1. Open Telegram and search for `@userinfobot`
2. Send any message
3. The bot replies with your info including your numeric **Id** (e.g., `123456789`)
4. Add to config:
   ```bash
   echo "TELEGRAM_USER_ID=123456789" >> ~/.myagentive/config
   ```

**Important:** Use the numeric ID, not your @username. The ID is what MyAgentive uses to restrict access so only you can control the bot in private chats.

### Step 3: Restart and Test

```bash
myagentivectl restart
```

Then in Telegram:
1. Search for your bot by its username
2. Tap "Start" or send `/start`
3. Send a test message

### Step 4 (Optional): Activity Monitoring Group

A monitoring group receives notifications about everything MyAgentive does: sessions created, messages processed, errors, and system events. This is useful for keeping an eye on agent activity.

1. Create a new Telegram group (e.g., "MyAgentive Activity")
2. Add your bot to the group
3. Get the group ID:
   - Add `@getidsbot` to the group temporarily
   - It shows the group ID (a negative number starting with `-100`, e.g., `-1001234567890`)
   - Remove @getidsbot from the group afterwards
4. Add to config:
   ```bash
   echo "TELEGRAM_MONITORING_GROUP_ID=-1001234567890" >> ~/.myagentive/config
   ```
5. Restart: `myagentivectl restart`

The monitoring group is one-way: MyAgentive posts activity there, but does not respond to messages in the monitoring group.

### Step 5 (Optional): Shared Collaboration Group

You can create a Telegram group where multiple people can interact with MyAgentive by @mentioning the bot. This is useful for teams or families who want to share an agent.

1. Create a Telegram group (e.g., "Team Agent")
2. Add your bot and the people who should have access
3. Get the group ID using `@getidsbot` (same process as Step 4)
4. Add the group to the allowed list:
   ```bash
   echo "TELEGRAM_ALLOWED_GROUPS=-1001234567890" >> ~/.myagentive/config
   ```
   For multiple groups, comma-separate them: `TELEGRAM_ALLOWED_GROUPS=-100111,-100222`
5. Restart: `myagentivectl restart`

**How it works in groups:**
- The bot only responds when @mentioned (e.g., `@my_agent_xyz_bot what is the weather?`)
- Anyone in the group can @mention the bot; the private chat user ID restriction does not apply in groups
- The bot ignores messages that do not @mention it
- Each group conversation uses the same session system as private chat and web

**Group policy options** (in config):
- `TELEGRAM_GROUP_POLICY=allowlist` (default): Bot only responds in groups listed in `TELEGRAM_ALLOWED_GROUPS`
- `TELEGRAM_GROUP_POLICY=open`: Bot responds when @mentioned in any group it has been added to
- `TELEGRAM_GROUP_POLICY=disabled`: Bot never responds in any group

You can also set per-group policies:
```
TELEGRAM_GROUP_POLICIES={"‑100111":"open","‑100222":"disabled"}
```

### Telegram Setup Summary

| Variable | Required | Purpose |
|----------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | For Telegram | Bot token from @BotFather |
| `TELEGRAM_USER_ID` | For Telegram | Your numeric user ID (private chat access) |
| `TELEGRAM_MONITORING_GROUP_ID` | No | Group for activity notifications |
| `TELEGRAM_ALLOWED_GROUPS` | No | Groups where bot responds when @mentioned |
| `TELEGRAM_GROUP_POLICY` | No | Default group policy (allowlist/open/disabled) |
| `TELEGRAM_GROUP_POLICIES` | No | Per-group policy overrides (JSON) |
| `TELEGRAM_REACTION_ACK` | No | Show eye reaction on receiving messages (default: true) |
| `TELEGRAM_FRAGMENT_BUFFER_MS` | No | Buffer time for rapid message coalescence (default: 500ms) |
| `TELEGRAM_LINK_PREVIEW` | No | Enable link previews in responses (default: true) |

---

## Other Integration Setup Guides

### Deepgram (Transcription)

**Free Credit:** $200 for new accounts

**What it enables:**
- Transcribe voice messages in Telegram
- Convert audio files to text
- Transcribe video files
- Multiple language support

**Setup:**
1. Sign up: https://console.deepgram.com/signup
2. Go to API Keys > Create new key
3. Add to config:
   ```bash
   echo "DEEPGRAM_API_KEY=your_key" >> ~/.myagentive/config
   ```
4. Restart: `myagentivectl restart`

**Skill:** `deepgram-transcription`

---

### Gemini (Image Generation)

**Free Tier:** Limited requests per minute

**What it enables:**
- Generate images from text descriptions
- Multiple quality levels (fast, balanced, ultra)

**Setup:**
1. Get API key: https://aistudio.google.com/apikey
2. Add to config:
   ```bash
   echo "GEMINI_API_KEY=your_key" >> ~/.myagentive/config
   ```
3. Restart: `myagentivectl restart`

**Skill:** `gemini-imagen`

---

### ElevenLabs (Voice Synthesis)

**Free Tier:** 10,000 characters/month

**What it enables:**
- Natural AI voices for phone calls
- Multiple voice options and accents
- Text-to-speech conversion

**Setup:**
1. Sign up: https://elevenlabs.io
2. Go to Profile > API Keys
3. Add to config:
   ```bash
   echo "ELEVENLABS_API_KEY=your_key" >> ~/.myagentive/config
   ```
4. Restart: `myagentivectl restart`

**Skill:** `twilio-phone`

---

### Twilio (Phone & SMS)

**What it enables:**
- Make phone calls with AI voices
- Send SMS messages
- Receive call/SMS notifications

**Setup:**
1. Sign up: https://www.twilio.com
2. Get a phone number
3. Install CLI: `brew tap twilio/brew && brew install twilio`
4. Login: `twilio login`
5. Optionally add to config for reference:
   ```bash
   echo "TWILIO_PHONE_NUMBER=+1234567890" >> ~/.myagentive/config
   ```

**Note:** Twilio uses CLI authentication, not environment variables.

**Skill:** `twilio-phone`

---

### LinkedIn (Social Media)

**What it enables:**
- Post updates to your profile
- Share articles and content
- Post to company pages

**Requirement:** LinkedIn Company Page

**Setup:**
1. Create app: https://www.linkedin.com/developers/apps
2. Request "Share on LinkedIn" permission
3. Get Client ID, Client Secret from app settings
4. Generate access token using OAuth flow:
   ```bash
   cd .claude/skills/social-media-poster
   source venv/bin/activate
   python scripts/get_token.py
   ```
5. Add to config:
   ```bash
   echo "LINKEDIN_CLIENT_ID=your_id" >> ~/.myagentive/config
   echo "LINKEDIN_CLIENT_SECRET=your_secret" >> ~/.myagentive/config
   echo "LINKEDIN_ACCESS_TOKEN=your_token" >> ~/.myagentive/config
   ```

**Note:** Tokens expire after ~60 days. Re-run `get_token.py` to refresh.

**Skill:** `social-media-poster`

---

### Twitter/X (Social Media)

**Free Tier:** 1,500 tweets/month

**What it enables:**
- Post tweets
- Schedule content
- Share media

**Setup:**
1. Apply for developer access: https://developer.x.com
2. Create app with Read+Write permissions
3. Generate all tokens (API Key, Secret, Access Token, Access Token Secret, Bearer Token)
4. Add to config:
   ```bash
   echo "TWITTER_API_KEY=your_key" >> ~/.myagentive/config
   echo "TWITTER_API_SECRET=your_secret" >> ~/.myagentive/config
   echo "TWITTER_ACCESS_TOKEN=your_token" >> ~/.myagentive/config
   echo "TWITTER_ACCESS_TOKEN_SECRET=your_secret" >> ~/.myagentive/config
   echo "TWITTER_BEARER_TOKEN=your_bearer" >> ~/.myagentive/config
   ```

**Important:** After changing permissions, regenerate all tokens.

**Skill:** `social-media-poster`

---

### Email (himalaya)

**What it enables:**
- Read emails from any account
- Send emails
- Search and manage mailboxes

**Setup:**
1. Install himalaya: `brew install himalaya`
2. Configure accounts in `~/.config/himalaya/config.toml`
3. For Gmail, create an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Store in macOS Keychain:
     ```bash
     security add-generic-password -s himalaya-gmail -a "you@gmail.com" -w "your-app-password"
     ```

**Skill:** `email-himalaya`

---

### Android Device Control

**What it enables:**
- Tap buttons and navigate apps
- Type text
- Take screenshots
- Automate phone tasks

**Setup:**
1. Install ADB: `brew install android-platform-tools`
2. Enable Developer mode on Android (tap Build Number 7 times)
3. Enable USB debugging in Developer options
4. Connect phone via USB and authorise
5. Verify: `adb devices -l`
6. Optional (for vision-based detection):
   ```bash
   echo "OPENAI_API_KEY=your_key" >> ~/.myagentive/config
   ```

**Skill:** `android-use`

---

### Cloudflare (Web Hosting)

**Free Tier:** Generous limits for Pages, Workers, DNS

**What it enables:**
- Deploy static websites (Cloudflare Pages)
- Create serverless functions (Workers)
- Manage DNS and custom domains

**Setup:**
1. Sign up: https://dash.cloudflare.com/sign-up
2. Create API Token: https://dash.cloudflare.com/profile/api-tokens
3. Permissions needed:
   - Account > Cloudflare Pages: Edit
   - Account > Workers Scripts: Edit
   - Zone > DNS: Edit
4. Add to config:
   ```bash
   echo "CLOUDFLARE_API_TOKEN=your_token" >> ~/.myagentive/config
   echo "CLOUDFLARE_ACCOUNT_ID=your_account_id" >> ~/.myagentive/config
   ```
5. Restart: `myagentivectl restart`

---

### Google Analytics & Search Console

**What it enables:**
- Track website visitors
- Monitor search performance
- SEO insights

**Setup (Analytics):**
1. Create property: https://analytics.google.com
2. Get Measurement ID (G-XXXXXXXXXX)
3. Add to config:
   ```bash
   echo "GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX" >> ~/.myagentive/config
   ```

**Setup (Search Console):**
1. Add site: https://search.google.com/search-console
2. Verify ownership
3. For API access, create GCP Service Account with Search Console access

---

### GCP Service Account

**What it enables:**
- Access Google APIs (Sheets, Drive, Calendar)
- Cloud Storage
- BigQuery, Vision, Speech, Translation APIs

**Setup:**
1. Create project: https://console.cloud.google.com
2. Create Service Account (IAM & Admin > Service Accounts)
3. Download JSON key file
4. Save to secure location and set:
   ```bash
   echo "GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json" >> ~/.myagentive/config
   echo "GCP_PROJECT_ID=your-project-id" >> ~/.myagentive/config
   ```
5. Restart: `myagentivectl restart`

---

## Recommended Setup Order

### Essential (Start Here)
1. **Deepgram** - $200 free credit, enables voice message transcription
2. **Gemini** - Free tier, enables image generation

### Communication
3. **ElevenLabs** - Natural AI voices
4. **Twilio** - Phone calls and SMS
5. **Email (himalaya)** - Email access

### Social Media
6. **Twitter/X** - Social presence
7. **LinkedIn** - Professional presence

### Web Hosting
8. **Cloudflare** - Website deployment

### Advanced
9. **Android Control** - Phone automation
10. **GCP Service Account** - Google Workspace automation

---

## How to Add an Integration

Simply ask:
- "Set up Telegram" - Full Telegram onboarding walkthrough
- "Set up Deepgram integration"
- "Help me configure Twitter"
- "I want to add ElevenLabs"
- "What integrations do I have?"
- "Set up a monitoring group"
- "Set up a shared group for my team"

I will guide you through the process step by step.

---

## Key File Locations

| Item | Path |
|------|------|
| Configuration | `~/.myagentive/config` |
| System prompt (product-managed) | `~/.myagentive/system_prompt.md` |
| User prompt (your customisations) | `~/.myagentive/user_prompt.md` |
| Database | `~/.myagentive/data/myagentive.db` |
| Media / file delivery | `~/.myagentive/media/` |
| Skills | `~/.myagentive/skills/` |
| Logs (standalone mode) | `~/.myagentive/myagentive.log` |

**Config format rules:**
- `KEY=value` (no quotes around values)
- No trailing spaces
- Each variable on its own line
- All config changes require restart: `myagentivectl restart`

---

## Security Notes

- All API keys are stored in `~/.myagentive/config`
- This file is only readable by your user account
- Never share your API keys publicly
- You can revoke any API key from the provider's dashboard
- Keys are never displayed in full in responses
- Web tokens expire after 7 days
- The `API_KEY` in config never expires (for programmatic/CLI access)

---

## Quick Troubleshooting

**MyAgentive not running:**
```bash
myagentivectl status
myagentivectl start
```

**Health check:**
```bash
curl http://localhost:3847/health
```

**Telegram not working:**
- Check health endpoint: `telegram.status` should be `"ok"`, not `"not_configured"`
- Verify bot token has a colon (`:`) in it
- Verify user ID is numeric (get from @userinfobot)
- Make sure you sent `/start` to the bot in Telegram
- If Telegram was added after initial setup, restart is required: `myagentivectl restart`

**Web interface not loading:**
- Check server is running: `curl http://localhost:3847/health`
- Verify port: `grep PORT ~/.myagentive/config` (default: 3847)

**Config changes not taking effect:**
```bash
myagentivectl restart
```

For detailed troubleshooting, I can use the `myagentive` skill which has a full troubleshooting reference.

---

## Need Help?

Ask me:
- "What can you do?" - Overview of capabilities
- "What integrations are available?" - List all integrations
- "Check my integration status" - See what is configured
- "Help me set up Telegram" - Full Telegram onboarding
- "Help me set up a monitoring group" - Activity notifications
- "Help me set up a shared group" - Team collaboration via Telegram
- "Help me set up [integration name]" - Step-by-step setup guide
- "How do sessions work?" - Session management explanation
- "How do I send files?" - File delivery explanation
