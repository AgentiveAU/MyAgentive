import { query } from "@anthropic-ai/claude-agent-sdk";
import * as path from "path";
import * as fs from "fs";

// Current model preference (can be changed at runtime)
let currentModel: "opus" | "sonnet" | "haiku" = "opus";

// Determine project root directory (where .claude/skills/ lives)
// In compiled binary: import.meta.dir returns /$bunfs/root/, use executable location
// In development: use import.meta.dir relative to source
function getProjectRoot(): string {
  const isCompiledBinary = import.meta.dir.startsWith("/$bunfs");
  if (isCompiledBinary) {
    // Compiled binary: use the directory containing the executable
    // Installation structure: ~/.myagentive/myagentive with .claude/skills/ alongside
    return path.dirname(process.execPath);
  }
  // Development: go up from server/core/ to repo root
  return path.resolve(import.meta.dir, "../..");
}

const PROJECT_ROOT = getProjectRoot();

export function getCurrentModel(): string {
  return currentModel;
}

export function setCurrentModel(model: "opus" | "sonnet" | "haiku"): void {
  currentModel = model;
}

// Embedded default system prompt (fallback for compiled binaries)
const DEFAULT_SYSTEM_PROMPT = `You are MyAgentive, a super personal AI agent built by Agentive (https://MyAgentive.ai). You are NOT Claude - you are MyAgentive, a distinct product that uses Claude's capabilities as its foundation.

When asked who or what you are, always identify as "MyAgentive".

You run on the user's personal laptop or PC with full system access. You can install any application or skill you need. You can help with a wide variety of tasks including:
- Answering questions
- Writing and editing text
- Coding and debugging
- Analysis and research
- Creative tasks
- System administration tasks
- File management
- Post in social media
- Use different providers API and CLI to do variety of tasks

You have full access to the system and can execute commands, read/write files, and search the web, install applications and even request user to give you more access, API key for using external services.
Always ask permission before actions that could have severe impact (it may break the user system or make high security risk)
Be concise but thorough in your responses. Use Australian English spelling.

## Saving Files for User Download

When creating files that the user should download, save them to ~/.myagentive/media/ subdirectories:
- Documents, spreadsheets, and PDFs: ~/.myagentive/media/documents/
- Images and photos: ~/.myagentive/media/photos/
- Audio files: ~/.myagentive/media/audio/
- Video files: ~/.myagentive/media/videos/

Files saved in ~/.myagentive/media/ will be automatically available for download in the UI. The user can access them directly from the web interface without needing to use file commands.

IMPORTANT: Always include the complete file path WITH filename in your response (e.g., ~/.myagentive/media/documents/report.pdf). This enables automatic file delivery to the user.

## API Keys and Configuration

Your configuration file is located at ~/.myagentive/config. This file contains environment variables including API keys for various services.

When you need an API key for any integration (e.g., GEMINI_API_KEY, DEEPGRAM_API_KEY, OPENAI_API_KEY, ELEVENLABS_API_KEY, social media tokens, etc.):
1. First, read ~/.myagentive/config to check if the key already exists
2. If the key exists, use it from the environment variable (it is automatically loaded)
3. If the key is missing or empty:
   - Explain to the user what the key is for and where to get it (provide the relevant URL)
   - Ask the user to paste the API key in the chat
   - Once the user provides the key, append it to ~/.myagentive/config in the format: KEY_NAME=value
   - Confirm to the user that the key has been saved for future use

You are responsible for managing API keys on behalf of the user. Always save new keys to ~/.myagentive/config so they persist across sessions and the user never needs to provide them again.

## MyAgentive Self-Knowledge

When users ask about MyAgentive itself (You) like what it is, how to configure it, troubleshooting, architecture, use "myagentive" skill to answer.`;

// System prompt file paths
// NOTE: These are functions to ensure environment variables are read at runtime,
// not at compile time (important for compiled binaries)
function getMyAgentiveHome(): string {
  return process.env.MYAGENTIVE_HOME || path.join(process.env.HOME || "", ".myagentive");
}

function getSystemPromptPath(): string {
  return path.join(getMyAgentiveHome(), "system_prompt.md");
}

function getDefaultPromptPath(): string {
  const isCompiledBinary = import.meta.dir.startsWith("/$bunfs");
  if (isCompiledBinary) {
    // Binary: default prompt alongside executable
    return path.join(path.dirname(process.execPath), "default-system-prompt.md");
  }
  // Development: in server/ directory
  return path.resolve(import.meta.dir, "../default-system-prompt.md");
}

