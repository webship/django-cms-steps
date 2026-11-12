Feature: Publish and unpublish with versions
  As an editor
  I want to publish a draft, change it in a new draft and unpublish it
  So that visitors only see the versions I released

  Scenario: A page goes from draft to published to a new draft and back offline
    Given I am a logged in user with the "admin" user
    When I go to the homepage
    And I create a page titled "Version story" with the text "First edition." with the wizard
    Then the page version should be "Draft"
    And the page version should not be "Published"
    And the page should be at version 1
    And I should not see the CMS message "Version published"
    And the toolbar should have the "Publish" button

    When I publish the page
    Then I should see the CMS message "Version published"
    And the page version should be "Published"
    And I should not be in edit mode
    And the toolbar should have the "New Draft" button
    But the toolbar should not have the "Publish" button
    And I should see "First edition."

    When I open the page for editing
    Then I should be in edit mode
    And the page version should be "Draft"
    And the page should be at version 2
    But the page should not be at version 1
    When I add a text plugin with "Second edition." to the "Page Content" placeholder
    And I publish the page
    Then the page version should be "Published"
    And the page should be at version 2
    And I should see "Second edition."

    When I unpublish the page
    And I am on the page tree
    Then the page "Version story" should be unpublished in the page tree
    And the page "Version story" should not be published in the page tree

    When I delete the page "Version story" in the page tree
    Then I should not see "Version story" in the page tree

  Scenario: A visitor sees a page only while it is published
    Given I am a logged in user with the "admin" user
    When I go to the homepage
    And I create a page titled "Version visible" with the text "Now you see me." with the wizard
    And I log out
    And I go to "/en/version-visible/"
    Then I should be on the page not found page

    Given I am a logged in user with the "admin" user
    When I open the page "Version visible" from the page tree
    And I publish the page
    And I log out
    And I go to "/en/version-visible/"
    Then I should not be on the page not found page
    And I should see "Now you see me."
    And the navigation menu should list "Version visible"

    Given I am a logged in user with the "admin" user
    And I am on the page tree
    When I delete the page "Version visible" in the page tree
    Then I should not see "Version visible" in the page tree
