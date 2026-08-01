Feature: Page tree

  Background:
    Given I am logged in as "admin"

  Scenario: Admin views the page tree
    Given I am on the django CMS page tree
    Then I should see the page tree
