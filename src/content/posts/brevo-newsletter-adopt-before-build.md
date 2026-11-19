---
title: "Wiring the newsletter with Brevo: adopt before you build"
excerpt: "Subscriber lists, consent and unsubscribe are solved problems with legal weight. This blog hands all three to Brevo and keeps its own code to the part that's actually specific: one email per published post."
date: 2026-10-14
issue: 3
tags: [newsletter, brevo, workflows]
draft: false
---

The quickest way to get a newsletter wrong is to build one. A list of email addresses looks like a small table,
but behind it sit consent records, double opt-in, unsubscribe links in every email, bounce handling and the rules
that come with each. A mail provider does all of that already, and is accountable for it.

So the rule for this blog's newsletter was simple: **adopt before you build.** Brevo owns the list, the
confirmation email, consent and unsubscribe. The site never stores an address.

## Subscribing: a plain form

The subscribe box on every page is Brevo's own form, posted as ordinary HTML. It works with scripts turned off.
Brevo sends a confirmation email first, and nothing else arrives until the reader clicks it. If the form can't be
configured for some reason, the page falls back to an email link rather than showing a broken box.

## Sending: one email per post

The part that is specific to this blog is when to send: once, when a post is published. That has one hard rule —
the same post must never go out twice, even if a deploy runs again or something retries.

The design keeps that rule in the place that can see it. Each campaign is named after the post it announces. Before
sending, the workflow looks for a campaign with that name. If one exists and was sent, it stops. If one exists as a
draft, because an earlier send failed halfway, it sends that draft instead of creating another. The provider's own
record becomes the sent-log, so there is no second database to keep in step.

## Off until it's proven

Broadcasting stays switched off until it has been tested end to end against a test list: a test subscriber who
confirms, and a test post that produces exactly one campaign. Until then, subscribers simply accumulate in Brevo and
nobody receives anything unexpected.

## The general lesson

Look at each piece of a feature and ask who should be accountable for it. Consent and delivery belong to the
provider. The decision of *what* to send, and *when*, belongs to you. Building only the second part is less code and
far less risk.
