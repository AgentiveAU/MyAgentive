# Integration Setup Guides

Detailed step-by-step setup instructions for each MyAgentive integration. These guides are referenced by the onboarding flow in SKILL.md.

All API keys are stored in `~/.myagentive/config` using `KEY=value` format (no quotes, no trailing spaces). All config changes require restart: `myagentivectl restart`.

---

## Email - himalaya

himalaya is a CLI email client that supports IMAP/SMTP for any email provider.

**Skill:** `email-himalaya`

### Gmail / Google Workspace Setup

1. Install himalaya:
   ```bash
   brew install himalaya
   ```

2. Create a Gmail App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated 16-character password

3. Store the password in macOS Keychain:
   ```bash
   security add-generic-password -s himalaya-gmail -a "you@gmail.com" -w "your-app-password"
   ```

4. Configure himalaya at `~/.config/himalaya/config.toml`:
   ```toml
   [accounts.gmail]
   default = true
   email = "you@gmail.com"
   display-name = "Your Name"

   [accounts.gmail.imap]
   host = "imap.gmail.com"
   port = 993
   encryption = "tls"
   login = "you@gmail.com"
   passwd.cmd = "security find-generic-password -s himalaya-gmail -a you@gmail.com -w"

   [accounts.gmail.smtp]
   host = "smtp.gmail.com"
   port = 465
   encryption = "tls"
   login = "you@gmail.com"
   passwd.cmd = "security find-generic-password -s himalaya-gmail -a you@gmail.com -w"
   ```

5. Test:
   ```bash
   himalaya envelope list
   ```

### Microsoft 365 / Outlook Setup

1. Install himalaya:
   ```bash
   brew install himalaya
   ```

2. Create an App Password in Microsoft 365:
   - Go to: https://account.microsoft.com/security
   - Navigate to "Additional security options" then "App passwords"
   - Create a new app password

3. Store the password in macOS Keychain:
   ```bash
   security add-generic-password -s himalaya-outlook -a "you@company.com" -w "your-app-password"
   ```

4. Configure himalaya at `~/.config/himalaya/config.toml`:
   ```toml
   [accounts.outlook]
   default = true
   email = "you@company.com"
   display-name = "Your Name"

   [accounts.outlook.imap]
   host = "outlook.office365.com"
   port = 993
   encryption = "tls"
   login = "you@company.com"
   passwd.cmd = "security find-generic-password -s himalaya-outlook -a you@company.com -w"

   [accounts.outlook.smtp]
   host = "smtp.office365.com"
   port = 587
   encryption = "start-tls"
   login = "you@company.com"
   passwd.cmd = "security find-generic-password -s himalaya-outlook -a you@company.com -w"
   ```

5. Test:
   ```bash
   himalaya envelope list
   ```

### Generic IMAP/SMTP Setup

For other providers, use the same himalaya pattern with the provider's IMAP/SMTP host and port. Common providers:

| Provider | IMAP Host | IMAP Port | SMTP Host | SMTP Port |
|----------|-----------|-----------|-----------|-----------|
| Yahoo | imap.mail.yahoo.com | 993 | smtp.mail.yahoo.com | 465 |
| iCloud | imap.mail.me.com | 993 | smtp.mail.me.com | 587 |
| Fastmail | imap.fastmail.com | 993 | smtp.fastmail.com | 465 |
| Zoho | imap.zoho.com | 993 | smtp.zoho.com | 465 |

---

## Telegram

Telegram is optional. MyAgentive works perfectly with just the web interface. Telegram adds mobile access, voice message support, and file sharing from anywhere.

### Step 1: Create a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Choose a display name (e.g., "My Personal Agent")
4. Choose a unique username ending in `bot` (e.g., `my_agent_xyz_bot`)
5. BotFather sends the bot token: `7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxx`
6. Add to config:
   ```bash
   echo "TELEGRAM_BOT_TOKEN=7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxx" >> ~/.myagentive/config
   ```

Optional bot customisation (via @BotFather):
- `/setdescription` to set bot description
- `/setabouttext` to set "About" text
- `/setuserpic` to set bot profile picture

### Step 2: Get Your Telegram User ID

1. Open Telegram and search for `@userinfobot`
2. Send any message
3. The bot replies with your numeric **Id** (e.g., `123456789`)
4. Add to config:
   ```bash
   echo "TELEGRAM_USER_ID=123456789" >> ~/.myagentive/config
   ```

Important: Use the numeric ID, not the @username. The ID restricts access so only you can control the bot in private chats.

### Step 3: Restart and Test

```bash
myagentivectl restart
```

Then in Telegram:
1. Search for your bot by its username
2. Tap "Start" or send `/start`
3. Send a test message

### Step 4 (Optional): Activity Monitoring Group

A monitoring group receives notifications about MyAgentive activity.

1. Create a new Telegram group (e.g., "MyAgentive Activity")
2. Add your bot to the group
3. Get the group ID:
   - Add `@getidsbot` to the group temporarily
   - It shows the group ID (a negative number like `-1001234567890`)
   - Remove @getidsbot afterwards
