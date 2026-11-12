Feature: The structure board and text plugins
  As an editor
  I want to add, edit and delete plugins on the structure board
  So that I can build the content of a page from its placeholders

  Scenario: An editor builds a page from text plugins
    Given I am a logged in user with the "admin" user
    When I go to the homepage
    And I create a page titled "Board playground" with the wizard
    Then I should be in edit mode
    And the page should have editable plugins
    And I should not see the structure board

    When I open the structure board
    Then I should see the structure board
    And I should see the "Page Content" placeholder
    But I should not see the "Sidebar" placeholder
    And the "Page Content" placeholder should have 0 plugins
    And the "Page Content" placeholder should not have a "Text" plugin

    When I add a "Text" plugin to the "Page Content" placeholder
    Then the CMS modal should be open
    And the CMS modal title should contain "Text"
    When I fill in the text editor with "The first paragraph."
    Then the text editor should contain "The first paragraph."
    When I save the plugin
    Then the CMS modal should not be open
    And the "Page Content" placeholder should have a "Text" plugin
    And the "Page Content" placeholder should have 1 plugin

    When I add a text plugin with "The second paragraph." to the "Page Content" placeholder
    Then the "Page Content" placeholder should have 2 plugins

    When I edit the second "Text" plugin in the "Page Content" placeholder
    Then the rich text editor should contain "The second paragraph."
    But the text editor should not contain "The first paragraph."
    When I fill in the rich text editor with "The second paragraph, edited."
    And I save the plugin
    And I close the structure board
    Then I should not see the structure board
    And I should see "The first paragraph."
    And I should see "The second paragraph, edited."

    When I delete the first "Text" plugin in the "Page Content" placeholder
    Then the "Page Content" placeholder should contain 1 plugin
    When I close the structure board
    Then I should not see "The first paragraph."
    But I should see "The second paragraph, edited."

    When I preview the page
    Then I should not be in edit mode
    And the page should not have editable plugins
    And I should see "The second paragraph, edited."

    When I am on the page tree
    And I delete the page "Board playground" in the page tree
    Then I should not see "Board playground" in the page tree

  Scenario: A published page has no structure board until it is opened for editing
    Given I am a logged in user with the "admin" user
    When I go to "/en/contact/"
    Then I should not be in edit mode
    And the page should not have editable plugins
    And I should not see the structure board