function loadSystemPrompt(): string {
  const systemPromptPath = getSystemPromptPath();
  const myAgentiveHome = getMyAgentiveHome();

  // Try user's custom prompt first
  if (fs.existsSync(systemPromptPath)) {
    try {
      const customPrompt = fs.readFileSync(systemPromptPath, "utf-8");
      console.log(`Loaded custom system prompt from: ${systemPromptPath}`);
      return customPrompt;
    } catch (error) {
      console.warn("Failed to read custom system prompt, using default");
    }
  }

  // Load default prompt
  const defaultPath = getDefaultPromptPath();
  let defaultPrompt: string;

  if (fs.existsSync(defaultPath)) {
    defaultPrompt = fs.readFileSync(defaultPath, "utf-8");
  } else {
    // Fallback to embedded default (for compiled binary)
    defaultPrompt = DEFAULT_SYSTEM_PROMPT;
  }

  // Copy default to user location for discoverability
  try {
    if (fs.existsSync(myAgentiveHome)) {
      fs.writeFileSync(systemPromptPath, defaultPrompt, "utf-8");
      console.log(`Created customisable system prompt at: ${systemPromptPath}`);
    }
  } catch (error) {
    console.warn("Could not create user system prompt file");
  }

  return defaultPrompt;
}

// Load system prompt once at startup
const SYSTEM_PROMPT = loadSystemPrompt();

type UserMessage = {
  type: "user";
  message: { role: "user"; content: string };
};

// Simple async queue - messages go in via push(), come out via async iteration
class MessageQueue {
  private messages: UserMessage[] = [];
  private waiting: ((msg: UserMessage | null) => void) | null = null;
  private closed = false;

  push(content: string) {
    const msg: UserMessage = {
      type: "user",
      message: {
        role: "user",
        content,
      },
    };

    if (this.waiting) {
      // Someone is waiting for a message - give it to them
      this.waiting(msg);
      this.waiting = null;
    } else {
      // No one waiting - queue it
      this.messages.push(msg);
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<UserMessage> {
    while (!this.closed) {
      if (this.messages.length > 0) {
        yield this.messages.shift()!;
      } else {
        // Wait for next message (or null if closed)
        const msg = await new Promise<UserMessage | null>((resolve) => {
          this.waiting = resolve;
        });
        // If we got null, the queue was closed while waiting
        if (msg === null) {
          break;
        }
        yield msg;
      }
    }
  }

  close() {
    this.closed = true;
    // Resolve any pending wait with null to signal closure
    // (instead of sending an empty message which causes API errors)
    if (this.waiting) {
      this.waiting(null);
      this.waiting = null;
    }
  }
}

// Find Claude Code in nvm installations
function findNvmClaudePaths(): string[] {
  const fs = require("fs");
  const nvmDir = `${process.env.HOME}/.nvm/versions/node`;
  if (!fs.existsSync(nvmDir)) return [];
  try {
    const versions = fs.readdirSync(nvmDir);
    return versions.map((v: string) => `${nvmDir}/${v}/bin/claude`);
  } catch {
    return [];
  }
}

export class AgentSession {
  private queue = new MessageQueue();
  private outputIterator: AsyncIterator<any> | null = null;
  private closed = false;

  constructor() {
    // Start the query immediately with the queue as input
    // Use the current model preference

    // Find Claude Code executable - check common locations
    const possiblePaths = [
      process.env.CLAUDE_CODE_PATH,
      "/usr/local/bin/claude",
      `${process.env.HOME}/.local/bin/claude`,
      `${process.env.HOME}/.claude/local/claude`,
      // nvm installations (common on Linux when using npm install -g)
      ...findNvmClaudePaths(),
    ].filter(Boolean) as string[];

    const fs = require("fs");
    let claudePath: string | undefined;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        claudePath = p;
        break;
      }
    }

    this.outputIterator = query({
      prompt: this.queue as any,
      options: {
        maxTurns: 100,
        model: currentModel,
        cwd: PROJECT_ROOT, // Use repo root for .claude/skills/ lookup
        settingSources: ['project'],
        allowedTools: [
          "Bash",
          "Read",
          "Write",
          "Edit",
          "Glob",
          "Grep",
          "WebSearch",
          "WebFetch",
          "TodoWrite",
        ],
        systemPrompt: SYSTEM_PROMPT,
        ...(claudePath && { pathToClaudeCodeExecutable: claudePath }),
      },
    })[Symbol.asyncIterator]();
  }

  // Send a message to the agent
  sendMessage(content: string) {
    if (!this.closed) {
      this.queue.push(content);
    }
  }

  // Get the output stream
  async *getOutputStream() {
    if (!this.outputIterator) {
      throw new Error("Session not initialized");
    }
    while (!this.closed) {
      const { value, done } = await this.outputIterator.next();
      if (done) break;
      yield value;
    }
  }

  close() {
    this.closed = true;
    this.queue.close();
  }
}
