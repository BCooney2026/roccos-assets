# Drop TV videos here

**1. Rename the clip:**

`tv2 Hoagies - Stacked High.mp4`

- `tv1` or `tv2`: which TV it plays on (required)
- `Hoagies`: the small red line (use the menu section)
- `Stacked High`: the big title (optional, leave it off for "Rocco's Pizza")

**2. Drag it onto this page** (or click **Add file > Upload files**), then press **Commit changes**.

**3. That's it.** In about a minute it's cropped for the TV and gets a still picture, and your upload disappears from this folder. The TVs check for new videos every 10 minutes, so it shows up within about 10 minutes.

## Good to know

- Download the **HD 1080p** version from Pexels (under 25 MB). GitHub won't take files over 25 MB here.
- Wide or tall clips both work. Clips longer than 10 seconds are trimmed to 10.
- Every video runs **without an item name or price**, because stock footage isn't Rocco's own food.
- Videos added here play in the **side panel** of the menu. The **full-screen reels** (`show-*.mp4`) are edited separately from 4K originals; ask Claude to build a new one.
- **To remove a video:** open `boards/v2c/video`, click its `.mp4`, then the trash can, and commit. Its still and rotation spot are cleaned up automatically.
- A file whose name doesn't start with `tv1` or `tv2` gets moved to `needs-tv1-or-tv2` and skipped. Rename it and upload it again.
