---
name: antigravity-guide
description: Reference guide for Antigravity IDE commands, SDKs, modal features, slash commands, keybindings, and workflows. Use when querying IDE capabilities, agent modalities, planning workflows, or Antigravity architecture.
---

# Google Antigravity (AGY) Guide

Comprehensive overview of Antigravity AI modalities, developer controls, workflows, and extension mechanisms.

## 1. Core Modalities

1. **Passive (Antigravity Tab / Autocomplete)**:
   - Single keystroke next-intent prediction, inline multi-line completion, and Tab-to-Jump.
   - Accept with `Tab`, reject with `Esc`, word-by-word with `Ctrl`+`Right`.

2. **Instructive (Inline Command - `Ctrl`+`I` / `Cmd`+`I`)**:
   - Localized targeted edits on selected code blocks, net-new code generation, or docstring additions.

3. **Collaborative (Sidebar Agent & Chat)**:
   - Autonomous multi-step pair programmer with file tools, terminal execution, MCP tool invocation, and subagent orchestration.

## 2. Slash Commands

- `/goal`: Run long-running autonomous tasks without stopping until completion.
- `/schedule`: Schedule recurring jobs or one-shot timers.
- `/browser`: Specialized web interaction tasks.
- `/grill-me`: Interactive design and planning interview.
- `/teamwork-preview`: Multi-agent coordinated execution.
- `/learn`: Persist learned behavior or environment corrections for future tasks.

## 3. Customizations Discovery

Antigravity auto-discovers:
- Project rules: `GEMINI.md`, `AGENTS.md`, `.agents/rules/*.md`
- Project skills: `.agents/skills/<skill_name>/SKILL.md`
- Global MCP configurations: `~/.gemini/config/mcp_config.json`
