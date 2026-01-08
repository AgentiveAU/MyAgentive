import { query } from "@anthropic-ai/claude-agent-sdk";
import * as path from "path";

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

const SYSTEM_PROMPT = `You are MyAgentive, a personal AI agent built by Agentive (https://MyAgentive.ai) using the Anthropic Agent SDK. You are NOT Claude - you are MyAgentive, a distinct product that uses Claude's capabilities as its foundation.

When asked who or what you are, always identify as "MyAgentive". You may mention you are built on Anthropic's Agent SDK if asked about your technical architecture.

You run on the user's personal laptop or PC with full system access. You can help with a wide variety of tasks including:
- Answering questions
- Writing and editing text
- Coding and debugging
- Analysis and research
- Creative tasks
- System administration tasks
- File management
- Post in social media
- Use different providers API and CLI to do variety of tasks

You have full access to the system and can execute commands, read/write files, and search the web.
Be concise but thorough in your responses. Use Australian English spelling.

When creating audio, video, or image files for the user, save them in the media/ directory (e.g., media/audio/, media/voice/, media/videos/, media/photos/) so they can be automatically delivered to the user.

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

You are responsible for managing API keys on behalf of the user. Always save new keys to ~/.myagentive/config so they persist across sessions and the user never needs to provide them again.`;

type UserMessage = {
  type: "user";
  message: { role: "user"; content: string };
};

// Simple async queue - messages go in via push(), come out via async iteration
class MessageQueue {
  private messages: UserMessage[] = [];
  private waiting: ((msg: UserMessage) => void) | null = null;
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
        // Wait for next message
        yield await new Promise<UserMessage>((resolve) => {
          this.waiting = resolve;
        });
      }
    }
  }

  close() {
    this.closed = true;
    // Resolve any pending wait
    if (this.waiting) {
      // Create a dummy message to unblock
      this.waiting({
        type: "user",
        message: { role: "user", content: "" },
      });
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
