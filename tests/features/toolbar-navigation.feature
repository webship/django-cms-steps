Feature: CMS toolbar navigation

  Background:
    Given I am a logged in user with the username "admin"

  Scenario: Admin opens the Pages admin from the toolbar menu
    When I click "Pages" in the CMS toolbar menu
    Then the CMS sideframe should be showing "/admin/cms/pagecontent/"

  Scenario: Admin opens the Users admin from the toolbar menu
    When I click "Users" in the CMS toolbar menu
    Then the CMS sideframe should be showing "/admin/auth/user/"

  Scenario: Admin opens the Django administration from the toolbar menu
    When I click "Administration" in the CMS toolbar menu
    Then the CMS sideframe should be showing "/admin/"
