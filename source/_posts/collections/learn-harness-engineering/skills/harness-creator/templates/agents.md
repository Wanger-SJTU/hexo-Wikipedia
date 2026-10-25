---
title: "{{AGENTFILENAME}}"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/skills/harness-creator/templates/agents/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# {{AGENT_FILE_NAME}}

{{PROJECT_PURPOSE}}

## Startup Workflow

Before writing code:

## 1. **Confirm working directory** with `pwd`

## 2. **Read this file** completely

## 3. **Read project docs if present** (`docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, README, or equivalent)

## 4. **Run `./init.sh`** to verify environment is healthy

## 5. **Read `feature_list.json`** to see current feature state

## 6. **Review recent commits** with `git log --oneline -5`


If baseline verification is failing, repair that first before adding new scope.

## Working Rules

- <strong>One feature at a time</strong>: Pick exactly one unfinished feature from `feature_list.json`
- <strong>Verification required</strong>: Don't claim done without running verification commands
- <strong>Update artifacts</strong>: Before ending session, update `progress.md` and `feature_list.json`
- <strong>Stay in scope</strong>: Don't modify files unrelated to the current feature
- <strong>Leave clean state</strong>: Next session must be able to run `./init.sh` immediately

## Required Artifacts

- `feature_list.json` — Feature state tracker (source of truth)
- `progress.md` — Session continuity log
- `init.sh` — Standard startup and verification path
- `session-handoff.md` — Optional, for larger sessions

## Definition of Done

A feature is done only when ALL of the following are true:

- [ ] Target behavior is implemented
- [ ] Required verification actually ran (tests / lint / type-check)
- [ ] Evidence recorded in `feature_list.json` or `progress.md`
- [ ] Repository remains restartable from standard startup path

## End of Session

Before ending a session:

## 1. Update `progress.md` with current state

## 2. Update `feature_list.json` with new feature status

## 3. Record any unresolved risks or blockers

## 4. Commit with descriptive message once work is in safe state

## 5. Leave repo clean enough for next session to run `./init.sh` immediately


## Verification Commands

```bash
# Full verification (recommended)
{{PRIMARY_VERIFICATION_COMMAND}}
```

Required checks:
{{VERIFICATION_COMMANDS}}

## Escalation

If you encounter:
- <strong>Architecture decisions</strong>: Consult project architecture docs if present, otherwise ask user
- <strong>Unclear requirements</strong>: Check product/requirements docs if present, otherwise ask user
- <strong>Repeated test failures</strong>: Update progress, flag for human review
- <strong>Scope ambiguity</strong>: Re-read `feature_list.json` for definition of done
