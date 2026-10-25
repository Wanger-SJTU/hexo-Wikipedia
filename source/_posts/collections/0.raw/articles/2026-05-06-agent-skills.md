---
title: Agent Skills
date: "2026-05-06 00:00:00"
updated: "2026-05-06 00:00:00"
layout: post
permalink: /collections/0.raw/articles/2026-05-06-agent-skills/
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - 文档
tags:
  - AI
  - Agent
  - Engineering
  - Claude
source_url: https://addyosmani.com/blog/agent-skills/
---


A senior engineer's job is mostly the parts that don't show up in the diff. Specs. Tests. Reviews. Scope discipline. Refusing to ship what can't be verified. AI coding agents skip those parts by default. Agent Skills is my attempt to make them not optional.

The default behaviour of any AI coding agent is to take the shortest path to "done." Ask for a feature and it writes the feature. It does not ask whether you have a spec, write a test before the implementation, consider whether the change crosses a trust boundary, or check what the PR will look like to a reviewer. It produces code, declares victory, and moves on.

This is the same failure mode every senior engineer has spent their career learning to avoid. The senior version of any task includes work that doesn't show up in the diff: surfacing assumptions, writing the spec, breaking the work into reviewable chunks, choosing the boring design, leaving evidence that the result is correct, sizing the change so a human can actually review it. Those steps are most of what separates engineers who ship reliable software at scale from people who push code that breaks.

Agents skip those steps for the same reason any junior would. They're invisible. The reward signal points at "task complete" not "task complete and the design doc exists." So we have to bolt the senior-engineer scaffolding back on.

