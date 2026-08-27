---
name: agy-customizations
description: Comprehensive guide and reference for the Antigravity Customization System (rules, skills, plugins, hooks, MCP servers). Use to explain customization discovery, loading priority, and creating or modifying agent capabilities.
---

# Antigravity Customization System Guide

The Antigravity Customization System allows developers to configure agent behavior, custom workflows, rules, plugins, hooks, and MCP servers.

## Customization Types & Locations

1. **Rules** (`GEMINI.md`, `AGENTS.md`, `.agents/rules/*.md`):
   - Enforce coding standards, constraints, and project policies.
   - Discovered hierarchically by walking up from the current file to the repository root.

2. **Skills** (`.agents/skills/<name>/SKILL.md`, `~/.gemini/antigravity/builtin/skills/`):
   - Modular workflow packages providing runbooks and procedures.
   - Uses progressive disclosure (frontmatter description is indexed; full content is read on-demand).

3. **MCP Servers** (`~/.gemini/config/mcp_config.json`, `~/.gemini/antigravity/mcp_config.json`, `.mcp.json`):
   - Connects external tool providers via Stdio or SSE transport.

4. **Plugins** (`plugins/<name>/plugin.json`):
   - Bundles related skills, rules, and MCP configurations into a reusable package.

5. **Hooks** (`hooks.json`):
   - Triggers automated scripts at specific agent lifecycle events.

## Precedence Order
1. Workspace Project Customizations (`.agents/`)
2. Declared Configurations (`skills.json`, `plugins.json`)
3. Global Discovery (`~/.gemini/config/`)
4. Built-in Customizations
5. Global Declared Configurations
