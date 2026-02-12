---
name: myagentive-onboarding
description: Interactive onboarding for new MyAgentive users. This skill should be used when welcoming new users, when a user says "get started", "set me up", "what can you do", "onboard me", or when first meeting a user who has no profile in memory. Guides users through personalisation, communication setup, skill discovery, and integration configuration in a conversational step-by-step flow.
---

# MyAgentive Onboarding

This skill provides an interactive, conversational onboarding experience. Follow the steps in order. Each step gathers information, stores it in memory, and configures the agent to serve the user's specific needs. Do not dump all information at once; ask questions, wait for answers, then proceed.

## Before Starting

Check whether onboarding has already been completed:

```bash
cat ~/.myagentive/memory/user-profile.md 2>/dev/null
```

If a profile exists, summarise what is already known and ask: "Would you like to update your profile, continue setting up integrations, or start fresh?"

If no profile exists, begin at Step 1.

---

## Step 1: Welcome and Introduction

Greet the user warmly and introduce MyAgentive in 2-3 sentences:

> Welcome! I am your MyAgentive agent, a personal AI assistant built by Agentive. I run on your machine (or server) and can perform real tasks: manage files, run commands, search the web, send emails, make phone calls, create documents, and much more. Let me get to know you so I can be most helpful.

Then proceed to gather the user's profile.

---

## Step 2: Get to Know the User

Ask these questions **one or two at a time** to keep the conversation natural. Do not ask all at once.

### Round 1: Identity
- "What is your name? (What should I call you?)"
- "What is your business or organisation name? (Or say 'personal use' if this is for personal tasks.)"

### Round 2: Context
- "What is your business website? (Skip if not applicable.)"
- "What is your role or what do you do? For example: marketing consultant, software developer, clinic manager, freelancer."

### Round 3: Daily Work
- "What are the main tasks you do every day? For example: answering emails, writing proposals, posting on social media, managing invoices, scheduling appointments."
- "Is there anything specific you are hoping I can help with right away?"

After gathering answers, confirm with the user: "Here is what I have so far: [summary]. Is that correct?"

---

## Step 3: Store the User Profile in Memory

Once confirmed, write the profile to `~/.myagentive/memory/user-profile.md`:

```markdown
# User Profile

- **Name:** [name]
- **Business:** [business name or "Personal use"]
- **Website:** [website or "N/A"]
- **Role:** [role description]
- **Daily tasks:** [comma-separated list]
- **Immediate needs:** [what they want help with first]
- **Onboarded:** [date]
```

Also create `~/.myagentive/memory/onboarding-status.md`:

```markdown
# Onboarding Status

## Completed
- [x] User profile collected

## Pending
- [ ] Communication setup
- [ ] Skill discovery
- [ ] Integration configuration

## Configured Integrations
(none yet)

## Skipped / Later
(none yet)
```

Update `~/.myagentive/user_prompt.md` to add the user's name and key preferences. Preserve any existing content. Append a section like:

```markdown
## User Profile (from onboarding)
- Name: [name]
- Business: [business name]
- Tone preference: [professional/casual, based on conversation style observed]
```

Tell the user: "Great, I have saved your profile. I will remember you across all our conversations."

---

## Step 4: Communication Setup

Communication is the most universally useful capability. Guide the user through setting up their preferred communication channels.

### 4a: Email

Ask: "Do you use email for work? Which email provider do you use?"

Based on the answer:

**Gmail / Google Workspace:**
- Recommend the `email-himalaya` skill
- Guide through himalaya CLI setup (see `references/integration-setup.md`, section "Email - himalaya")
- This handles reading, sending, and searching emails

**Microsoft 365 / Outlook:**
- Note: native Microsoft 365 email integration is on the roadmap
- For now, himalaya also supports IMAP/SMTP, which works with Outlook
- Guide through himalaya setup with IMAP configuration

**Other provider:**
- himalaya supports any IMAP/SMTP email provider
- Guide through generic himalaya setup

If the user wants to skip email, note it in `onboarding-status.md` under "Skipped / Later" and move on.

### 4b: Voice and Phone Calls

