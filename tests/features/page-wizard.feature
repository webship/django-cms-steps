Feature: Create a page with the wizard
  As an editor
  I want to create a page with the create wizard
  So that a new page starts as a draft I can work on before anyone sees it

  Background:
    Given I am a logged in user with the "admin" user

  Scenario: The wizard offers what can be created
    When I go to "/en/about/"
    And I open the create wizard
    Then the CMS modal should be open
    And the CMS modal title should be "Create"
    And the CMS modal title should not contain "Page settings"
    And the create wizard should offer "New page"
    And the create wizard should offer "New sub page"
    And the page wizard should offer "New alias"
    But the create wizard should not offer "New blog post"
    When I click "Cancel" in the CMS modal
    Then the CMS modal should not be open

  Scenario: The wizard, step by step
    When I go to "/en/contact/"
    And I open the page wizard
    And I click "New page" in the CMS modal
    And I click "Next" in the CMS modal
    Then I should see "Provide a title for the new page." in the CMS modal
    When I fill in "Title" with "Wizard steps" in the CMS modal
    And I fill in "Slug" with "wizard-steps" in the CMS modal
    And I click "Create" in the CMS modal
    Then I should be in edit mode
    And I should see "Wizard steps"
    And the page version should be "Draft"
    When I am on the page tree
    Then the page "Wizard steps" should be a draft in the page tree
    When I delete the page "Wizard steps" in the page tree
    Then I should not see "Wizard steps" in the page tree

  Scenario: A page with a first text, in one step
    When I go to the homepage
    And I create a page titled "Wizard news" with the text "Fresh from the wizard." with the wizard
    Then I should be in edit mode
    And the toolbar should have the "Publish" button
    And the "Page Content" placeholder should have a "Text" plugin
    And the "Page Content" placeholder should have 1 plugin
    When I am on the page tree
    And I delete the page "Wizard news" from the page tree
    Then I should not see "Wizard news" in the page tree

  Scenario: A sub page is created below the current page
    When I go to "/en/contact/"
    And I create a sub page titled "Wizard office" with the wizard
    Then I should be in edit mode
    When I am on the page tree
    Then the page "Wizard office" should be a sub page of "Contact" in the page tree
    When I delete the page "Wizard office" in the page tree
    Then I should not see "Wizard office" in the page tree
