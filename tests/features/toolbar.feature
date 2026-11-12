Feature: The CMS toolbar
  As an editor
  I want the toolbar to offer the menus and buttons of the page I am on
  So that I can reach every editing task from the page itself

  Background:
    Given I am a logged in user with the "admin" user

  Scenario: The toolbar reports the django CMS version
    Then the site should be running django CMS
    And the site should be running django CMS 5
    But the site should not be running django CMS 3

  Scenario: The toolbar of a published page
    When I go to "/en/about/"
    Then the toolbar should have the "Page" menu
    And the toolbar should have the "Version" menu
    And the CMS toolbar should have the "Language" menu
    And the toolbar should have the "Create" button
    And the toolbar should have the "New Draft" button
    But the toolbar should not have the "Publish" button
    And I should not see the page tree

  Scenario: The menus list their entries
    When I go to "/en/about/"
    Then the "site" toolbar menu should list "Pages"
    And the "site" toolbar menu should list "Users"
    And the "Page" toolbar menu should list "Page settings"
    And the "Page" toolbar menu should list "Create Page > New Sub Page"
    And the "Version" toolbar menu should list "Manage Versions"
    And the "Language" CMS toolbar menu should list "Deutsch"
    But the "Page" toolbar menu should not list "Publish"

  Scenario: A menu entry opens the CMS modal
    When I go to "/en/about/"
    And I click "Page settings" in the "Page" toolbar menu
    Then the CMS modal should be open
    And the CMS modal title should contain "page content"
    And I should see "Description meta tag" in the CMS modal
    When I close the CMS modal
    Then the CMS modal should not be open

  Scenario: The site menu opens the page tree in the CMS sideframe
    When I click "Pages" in the CMS toolbar menu
    Then the CMS sideframe should be showing "/admin/cms/pagecontent/"
    And I should see "Main Navigation" in the CMS sideframe
    When I close the CMS sideframe
    Then the CMS sideframe should not be showing "/admin/cms/pagecontent/"

  Scenario: The site menu opens the users list in the CMS sideframe
    When I click "Users" in the CMS toolbar menu
    Then the CMS sideframe should be showing "/admin/auth/user/"
    And I should see "editor" in the CMS sideframe
    When I fill in "searchbar" with "admin" in the CMS sideframe
    And I click "Search" in the CMS sideframe
    Then I should not see "editor@example.com" in the CMS sideframe
    When I click "admin" in the CMS sideframe
    Then I should see "Change user" in the CMS sideframe

  Scenario: The site menu opens the Django administration in the CMS sideframe
    When I click "Administration" in the django CMS toolbar menu
    Then the django CMS sideframe should be showing "/admin/"
    But the sideframe should not be showing "/admin/auth/user/"

  Scenario: The toolbar buttons follow the page
    When I go to "/en/contact/"
    And I click the "Preview" toolbar button
    Then the toolbar should have the "View published" button
    But the toolbar should not have the "Publish" button