Ask: "Would you like your agent to make and receive phone calls with a natural AI voice? This is useful for things like appointment reminders, lead follow-ups, or quick check-in calls."

If yes:

1. **ElevenLabs (voice):** Guide the user to create a free account at https://elevenlabs.io. The free tier provides 10,000 characters per month, which is enough for basic use. Collect the API key and store as `ELEVENLABS_API_KEY` in `~/.myagentive/config`.

2. **Twilio (phone line):** Guide the user to create a Twilio account at https://www.twilio.com. Twilio provides trial credits. Install the CLI: `brew tap twilio/brew && brew install twilio`, then `twilio login`. Collect the phone number and store as `TWILIO_PHONE_NUMBER` in config.

Both are needed for the `twilio-phone` skill to work. See `references/integration-setup.md` for detailed steps.

If the user wants to skip voice, note it and move on.

### 4c: Telegram (if not already configured)

Check if Telegram is already set up:

```bash
grep -E "TELEGRAM_BOT_TOKEN|TELEGRAM_USER_ID" ~/.myagentive/config
```

If not configured, ask: "Would you like to access me from Telegram on your phone? It is optional; the web interface works perfectly on its own."

If yes, guide through Telegram setup (see `references/integration-setup.md`, section "Telegram"). If no, move on.

After completing communication setup, update `onboarding-status.md` to mark communication as done and list what was configured.

---

## Step 5: Skill Discovery

This is where the onboarding becomes personalised. Based on the user's profile (role, daily tasks, immediate needs), recommend relevant skills and explain what each one does.

### 5a: Identify Relevant Skills

Read the user's profile from memory and match their needs to available skills:

| User Need | Recommended Skill | What It Does | Setup Required |
|-----------|------------------|--------------|----------------|
| Emails | `email-himalaya` | Read, send, search emails from any provider | himalaya CLI |
| Phone calls | `twilio-phone` | Make/receive calls with AI voice, send SMS | Twilio + ElevenLabs |
| Social media | `social-media-poster` | Post to LinkedIn and Twitter/X | API tokens |
| Image creation | `gemini-imagen` | Generate images from text descriptions | Gemini API key (free) |
| Transcription | `deepgram-transcription` | Transcribe audio, video, voice messages | Deepgram API key ($200 free credit) |
| Documents | `docx` | Create and edit Word documents | None |
| Spreadsheets | `xlsx` | Create and edit Excel spreadsheets | None |
| Presentations | `pptx` | Create and edit PowerPoint presentations | None |
| PDFs | `pdf` | Create, merge, split, extract from PDFs | None |
| Android automation | `android-use` | Control Android phone via ADB | ADB + USB |
| CRM | `hubspot` | Manage contacts, deals, companies in HubSpot | HubSpot API key |
| Accounting | `xero-accountant` | Manage invoices, bank transactions, reports in Xero | Xero OAuth |
| Healthcare practice | `halaxy` | Manage patients, appointments, invoices in Halaxy | Halaxy OAuth |
| Outbound calls (sales) | `outbound-caller` | AI-powered lead qualification and follow-up calls | ElevenLabs + Twilio + HubSpot |
| Website deployment | `cloudflare-pages-deploy` | Deploy static sites to Cloudflare Pages | Cloudflare account |
| SEO | `seo-manager` | Manage Google Analytics, Search Console, GTM | Google credentials |
| WordPress | `wordpress-publisher` | Publish blog posts to WordPress | WordPress credentials |

### 5b: Present Recommendations

Present only the skills relevant to the user's stated needs. Group them as:

**"Based on what you told me, these skills would be most useful for you:"**
- List 3-5 most relevant skills with a one-sentence explanation of each

**"These are also available if you need them later:"**
- Brief mention of remaining skills

For each recommended skill, ask: "Would you like to set up [skill name] now, later, or skip it?"

### 5c: Built-in Capabilities (No Setup)

Always mention these as already available with no setup:
- Document creation (Word, Excel, PowerPoint, PDF)
- File management and delivery
- Web search and page fetching
- Running bash commands and scripts
- Session management across web and Telegram

