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

  // Step 1: Telegram Bot Token
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 1: Create your Telegram Bot");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  console.log("1. Open Telegram and search for @BotFather");
  console.log("2. Send /newbot to create a new bot");
  console.log("3. Choose a display name (e.g., 'My Agent')");
  console.log("4. Choose a username ending in 'bot' (e.g., 'my_agent_bot')");
  console.log("5. Copy the token BotFather gives you");
  console.log("");
  console.log("Example token: 7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxx");
  console.log("");

  let telegramBotToken = "";
  while (!telegramBotToken || !telegramBotToken.includes(":")) {
    telegramBotToken = await question(rl, "Paste your Telegram Bot Token: ");
    if (!telegramBotToken.includes(":")) {
      console.log("Invalid token format. It should contain a colon (:)");
    }
  }
  console.log("✓ Bot token saved");
  console.log("");

  // Step 2: Telegram User ID
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 2: Get your Telegram User ID");
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

  let telegramUserId = "";
  while (!telegramUserId || isNaN(parseInt(telegramUserId))) {
    telegramUserId = await question(rl, "Enter your Telegram User ID: ");
    if (isNaN(parseInt(telegramUserId))) {
      console.log("Invalid ID. Please enter a numeric ID (e.g., 507299420)");
    }
  }
  console.log("✓ User ID saved");
  console.log("");

  // Step 3: Web Password
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 3: Set Web Interface Password");
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

  // Step 4: Optional Monitoring Group
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 4: Activity Monitoring (Optional)");
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

  const monitoringGroupId = await question(
    rl,
    "Monitoring Group ID (or press Enter to skip): "
  );
  if (monitoringGroupId) {
    console.log("✓ Monitoring group saved");
  } else {
    console.log("✓ Skipped monitoring setup");
  }
  console.log("");

  // Step 5: Agent ID (Optional)
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 5: Agent ID (Optional)");
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

  // Step 6: Port
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("STEP 6: Server Port");
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

# Telegram
TELEGRAM_BOT_TOKEN=${telegramBotToken}
TELEGRAM_USER_ID=${telegramUserId}
${monitoringGroupId ? `TELEGRAM_MONITORING_GROUP_ID=${monitoringGroupId}` : "# TELEGRAM_MONITORING_GROUP_ID=  # Uncomment and add group ID for monitoring"}

# Database (relative to ~/.myagentive/)
DATABASE_PATH=./data/myagentive.db

# Media storage (relative to ~/.myagentive/)
MEDIA_PATH=./media
`;

  fs.writeFileSync(getConfigFile(), configContent);

  // Copy default system prompt to user config directory
  const systemPromptDest = path.join(configDir, "system_prompt.md");
  const defaultPromptSrc = path.join(__dirname, "default-system-prompt.md");

  if (fs.existsSync(defaultPromptSrc)) {
    fs.copyFileSync(defaultPromptSrc, systemPromptDest);
    console.log("✓ System prompt created (customisable)");
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
  console.log("  • Telegram: Message your bot directly");
  console.log("");
  console.log("To edit settings later: nano ~/.myagentive/config");
  console.log("To customise AI behaviour: nano ~/.myagentive/system_prompt.md");
  console.log("");
  console.log("Starting MyAgentive...");
  console.log("");
}
