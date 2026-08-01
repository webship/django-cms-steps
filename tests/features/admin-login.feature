Feature: Django admin login/logout

  Scenario: Admin logs in and sees the CMS toolbar
    Given I am logged in as "admin"
    Then I should see the CMS toolbar

  Scenario: Anonymous visitor does not see the CMS toolbar
    Given I am on the homepage
    Then I should not see the CMS toolbar

  Scenario: Admin logs out
    Given I am logged in as "admin"
    Then I should see the CMS toolbar
    When I log out
    Then I should not see the CMS toolbar
