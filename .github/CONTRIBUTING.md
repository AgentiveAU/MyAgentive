# Contributing to MyAgentive

Thank you for your interest in contributing to MyAgentive! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributors of all experience levels.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/AgentiveIS/MyAgentive/issues)
2. If not, create a new issue using the bug report template
3. Include as much detail as possible: steps to reproduce, expected behaviour, actual behaviour

### Suggesting Features

1. Check existing issues and discussions for similar suggestions
2. Open a new issue using the feature request template
3. Describe the use case and why this feature would be valuable

### Contributing Code

1. **Fork the repository** to your GitHub account
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/MyAgentive.git
   cd MyAgentive
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Install dependencies**:
   ```bash
   bun install
   ```
5. **Make your changes** following our code style guidelines
6. **Test your changes**:
   ```bash
   bun run dev
   ```
7. **Commit with clear messages**:
   ```bash
   git commit -m "Add: brief description of your change"
   ```
8. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
9. **Open a Pull Request** against the `main` branch

## Pull Request Process

- All PRs require approval from maintainers before merging
- All CI checks must pass
- Keep PRs focused: one feature or fix per PR
- Update documentation if your change affects user-facing behaviour
- Respond to review feedback promptly

## Code Style Guidelines

### General

- Use **Australian English** spelling (e.g., "colour", "behaviour", "organisation")
- Follow existing patterns in the codebase
- Keep code simple and readable

### TypeScript

- Use TypeScript for all new code
- Prefer explicit types over `any`
- Use meaningful variable and function names

### Commits

- Use clear, descriptive commit messages
- Start with a verb: Add, Fix, Update, Remove, Refactor
- Reference issues when applicable: `Fix: resolve login bug (#42)`

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) runtime
- Telegram Bot Token (from @BotFather)
- Your Telegram User ID

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_USER_ID=your_user_id
WEB_PASSWORD=your_web_password
```

### Running Locally

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Run database migrations
bun run db:migrate
```

## Questions?

If you have questions about contributing, feel free to open a discussion or issue.

---

Built with care by [Agentive](https://TheAgentiveGroup.com)
