# MonSuite V45 — AbateBot PPM4/RPM Manual Deep Brain

## Purpose

V45 expands AbateBot so it can answer practical customer/support questions from the PPM4 and RPM owner manuals. The goal is to make AbateBot useful for the questions people actually ask, especially “how do I…” questions.

## Source manuals reviewed

- PPM4 Owner's Manual
- RPM Owner's Manual

## What changed

- Added 109 new grounded manual entries to `src/data/chatbotBrain.json`.
- Added hundreds of natural question variants around PPM4 and RPM setup, operation, maintenance, and troubleshooting.
- Updated the public text mirror at `public/knowledge/monsuite-chatbot-brain-v1.txt`.
- Updated app version/cache to `v45.0.0`.

## Major PPM4 coverage added

- Product overview and features
- Included accessories
- Battery conditioning before first use
- AC Power Mode vs Battery Mode
- Turning unit on/off and waking display
- Charger and power jack behavior
- ROOM/REF pressure tubing setup
- Inline filter placement and replacement
- Closed-lid operation and avoiding pinched tubing
- Do-not-blow warning for tubing/ports
- Menu navigation
- STOP ALARM behavior
- Occupied/Unoccupied room status
- Zero calibration
- Room naming
- Pressure alarm limits for positive and negative rooms
- Alarm preferences, audible alarm, silence duration, delay
- Pressure units
- Recording intervals and local/cloud logging
- Altitude setting
- Display scale
- BACnet setup
- Wi-Fi setup and Wi-Fi info
- Cellular setup menu
- Cloud login and verification
- USB history download / `ARCHIVE.CSV`
- Delete log behavior
- Touch beep, display settings, screen timeout, brightness, font size, language
- Knock sensor
- Date/time and 24-hour clock
- Password behavior
- Firmware and language update from USB
- System information screen
- Abatement Link / AT Connect device creation, verification, notifications, and mobile app
- Filter replacement and display cleaning
- External sensor connection, DIP switches, sensor enablement, and troubleshooting
- Calibration/repair service
- Specs, archive capacity, logged events, job numbers

## Major RPM coverage added

- Product overview and features
- Included accessories
- External sensor capacity: up to 10 total, max 5 per room
- Built-in pressure sensor reserved as Room 1 Sensor 1
- Do-not-connect-to-network-switch/router warning
- Sensor layout planning
- DIP switch assignments
- Sensor bus wiring, Cat5e, 50 ft maximum total cable distance
- Power-on order after sensor wiring
- Enabling sensors in UI
- Communication error alarm warning if unconnected sensors are enabled
- Sensor alarm trigger setup
- Sensor alarm status setup
- Occupied room requirement for alarm triggers
- Sensor troubleshooting and left-to-left RJ45 note
- ROOM/REF tubing setup and inline filters
- Job number editing
- Menu navigation
- STOP ALARM behavior
- Room select, room status, calibration, room naming
- Sensor settings purpose
- Negative/positive pressure alarm logic
- ACH Room Setup menu path with limitation note
- Alarm preferences
- Pressure/environmental units
- Recording intervals and cloud update note
- Altitude, display scale
- BACnet, Wi-Fi, cellular, cloud setup
- USB export, delete log
- Display/screen saver settings
- Date/time, password, firmware/language update, system info
- Web portal create/verify/view, alarm notifications, mobile app
- Maintenance, cleaning, calibration/repair, specifications, replacement parts

## Notes

The owner manuals give some topics as clear menu paths but not full setup details. Where the manual is brief, V45 entries say so and point to quick guides/support rather than inventing unsupported steps.
