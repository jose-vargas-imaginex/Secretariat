# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Secretariat is an AI-augmented notes app that helps keep track of your work.

## Tech Stack

- **Frontend**: Svelte 5 (with runes)
- **Desktop**: Electron
- **Build**: Vite with vite-plugin-electron
- **Language**: TypeScript

## Code Standards

- **Always use TypeScript** - All new code must be written in TypeScript. Use `<script lang="ts">` in Svelte components and `.ts` extensions for modules.
- Define explicit types for props, state, and function parameters
- Use interfaces for component Props (e.g., `interface Props { ... }`)
- Import types from `src/lib/db/types.ts` for database entities

## Build Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production

## Process Management

When stopping the dev server, use project-specific patterns to avoid killing other Electron apps (like VSCode):

```bash
# Good - targets only this project
pkill -f "Secretariat/node_modules/electron"
pkill -f "Secretariat.*vite"

# Bad - kills ALL Electron apps including VSCode
pkill -f "Electron"
```
