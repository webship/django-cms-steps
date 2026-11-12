Feature: Page not found
  As a visitor
  I want a clear answer when a page does not exist
  So that I can go back to the site instead of reading an error

  Scenario: A path with no page answers "page not found"
    Given I am not logged in
    When I go to "/en/no-such-page/"
    Then I should be on the page not found page
    And I should see "Page not found"
    And the navigation menu should list "Home"
    But I should not see the breadcrumb

  Scenario: A page that exists is not a "page not found" page
    Given I am not logged in
    When I go to "/en/about/"
    Then I should not be on the 404 page

  Scenario: A draft that was never published is not found by a visitor
    Given I am not logged in
    When I go to "/en/draft-notes/"
    Then we should be on the 404 page
    And I should not see "Not published yet."
