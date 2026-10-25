---
title: "AGENTS.md -- Project 02: Agent-Readable Workspace"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/projects/project-02/starter/AGENTS/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# AGENTS.md -- Project 02: Agent-Readable Workspace

## Quick Start

## 1. Run `npm install && npm run check` to verify the build.

## 2. Read `docs/ARCHITECTURE.md` for layer structure.

## 3. Check `feature_list.json` for what needs to be done.


## Layers

- Main process: `src/main/` -- window, IPC, services
- Preload: `src/preload/` -- bridge API
- Renderer: `src/renderer/` -- React UI
- Services: `src/services/` -- business logic

## Conventions

- TypeScript strict mode. No `any` without comment.
- Named exports only.
- IPC channels in `src/shared/types.ts`.
