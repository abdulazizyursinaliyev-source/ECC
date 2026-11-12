---
description: Turn a media review into executed fixes — loudness, reframing, subtitles, color, cleanup, trims — writing new output files and re-checking them. Works for video, image, and audio.
argument-hint: <file> [platform-id] [--plan-only]
---

# Media Improve

**Input**: $ARGUMENTS

Use the `media-director` agent (`agents/media-director.md`).

## Steps

1. **Get the findings.** If a review of this file exists earlier in the conversation, use it. Otherwise run the full `/media-review` flow first.
2. **Build a fix plan** ordered by impact divided by effort. For each fix list: the problem, the tool (FFmpeg command, editor steps, or regeneration prompt), and the output file name. Use the recipes in `skills/video-analysis/`, `skills/image-analysis/`, and `skills/audio-analysis/`.
3. **If `--plan-only` is set, stop here** and present the plan.
4. **Execute automatable fixes** with FFmpeg into new files (`<name>_fixed.<ext>`, `<name>_reel.mp4`, and so on). Never overwrite the original. Chain steps in this order: trim and reframe → color → audio cleanup → loudness → subtitles → final delivery export.
5. **Re-measure** each output with `node scripts/lib/media-probe.js <output> --platform <id>` and show a before/after table.
6. **List what still needs a human or another tool** (re-shoot, B-roll, retouching, re-recording) with step-by-step instructions, and offer regeneration prompts via `skills/media-prompt-engineering/` where a redo is better than a fix.

Confirm with the user before any step that spends paid generation credits.

Reply in the user's language.
