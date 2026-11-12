Feature: Log in and log out
  As a tester of a django CMS site
  I want to log in as an account from the users registry and log out again
  So that every scenario starts with the right user and no password lives in a feature

  Scenario: An administrator logs in and sees the CMS toolbar
    Given I am a logged in user with the "admin" user
    Then I should be logged in
    And I should see the CMS toolbar
    And I should not see the login form

  Scenario: An editor logs in by the registry handle
    Given we are a logged in user with the username "editor"
    Then we should be logged in
    And we should see the django CMS toolbar

  Scenario: An anonymous visitor does not see the CMS toolbar
    Given I am not logged in
    When I go to the homepage
    Then I should not see the CMS toolbar
    And I should not be logged in

  Scenario: The toolbar logs the user out
    Given I am a logged in user with the "admin" user
    Then I should see the CMS toolbar
    When I log out
    Then I should not see the CMS toolbar
    And I should not be logged in

  Scenario: The Django admin logs the user out
    Given I am a logged in user with the "admin" user
    When I go to "/en/admin/"
    And I sign out
    Then I should not be logged in

  Scenario: A cleared session is anonymous again
    Given I am a logged in user with the "admin" user
    Then I should see the CMS toolbar
    Given I am not logged in
    Then I should see the login form
    When I go to the homepage
    Then I should not see the CMS toolbar

  Scenario: The login form rejects a wrong password
    Given I am on the login page
    Then I should see the login form
    And I should not see a login error
    When I log in as "admin" with password "not-the-password"
    Then I should see a login error
    And I should see the login error "Please enter the correct username and password"
    And I should not be logged in

  Scenario: An anonymous visitor is sent to the login form by the admin
    Given I am not logged in
    Then I should not be allowed to open "/admin/cms/pagecontent/"
    And I should see the admin login form