[Agent Skills](https://github.com/addyosmani/agent-skills) is my attempt at that scaffolding. It just crossed 27K stars, so apparently I'm not alone in wanting it. This post is the part the README doesn't quite cover: why each design choice exists, how it maps onto standard SDLC and Google's published engineering practices, and what you should steal from the project even if you never install a single skill.

## What a "skill" actually is

The word "skill" is doing a lot of work in the Claude Code / Anthropic vocabulary, and it helps to be precise. A skill is a markdown file with frontmatter that gets injected into the agent's context when the situation calls for it. Somewhere between a system-prompt fragment and a runbook.

A skill is not reference documentation. It is not "everything you should know about testing." It is a workflow: a sequence of steps the agent follows, with checkpoints that produce evidence, ending in a defined exit criterion.

That distinction is the whole game. If you put a 2,000-word essay on testing best practices into the agent's context, the agent reads it, generates plausible-looking text, and skips the actual testing. If you put a workflow there (write the failing test first, run it, watch it fail, write the minimum code to pass, watch it pass, refactor), the agent has something to do, and you have something to verify.

Process over prose. Workflows over reference. Steps with exit criteria over essays without them. That single distinction separates a useful skill from a pretty markdown file. It also explains why so many "AI rules" repos end up doing nothing in practice. The rules are essays.

## The SDLC the skills encode

The twenty skills in the repo organise around six lifecycle phases, with seven slash commands sitting on top. Define (/spec) is where you decide what you're actually building. Plan (/plan) breaks the work down. Build (/build) implements it in vertical slices. Verify (/test) proves it works. Review (/review) catches what slipped through. Ship (/ship) gets it to users safely. /code-simplify sits across the bottom of the whole thing.

This isn't a coincidence. It's the same SDLC every functioning engineering organisation runs, just in different vocabulary. Google calls it design doc → review → implementation → readability review → launch checklist. Amazon calls it the working-backwards memo and the bar raiser. Every healthy team has some version of this loop.

What's new with AI coding agents is that most agents skip most of these phases by default. You ask for a feature, you get an implementation, and the spec, plan, tests, review, and launch checklist all just don't happen. Skills push the agent through the same phases a senior engineer forces themselves through, because shipping the code without them is how you produce incidents.

A complex feature might activate eleven skills in sequence. A small bug fix might use three. The router (using-agent-skills) decides which apply. The point is that the workflow scales to the actual scope, not to the assumed scope.

## Five principles that are doing the work

Five design decisions in the project are the load-bearing ones. The rest of the system follows from them.

### 1. Process over prose

Already covered. Workflows are agent-actionable; essays are not. The same is true for human teams. If your team handbook is 200 pages, no one reads it under time pressure. If it's a small set of workflows with checkpoints, people actually run them.

### 2. Anti-rationalization tables

This is the most distinctive design decision in the project, and the one I most want other teams to steal.

Each skill includes a table of common excuses an agent (or a tired engineer) might use to skip the workflow, paired with a written rebuttal. A few examples close to the originals:

- "This task is too simple to need a spec." → Acceptance criteria still apply. Five lines is fine. Zero lines is not.

- "I'll write tests later." → Later is the load-bearing word. There is no later. Write the failing test first.

- "Tests pass, ship it." → Passing tests are evidence, not proof. Did you check the runtime? Did you verify user-visible behaviour? Did a human read the diff?

The reason this works is that LLMs are excellent at rationalisation. They will produce a plausible-sounding paragraph explaining why this particular task doesn't need a spec, or why this particular change is fine to merge without review. Anti-rationalization tables are pre-written rebuttals to lies the agent hasn't yet told.

The pattern is just as good for human teams. Most engineering decay isn't anyone choosing to do bad work. It's people accepting plausible-sounding justifications for skipping the parts they don't feel like doing. A team that writes down its anti-rationalizations is a team that has fewer of them.

### 3. Verification is non-negotiable

Every skill terminates in concrete evidence. Tests pass. Build output is clean. The runtime trace shows the expected behaviour. A reviewer signs off. "Seems right" is never sufficient.

This is the same principle that makes Anthropic's harness recover from failures, that makes Cursor's planner/worker/judge split actually catch bugs, that makes any [long-running agent](https://addyosmani.com/blog/long-running-agents/) recoverable. The agent is a generator. You need a separate signal that the work is done. Skills bake that signal into every workflow.

### 4. Progressive disclosure

Do not load all twenty skills into context at session start. Activate them based on the phase. A small meta-skill (using-agent-skills) acts as a router that decides which skill applies to the current task.

This is the [harness engineering](https://addyosmani.com/blog/agent-harness-engineering/) lesson applied at skill granularity. Every token loaded into context degrades performance somewhere, so you load what's relevant and leave the rest on disk. Progressive disclosure is how you get a twenty-skill library into a 5K-token slot without poisoning the well.

### 5. Scope discipline

The meta-skill encodes a non-negotiable I'd staple to every agent if I could: "touch only what you're asked to touch." Don't refactor adjacent systems. Don't remove code you don't fully understand. Don't brush against a TODO and decide to rewrite the file.

This sounds obvious until you watch an agent decide that fixing one bug requires modernizing three unrelated files. Scope discipline is the single biggest determinant of whether an agent's PR is mergeable or has to be unwound. It's also the principle that maps most cleanly onto Google's code review norms, where reviewers will block a PR for doing more than one thing.

## The Google DNA

The skills are saturated with practices from Software Engineering at Google and Google's public engineering culture. This is intentional. Most of what makes Google-scale software work is documented and public, and it is exactly the part agents are most likely to skip.

A partial map of which skill encodes which practice:

- Hyrum's Law in api-and-interface-design. Every observable behaviour of your API will eventually be depended on by someone, so design with that in mind.

- The test pyramid (~80/15/5) and the Beyoncé Rule in test-driven-development. "If you liked it, you should have put a test on it." Infrastructure changes don't catch bugs; tests do.

- DAMP over DRY in tests. Google's testing philosophy is explicit that test code should read like a specification even at the cost of some duplication. Over-abstracted tests are a known anti-pattern.

- ~100-line PR sizing, with Critical / Nit / Optional / FYI severity labels in code-review-and-quality. Straight from Google's code review norms. Big PRs don't get reviewed; they get rubber-stamped.

- Chesterton's Fence in code-simplification. Don't remove a thing until you understand why it was put there.

- Trunk-based development and atomic commits in git-workflow-and-versioning.

- Shift Left and feature flags in ci-cd-and-automation. Catch problems as early as possible, decouple deploy from release.

- Code-as-liability in deprecation-and-migration. Every line you keep is one you have to maintain forever, so prefer the smaller surface.

None of these are new ideas. The point is that none of them are in the agent by default. A frontier model has read the phrase "Hyrum's Law" in its training data, but it does not apply Hyrum's Law when it's designing your API at 3am. Skills are how you make sure it does.

## How to actually use it

Three modes, in roughly increasing commitment.

Mode 1: install via marketplace. If you're using Claude Code:

```
/plugin marketplace add addyosmani/agent-skills
/plugin install agent-skills@addy-agent-skills
```

You get the slash commands (/spec, /plan, /build, /test, /review, /ship, /code-simplify) and the agent activates the relevant skills automatically based on context. This is the path I'd recommend most people start on.

Mode 2: drop the markdown into your tool of choice. The skills are plain markdown with frontmatter. Cursor users put them in .cursor/rules/. Gemini CLI has its own install path. Codex, Aider, Windsurf, OpenCode, anything that accepts a system prompt can read them. The tooling matters less than the workflow underneath.

Mode 3: read them as a spec. Even if you never install anything, the skills are a documented description of what good engineering with AI agents looks like. Read code-review-and-quality.md and apply the five-axis framework to your team's review process. Read test-driven-development.md and use it to settle the next "do we need to write the test first" argument with a junior. Read the meta-skill and steal the five non-negotiables for your own AGENTS.md.

This third mode is where I'd actually start. Pick the four or five skills closest to your current pain. Decide which workflows you want enforced. Then install the runtime, or roll your own, to do the enforcing.

## What to steal even if you never install

A few patterns from the project I'd steal regardless of whether you use AI coding agents at all.

<strong>Anti-rationalization as a team practice.</strong> Write down the lies your team tells itself. "We'll fix the tests after launch." "This change is too small for a design doc." "It's fine, we have monitoring." Pair each with the rebuttal. Put it in your AGENTS.md or your engineering wiki. It will save you arguments and it will catch the next tired Friday-afternoon shortcut.

<strong>Process over prose for anything you write internally.</strong> If you find yourself writing a 2,000-word doc titled "how we approach X" you've written reference material. Convert it to a workflow with checkpoints. The doc shrinks to 400 words and people actually run it. This applies as much to onboarding guides and runbooks as it does to agent skills.

<strong>Verification as a hard exit criterion.</strong> Make "produce evidence" the exit step of every task. For agents, for engineers, for yourself. Evidence is whatever proves the work is done: a green test run, a screenshot, a log, a review approval. Without it, the task is not done. "Seems right" never closes the loop.

<strong>Progressive disclosure for any rulebook.</strong> Do not write a 50-page handbook. Write a small router that points to the right small chapter for the situation. This is true for AGENTS.md, for runbooks, for incident playbooks, for anything anyone will read under time pressure.

Five non-negotiables, lifted from the meta-skill, that I'd put in any AGENTS.md tomorrow:

- Surface assumptions before building. Wrong assumptions held silently are the most common failure mode.

- Stop and ask when requirements conflict. Don't guess.

- Push back when warranted. The agent (or engineer) is not a yes-machine.

- Prefer the boring, obvious solution. Cleverness is expensive.

- Touch only what you're asked to touch.

That's a worthwhile engineering culture in five lines, and you don't need to install anything to adopt it.

## Where this fits in the harness

In the broader picture, skills are one layer of [agent harness engineering](https://addyosmani.com/blog/agent-harness-engineering/). The harness is the model plus everything you build around it; skills are the reusable workflow chunks that get progressively disclosed into the system prompt. They sit alongside AGENTS.md (the rolling rulebook), hooks (the deterministic enforcement layer), tools (the actions the agent can take), and the session log (the durable memory). Each layer has a specific job. Skills do the senior-engineer-process job.

Skills matter more for [long-running agents](https://addyosmani.com/blog/long-running-agents/) than they do for chat-style ones, because long runs amplify every shortcut. An agent that skips the test in a 10-minute session produces one bug. An agent that skips the test in a 30-hour session produces a debugging archaeology project at the end of the run, when no one remembers what the original intent was. The longer the run, the more the senior-engineer scaffolding has to be enforced rather than suggested.

The portability of the skills format matters too. The same SKILL.md file works in Claude Code, Cursor (with rules), Gemini CLI, Codex, Aider, Windsurf, OpenCode, and any other harness that accepts system-prompt content. Write the workflow once, the runtime enforces it. That's the thing the markdown-with-frontmatter format buys you that bespoke prompt engineering does not.

## Closing

The thing I most want people to take from this project, more than the skills themselves, is the framing.

AI coding agents are extremely capable junior engineers with no instinct for the parts of the job that don't show up in the diff. The senior-engineering work (surfacing assumptions, sizing changes, writing the spec, leaving evidence, refusing to merge what can't be reviewed) is exactly what an agent will skip unless you make it impossible to skip. The job, increasingly, is to encode that discipline as something the agent cannot talk itself out of.

Skills are one shape of that. Anti-rationalization tables. Progressive disclosure. Process over prose. Verification as the load-bearing exit criterion. The Google practices that already work, made portable.

You can install [my version](https://github.com/addyosmani/agent-skills). You can roll your own. The lesson stands either way: the senior-engineer parts of the job are no longer optional, even when the engineer is a model.

---

Repo: [github.com/addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) (MIT)
Related: [Agent Harness Engineering](https://addyosmani.com/blog/agent-harness-engineering/) · [Long-running Agents](https://addyosmani.com/blog/long-running-agents/)