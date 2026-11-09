Feature: Welcome screen on a fresh install
  A fresh django CMS site has no pages. Its root renders the welcome screen for a signed-in user,
  and its own script sends an anonymous visitor to the login form instead.

  Scenario: A signed-in user sees the welcome screen before any page exists
    Given I am a logged in user with the "admin" user
    When I am on the homepage
    Then I should see the django CMS welcome screen

  Scenario: An anonymous visitor to an empty site is sent to the login form
    Given I am not logged in
    When I am on the homepage
    Then I should see "Log in"
