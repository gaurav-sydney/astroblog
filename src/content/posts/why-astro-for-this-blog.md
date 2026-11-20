---
title: "Why this blog is a static Astro site"
excerpt: "A newsletter-first blog needs fast pages, typed content and nothing on a server to patch. Astro gives that without giving up components, and it compares well with Hugo for a site that will grow an assistant."
date: 2026-10-07
issue: 2
tags: [websites, astro, tooling]
draft: false
---

Every publication starts with the same temptation: pick a platform with everything built in. For a site whose job
is to publish writing and collect subscribers, "everything" mostly means things to maintain. This blog is a static
site built with Astro, and the reasons are worth writing down, because they apply to most small organisations.

## What the site actually has to do

The list is short:

- Render articles and a home page quickly, on any phone.
- Keep each post's metadata consistent: title, excerpt, date, issue number, tags.
- Collect email subscribers without running a database.
- Leave room to add an on-page assistant later without rewriting the site.

None of that needs a server. A folder of HTML files on ordinary hosting does all of it, and there's nothing to
patch at night.

## Typed content, not loose files

Astro's content collections let a post's frontmatter be checked against a schema at build time. If a post is
missing its excerpt, or its date isn't a date, the build fails before anything reaches readers. That sounds minor
until the same data feeds more than one page: the home list, the article header, and, later, a machine-readable
index that an assistant reads.

## Components when you need them

Astro pages are HTML first, with components for the parts that repeat: the subscribe box, the header, the
connected-node motif. Scripts are opt-in, so a page ships no JavaScript unless it needs some.

## Compared with Hugo

Hugo is also a fine static generator, and faster at building very large sites. The difference here is mostly
ergonomics. Astro's components, its typed collections and its plain JavaScript ecosystem are closer to how the rest
of this stack is built, so adding a small module later, such as an assistant, doesn't mean learning a second
templating language. For a site of a few dozen pages, build speed isn't the constraint.

## The trade-off

A static site can't do anything on its own after it's built. Forms post to a service that owns the data, and
anything dynamic runs in the visitor's browser. For a blog that's the right trade: fewer moving parts, and the
services that hold people's data are the ones built to hold it.
