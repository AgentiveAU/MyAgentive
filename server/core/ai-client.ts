import { query, type Query } from "@anthropic-ai/claude-agent-sdk";
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
    // Binary at ~/.myagentive/bin/myagentive
    // Project root is ~/.myagentive/ (parent of bin/)
    return path.resolve(path.dirname(process.execPath), "..");
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

// Embedded default system prompt (fallback when no file is found)
const DEFAULT_SYSTEM_PROMPT = `<!-- This file is managed by MyAgentive. It will be overwritten on upgrades. -->
<!-- To add your own instructions, edit user_prompt.md instead. -->

You are MyAgentive, a super personal AI agent built by Agentive (https://MyAgentive.ai). You are NOT Claude - you are MyAgentive, a distinct product that uses Claude's capabilities as its foundation.

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

When users ask about MyAgentive itself (You) like what it is, how to configure it, troubleshooting, architecture, use "myagentive" skill to answer.

## Style and Branding

- In all documents and posts, use Australian English spelling
- NEVER use em dash. Instead use appropriate alternatives: comma, colon, semicolon, or start a new sentence
- When creating commits, pull requests, GitHub issues, or similar: do not reference Claude Code or Anthropic. Instead use: "By MyAgentive (www.myagentive.ai)"

<!-- End of system prompt. User customisations go in user_prompt.md -->`;

// System prompt file paths
// NOTE: These are functions to ensure environment variables are read at runtime,
// not at compile time (important for compiled binaries)
function getMyAgentiveHome(): string {
  return process.env.MYAGENTIVE_HOME || path.join(process.env.HOME || "", ".myagentive");
}

function getSystemPromptPath(): string {
  return path.join(getMyAgentiveHome(), "system_prompt.md");
}

function getUserPromptPath(): string {
  return path.join(getMyAgentiveHome(), "user_prompt.md");
}

function getDefaultPromptPath(filename: string): string {
  const isCompiledBinary = import.meta.dir.startsWith("/$bunfs");
  if (isCompiledBinary) {
    // Binary: default prompts in install directory
    return path.join(getMyAgentiveHome(), filename);
  }
  // Development: in server/ directory
  return path.resolve(import.meta.dir, "..", filename);
}

/**
 * Expand ~ and ~/.myagentive to absolute paths in prompts.
 * Ensures the agent uses the correct paths regardless of its working directory.
 */
function expandPathsInPrompt(prompt: string): string {
  const home = process.env.HOME || "";
  const myAgentiveHome = getMyAgentiveHome();

  // Replace ~/.myagentive first to avoid double-replacement
  let expanded = prompt.replace(/~\/\.myagentive/g, myAgentiveHome);
  expanded = expanded.replace(/~\//g, home + "/");

  return expanded;
}

function loadSystemPrompt(): string {
  const systemPromptPath = getSystemPromptPath();

  // Try the installed system_prompt.md first (written by installer)
  if (fs.existsSync(systemPromptPath)) {
    try {
      const prompt = fs.readFileSync(systemPromptPath, "utf-8");
      console.log(`Loaded system prompt from: ${systemPromptPath}`);
      return expandPathsInPrompt(prompt);
    } catch (error) {
      console.warn("Failed to read system prompt, trying default file");
    }
  }

  // Try the default-system-prompt.md file
  const defaultPath = getDefaultPromptPath("default-system-prompt.md");
  if (fs.existsSync(defaultPath)) {
    const prompt = fs.readFileSync(defaultPath, "utf-8");
    console.log(`Loaded system prompt from default: ${defaultPath}`);
    return expandPathsInPrompt(prompt);
  }

  // Fallback to embedded default
  console.log("Using embedded default system prompt");
  return expandPathsInPrompt(DEFAULT_SYSTEM_PROMPT);
}

function loadUserPrompt(): string {
  const userPromptPath = getUserPromptPath();

  if (fs.existsSync(userPromptPath)) {
    try {
      const prompt = fs.readFileSync(userPromptPath, "utf-8");
      // Only log if user has actual content (not just the template comments)
      const hasContent = prompt.split("\n").some(
        (line) => line.trim() && !line.trim().startsWith("<!--") && !line.trim().startsWith("##")
      );
      if (hasContent) {
        console.log(`Loaded user prompt from: ${userPromptPath}`);
      }
      return expandPathsInPrompt(prompt);
    } catch (error) {
      console.warn("Failed to read user prompt");
    }
  }

  return "";
}

// Load and compose prompts once at startup
const SYSTEM_PROMPT = (() => {
  const systemPrompt = loadSystemPrompt();
  const userPrompt = loadUserPrompt();
  if (userPrompt) {
    return systemPrompt + "\n\n" + userPrompt;
  }
  return systemPrompt;
})();

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

export interface AgentSessionOptions {
  resumeSessionId?: string; // SDK session ID to resume from
}

export class AgentSession {
  private queue = new MessageQueue();
  private queryInstance: Query | null = null;
  private outputIterator: AsyncIterator<any> | null = null;
  private closed = false;

  constructor(options: AgentSessionOptions = {}) {
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

    // Log if resuming a session
    if (options.resumeSessionId) {
      console.log(`[AgentSession] Resuming SDK session: ${options.resumeSessionId}`);
    }

    const q = query({
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
        ...(options.resumeSessionId && { resume: options.resumeSessionId }),
      },
    });
    this.queryInstance = q;
    this.outputIterator = q[Symbol.asyncIterator]();
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

  // Interrupt the current query execution
  async interrupt(): Promise<void> {
    if (this.queryInstance && !this.closed) {
      await this.queryInstance.interrupt();
    }
  }

  close() {
    this.closed = true;
    this.queue.close();
  }
}