4. Add to config:
   ```bash
   echo "TELEGRAM_MONITORING_GROUP_ID=-1001234567890" >> ~/.myagentive/config
   ```
5. Restart: `myagentivectl restart`

### Step 5 (Optional): Shared Collaboration Group

Create a group where multiple people can interact with MyAgentive by @mentioning the bot.

1. Create a Telegram group and add your bot plus the people who should have access
2. Get the group ID using `@getidsbot`
3. Add to config:
   ```bash
   echo "TELEGRAM_ALLOWED_GROUPS=-1001234567890" >> ~/.myagentive/config
   ```
4. Restart: `myagentivectl restart`

The bot responds only when @mentioned in groups.

### Telegram Config Summary

| Variable | Required | Purpose |
|----------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | For Telegram | Bot token from @BotFather |
| `TELEGRAM_USER_ID` | For Telegram | Your numeric user ID |
| `TELEGRAM_MONITORING_GROUP_ID` | No | Group for activity notifications |
| `TELEGRAM_ALLOWED_GROUPS` | No | Groups where bot responds when @mentioned |
| `TELEGRAM_GROUP_POLICY` | No | Default: `allowlist`. Options: `open`, `disabled` |
| `TELEGRAM_REACTION_ACK` | No | Eye reaction on receiving messages (default: true) |
| `TELEGRAM_FRAGMENT_BUFFER_MS` | No | Buffer for rapid messages (default: 500ms) |
| `TELEGRAM_LINK_PREVIEW` | No | Link previews in responses (default: true) |

---

## ElevenLabs (Voice Synthesis)

Natural AI voices for phone calls and text-to-speech.

**Free tier:** 10,000 characters/month
**Skill:** `twilio-phone`

### Setup

1. Sign up: https://elevenlabs.io
2. Go to Profile (bottom-left) then API Keys
3. Copy the API key
4. Add to config:
   ```bash
   echo "ELEVENLABS_API_KEY=your_key" >> ~/.myagentive/config
   ```
5. Restart: `myagentivectl restart`

### Verification

Ask the agent: "List available ElevenLabs voices" to confirm the key works.

---

## Twilio (Phone Calls and SMS)

Phone line for making/receiving calls and sending SMS.

**Free tier:** Trial credits included on signup
**Skill:** `twilio-phone`

### Setup

1. Sign up: https://www.twilio.com
2. Get a phone number from the Twilio console
3. Install the CLI:
   ```bash
   brew tap twilio/brew && brew install twilio
   ```
4. Login:
   ```bash
   twilio login
   ```
5. Add the phone number to config for reference:
   ```bash
   echo "TWILIO_PHONE_NUMBER=+1234567890" >> ~/.myagentive/config
   ```

Note: Twilio primarily uses CLI authentication. The config entry is for the agent's reference.

### For Outbound AI Calls

The `outbound-caller` skill requires both ElevenLabs and Twilio, plus optionally HubSpot for CRM logging. Ensure ElevenLabs is configured first.

Additional config for outbound calls:
```bash
echo "TWILIO_ACCOUNT_SID=your_sid" >> ~/.myagentive/config
echo "TWILIO_AUTH_TOKEN=your_token" >> ~/.myagentive/config
```

---

## Deepgram (Transcription)

Audio and video transcription with multiple language support.

**Free credit:** $200 for new accounts
**Skill:** `deepgram-transcription`

### Setup

1. Sign up: https://console.deepgram.com/signup
2. Go to API Keys then create a new key
3. Add to config:
   ```bash
   echo "DEEPGRAM_API_KEY=your_key" >> ~/.myagentive/config
   ```
4. Restart: `myagentivectl restart`

### What It Enables

- Transcribe voice messages sent via Telegram
- Convert audio files (.mp3, .wav, .m4a) to text
- Transcribe video files
- Speaker diarisation (who said what)
- Multiple languages

---

## Gemini (Image Generation)

Generate images from text descriptions using Google Gemini.

**Free tier:** Limited requests per minute
**Skill:** `gemini-imagen`

### Setup

1. Get API key: https://aistudio.google.com/apikey
2. Add to config:
   ```bash
   echo "GEMINI_API_KEY=your_key" >> ~/.myagentive/config
   ```
3. Restart: `myagentivectl restart`

### Verification

Ask the agent: "Generate an image of a sunset over the ocean" to confirm it works.

---

## LinkedIn (Social Media)

Post updates, articles, and content to LinkedIn profiles and company pages.

**Requirement:** LinkedIn Company Page recommended
**Skill:** `social-media-poster`

### Setup

1. Create app: https://www.linkedin.com/developers/apps
2. Request "Share on LinkedIn" permission
3. Get Client ID and Client Secret from app settings
4. Generate access token using OAuth flow:
   ```bash
   cd ~/.myagentive/skills/social-media-poster
   source venv/bin/activate
   python scripts/get_token.py
   ```
5. Add to config:
   ```bash
   echo "LINKEDIN_CLIENT_ID=your_id" >> ~/.myagentive/config
   echo "LINKEDIN_CLIENT_SECRET=your_secret" >> ~/.myagentive/config
   echo "LINKEDIN_ACCESS_TOKEN=your_token" >> ~/.myagentive/config
   ```

