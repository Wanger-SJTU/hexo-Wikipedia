---
title: "Example: Turning Review Feedback into a Rule"
date: "2026-05-28 11:34:14"
updated: "2026-05-28 11:34:14"
layout: "post"
permalink: "/collections/learn-harness-engineering/docs/en/lectures/lecture-10-why-end-to-end-testing-changes-results/code/review-feedback-to-rule/"
disableNunjucks: true
wiki: false
nav_hidden: true
categories:
  - "文档"
---

# Example: Turning Review Feedback into a Rule

Repeated review comment:

> Do not call filesystem utilities from the renderer. Use the preload bridge.

Promoted harness rule:

- add a lint or import rule preventing `fs` usage in renderer code
- add remediation text explaining the preload boundary
