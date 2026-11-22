# FE-129 blog hardening, increment 1: acceptance criteria (tests-first).
# Status: awaiting Gaurav's approval. These scenarios become gate checks before any milestone is built.

Feature: Hardened, self-verifying delivery of automationworker.io

  # AC-M1
  Scenario: content-only deploy is gated proportionately and rolls back on failure
    Given main is the default branch with CI active
    When a commit changing only src/content/ is pushed to main
    Then only hygiene, dist, contract, content and rendered gates run
    And dist/ is deployed to Hostinger and the live check passes
    And if the live check is forced to fail the previous release is restored

  # AC-M2
  Scenario: SEO artefacts stay coherent with content
    Given the seo capability and gate are in place
    When a non-draft post is added and the site is built
    Then sitemap.xml and rss.xml list exactly the non-draft posts
    And each post page has valid BlogPosting JSON-LD and an og:image
    And the seo gate fails the build if any required tag is missing

  # AC-M3
  Scenario: newsletter broadcast is once-only and idempotent
    Given DP-033 broadcast-on-publish is active
    When a post is published
    Then exactly one broadcast is sent to the confirmed Brevo list
    And re-running the flow for the same post sends no further broadcast
