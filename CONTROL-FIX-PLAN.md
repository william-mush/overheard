# Control Panel Complete Fix Plan

## Critical Issues to Fix

### 1. Speed/Density Crash (CRITICAL)
**Problem**: `setSpeed` and `setDensity` commands crash when `speedControl`/`densityControl` elements are null on display page.
**Fix**: Add null checks before setting element values in main.js

### 2. Timing Sliders Don't Update Live (HIGH)
**Problem**: Art mode timing sliders only update UI text, never send commands to display.
**Fix**: Add sendCommand calls for timing slider changes

### 3. Filter Logic Not Applied (HIGH)
**Problem**: Category/rhetoric/factcheck filters are stored but not actually used when fetching quotes.
**Fix**: Ensure getFilteredPoliticalQuotes properly passes filters to politicalSpeechSource

### 4. Mode State Not Synced (MEDIUM)
**Problem**: Control panel mode buttons don't update when display mode changes.
**Fix**: Update control panel UI when receiving stats with mode info

## Implementation Tasks

### Task 1: Fix main.js Command Handlers
- Add null checks for speedControl and densityControl
- Verify all command handlers work without UI elements

### Task 2: Fix control.html Timing Controls
- Add sendCommand for speakerTime slider
- Add sendCommand for quoteInterval slider
- Add sendCommand for quotesPerSpeaker slider
- Add live timing update commands to main.js

### Task 3: Fix Filter Application
- Verify politicalSpeechSource.applyFilters works
- Ensure getFilteredPoliticalQuotes uses all filter types
- Test each filter type individually

### Task 4: Add Mode Sync
- Update control panel mode buttons from stats messages
- Highlight active mode correctly

### Task 5: Test All Controls
- Test each mode button
- Test speed slider
- Test density slider
- Test speaker selection
- Test timing sliders
- Test filter presets
- Test contradiction enable/disable
- Test Start/Skip/Stop art mode

## Files to Modify
1. main.js - Fix command handlers
2. control.html - Fix timing controls, add mode sync

## Verification Checklist
- [ ] Speed slider changes display speed
- [ ] Density slider changes display density
- [ ] Mode buttons switch display modes
- [ ] Speaker selection filters speakers
- [ ] Timing sliders update art mode timing
- [ ] Filter presets apply correctly
- [ ] Contradiction toggles work
- [ ] Start Art begins accumulation
- [ ] Skip Speaker advances
- [ ] Stop Art stops
- [ ] Connection status shows green when connected
