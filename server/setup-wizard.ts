import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import * as crypto from "crypto";

// NOTE: These are functions to ensure environment variables are read at runtime,
// not at compile time (important for compiled binaries)
function getConfigDir(): string {
  return path.join(process.env.HOME || "~", ".myagentive");
}

function getConfigFile(): string {
  return path.join(getConfigDir(), "config");
}

function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

function generateApiKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

function generatePassword(): string {
  return crypto.randomBytes(16).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
}

export function configExists(): boolean {
  return fs.existsSync(getConfigFile());
}

export function getConfigPath(): string {
  return getConfigFile();
}

export async function runSetupWizard(): Promise<void> {
  const rl = createInterface();

  console.log("");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                                                            ║");
  console.log("║   Welcome to MyAgentive Setup                              ║");
  console.log("║   Open-source personal AI agent for power users            ║");
  console.log("║                                                            ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("This wizard will help you configure MyAgentive.");
  console.log("Your settings will be saved to: ~/.myagentive/config");
  console.log("");

  // Create config directory
  const configDir = getConfigDir();
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.mkdirSync(path.join(configDir, "data"), { recursive: true });
  fs.mkdirSync(path.join(configDir, "media"), { recursive: true });

  let stepNumber = 1;

  // Step 1: Telegram Setup (Optional)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`STEP ${stepNumber}: Telegram Integration (Optional)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("Telegram integration allows you to chat with MyAgentive via Telegram.");
  console.log("You can skip this and use only the web interface.");
  console.log("");

  const setupTelegram = await question(
    rl,
    "Set up Telegram integration? (y/n, default: y): "
  );

  let telegramBotToken = "";
  let telegramUserId = "";
  let monitoringGroupId = "";

  if (setupTelegram.toLowerCase() !== "n") {
    console.log("");
    console.log("To create a Telegram bot:");
    console.log("1. Open Telegram and search for @BotFather");
    console.log("2. Send /newbot to create a new bot");
    console.log("3. Choose a display name (e.g., 'My Agent')");
    console.log("4. Choose a username ending in 'bot' (e.g., 'my_agent_bot')");
    console.log("5. Copy the token BotFather gives you");
    console.log("");
    console.log("Example token: 7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxx");
    console.log("");

    while (!telegramBotToken || !telegramBotToken.includes(":")) {
      telegramBotToken = await question(rl, "Paste your Telegram Bot Token: ");
      if (!telegramBotToken.includes(":")) {
        console.log("Invalid token format. It should contain a colon (:)");
      }
    }
    console.log("✓ Bot token saved");
    console.log("");

    // Telegram User ID
    stepNumber++;
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`STEP ${stepNumber}: Get your Telegram User ID`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("Your bot will ONLY respond to your Telegram account.");
    console.log("");
    console.log("1. Open Telegram and search for @userinfobot or @getidsbot");
    console.log("2. Send /start to the bot");
    console.log("3. Copy the numeric ID it returns (e.g., 507299420)");
    console.log("");
    console.log("Important: This must be a number, not your @username");
    console.log("");

    while (!telegramUserId || isNaN(parseInt(telegramUserId))) {
      telegramUserId = await question(rl, "Enter your Telegram User ID: ");
      if (isNaN(parseInt(telegramUserId))) {
        console.log("Invalid ID. Please enter a numeric ID (e.g., 507299420)");
      }
    }
    console.log("✓ User ID saved");
  } else {
    console.log("✓ Skipping Telegram setup (web-only mode)");
  }
  console.log("");

  // Web Password Step
  stepNumber++;
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`STEP ${stepNumber}: Set Web Interface Password`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("The web interface runs at http://localhost:3847");
  console.log("Set a password to protect access.");
  console.log("");

  const suggestedPassword = generatePassword();
  let webPassword = await question(
    rl,
    `Enter a password (or press Enter for: ${suggestedPassword}): `
  );
  if (!webPassword) {
    webPassword = suggestedPassword;
  }
  console.log("✓ Web password saved");
  console.log("");

  // Activity Monitoring (only if Telegram is configured)
  if (telegramBotToken) {
    stepNumber++;
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`STEP ${stepNumber}: Activity Monitoring (Optional)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("");
    console.log("You can receive activity notifications in a Telegram group.");
    console.log("This is optional - press Enter to skip.");
    console.log("");
    console.log("To set up monitoring later:");
    console.log("1. Create a Telegram group");
    console.log("2. Add your bot to the group");
    console.log("3. Add @getidsbot to get the group's numeric ID");
    console.log("4. Edit ~/.myagentive/config and add the group ID");
    console.log("");

    monitoringGroupId = await question(
      rl,
      "Monitoring Group ID (or press Enter to skip): "
    );
    if (monitoringGroupId) {
      console.log("✓ Monitoring group saved");
    } else {
      console.log("✓ Skipped monitoring setup");
    }
    console.log("");
  }

  // Agent ID (Optional)
  stepNumber++;
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`STEP ${stepNumber}: Agent ID (Optional)`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("Give your agent a unique identifier (e.g., AG001, LAPTOP, WORK).");
  console.log("This ID will appear in the web UI to help you identify which");
  console.log("instance you're connected to when running multiple agents.");
  console.log("Press Enter to skip (no ID will be shown).");
  console.log("");

  const agentId = await question(
    rl,
    "Agent ID (or press Enter to skip): "
  );
  if (agentId) {
    console.log(`✓ Agent ID set to: ${agentId}`);
  } else {
    console.log("✓ Skipped agent ID");
  }
  console.log("");

  // Server Port
  stepNumber++;
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`STEP ${stepNumber}: Server Port`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  let port = await question(rl, "Port number (default: 3847): ");
  if (!port) {
    port = "3847";
  }
  console.log(`✓ Server will run on port ${port}`);
  console.log("");

  // Generate API key
  const apiKey = generateApiKey();

  // Build Telegram section of config
  const telegramSection = telegramBotToken
    ? `# Telegram
TELEGRAM_BOT_TOKEN=${telegramBotToken}
TELEGRAM_USER_ID=${telegramUserId}
${monitoringGroupId ? `TELEGRAM_MONITORING_GROUP_ID=${monitoringGroupId}` : "# TELEGRAM_MONITORING_GROUP_ID=  # Uncomment and add group ID for monitoring"}`
    : `# Telegram (not configured - web-only mode)
# To enable Telegram later, add these lines:
# TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
# TELEGRAM_USER_ID=your_telegram_user_id`;

  // Write config file
  const configContent = `# MyAgentive Configuration
# Generated by setup wizard
# You can edit this file to change settings

# Server
PORT=${port}
NODE_ENV=production

# Agent Identity (optional - shown in Web UI)
${agentId ? `AGENT_ID=${agentId}` : "# AGENT_ID=  # Uncomment and set to show an identifier in the Web UI"}

# Authentication
WEB_PASSWORD=${webPassword}
API_KEY=${apiKey}

${telegramSection}

# Database (relative to ~/.myagentive/)
DATABASE_PATH=./data/myagentive.db

# Media storage (relative to ~/.myagentive/)
MEDIA_PATH=./media
`;

  fs.writeFileSync(getConfigFile(), configContent);

  // Copy prompt files to user config directory
  const systemPromptDest = path.join(configDir, "system_prompt.md");
  const userPromptDest = path.join(configDir, "user_prompt.md");
  const defaultSystemSrc = path.join(__dirname, "default-system-prompt.md");
  const defaultUserSrc = path.join(__dirname, "default-user-prompt.md");

  if (fs.existsSync(defaultSystemSrc)) {
    fs.copyFileSync(defaultSystemSrc, systemPromptDest);
    console.log("✓ System prompt created");
  }
  if (fs.existsSync(defaultUserSrc) && !fs.existsSync(userPromptDest)) {
    fs.copyFileSync(defaultUserSrc, userPromptDest);
    console.log("✓ User prompt created (customisable)");
  }

  rl.close();

  // Summary
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Setup Complete!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("Configuration saved to: ~/.myagentive/config");
  console.log("");
  console.log("To access MyAgentive:");
  console.log(`  • Web:      http://localhost:${port}`);
  console.log(`  • Password: ${webPassword}`);
  if (telegramBotToken) {
    console.log("  • Telegram: Message your bot directly");
  } else {
    console.log("  • Telegram: Not configured (web-only mode)");
  }
  console.log("");
  console.log("To edit settings later: nano ~/.myagentive/config");
  console.log("To customise AI behaviour: nano ~/.myagentive/user_prompt.md");
  console.log("");
  console.log("Starting MyAgentive...");
  console.log("");
}
