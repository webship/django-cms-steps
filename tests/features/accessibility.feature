Feature: Accessibility
  As a site owner
  I want the pages visitors and editors meet first to pass an accessibility audit
  So that everyone can read the site and log in to it

  The audits use the axe-core steps of webship-js.

  Scenario: The front page
    Given I am not logged in
    When I go to the homepage
    Then the page language should be "en"
    And the page should have no critical accessibility violations
    And the page should have no serious accessibility violations
    And every link should have an accessible name

  Scenario: A content page
    Given I am not logged in
    When I go to "/en/about/team/"
    Then the page should have no critical accessibility violations
    And the page should have no serious accessibility violations
    And every link should have an accessible name
    And every button should have an accessible name

  Scenario: The login page
    Given I am on the login page
    Then the page should have no critical accessibility violations
    And the page should have no serious accessibility violations
    And every form field should have an accessible label
    And every button should have an accessible name
