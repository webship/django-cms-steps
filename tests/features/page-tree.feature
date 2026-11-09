Feature: Page tree

  Background:
    Given I am a logged in user with the "admin" user

  Scenario: Admin views the page tree
    Given I am on the django CMS page tree
    Then I should see the page tree
