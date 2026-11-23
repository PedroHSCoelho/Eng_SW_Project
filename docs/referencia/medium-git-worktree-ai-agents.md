# Supercharging Development: Using Git Worktree & AI Agents

Autor: Mike Welsh — 1 jul 2025
Fonte: https://medium.com/@mike-welsh/supercharging-development-using-git-worktree-ai-agents-4486916435cb

(Texto extraído do navegador; imagens omitidas.)

## The Challenge

Working in a large codebase presents unique challenges. You often need to:

- Handle multiple, unrelated tasks simultaneously
- Keep different changes isolated from each other
- Maintain context switching between different problems

Traditional git branching requires constant stashing, context switching, and mental overhead. But what if you could have multiple, isolated workspaces running in parallel, each with its own AI assistant?

## A Solution: Git Worktrees + Claude Code

There is a powerful workflow combining git worktrees with AI agents (Claude Code) that can transform how to tackle parallel development tasks.

### Worktree & Agent Setup

Right now, I have 5 active worktrees in a large monorepo:

- main/ → [main branch reference]
- trees/claude2/ → [feature/update-components]
- trees/claude3/ → [feature/refactor-api]
- trees/claude4/ → [docs/workflow-guide] (meta: writing about this workflow!)
- trees/test-tree/ → [feature/performance-improvements]

Each worktree has its own Claude Code instance running, working independently on different tasks.

## The Power of This Approach

**True Parallel Development**
- No context switching: Each worktree maintains its own state
- No stashing required: Changes stay isolated in their respective trees
- Independent testing: Run tests in one tree while developing in another

**AI Agent Multiplication**
- Dedicated context: Each Claude instance maintains deep context about its specific task
- No confusion: AI agents don't mix up different features or changes
- Specialized focus: Each agent becomes an expert in its assigned task

**Works in a Monorepos**
- Service isolation: Work on different services without interference in different trees using different branches

## Real-World Example

In my current setup, I'm simultaneously:

1. Refactoring multiple components across the codebase
2. Working on new API endpoints & schema updates
3. Writing documentation about this workflow
4. Investigating flaky tests

Each Claude instance is deep in its own context, understanding the specific codebase areas, test patterns, and requirements for its task.

However, you could just as easily be working on two services that require related changes but should be separate branches when creating pull requests.

## How to Set It Up

```bash
# Create a new worktree manually
git worktree add <path>/<for>/<tree>/claude2 -b feature/my-new-feature

# Navigate to the worktree
cd <path>/<for>/<tree>/claude2

# Perform any setup needed for the repository.
# e.g. there might be a setup-repo.sh script to run.

# Start working with your dedicated AI assistant!
claude
```

## Creating an Agent Command Center

For maximum visibility and control, consider setting up a tmux-based command center where you can monitor all agents simultaneously:

```bash
# Create a new tmux session
tmux new-session -s worktrees

# Split into panes for each worktree
# Each pane shows:
# - Claude Code output and progress
# - A terminal in that worktree directory
# - Real-time updates as agents work
# Example tmux layout:
# ┌─────────────────┬─────────────────┬─────────────────┐
# │ claude2/        │ claude3/        │ claude4/        │
# │ Refactoring     │ API Updates     │ Writing docs    │
# │ [Agent output]  │ [Agent output]  │ [Agent output]  │
# ├─────────────────┼─────────────────┼─────────────────┤
# │ Terminal        │ Terminal        │ Terminal        │
# │ ~/trees/claude2 │ ~/trees/claude3 │ ~/trees/claude4 │
# └─────────────────┴─────────────────┴─────────────────┘
```

This setup provides:

- Real-time monitoring: See all agents' progress at a glance
- Quick intervention: Jump into any worktree terminal as needed
- Context awareness: Understand what each agent is working on
- Efficient coordination: Spot dependencies or conflicts early

## Key Benefits

- Significant productivity boost: Multiple tasks progress simultaneously
- Reduced cognitive load: No need to stash or create partial commits
- Better code quality: Each AI agent maintains deep, focused context
- Faster iteration: Test in one tree while developing in another
- Risk isolation: Experimental changes don't affect stable work

## The Future of Development?

This workflow represents a paradigm shift in how developers approach parallel development. By combining git's powerful worktree feature with AI agents, it's possible to not just switch between tasks — but truly work on multiple things simultaneously, each with its own dedicated AI assistant.

Increase productivity and better code quality when working with coding agents.

## Resources

- Git Worktrees: Official Git Documentation | GitHub's Guide to Worktrees
- Claude Code: Official Documentation | Getting Started
- tmux: Official Wiki | Getting Started Guide

*This workflow was used to write this post while three other Claude instances worked on code changes.*
