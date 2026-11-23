// Structured data and share metadata for the SEO capability (capabilities/experience/seo, FE-129 M2).
// Pure functions of the site config and a post, so the build output is deterministic and the seo gate can assert on it.
import { SITE } from '../config';

export const DEFAULT_IMAGE = '/og/default.png';
export const IMAGE_SIZE = { width: 1200, height: 630 };
const abs = (path: string) => new URL(path, SITE.url).href;

export interface PostMeta {
  title: string;
  excerpt: string;
  date: Date;
  tags: string[];
  url: string;
  image: string;
}

export function organization() {
  return {
    '@type': 'Organization',
    '@id': abs('/#organization'),
    name: SITE.name,
    url: abs('/'),
    logo: { '@type': 'ImageObject', url: abs('/favicon.svg') },
    email: SITE.email,
  };
}

export function website() {
  return {
    '@type': 'WebSite',
    '@id': abs('/#website'),
    name: SITE.name,
    url: abs('/'),
    description: SITE.tagline,
    publisher: { '@id': abs('/#organization') },
  };
}

export function blogPosting(post: PostMeta) {
  return {
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date.toISOString(),
    dateModified: post.date.toISOString(),
    url: post.url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': post.url },
    image: abs(post.image),
    keywords: post.tags.join(', ') || undefined,
    author: { '@type': 'Person', name: SITE.author, url: abs('/about/') },
    publisher: { '@id': abs('/#organization'), '@type': 'Organization', name: SITE.name },
    isPartOf: { '@id': abs('/#website') },
  };
}

/** The page's JSON-LD graph: the organisation and site on every page, plus the post on a post page. */
export function graph(post?: PostMeta) {
  return { '@context': 'https://schema.org', '@graph': [organization(), website(), ...(post ? [blogPosting(post)] : [])] };
}

export { abs };
