Feature: Users, groups and what an editor may do
  As a site owner
  I want an editor to work on pages without reaching the accounts of the site
  So that content work and user management stay in separate hands

  The accounts are configuration: the site creates "admin" and "editor" once
  (site/scripts/accounts.py) and cucumber.js names them in the users registry.

  Scenario: The administrator sees the users and the groups
    Given I am a logged in user with the "admin" user
    And I am on the users list
    Then I should see "admin" in the admin list
    And I should see "editor" in the admin list
    But I should not see "edit" in the admin list
    When I go to the groups list
    Then I should see "Editors" in the admin list
    But I should not see "Publishers" in the admin list

  Scenario: The administrator opens an account from the users list
    Given I am a logged in user with the "admin" user
    And I am on the users list
    When I open "editor" in the admin list
    Then I should see "Change user"
    And I should see "Important dates"

  Scenario: The editor account is staff, in the Editors group, and not a superuser
    Given I am a logged in user with the "admin" user
    Then the user "editor" should be staff
    And the user "editor" should be active
    And the user "editor" should be in the "Editors" group
    But the user "editor" should not be a superuser
    And the user "admin" should be a superuser
    And the user "admin" should not be in the "Editors" group

  Scenario: The Editors group may work on pages, not on accounts
    Given I am a logged in user with the "admin" user
    Then the "Editors" group should have the "Can change page" permission
    And the "Editors" group should have the "Can publish page" permission
    And the "Editors" group should have the "django CMS | page | Can delete page" permission
    But the "Editors" group should not have the "Can add user" permission
    And the "Editors" group should not have the "Can change group" permission

  Scenario: The administration offers an editor the pages, not the accounts
    Given I am a logged in user with the "editor" user
    Then the administration should offer "Page contents"
    And the administration should offer "Aliases"
    But the administration should not offer "Users"
    And the administration should not offer "Groups"
    And the administration should not offer "Pages global permissions"

  Scenario: An editor is refused the accounts
    Given I am a logged in user with the "editor" user
    Then I should be allowed to open "/admin/cms/pagecontent/"
    But I should not be allowed to open "/admin/auth/user/"
    And I should not be allowed to open "/admin/auth/group/"
    And I should not be allowed to open "/admin/cms/globalpagepermission/"

  Scenario: The toolbar of an editor has no Users entry
    Given I am a logged in user with the "editor" user
    When I go to "/en/about/"
    Then the "site" toolbar menu should list "Pages"
    And the "site" toolbar menu should list "Administration"
    But the "site" toolbar menu should not list "Users"

  Scenario: An editor creates and publishes a page
    Given I am a logged in user with the "editor" user
    When I go to the homepage
    And I create a page titled "Editor report" with the text "Written by the editor." with the wizard
    And I publish the page
    Then the page version should be "Published"
    And I should see "Written by the editor."
    When I am on the page tree
    Then the page "Editor report" should be published in the page tree
    When I delete the page "Editor report" in the page tree
    Then I should not see "Editor report" in the page tree
