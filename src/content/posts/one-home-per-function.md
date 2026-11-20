---
title: "One home per function"
excerpt: "Most operational mess comes from the same fact living in two places. A simple rule — each function has one home, and everything else links to it — removes a surprising amount of coordination work."
date: 2026-11-07
issue: 7
tags: [operations, operating-model]
draft: false
---

Small teams rarely fail for lack of tools. They fail because the same thing is tracked in three of them. The task is
in the tracker, its status is in a chat thread, and the real decision is in someone's email. Every update then has
to be made three times, and one of them is always stale.

The rule used here is blunt: **every function has one home.** Everything else links to it.

## What "a function" means

A function is a kind of work with its own owner and lifecycle. A few examples:

- **Planning the platform** lives in one tracker, with its statuses.
- **Delivering work for a client** lives in a separate system, with *its* statuses, owned by whoever manages
  delivery.
- **Decisions** live in a decisions log in the repository, each with who made it and when.
- **Code and specifications** live in the repository, and nowhere else is the source.

The two trackers never mirror each other. If platform work needs to know that a delivery happened, it records a link
to the delivery's receipt, not a copy of its status.

## One fact, one place

The same idea applies inside a repository. A business's configuration is written once, in that business's own
folder. Its parent folder doesn't repeat it; location says where it belongs. Generated files, such as an index
agents read to find their way around, are produced from those sources and never edited by hand.

## Why it matters more with agents

People can reconcile two slightly different notes in their heads. Software can't, and neither can an AI assistant
reading the repository. When an agent finds two answers, it either picks one or stops. With one home per function
there is only one answer to find, and the agent can be told exactly where to look.

## How to start

Pick the function that causes the most "which one is right?" questions. Choose its single home, move the
authoritative copy there, and replace every other copy with a link. Then make the rule explicit: if it isn't in the
home, it isn't true yet.
