// Registers the Automation Worker blog's operations with the agent runtime (FE-122).
// agent-manifest.json loads this module through "actions.module". Only the names in "actions.agentTools" become
// model tools, called website_<name>. Every action wraps a method of the page object in page.js, which the page's
// own subscribe form also uses; no rule is copied here.
import { App } from "./page.js";

class SiteActions {
  static async registerActions(actions) {
    await App.page.load();
    actions.register(SiteActions.listPostsAction());
    actions.register(SiteActions.readPostAction(App.page.postIds()));
    actions.register(SiteActions.searchPostsAction());
    actions.register(SiteActions.subscribeAction());
  }

  static listPostsAction() {
    return {
      name: "list_posts",
      description: "List every published post on this blog: id, issue number, title, excerpt, date, tags, URL and length, plus how subscribing works. Call it before answering about what the blog has published, and again in each turn that needs it.",
      effect: "read",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: () => App.page.listPosts(),
    };
  }

  static readPostAction(ids) {
    return {
      name: "read_post",
      description: "Read one post's full text, with its title, date and URL. Call it before quoting, summarising or answering a detailed question about a post. Give an id from website_list_posts or website_search_posts.",
      effect: "read",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["id"],
        properties: {
          id: { type: "string", enum: ids.length ? ids : ["none"], description: "The post id from website_list_posts." },
        },
      },
      execute: (args) => App.page.readPost(args.id),
    };
  }

  static searchPostsAction() {
    return {
      name: "search_posts",
      description: "Search all posts for words from the visitor's question. Returns the best matching posts with a passage of text around the match. Call it for questions about a topic; then read_post for the full text if the passage is not enough.",
      effect: "read",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["query"],
        properties: {
          query: { type: "string", minLength: 1, maxLength: 200, description: "Words from the visitor's question." },
          limit: { type: "integer", minimum: 1, maximum: 10, description: "How many posts to return. Leave out for 5." },
        },
      },
      execute: (args) => App.page.searchPosts(args.query, args.limit),
    };
  }

  static subscribeAction() {
    return {
      name: "subscribe",
      description: "Subscribe the visitor's email to the newsletter through the site's own Brevo form. Call it only when the visitor asks to subscribe and has given their email address in this chat; never guess one. The browser asks the visitor to confirm. Brevo then emails a confirmation link; the address joins the list only after it is clicked, so say that. Returns ok false with a reason when the site refuses, for example when the form is not connected.",
      effect: "irreversible",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["email"],
        properties: {
          email: { type: "string", minLength: 3, maxLength: 320, description: "The email address the visitor gave in this chat." },
        },
      },
      execute: (args) => App.page.subscribe(args.email),
    };
  }
}

export const registerActions = SiteActions.registerActions;