---

## Step 6: Integration Configuration

For each skill the user wants to set up now, guide them through the configuration. Follow the detailed guides in `references/integration-setup.md`.

### Configuration Process (for each integration)

1. Explain what API key or credential is needed and where to get it
2. Provide the signup/dashboard URL
3. Wait for the user to provide the key
4. Store the key in `~/.myagentive/config` using the correct format:
   ```bash
   echo "KEY_NAME=value" >> ~/.myagentive/config
   ```
5. **Important config format:** No quotes around values, no trailing spaces, one variable per line
6. After all keys for a session are added, restart once: `myagentivectl restart`
7. Verify the integration works with a quick test

After each integration, update `~/.myagentive/memory/onboarding-status.md`:
- Move from "Pending" to "Configured Integrations" with the date
- Note any the user wants to do later under "Skipped / Later"

---

## Step 7: Personalise the User Prompt

Based on everything learned during onboarding, update `~/.myagentive/user_prompt.md` with useful context. Preserve any existing content and append:

```markdown
## About Me (from onboarding)
- Name: [name]
- Business: [business] ([website])
- Role: [role]
- Common tasks: [tasks]

## My Preferences
- [Any preferences observed during conversation, e.g., communication style, urgency of tasks]

## Configured Integrations
- [List of what was set up, e.g., "Email via himalaya (Gmail)", "Deepgram transcription"]
```

This ensures every future session starts with context about the user.

---

## Step 8: Wrap Up and Next Steps

Summarise what was accomplished:

1. "Here is what we set up today: [list configured integrations]"
2. "Here is what you can try right now: [2-3 specific example commands based on their setup]"
3. "Here is what is still on your to-do list: [integrations they said 'later' to]"

Provide personalised example prompts based on their role and configured skills. For example:

- For a marketer: "Try asking me to draft a LinkedIn post about [their business]"
- For a consultant: "Try asking me to create a proposal document for a client"
- For a clinic manager: "Try asking me to check today's appointments"
- For anyone with email: "Try asking me to check your latest emails"
- For anyone with Deepgram: "Send me a voice message and I will transcribe it"

End with: "You can always come back and say 'continue onboarding' or 'set up [integration name]' to configure more integrations. I am here to help with your day-to-day tasks whenever you need me."

Update `onboarding-status.md` to reflect completion.

---

## Handling Partial Onboarding

If the user returns mid-onboarding or says "continue onboarding":

1. Read `~/.myagentive/memory/onboarding-status.md`
2. Read `~/.myagentive/memory/user-profile.md`
3. Greet them by name
4. Show what is already done and what is still pending
5. Resume from the next incomplete step

---

## Handling "What Can You Do?"

If triggered by a general capability question rather than explicit onboarding:

1. Check if a user profile exists in memory
2. If yes: give a personalised answer based on their configured integrations and role
3. If no: give the brief overview below, then offer to start full onboarding

Brief overview response:

> I am MyAgentive, your personal AI agent. Here is what I can do right now:
>
> **Always available (no setup):** Run commands, manage files, search the web, create documents (Word, Excel, PowerPoint, PDF), deliver files to you via web or Telegram.
>
> **With integrations:** Read and send emails, make phone calls with AI voice, post to social media, generate images, transcribe audio/video, manage your CRM, handle invoicing, control your Android phone, deploy websites, and more.
>
> Want me to walk you through setting things up? Just say "get started" or "onboard me".

---

## Key File Locations

| File | Purpose |
|------|---------|
| `~/.myagentive/config` | All API keys and configuration (KEY=value format, no quotes) |
| `~/.myagentive/memory/user-profile.md` | User identity and context |
| `~/.myagentive/memory/onboarding-status.md` | Onboarding progress tracker |
| `~/.myagentive/user_prompt.md` | Persistent user preferences (loaded every session) |
| `~/.myagentive/skills/` | Installed skills |

All config changes require restart: `myagentivectl restart`

---

## Reference

For detailed integration setup guides (API key URLs, step-by-step instructions, troubleshooting), see `references/integration-setup.md`.
