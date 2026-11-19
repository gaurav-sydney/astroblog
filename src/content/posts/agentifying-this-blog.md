---
title: "Making this blog an open agentic website"
excerpt: "This site now carries an assistant that answers from its own posts and can subscribe a reader, running entirely in the visitor's browser on their own AI key. Here's what that took on a static site, and what it deliberately doesn't do."
date: 2026-11-04
issue: 6
tags: [agentic-web, websites, agents]
draft: false
---

The first issue argued that the agentic web arrives through clearly described actions. This blog now tries that on
itself. Its home page has an assistant that answers questions from the posts here and can subscribe a reader to the
newsletter. It follows an open specification for "agentic websites", so other agent sites can find and call it too.

## Nothing runs on our server

The site is still static. The assistant's runtime loads in the visitor's browser, and the visitor brings their own
key for an AI provider, entered in the assistant's settings. The site pays nothing per question and holds nobody's
key. The trade-off is stated plainly on the page: the visitor's messages, and the posts the assistant reads, go to
the provider they choose.

## What the assistant can call

The assistant can only use actions the site registers, each with typed inputs:

- **List posts**, **read a post** and **search posts**, all reading from an index the site builds from the same
  posts you're reading.
- **Subscribe**, which uses the same Brevo form as the subscribe box on the page.

The first three only read. Subscribing contacts someone, so it is marked as an action that can't be undone: the
browser shows the reader a confirmation dialog with their email address before anything is sent, and Brevo still
sends its own confirmation email afterwards.

## Grounding, by design

The assistant's instructions say facts come only from the site's own tools. It shouldn't invent posts, and when
nothing here covers a question it should say the blog hasn't written about it yet. It also has a short list of what
the site can't do, such as taking on client work, so it declines those plainly instead of improvising.

## Published for other agents

The site publishes a manifest and a description of its agent network at public addresses. Another agent website can
run this network for its own visitor, on that visitor's key. When it does, it gets none of this site's actions: it
can say what the blog covers and point to the page, but it can't subscribe anyone. That boundary is deliberate.

## What's still rough

The specification asks for every change to be shown to the visitor before it runs. The runtime used here only does
that for actions marked irreversible, which is one reason subscribing is marked that way. Expect this page to change
as the tools mature.
