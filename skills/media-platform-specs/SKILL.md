---
name: media-platform-specs
description: Delivery specs and native-performance guidance for Instagram (Reels, Feed, Stories, carousels), YouTube (long-form, Shorts, thumbnails), Telegram (channel video, video messages, photos, voice), and paid ads (Meta, YouTube, Telegram Ads) — aspect ratios, sizes, durations, safe zones, loudness, captions, and what each feed rewards. Use when preparing, checking, or repurposing media for a specific platform.
metadata:
  origin: ECC
---

# Media Platform Specs

One reference for "what does this platform need and what does it reward". The numbers here are the defaults used by `scripts/lib/media-probe.js`.

> **Drift-prone skill.** Platforms change limits and placements often. Treat these values as a strong default and confirm critical limits (ad durations, file size caps, text policies) against the platform's own help center before final delivery.

## When to Use

- Choosing aspect ratio, resolution, and length before shooting or generating
- Checking a finished file before upload (`node scripts/lib/media-probe.js <file> --platform <id>`)
- Repurposing one asset across Instagram, YouTube, Telegram, and ads
- Explaining to the user why a file looks wrong after upload (crop, blur, black bars)

## How It Works

### Delivery Table

| Platform id | Placement | Aspect | Resolution | Length | Audio target |
|-------------|-----------|--------|------------|--------|--------------|
| `instagram-reels` | Reels | 9:16 | 1080x1920 | up to 3 min (best 7-30s) | -14 LUFS |
| `instagram-story` | Stories | 9:16 | 1080x1920 | up to 60s per story | -14 LUFS |
| `instagram-feed` | Feed post / carousel | 4:5 (best) or 1:1 | 1080x1350 | video up to 60 min, carousel up to 20 slides | -14 LUFS |
| `youtube` | Long-form | 16:9 | 1920x1080 or 3840x2160 | any (8-15 min common) | -14 LUFS |
| `youtube-shorts` | Shorts | 9:16 | 1080x1920 | up to 3 min (best 15-45s) | -14 LUFS |
| `youtube-thumbnail` | Thumbnail | 16:9 | 1280x720, under 2 MB, JPG/PNG | — | — |
| `telegram-video` | Channel / group video | any (16:9, 9:16, 1:1, 4:5) | 1080 short side, H.264 + AAC MP4 | up to 2 GB file (4 GB Premium) | -16 LUFS |
| `telegram-round` | Video message (circle) | 1:1 | 384-640 px square | up to 60s | -16 LUFS |
| `telegram-photo` | Channel photo | any | 1080-2560 px long side | up to 10 MB as photo | — |
| `ads-vertical` | Meta Reels/Stories ads, Shorts ads | 9:16 | 1080x1920 | 6-60s (best 9-15s) | -14 LUFS |
| `ads-feed` | Meta feed ads | 4:5 or 1:1 | 1080x1350 | 6-60s (best 15s) | -14 LUFS |
| `ads-youtube` | YouTube in-stream | 16:9 | 1920x1080 | bumper 6s, non-skippable 15-30s, skippable any | -14 LUFS |
| `podcast` | Audio | — | 48 kHz / 44.1 kHz | any | -16 LUFS |

Export default that works almost everywhere: MP4, H.264 High profile, yuv420p, 30 fps (or the source fps), AAC 192 kbps 48 kHz, `-movflags +faststart`.

### Safe Zones (vertical 1080x1920)

- **Top 250 px**: account name, progress bar, Stories header. No text.
- **Bottom 400-480 px**: caption, music label, CTA button. No text or key subject.
- **Right 140 px**: like / comment / share icons on Reels and Shorts.
- Keep headlines and faces inside the central area of about 1080x1200 starting 250 px from the top.
- Instagram grid shows a **3:4 crop** of Reels and 4:5 posts in the profile grid; keep the cover's key element centered.
- Telegram channel previews crop tall images and videos in the feed; keep the subject centered.

### What Each Feed Rewards

**Instagram**
- Reels: watch time, rewatches, shares and saves. Hook in the first second, loopable endings, trending or original audio, on-screen text plus captions.
- Carousels: saves. Slide 1 is the hook headline, slides 2-9 give value, the last slide is the CTA. Same template on all slides.
- Stories: daily presence and replies. Polls, questions, and stickers increase interaction; the first frame must not look like an ad.

**YouTube**
- Long-form: click-through rate (thumbnail + title) and average view duration. The first 30 seconds must confirm the promise of the title, then use chapters, pattern breaks every 30-60s, and an end screen in the last 5-20s.
- Shorts: viewed vs swiped away and loops. Start mid-action, no intro, one idea, end so it loops.
- Thumbnails: 3 elements max (face/emotion, object, 0-4 words), high contrast, readable at 168 px wide. Use the built-in A/B test (Test and Compare) when available.

**Telegram**
- Channel posts are read more than watched: a strong first line of caption, a cover image or the first frame that reads at a small size, captions burned in (autoplay is muted), and a file size that loads quickly on mobile data (compress long videos to 4-6 Mbps for 1080p).
- Video messages (circles) feel personal: face centered, direct speech to the camera, under 60s.
- Voice posts: speech at -16 LUFS, music bed low or absent.
- Use the post text for the CTA and links; Telegram does not add a CTA button to organic posts.

**Paid ads (Meta, YouTube, Telegram Ads)**
- Brand or product visible in the first 2-3 seconds, sound-off friendly with captions, one message per creative, a clear CTA at the end and in the copy.
- Make 3-5 variations of the hook (first 3 seconds) on the same body; hooks drive most of the performance difference.
- Respect the ad platform's policy on before/after claims, health, finance, and text density. Telegram Ads in channels are text-first (short text, optional media, link) — check the current format before promising video placement.

## Examples

### Repurposing map for one 10-minute YouTube video

| Output | Platform id | How |
|--------|-------------|-----|
| 3-5 vertical clips | `youtube-shorts`, `instagram-reels` | Pick 20-45s moments with a self-contained payoff, reframe to 9:16, add captions and a new hook line |
| 1 carousel | `instagram-feed` | 6-8 key frames or takeaways at 4:5, same template |
| 1 channel post | `telegram-video` | 60-90s highlight at 1080p 5 Mbps plus a strong first line and the link to the full video |
| 3 thumbnails | `youtube-thumbnail` | Different emotion or text per variant for A/B testing |
| 2-3 ad cuts | `ads-vertical`, `ads-youtube` | 6s bumper, 15s, and 30s with the product in the first 3s |

### Probe usage

```bash
node scripts/lib/media-probe.js reel.mp4 --platform instagram-reels
node scripts/lib/media-probe.js cover.jpg --platform telegram-photo --no-loudness
node scripts/lib/media-probe.js --list-platforms
```

## Related

- `media-director` agent
- `video-analysis`, `image-analysis`, `audio-analysis`
- `media-prompt-engineering`
