---
description: Professional review of a video, image, or audio file — technical QC, scored creative critique, platform fit, and the top fixes. Targets Instagram, YouTube, Telegram, and paid ads.
argument-hint: <file> [platform-id] [goal]
---

# Media Review

**Input**: $ARGUMENTS

Use the `media-director` agent (`agents/media-director.md`) to review the supplied media.

## Steps

1. **Identify the file and destination.** The first argument is the file path. The optional second argument is a platform id (`instagram-reels`, `instagram-feed`, `instagram-story`, `youtube`, `youtube-shorts`, `youtube-thumbnail`, `telegram-video`, `telegram-round`, `telegram-photo`, `ads-vertical`, `ads-feed`, `ads-youtube`, `podcast`). Anything after it is the goal. If the platform is missing, infer it from the aspect ratio and state the assumption.
2. **Measure.** Run `node scripts/lib/media-probe.js "<file>" --platform <id>`.
3. **Inspect the content.** Follow the matching skill:
   - video → `skills/video-analysis/` (extract hook, scene, and last frames; check silence, clipping, black frames)
   - image → `skills/image-analysis/` (glance test at 168 px, grayscale check)
   - audio → `skills/audio-analysis/` (spectrum, waveform, noise floor)
4. **Score and report** using the agent's output format: Verdict, Technical Report, Scores, Top 3 Fixes, All Findings, How to Get More From This Asset, Next Step.
5. **Do not modify the source file.** Offer `/media-improve` as the next step.

Reply in the user's language.
