# TODO

The default loop selection should be 1x. 

When the user selects a pattern from the pattern dropdown and at initial load time, before they click start, we should display the pattern in the piano roll region and hide the central bright white hit time line as well as the end of measure double vertical line. This will allow users to see how complex the pattern is and decide which pattern they want to play. 

When the user hits pads, they should always trigger the appropriate kit sound, whether the user is in the middle of an attempt and start has been clicked or not. The pads should always feel live to the user, even if they switch the kit while they're playing with the pads, even in a pause state. They should hear the new kit as it's selected. 

Practice data should persist across user sessions via browser local storage.

The kit select dropdown does not seem to change the actual sound that is emitted when a pad is hit. Please debug this and make some selectable kits for the user. If necessary, go find samples for the kit if this is how it needs to be done via WebMIDI. 

When the user completes an attempt, we write the attempt complete row, but almost all of the information in this row is duplicative of the information in the score row and playing history row immediately above it. Condense the attempt complete data with the data in the score combo accuracy cell to save space. You can say what the final score was and include the grade, and you can show the user's combo performance out of max combo. 

For the various score components where the user might not know what the meaning is, add tooltips that the user can hover over to get an explanation of what the score means, the subcomponents as well, and how they are calculated. For example, combo, max combo, accuracy, etc. In general, add tooltips to all UI elements within the app so that a user who hovers over an element for more than a second or two will get a hovering tooltip to describe the function of that element. 

Quantize should be a toggle which can be turned on and off.

Let's build Quantize on top of the above requested feature where when a user selects the pattern or when it's initially selected to the default, we display it. At that point, if a user clicks Quantize, they can see how the notes will move to react to the quantization, and if the user then toggles Quantize off, the notes move back to their original positions in the pattern.

When I select items from the midi Interfaces dropdown, The other options disappear from the dropdown if I go back to reselect and select another alternative interface. 

If keyboard is selected from the dropdown, we should show the keys used in the piano roll area next to each of the instrument types, for example, kick or snare, so that users know which keys to press when the keyboard interface is selected. 

Output. Instructions for how to run automated browser testing. I would like a small set of functional tests to verify some of the functionality that I've described requirements for in this TODO, along with management of any dependencies necessary for running those tests, if it's possible to do functional tests that are executed against Claude for Chrome and not add dependencies. Let's explore that. Otherwise, include dependency management for whatever testing tools are required to run a small set of tests. 

- [ ] **Completion view accuracy offset** - Revisit how timing accuracy is visualized in the piano roll completion view. Currently notes shift based on timeDiff (rushing/dragging), but the effect may be too pronounced at slow BPMs. Options: remove offset entirely, cap the offset, or keep as-is. This feature lets render the accuracy graph with the same gray disabled-looking notes as we use when an instrument in the piano roll is muted to show the true position which all notes should have been played in per the pattern. Let's overplot the existing accuracy view notes, which are colored and offset based on time diff, on top of the gray notes with an alpha channel so that users can see where their notes should have been played per the pattern as well as where they're actually played on average per the time diff and whether they're rushing or dragging particular notes. 
