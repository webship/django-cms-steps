Feature: Django admin login/logout

  Scenario: Admin logs in and sees the CMS toolbar
    Given I am a logged in user with the username "admin"
    Then I should see the CMS toolbar

  Scenario: Anonymous visitor does not see the CMS toolbar
    Given I am on the homepage
    Then I should not see the CMS toolbar

  Scenario: Admin logs out
    Given I am a logged in user with the username "admin"
    Then I should see the CMS toolbar
    When I log out
    Then I should not see the CMS toolbar

  Scenario: A visitor with a cleared session is sent to the login form
    Given I am a logged in user with the username "admin"
    Then I should see the CMS toolbar
    Given I am not logged in
    Given I am on the homepage
    Then I should not see the CMS toolbar
