import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    date: z.coerce.date(),
    issue: z.number().int().positive(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    // Optional share image, a path under public/ (e.g. /og/my-post.png). Default: the brand card /og/default.png.
    image: z.string().startsWith('/').optional(),
  }),
});

export const collections = { posts };
