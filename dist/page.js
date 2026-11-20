// The home page's object for the on-page assistant (FE-122). The assistant's actions (site-actions.js) and the page's
// own subscribe form both call these methods, so they follow one set of rules. Loaded as a module by site.js; the
// page works without it: the subscribe form is a plain HTML POST to Brevo.
//
// Content comes from /site-content.json, generated at build time from the blog's posts collection.
// Subscribing reuses the site's existing Brevo form: the same action URL and fields, submitted into a hidden frame
// so the visitor stays on the page. Brevo owns double opt-in: it emails a confirmation, and nothing else arrives
// until the visitor confirms.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export class App {
  static page = null;
}

class BlogPage {
  constructor(doc) {
    this.doc = doc;
    this.content = null;
    this.lastSubscribe = null;
    this.frameElement = null;
  }

  // ---- content ----

  async load() {
    if (!this.content) {
      const response = await fetch(new URL("/site-content.json", this.doc.URL), { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`site-content.json is unavailable: HTTP ${response.status}.`);
      }
      this.content = await response.json();
    }
    return this.content;
  }

  useContent(content) {
    this.content = content;
  }

  postIds() {
    return (this.content?.posts || []).map((p) => p.id);
  }

  listPosts() {
    const c = this.content;
    return {
      site: c.site,
      url: c.url,
      contact: c.contact,
      count: c.posts.length,
      posts: c.posts.map(({ text, ...summary }) => ({ ...summary, words: text.split(" ").length })),
      subscribe: this.subscribeFacts(),
    };
  }

  readPost(id) {
    const post = this.content.posts.find((p) => p.id === id);
    if (!post) {
      return { ok: false, reason: `There is no post with id "${id}". Use an id from the list of posts.`, field: "id" };
    }
    return { ok: true, ...post };
  }

  searchPosts(query, limit = 5) {
    const words = String(query).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);
    const results = [];
    for (const post of this.content.posts) {
      const title = post.title.toLowerCase();
      const text = `${post.excerpt} ${post.text}`.toLowerCase();
      let score = 0;
      for (const word of words) {
        score += 3 * (title.split(word).length - 1) + (text.split(word).length - 1);
      }
      if (score > 0) {
        results.push({ id: post.id, title: post.title, url: post.url, date: post.date, score,
                       passage: BlogPage.passage(post.text, words) });
      }
    }
    results.sort((a, b) => b.score - a.score);
    return { query: String(query), results: results.slice(0, limit), searched: this.content.posts.length };
  }

  static passage(text, words) {
    const lower = text.toLowerCase();
    let at = 0;
    for (const word of words) {
      const i = lower.indexOf(word);
      if (i >= 0) {
        at = Math.max(0, i - 200);
        break;
      }
    }
    return text.slice(at, at + 700);
  }

  // ---- subscribe ----

  form() {
    return this.doc.querySelector("#subscribe form.sub-form");
  }

  subscribeFacts() {
    return {
      available: Boolean(this.form()),
      how: this.form()
        ? "Brevo double opt-in: a confirmation email first; nothing else arrives until the visitor confirms; unsubscribe in one click."
        : `The subscribe form is not connected on this page yet. The visitor can email ${this.content?.contact || "the site"} to subscribe.`,
      lastRequest: this.lastSubscribe,
    };
  }

  checkSubscribe(email) {
    const value = String(email ?? "").trim();
    if (!this.form()) {
      return { ok: false, reason: this.subscribeFacts().how, field: "email" };
    }
    if (!EMAIL.test(value) || value.length > 254) {
      return { ok: false, reason: "That doesn't look like an email address. Please check it.", field: "email" };
    }
    return { ok: true, email: value };
  }

  subscribe(email) {
    const check = this.checkSubscribe(email);
    if (!check.ok) {
      return check;
    }
    const form = this.form();
    const frame = this.frame();
    const copy = this.doc.createElement("form");
    copy.method = "POST";
    copy.action = form.action;
    copy.target = frame.name;
    copy.hidden = true;
    for (const [name, value] of [["EMAIL", check.email], ["email_address_check", ""], ["locale", "en"]]) {
      const input = this.doc.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      copy.append(input);
    }
    this.doc.body.append(copy);
    copy.submit();
    copy.remove();
    this.lastSubscribe = { email: check.email, at: new Date().toISOString() };
    this.show(`Thanks. Brevo is sending a confirmation email to ${check.email}. Nothing else arrives until you confirm.`);
    return {
      ok: true,
      email: check.email,
      status: "confirmation-requested",
      note: "Sent to Brevo. Brevo emails a confirmation link; the address joins the list only after it is clicked. This page cannot see Brevo's answer.",
    };
  }

  frame() {
    if (!this.frameElement) {
      const frame = this.doc.createElement("iframe");
      frame.name = "subscribe-frame";
      frame.hidden = true;
      frame.title = "Subscription request";
      this.doc.body.append(frame);
      this.frameElement = frame;
    }
    return this.frameElement;
  }

  show(text) {
    const status = this.doc.querySelector("#subscribe-status");
    if (status) {
      status.textContent = text;
    }
  }

  // The page's own form: with this script it subscribes in place through the same method; without it, it is a
  // plain POST to Brevo, which redirects to /subscribed.
  wireForm() {
    const form = this.form();
    if (!form) {
      return;
    }
    form.addEventListener("submit", (event) => {
      const input = form.querySelector('input[name="EMAIL"]');
      event.preventDefault();
      const result = this.subscribe(input.value);
      input.setCustomValidity(result.ok ? "" : result.reason);
      if (!result.ok) {
        input.reportValidity();
        this.show(result.reason);
      } else {
        form.reset();
      }
    });
  }
}

App.page = new BlogPage(document);
App.page.wireForm();
