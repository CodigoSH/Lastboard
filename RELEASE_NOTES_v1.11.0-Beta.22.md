**Fixes from a second tester pass: names, backup password, edit mode and status dots**

### Fixed
- A board may be saved under the name it already has, and a failed name check is an error
- A board name that fills the limit is cut to fit its number
- A hypervisor that does not answer is not "not configured"
- A refused avatar is not kept for the next save
- A title made of spaces is refused, and saved titles are trimmed
- An account without the local network no longer sees its home services as down
- Creating a board answers with its date, and an empty user list is an array
- Names cut with an ellipsis are cut at their end on a right-to-left page
- The container search box keeps room for its placeholder beside the shortcut hint
- The demo refuses repeated board names too; document the rule
- The edit button is sized by its tile, so small bookmarks keep their name readable
- The grid columns slider is labelled for screen readers
- The main button of the wizard keeps its words on one line
- The password of a new protected backup is at least 8 characters
- Two accounts cannot have names that differ only by case

