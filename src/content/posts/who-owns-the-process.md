---
title: "n8n or Windmill? Decide who owns the process first"
excerpt: "Workflow tools overlap, so the useful question isn't which one is better. It's which tool owns the order of the steps, and which one only talks to vendors. Keeping those apart is what lets you swap a vendor without touching the process."
date: 2026-10-21
issue: 4
tags: [workflows, n8n, windmill, architecture]
draft: false
---

n8n and Windmill can both run a multi-step workflow, call an API and wait for a person. Comparing them feature by
feature goes nowhere, because each can do most of what the other does. The question that settles it is different:
**which tool owns the process, and which one only integrates?**

## Two jobs that look like one

A business process has two kinds of work in it:

- **The process itself.** The order of the steps, who approves what, what happens when a step fails, and the record
  of what happened. This is the part the business cares about and should be able to read.
- **Talking to vendors.** Calling a mail provider, a spreadsheet, a payment service. Credentials, retries, each
  vendor's quirks.

When both live in the same canvas, the vendor details leak into the process. Changing email providers then means
editing the business workflow, and nobody can say for sure what else moved.

## The split used here

In this setup, Windmill owns the process. Its flows are files in a repository, with typed inputs, explicit steps and
a clear stop when anything fails. Windmill never calls a vendor directly.

n8n integrates. Each n8n workflow answers one named capability, such as "send a broadcast for this post", for one
customer's vendor. It holds the vendor credentials, does the vendor-specific retries, and replies in one shape:
succeeded, failed, or unknown.

Between them sits a short list of operations named by what they do, never by who does it. The process asks for
"send the broadcast", and a per-customer binding decides that, today, Brevo answers.

## What it buys

- **Swapping a vendor touches one workflow and one binding.** The process doesn't change.
- **The process stays readable.** A flow is a handful of steps, not a wall of HTTP nodes.
- **Failures are honest.** A vendor problem comes back as "failed" or "unknown", and the process stops for a
  person rather than retrying something that may already have happened.

## When not to bother

For a one-off automation with a single vendor, this is overhead: build it in whichever tool you know. The split
pays off the second time the same process runs for a different customer, or the first time a vendor changes.
