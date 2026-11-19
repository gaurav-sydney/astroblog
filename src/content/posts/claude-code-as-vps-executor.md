---
title: "Running a coding agent unattended: what has to be true first"
excerpt: "Letting an AI coding agent work on a server while nobody watches is less about the agent and more about the rails: typed specifications, scripts instead of clicks, hard stop rules and evidence in place of summaries."
date: 2026-11-11
issue: 8
tags: [agents, claude-code, operations]
draft: false
---

Part of the work behind this blog is done by an AI coding agent, Claude Code, running on a small server and taking
the next piece of work from a queue. Making that safe had little to do with prompting. It came down to a handful of
rules that would make sense for any new team member working alone at night.

## Judgement ends in a file

Every piece of work starts from a written specification in the repository: the outcome, the acceptance checks, the
constraints, and the decisions already made. The agent doesn't decide what to build. It decides how, within that
file. When something genuinely needs a person, such as a missing credential, a choice between two designs or
anything that publishes to the world, it stops and asks instead of guessing.

## Scripts, not clicks

Deployments, workflow changes and checks run through scripts kept in the repository. The same command produces the
same result every time, and its output is the record. Interactive connectors are allowed only as a named fallback
when no script exists yet, and each use is followed by writing the script.

## Hard boundaries

Some limits are enforced outside the agent, not just written in its instructions:

- Credentials are scoped. A key for a test site can't be used to reach a live one.
- Live client systems are out of bounds unless a person has released that exact action.
- Commands that could destroy or publish something need an explicit go-ahead.

When a boundary blocks the agent, the right outcome is a clear note of what it needed and why, not a workaround.

## Evidence over narrative

"Done" means the acceptance checks ran and passed, with their output kept. Reports separate what changed in the
code from what changed on running systems, and mark anything not actually observed as unknown. Retries are
bounded: an unchanged failure isn't run again in the hope it passes.

## What it's good for

With those rails, an agent is very good at careful, well-specified work: extending an integration, writing the
tests that prove it, and leaving a precise list of what still needs a human. Without them, it's a fast way to make
confident mistakes.
