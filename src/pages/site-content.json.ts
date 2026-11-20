// The blog's posts as plain data for the on-page assistant (FE-122). Built from the same `posts` collection the home
// page lists, so the assistant answers only from what is published. Text is the post body with Markdown removed.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../config';

function plain(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export const GET: APIRoute = async () => {
  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const body = {
    site: SITE.name,
    url: SITE.url,
    contact: SITE.email,
    posts: posts.map((p) => ({
      id: p.id,
      issue: p.data.issue,
      title: p.data.title,
      excerpt: p.data.excerpt,
      date: p.data.date.toISOString().slice(0, 10),
      tags: p.data.tags,
      url: new URL(`/posts/${p.id}/`, SITE.url).href,
      text: plain(p.body ?? ''),
    })),
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
};
