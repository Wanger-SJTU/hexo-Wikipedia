---
title: SECURITY.md
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: post
permalink: /collections/learn-harness-engineering/docs/en/resources/openai-advanced/repo-template/docs/SECURITY/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
---

# SECURITY.md

This file defines the security and safety rules that agents must not guess at.

## Secrets And Credentials

- Never hard-code secrets in source or docs.
- Document approved secret-loading paths here.
- Redact tokens, API keys, and personal data from logs and screenshots.

## Untrusted Input

- Treat external content as untrusted until validated.
- Record allowed fetch or execution boundaries here.
- If prompt injection or command injection risk exists, document the guardrail.

## External Actions

- List which actions require explicit approval.
- Record any production or destructive commands that agents must not run by default.
- Prefer sandbox-safe workflows for debugging and verification.

## Dependency And Review Rules

- New dependencies need justification in the active plan.
- Security-sensitive changes require explicit verification steps.
- Repeated security review comments should become checks, not tribal knowledge.
