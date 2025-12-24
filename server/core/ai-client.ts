import { query } from "@anthropic-ai/claude-agent-sdk";

// Current model preference (can be changed at runtime)
let currentModel: "opus" | "sonnet" | "haiku" = "opus";

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
Be concise but thorough in your responses. Use Australian English spelling.`;

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
