@empty-site
Feature: Welcome screen of a site with no pages
  As a site builder
  I want to see the welcome screen on a fresh django CMS site
  So that I know the installation works before the first page exists

  A django CMS site with no page renders the welcome screen on its root. This
  lane runs before the site content is seeded: CUCUMBER_TAGS=@empty-site.

  Scenario: A logged-in user sees the welcome screen before any page exists
    Given I am a logged in user with the "admin" user
    When I go to the homepage
    Then I should see the django CMS welcome screen
    And I should see the CMS toolbar
    And the toolbar should have the "Create" button
    But the toolbar should not have the "Page" menu

  Scenario: An anonymous visitor to an empty site is asked to log in
    Given I am not logged in
    When I go to the homepage
    Then I should see "Log in"

  Scenario: The page tree of an empty site lists no page
    Given I am a logged in user with the "admin" user
    And I am on the page tree
    Then I should see the page tree
    But I should not see "Home" in the page tree
