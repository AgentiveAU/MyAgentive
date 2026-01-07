import * as fs from "fs";
import * as path from "path";
import { configExists, runSetupWizard, getConfigPath } from "./setup-wizard.js";
import { APP_VERSION } from "./version.js";

// Load config from ~/.myagentive/config if it exists
function loadConfigFile(): void {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=");
        if (key && value !== undefined) {
          process.env[key.trim()] = value.trim();
        }
      }
    }

    // Set working directory to config dir for relative paths
    const configDir = path.dirname(configPath);
    process.chdir(configDir);
  }
}

async function bootstrap(): Promise<void> {
  // Check if config exists, if not run setup wizard
  if (!configExists()) {
    await runSetupWizard();
  }

  // Load config file into process.env
  loadConfigFile();

  // Now import the rest of the app (which depends on config)
  const { config } = await import("./config.js");
  const { runMigrations, closeDatabase } = await import("./db/database.js");
  const { startServer, stopServer } = await import("./server.js");
  const { startTelegramBot, stopTelegramBot } = await import("./telegram/bot.js");
  const {
    setupActivityMonitoring,
    sendStartupMessage,
    sendShutdownMessage,
  } = await import("./telegram/monitoring.js");

  console.log(`Starting MyAgentive v${APP_VERSION}...`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Domain: ${config.domain}`);

  // Run database migrations
  console.log("Running database migrations...");
  runMigrations();

  // Set up activity monitoring
  setupActivityMonitoring();

  // Start Express server
  await startServer();

  // Start Telegram bot
  await startTelegramBot();

  // Send startup notification
  await sendStartupMessage();

  console.log("MyAgentive is ready!");
  console.log(`Web interface: http://localhost:${config.port}`);

  // Graceful shutdown
  async function shutdown() {
    console.log("\nShutting down...");

    try {
      await sendShutdownMessage();
    } catch (e) {
      console.error("Error sending shutdown message:", e);
    }

    await stopTelegramBot();
    await stopServer();
    closeDatabase();

    console.log("Shutdown complete");
    process.exit(0);
  }

  // Handle signals
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
});

// Start the application
bootstrap().catch((error) => {
  console.error("Failed to start:", error);
  process.exit(1);
});
