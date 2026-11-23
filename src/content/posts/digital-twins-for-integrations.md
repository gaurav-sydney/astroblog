---
title: "Testing integrations against digital twins"
excerpt: "You can't run a test suite against a live mailing list. A small, faithful stand-in for each vendor API lets the real workflow files run end to end on every change, without sending anything to anyone."
date: 2026-11-14
issue: 9
tags: [testing, workflows, integrations]
draft: false
---

Integrations are where automations usually break, and they are also the hardest part to test. A test that sends a
real campaign to a real list isn't a test. A test that mocks everything proves only that the mocks agree with each
other. The middle ground used here is a **digital twin** of each vendor API.

## What a twin is

A twin is a small in-memory stand-in for one provider, written from that provider's own API reference. It answers
only the operations the workflow actually uses, with the same paths, fields and error codes. Anything else gets a
clear "not in the twin" error, so a workflow can't quietly depend on behaviour nobody captured.

It also keeps the provider's important rules. The newsletter's twin, for example, models double opt-in: a new
contact stays pending until they confirm, and a campaign reaches only confirmed contacts. A campaign can be sent
once; a second send is refused, as the real service refuses it.

## Running the real files

The point is to run the actual workflow definitions, not a re-implementation of them. The tests load the same flow
files that get deployed, run them step by step, and route every vendor call to the twin through the same HTTP
interface the live system uses. So a scenario such as "a reader subscribes, confirms, and receives exactly one email
for a new post, even when the post is published twice" exercises the code that will really run.

## Checking the tests themselves

A green test suite only means something if it can go red. One cheap habit: break the logic on purpose — for
example, make the "has this post been sent?" check always say no — and confirm the tests fail. If they still pass,
they weren't testing what you thought.

## Where twins stop

A twin is only as good as its reading of the provider's documentation. So before anything goes live, the same
workflow runs once against the real service with a test list, and any difference found there is fixed in the twin
first, then in the workflow. After that, the twin keeps every later change honest at no cost and with no risk.
