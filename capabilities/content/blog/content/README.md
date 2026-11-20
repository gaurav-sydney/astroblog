# Blog content

Posts are in `src/content/posts/*.md`, the Astro `posts` collection. Their frontmatter has title, excerpt, date, issue, tags and draft. Astro needs them at that path, so they stay there and this bundle points to them.

| Issue | Post | Added by |
| --- | --- | --- |
| 1 | `the-agentic-web` | Launch handoff |
| 2 to 9 | Eight posts on agents in the back office | FE-128 |

**Open:** the post dates don't follow the issue order. The choice is to renumber by date or to re-date the posts after 18 Nov, and that is Gaurav's call.

The assistant reads the same collection through `src/pages/site-content.json.ts`, so it can only answer from published posts.
