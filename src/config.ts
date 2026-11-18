export const SITE = {
  name: 'Automation Worker',
  url: 'https://automationworker.io',
  tagline: 'Field notes on automating real work: websites, workflows and the agents that run them.',
  author: 'Gaurav',
  email: 'hello@automationworker.io',
};

// Brevo's native subscription form (double opt-in on, list 2, redirect /subscribed).
// Set at build time; when empty, the form degrades to a mailto link so the page never breaks.
export const BREVO_FORM_ACTION: string = import.meta.env.PUBLIC_BREVO_FORM_ACTION ?? '';