Note: Tokens expire after approximately 60 days. Re-run `get_token.py` to refresh.

---

## Twitter/X (Social Media)

Post tweets, schedule content, share media.

**Free tier:** 1,500 tweets/month
**Skill:** `social-media-poster`

### Setup

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

Important: After changing permissions, regenerate all tokens.

---

## HubSpot (CRM)

Manage contacts, companies, deals, tickets, and pipelines.

**Skill:** `hubspot`

### Setup

1. Go to HubSpot Settings then Integrations then Private Apps
2. Create a private app with required scopes (contacts, companies, deals, tickets)
3. Copy the access token
4. Add to config:
   ```bash
   echo "HUBSPOT_ACCESS_TOKEN=your_token" >> ~/.myagentive/config
   ```
5. Restart: `myagentivectl restart`

---

## Xero (Accounting)

Manage invoices, bank transactions, contacts, and financial reports.

**Skill:** `xero-accountant`

### Setup

1. Create app at https://developer.xero.com/app/manage
2. Configure OAuth 2.0 credentials
3. OAuth tokens are stored at `~/secrets/xero_tokens.json`
4. The skill handles token refresh automatically

Follow the detailed instructions in `~/.myagentive/skills/xero-accountant/SKILL.md`.

---

## Halaxy (Healthcare Practice Management)

Manage patients, appointments, invoices, practitioners, and referrals.

**Skill:** `halaxy`

### Setup

1. Request API access from Halaxy
2. Configure OAuth credentials:
   ```bash
   echo "HALAXY_CLIENT_ID=your_id" >> ~/.myagentive/config
   echo "HALAXY_CLIENT_SECRET=your_secret" >> ~/.myagentive/config
   ```
3. Token cache stored at `~/secrets/halaxy_token.json`

Follow the detailed instructions in `~/.myagentive/skills/halaxy/SKILL.md`.

---

## Cloudflare (Web Hosting)

Deploy static websites, serverless functions, manage DNS.

**Free tier:** Generous limits for Pages, Workers, DNS
**Skill:** `cloudflare-pages-deploy`

### Setup

1. Sign up: https://dash.cloudflare.com/sign-up
2. Create API Token: https://dash.cloudflare.com/profile/api-tokens
3. Required permissions:
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

## Android Device Control

Control an Android phone via ADB for automation.

**Skill:** `android-use`

### Setup

1. Install ADB:
   ```bash
   brew install android-platform-tools
   ```
2. Enable Developer mode on Android (tap Build Number 7 times in Settings > About)
3. Enable USB debugging in Developer options
4. Connect phone via USB and authorise the connection
5. Verify:
   ```bash
   adb devices -l
   ```
6. Optional (for vision-based UI element detection):
   ```bash
   echo "OPENAI_API_KEY=your_key" >> ~/.myagentive/config
   ```

---

## Google Analytics and Search Console

Track website visitors, monitor search performance, SEO insights.

**Skill:** `seo-manager`

### Google Analytics Setup

1. Create property: https://analytics.google.com
2. Get Measurement ID (G-XXXXXXXXXX)
3. Add to config:
   ```bash
   echo "GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX" >> ~/.myagentive/config
   ```

### Search Console Setup

1. Add site: https://search.google.com/search-console
2. Verify ownership
3. For API access, create a GCP Service Account with Search Console access

---

## GCP Service Account

Access Google APIs (Sheets, Drive, Calendar, BigQuery, Cloud Storage).

### Setup

1. Create project: https://console.cloud.google.com
2. Create Service Account (IAM and Admin then Service Accounts)
3. Download JSON key file
4. Save to a secure location and configure:
   ```bash
   echo "GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json" >> ~/.myagentive/config
   echo "GCP_PROJECT_ID=your-project-id" >> ~/.myagentive/config
   ```
5. Restart: `myagentivectl restart`

---

## WordPress

Publish blog posts and content to WordPress sites.

**Skill:** `wordpress-publisher`

### Setup

Follow the detailed instructions in `~/.myagentive/skills/wordpress-publisher/SKILL.md` (if installed) or the skill documentation for WordPress REST API credentials.

---

## Security Notes

- All API keys are stored in `~/.myagentive/config`, readable only by your user account
- Never share API keys publicly
- Any key can be revoked from the provider's dashboard
- Keys are never displayed in full in agent responses
- Web tokens expire after 7 days
- The `API_KEY` in config never expires (for programmatic/CLI access)

---

## Troubleshooting Integrations

**Integration not working after adding key:**
```bash
myagentivectl restart
```
Config changes require a restart to take effect.

**Verify what is configured:**
```bash
grep -E "_KEY|_TOKEN|_SECRET|_SID" ~/.myagentive/config | cut -d'=' -f1
```

**Check server health:**
```bash
curl http://localhost:3847/health
```

**himalaya not connecting:**
```bash
himalaya envelope list --debug
```
Check credentials, app password, and IMAP/SMTP settings.

For deeper troubleshooting, use the `myagentive` skill which has a full troubleshooting reference.
