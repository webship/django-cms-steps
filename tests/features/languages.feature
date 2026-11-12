Feature: Languages
  As a visitor of a site in two languages
  I want to switch a page to my language
  So that I read the site in the language I choose

  Scenario: The language chooser lists the languages of the site
    Given I am not logged in
    When I go to "/en/about/"
    Then the page language should be "en"
    And the language chooser should offer "English"
    And the language chooser should offer "Deutsch"
    But the language chooser should not offer "Français"
    And the active language should be "English"
    And the active language should not be "Deutsch"

  Scenario: A visitor switches a translated page to German and back
    Given I am not logged in
    When I go to "/en/about/"
    And I switch the language to "Deutsch"
    Then the page language should be "de"
    And the active language should be "Deutsch"
    And I should see "Über diese Website."
    And the navigation menu should list "Über uns"
    But the navigation menu should not list "Contact"
    When I switch the language to "en"
    Then the page language should be "en"
    And I should see "About this site."

  Scenario: The home page answers in both languages
    Given I am not logged in
    When I go to "/de/"
    Then the page language should be "de"
    And I should see "Willkommen auf der django CMS Testseite."
    And the breadcrumb should contain "Startseite"

  Scenario: A page that is not translated is not served in the other language
    Given I am not logged in
    When I go to "/de/contact/"
    Then I should be on the page not found page

  Scenario: An editor switches the language from the toolbar
    Given I am a logged in user with the "editor" user
    When I go to "/en/about/"
    Then the "Language" toolbar menu should list "English"
    And the "Language" toolbar menu should list "Deutsch"
    When I click "Deutsch" in the "Language" toolbar menu
    Then the page language should be "de"
    And I should see "Über diese Website."

  Scenario: An editor adds the German translation of a page
    Given I am a logged in user with the "admin" user
    When I go to the homepage
    And I create a page titled "Opening hours" with the text "Open daily." with the wizard
    Then the "Language" toolbar menu should list "Add Translation > Deutsch"
    When I click "Add Translation > Deutsch" in the "Language" toolbar menu
    Then the CMS modal should be open
    When I fill in "Title" with "Öffnungszeiten" in the CMS modal
    And I fill in "Slug" with "oeffnungszeiten" in the CMS modal
    And I click "Save" in the CMS modal
    Then the "Language" toolbar menu should list "Deutsch"
    When I click "Deutsch" in the "Language" toolbar menu
    Then the page language should be "de"
    And I should see "Öffnungszeiten"
    When I am on the page tree
    And I delete the page "Opening hours" in the page tree
    Then I should not see "Opening hours" in the page tree
