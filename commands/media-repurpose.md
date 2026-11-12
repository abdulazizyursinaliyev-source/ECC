---
description: Turn one video, image set, or audio recording into a multi-platform content pack — Reels, Shorts, YouTube thumbnails, Telegram posts, carousels, and ad cuts — with timestamps, hooks, captions, and export commands.
argument-hint: <file> [targets e.g. reels,shorts,telegram,ads,thumbnail,carousel]
---

# Media Repurpose

**Input**: $ARGUMENTS

Use the `media-director` agent (`agents/media-director.md`).

## Steps

1. **Understand the source.** Run `node scripts/lib/media-probe.js "<file>"`. For video, extract scene frames and transcribe speech if a transcription tool is connected (see `skills/video-analysis/`). For long footage, `skills/videodb/` can index and search moments.
2. **Find the moments.** List candidate segments with start and end timestamps. Score each on: self-contained payoff, strong first line or visual, emotion, and relevance to the audience. Keep the best 3-8.
3. **Map moments to outputs** using the repurposing table in `skills/media-platform-specs/`. Default targets: Instagram Reels, YouTube Shorts, a Telegram channel post, 3 YouTube thumbnail concepts, one carousel, and ad cuts (6s, 15s, 30s). Respect any targets the user lists.
4. **For each output write:** timestamps, the new hook (first line and first frame), on-screen text, caption or title in the user's language, hashtags where relevant, CTA, and the exact FFmpeg command to cut, reframe, caption, and export it.
5. **Execute on request.** Cut the clips into new files, re-check each with the probe against its platform id, and present a summary table (file, platform, length, status).
6. **Suggest a posting order** across the week so each platform gets native content rather than identical cross-posts.

Reply in the user's language.
