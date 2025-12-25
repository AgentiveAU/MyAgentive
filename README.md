# MyAgentive

Open-source personal AI agent for power users. Runs on your laptop with Telegram and web interfaces, powered by Claude.

**Platforms:** macOS and Linux. Windows users can install via WSL (Windows Subsystem for Linux).

**Website:** [MyAgentive.ai](https://MyAgentive.ai) | **Parent Company:** [Agentive](https://TheAgentiveGroup.com)

## Quick Install

```bash
# Option 1: Homebrew (recommended)
brew tap AgentiveIS/tap
brew install myagentive

# Option 2: Install script
curl -fsSL https://myagentive.ai/install | bash
```

Then run `myagentive` and follow the setup wizard.

## What You'll Need

- **Claude authentication** (one of these):
  - Claude Pro/Team subscription with [Claude Code](https://claude.ai/download) installed, OR
  - Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
- **Telegram account** (for mobile access)

## First-Run Setup

When you run `myagentive` for the first time, an interactive wizard guides you through:

### Step 1: Claude Authentication

**Option A: Claude Code (Recommended)**
- Uses your existing Claude Pro or Team subscription
- No API costs, same as using claude.ai
- Requires Claude Code CLI installed

```bash
# Install Claude Code first
npm install -g @anthropic-ai/claude-code

# Login to your Claude account
claude login
```

**Option B: Anthropic API Key**
- Uses API credits (pay-per-use)
- Get your key from [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

### Step 2: Create Your Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a display name (e.g., "My Agent")
4. Choose a username ending in `bot` (e.g., `my_agent_bot`)
5. Copy the token that BotFather gives you

Example token format: `7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 3: Get Your Telegram User ID

You need your numeric Telegram user ID (not your username):

1. Open Telegram and search for **@userinfobot** or **@getidsbot**
2. Send `/start` to the bot
3. Copy the **numeric ID** it returns (e.g., `507299000`)

**Important:** This must be your numeric ID, not your @username.

### Step 4: Set Web Password

Choose a password for accessing the web interface (default: http://localhost:3847)

## Running MyAgentive

After setup, simply run:

```bash
myagentive
```

This starts:
- **Telegram bot**: Message your bot from anywhere
- **Web UI**: http://localhost:PORT (default: 3847)

### Run in Background

```bash
# Start as background service
myagentivectl start

# Stop the service
myagentivectl stop

# View logs
myagentivectl logs

# Check status
myagentivectl status
```

## Updating

```bash
# Homebrew
brew upgrade myagentive

# Install script (re-run to update)
curl -fsSL https://myagentive.agentive.is/install | bash
```

Your config and data are preserved in `~/.myagentive/`.

## Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/help` | Show all commands |
| `/session <name>` | Switch to named session |
| `/new [name]` | Create new session |
| `/list` | List all sessions |
| `/status` | Current session info |
| `/model` | Show current model |
| `/model <opus\|sonnet\|haiku>` | Change model |
| `/usage` | Show usage info |

Send any message to chat with the agent. Voice messages, files, photos, and videos are supported.

## Web Interface

1. Open http://localhost:PORT (default: http://localhost:3847)
2. Login with your password
3. Sessions sync between web and Telegram

## Configuration

Config file: `~/.myagentive/config`

```ini
# Claude (leave empty for Claude Code subscription)
ANTHROPIC_API_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_USER_ID=your-user-id

# Optional: Monitoring group for activity logs
TELEGRAM_MONITORING_GROUP_ID=

# Web interface
WEB_PASSWORD=your-password
PORT=3847
```

### Data Locations

| Path | Contents |
|------|----------|
| `~/.myagentive/config` | Settings |
| `~/.myagentive/data/myagentive.db` | Chat history, sessions |
| `~/.myagentive/media/` | Uploaded files |

## Optional: Activity Monitoring

Get real-time notifications of agent activity in a Telegram group:

1. Create a Telegram group for monitoring
2. **Add your bot to the group** (required: the bot must be a member to send messages)
3. Get the group's numeric ID:
   - Add **@getidsbot** to the group temporarily
   - It will display the group's numeric ID (e.g., `-1001234567890`)
   - Remove @getidsbot after copying the ID
4. Add the numeric group ID to your config at `~/.myagentive/config`

**Important:** The group ID must be numeric (typically starts with `-100` for supergroups). Do not use the group name.

## Troubleshooting

### "Claude Code not found"

```bash
npm install -g @anthropic-ai/claude-code
claude login
```

### "Bot token invalid"

- Check for extra spaces when pasting
- Get a new token from @BotFather if needed

### "Telegram user not authorised"

The bot only responds to your Telegram account. If you need to change the authorised user:

```bash
myagentive config --reset-telegram
```

### Reset Everything

```bash
rm -rf ~/.myagentive
myagentive  # Re-run setup wizard
```

## Development

For contributors and local development:

```bash
# Clone the repo
git clone https://github.com/AgentiveIS/myagentive.git
cd myagentive

# Install dependencies
bun install

# Run in development mode
bun run dev
```

### Building Binaries

```bash
# macOS
bun run build:binary

# Linux
bun run build:binary:linux
```

## Power User Configuration

MyAgentive supports extended capabilities through Claude Code skills. Configure these APIs and accounts in your `.env` file to unlock additional features.

### Feature Overview

| Feature | Required APIs/Accounts | Purpose |
|---------|------------------------|---------|
| **Core** | Claude Code OR Anthropic API | AI conversations |
| **Telegram** | Telegram Bot | Mobile access |
| **Social Media** | LinkedIn + Twitter/X APIs | Post to LinkedIn and X |
| **AI Voice Calls** | Twilio + ElevenLabs | Make calls with natural voices |
| **SMS** | Twilio | Send text messages |
| **Transcription** | Deepgram | Transcribe audio/video files |
| **Image Generation** | Google Gemini | Generate images from prompts |
| **Android Control** | ADB + OpenAI | Control your Android phone |
| **Email** | himalaya CLI | Read and send emails |

---

### Social Media Posting (LinkedIn + Twitter/X)

Post content to LinkedIn and Twitter/X with text, images, and videos.

#### LinkedIn Setup

1. Go to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)
2. Click **Create app**
3. Fill in app details and link to a LinkedIn Page
4. Go to **Products** tab and request:
   - "Share on LinkedIn"
   - "Sign In with LinkedIn using OpenID Connect"
5. Go to **Auth** tab and add redirect URL: `http://localhost:8000/callback`
6. Copy **Client ID** and **Client Secret**
7. Run the token script to get your access token:
   ```bash
   cd .claude/skills/social-media-poster
   source venv/bin/activate
   python scripts/get_token.py
   ```

**Note:** LinkedIn tokens expire in ~60 days. Re-run `get_token.py` to refresh.

#### Twitter/X Setup

1. Go to [developer.x.com/en/portal/dashboard](https://developer.x.com/en/portal/dashboard)
2. Sign up for developer access (Free tier: 1,500 tweets/month)
3. Create a **Project** and **App**
4. Go to App Settings > **User authentication settings**
5. Enable **Read and Write** permissions
6. Set Callback URI: `http://localhost`
7. Go to **Keys and Tokens** and generate all credentials

**Important:** After enabling Read+Write, regenerate Access Token and Secret.

#### Environment Variables

```bash
# LinkedIn
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret
LINKEDIN_ACCESS_TOKEN=your-access-token

# Twitter/X
TWITTER_API_KEY=your-api-key
TWITTER_API_SECRET=your-api-secret
TWITTER_ACCESS_TOKEN=your-access-token
TWITTER_ACCESS_TOKEN_SECRET=your-access-token-secret
TWITTER_BEARER_TOKEN=your-bearer-token
```

---

### AI Voice Calls and SMS (Twilio + ElevenLabs)

Make phone calls with natural AI-generated voices and send SMS.

#### Twilio Setup

1. Create account at [twilio.com](https://www.twilio.com)
2. Get a phone number (Australian: +61, US: +1)
3. Install Twilio CLI:
   ```bash
   brew tap twilio/brew && brew install twilio
   ```
4. Login to Twilio CLI:
   ```bash
   twilio login
   ```

#### ElevenLabs Setup (for natural voices)

1. Create account at [elevenlabs.io](https://elevenlabs.io)
2. Go to Profile Settings and copy your API Key

#### Environment Variables

```bash
# ElevenLabs (for AI voice)
ELEVENLABS_API_KEY=sk_xxxxx
```

**Note:** Twilio uses CLI authentication (profile-based), not environment variables.

---

### Audio/Video Transcription (Deepgram)

Transcribe audio files (mp3, wav, m4a) and video files (mp4, mov) to text.

#### Setup

1. Create account at [deepgram.com](https://deepgram.com)
2. Go to Console > API Keys
3. Create a new API key

#### Environment Variables

```bash
DEEPGRAM_API_KEY=your-deepgram-api-key
```

**Tip:** For video files, the skill extracts audio first to reduce upload time (~98% smaller).

---

### Image Generation (Google Gemini Imagen)

Generate images from text prompts using Google's Imagen models.

#### Setup

1. Go to [ai.google.dev](https://ai.google.dev)
2. Create or select a project
3. Enable the Gemini API
4. Create an API key

#### Environment Variables

```bash
GEMINI_API_KEY=your-gemini-api-key
```

**Models available:**
- `imagen-4.0-fast-generate-001` - Fast generation (default)
- `imagen-4.0-generate-001` - Balanced quality
- `imagen-4.0-ultra-generate-001` - Highest quality

---

### Android Device Control (ADB + OpenAI)

Control your Android phone remotely: tap buttons, type text, navigate apps.

#### Setup

1. Install ADB:
   ```bash
   brew install android-platform-tools
   ```

2. On your Android phone:
   - Go to Settings > About phone
   - Tap "Build number" 7 times to enable Developer mode
   - Go to Settings > Developer options
   - Enable "USB debugging"

3. Connect phone via USB and authorise when prompted

4. Verify connection:
   ```bash
   adb devices -l
   ```

5. (Optional) For vision-based element detection:
   - Get an API key from [platform.openai.com](https://platform.openai.com)

#### Environment Variables

```bash
# Optional: For vision-based UI detection
OPENAI_API_KEY=sk-xxxxx
```

**Note:** The skill primarily uses text-based UI automation (99%+ accuracy, ~$0.01/action) instead of screenshot analysis (~$0.15/action).

---

### Email Management (himalaya)

Read, send, and manage emails from the command line.

#### Setup

1. Install himalaya:
   ```bash
   brew install himalaya
   ```

2. Configure your email accounts in `~/.config/himalaya/config.toml`:
   ```toml
   [accounts.default]
   email = "you@example.com"

   backend.type = "imap"
   backend.host = "imap.gmail.com"
   backend.port = 993
   backend.encryption = "tls"
   backend.login = "you@example.com"
   backend.auth.type = "password"
   backend.auth.command = "security find-generic-password -s himalaya-gmail -w"

   sender.type = "smtp"
   sender.host = "smtp.gmail.com"
   sender.port = 587
   sender.encryption = "starttls"
   sender.login = "you@example.com"
   sender.auth.type = "password"
   sender.auth.command = "security find-generic-password -s himalaya-gmail -w"
   ```

3. For Gmail, create an App Password:
   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Generate a password for "Mail"
   - Store it securely in macOS Keychain:
     ```bash
     security add-generic-password -s himalaya-gmail -a "you@example.com" -w "your-app-password"
     ```

---

### System Configuration Tips

#### Passwordless sudo (Optional)

For seamless app installations and system commands:

```bash
sudo visudo
```

Add this line (replace `yourusername`):
```
yourusername ALL=(ALL) NOPASSWD: ALL
```

**Warning:** Only do this on personal machines you fully control.

---

### Complete .env Example

```bash
# =============================================================================
# Core Configuration
# =============================================================================
PORT=3847
NODE_ENV=development
DOMAIN=your-domain.example.com

# Claude (leave empty for Claude Code subscription)
ANTHROPIC_API_KEY=

# Authentication
WEB_PASSWORD=your-secure-password
API_KEY=your-api-key

# Telegram
TELEGRAM_BOT_TOKEN=7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_USER_ID=123456789
TELEGRAM_MONITORING_GROUP_ID=-1001234567890

# =============================================================================
# Skills Configuration (Optional)
# =============================================================================

# Image Generation (Gemini Imagen)
GEMINI_API_KEY=

# Audio/Video Transcription (Deepgram)
DEEPGRAM_API_KEY=

# AI Voice (ElevenLabs)
ELEVENLABS_API_KEY=

# Android Control (OpenAI for vision, optional)
OPENAI_API_KEY=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_ACCESS_TOKEN=

# Twitter/X
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_TOKEN_SECRET=
TWITTER_BEARER_TOKEN=
```

---

## Security Notes

- Your Telegram bot only responds to your user ID
- Web interface requires password authentication
- API key and tokens stored locally in `~/.myagentive/config`
- No data sent to third parties (except Claude API)

## License

Elastic License 2.0 (ELv2). Created by [Agentive](https://TheAgentiveGroup.com).
