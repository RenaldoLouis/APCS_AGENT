# APCS Project - Agent Configurations

This repository contains the global rules, conventions, and agent-specific instructions for the **APCS Project**. It is designed to be used with agent-aware IDEs like **Antigravity**, **Windsurf**, and **Cursor**.

## 📁 Repository Purpose
This is a **metadata-only** repository. It does not contain the source code for `apcs_web` or `apcs_service` (which are hosted in their own respective repositories). 

The goal of this repo is to provide a consistent "Source of Truth" for AI agents to ensure they follow project-specific patterns and constraints.

## 🛠 Included Rules
* **`.agents/`**: Specific agent behavior definitions.
* **`CONVENTIONS.md`**: Global project constraints (e.g., restricted commands, tech stack).
* **`.cursorrules` / `.windsurfrules`**: IDE-specific instructions for autonomous agents.
* **`.geminiignore`**: Prevents the agent from indexing unnecessary or sensitive files.

## 🚀 How to Use
1. Clone this repository into your root `apcs_Project` folder.
2. Ensure your `apcs_web` and `apcs_service` repositories are cloned as subdirectories.
3. Open the root folder in **Antigravity**. The agent will automatically detect `CONVENTIONS.md` and the other rule files to guide its coding tasks.

## ⚠️ Key Constraints (from CONVENTIONS.md)
- **Do NOT** run `npm run start` or `npm run build`.
- Always follow the **Ant Design** and **Firebase** architectural patterns.