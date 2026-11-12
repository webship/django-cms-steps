Feature: The page tree
  As an editor
  I want to manage the pages of the site from the page tree
  So that I can see their state and publish, move and delete them in one place

  Background:
    Given I am a logged in user with the "admin" user
    And I am on the page tree

  Scenario: The page tree lists the pages by their exact title
    Then I should see the page tree
    And I should see "Home" in the page tree
    And I should see "About" in the page tree
    And I should see "Team" in the page tree
    And we should see "Contact" in the CMS page tree
    But I should not see "Abou" in the page tree
    And I should not see "Startseite" in the page tree

  Scenario: The page tree shows the state and the place of each page
    Then the page "Home" should be published in the page tree
    And the page "Home" should be the home page in the page tree
    And the page "About" should not be the home page in the page tree
    And the page "Draft notes" should be a draft in the page tree
    And the page "Draft notes" should not be published in the page tree
    And the page "Team" should be a sub page of "About" in the page tree
    But the page "Contact" should not be a sub page of "About" in the page tree

  Scenario: A draft that was never published opens from the page tree
    When I open the page "Draft notes" from the page tree
    Then I should be in edit mode
    And the page version should be "Draft"
    And I should see "Not published yet."

  Scenario: The settings of a page are a form of the admin
    When I open the settings of the page "Draft notes" in the page tree
    Then I should see "Change page content"
    And I should see "The default title"
    When I open the advanced settings of the page "About" in the page tree
    Then I should see "Advanced Settings"

  Scenario: A page is published, unpublished, moved and deleted in the page tree
    When I go to the homepage
    And I create a page titled "Tree traveller" with the wizard
    And I am on the page tree
    Then the page "Tree traveller" should be a draft in the page tree

    When I publish the page "Tree traveller" in the page tree
    Then the page "Tree traveller" should be published in the page tree

    When I move the page "Tree traveller" under the page "Contact" in the page tree
    Then the page "Tree traveller" should be a sub page of "Contact" in the page tree

    When I move the page "Tree traveller" to the top level of the page tree
    Then the page "Tree traveller" should not be a sub page of "Contact" in the page tree

    When I unpublish the page "Tree traveller" in the page tree
    Then the page "Tree traveller" should be unpublished in the page tree

    When I delete the page "Tree traveller" in the page tree
    Then I should not see "Tree traveller" in the page tree
