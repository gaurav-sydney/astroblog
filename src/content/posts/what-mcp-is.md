---
title: "What MCP is, and why it matters to small teams"
excerpt: "The Model Context Protocol gives AI assistants one standard way to reach tools and data. It lowers the cost of connecting things, but a connector you click through every time is still not automation."
date: 2026-10-28
issue: 5
tags: [mcp, agents, tooling]
draft: false
---

The Model Context Protocol, MCP, is an open standard for connecting AI applications to the tools and data they
need. A service publishes an MCP server that lists what it can do, each tool with a name, a description and typed
inputs. Any assistant that speaks the protocol can then discover those tools and call them.

## Why a standard helps

Before a shared protocol, every pairing of assistant and service needed its own integration. A standard turns that
many-to-many problem into one-to-many: a service writes one server, and every compatible assistant can use it.
For a small team, that means an assistant can read the task tracker, look at a workflow's last run or draft an
email without anyone writing glue code.

## What a tool description really is

The interesting part isn't the transport. It's that an MCP tool is a *described action*: a name, what it does,
which inputs it takes and what comes back. That is the same discipline good business processes need anyway. An
organisation that can describe its own operations that clearly is most of the way to being usable by agents,
whether through MCP or through its website.

## Where it fits, and where it doesn't

Connectors are excellent for exploring, for one-off tasks and for an operator working alongside an assistant. They
are a weaker fit for the steps that must run the same way every time. An assistant deciding, on each run, how to
call a tool brings variation and cost to work that should be boring.

The approach used here treats a connector as a **fallback**. Routine work goes through scripts that call each
provider's API in the same way every time, kept in a repository and tested. When no script covers a need yet, the
connector is used, the use is noted, and writing the script that replaces it becomes the next piece of work.

## The practical takeaway

- Use MCP connectors to look around and to handle the unusual.
- Turn anything you do through a connector twice into a script.
- Describe your own operations as if they were tools. It helps people, and it's what agents will need.
