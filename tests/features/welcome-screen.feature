Feature: Welcome screen on a fresh install

  Scenario: Visiting the homepage before any page exists shows the welcome screen
    Given I am on the homepage
    Then I should see the django CMS welcome screen
