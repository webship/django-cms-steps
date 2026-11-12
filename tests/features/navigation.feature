Feature: Navigation menu and breadcrumb
  As a visitor
  I want the menu and the breadcrumb to show where I am
  So that I can find my way around the site

  Background:
    Given I am not logged in

  Scenario: The navigation menu lists the published pages
    When I go to the homepage
    Then I should not see the welcome screen
    And the navigation menu should list "Home"
    And the navigation menu should list "About"
    And the navigation menu should contain "Team"
    And the navigation menu should list "Contact"
    But the navigation menu should not list "Draft notes"
    And "Home" should be the active navigation menu entry
    And "Contact" should not be the active navigation menu entry

  Scenario: A visitor follows the menu to a page
    When I go to the homepage
    And I click "Contact" in the navigation menu
    Then I should see "How to reach us."
    And "Contact" should be the active navigation menu entry
    And "Home" should not be the active navigation menu entry

  Scenario: A visitor opens a sub page from its parent entry
    When I go to the homepage
    And I click "Team" in the navigation menu
    Then I should see "The people behind this site."
    And "Team" should be the active navigation menu entry
    But "About" should not be the active navigation menu entry

  Scenario: The breadcrumb leads from the home page to the current page
    When I go to "/en/about/team/"
    Then I should see the breadcrumb
    And the breadcrumb should contain "Home"
    And the breadcrumb should contain "About"
    And the breadcrumb should contain "Team"
    But the breadcrumb should not contain "Contact"
