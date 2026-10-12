# Performance video playback during session assignment

Open the Admin Page's session-management board. Each performance registrant card now has **Play video**; the same action appears in Session Overview's registrant view.

1. Click **Play video** on an unassigned registrant with an uploaded video. Confirm the modal names the correct solo performer or ensemble and the video plays with native controls. Pause, seek and adjust volume.
2. Close the modal using Close, the top-right close icon or Escape. Confirm playback stops and the draft assignments remain intact. Assign the registrant, expand the destination group and play the same video from its assigned card.
3. Enable Swap mode and click **Play video**. Confirm this does not select the card for a swap. Drag the card itself to reorder/move it and confirm assignment still works.
4. Open Session Overview, select its registrant view and play a video. Close the player and confirm the Overview remains open. Verify the same action works in a read-only published session.
5. Check a registration with no saved video: the button is disabled and its tooltip says **No performance video available**. Check an unavailable file: the modal should show a playback error and offer **Open video in a new tab**. Check a filename with spaces or special characters if available.
6. If planning APCS2026 with APCS2025 guests, load the source event and play a guest's saved video. Switching the selected event should close any active player.

Playback uses the existing saved upload and Jury Dashboard CDN. It does not save or publish session assignments. Automated verification covered source parsing, link resolution and button behavior; browser appearance and actual media delivery require these manual checks.
