---
name: image-analysis
description: Professional critique of user-supplied images — photos, thumbnails, banners, carousel slides, ad creatives, and AI-generated images. Covers technical quality, composition, light and color, typography, brand fit, click-through potential, and platform fit for Instagram, YouTube, Telegram, and paid ads, then prescribes exact edits or regeneration prompts. Use when the user shares an image and asks how to improve it, whether it will perform, or which variant is better.
metadata:
  origin: ECC
---

# Image Analysis

Review a still image the way an art director and a performance marketer would together: does it look professional, and will it make the right person stop, click, or buy?

## When to Use

- The user shares a photo, thumbnail, post, carousel slide, banner, or ad creative
- "Which thumbnail is better?" or "Will this get clicks?"
- QC for images generated with `fal-ai-media` or another generator (artifacts, hands, text errors)
- Before reusing an image on a different platform (crop and safe-zone check)

## How It Works

### Step 1 — Measure

```bash
node scripts/lib/media-probe.js image.jpg --platform youtube-thumbnail --no-loudness
```

Then look at the image itself with Read. Also check how it reads small, because most images are seen at thumbnail size on a phone:

```bash
# Phone-feed size preview and a tiny "glance test" version
ffmpeg -v error -i image.jpg -vf "scale=360:-2" preview_360.jpg
ffmpeg -v error -i image.jpg -vf "scale=168:-2" glance_168.jpg
# Grayscale version to judge value contrast and hierarchy without color
ffmpeg -v error -i image.jpg -vf "format=gray" gray.jpg
```

Read all three. If the subject or the headline is not clear in `glance_168.jpg` and `gray.jpg`, that is a High finding.

### Step 2 — Score the 8 dimensions

| # | Dimension | What a 9-10 looks like | Common failures |
|---|-----------|------------------------|-----------------|
| 1 | **Technical quality** | Sharp focus on the subject, clean noise, no compression blocks, correct exposure, enough resolution | Soft focus, heavy JPEG artifacts, upscaled blur, clipped highlights |
| 2 | **Subject and focal point** | One clear subject that reads in under 1 second; the eye lands where you want | Three competing subjects, subject too small, busy background |
| 3 | **Composition** | Deliberate layout (thirds, center, leading lines), clean edges, breathing room, nothing important in crop or UI zones | Tangents, cut limbs at joints, horizon tilted, key element under the platform UI |
| 4 | **Light and color** | Light shapes the subject, color palette limited and intentional, skin tones natural, background darker or calmer than subject | Flat light, color cast, oversaturated, subject and background same value |
| 5 | **Typography** (if text) | 3-5 words max on thumbnails, bold sans-serif, high contrast (at least 4.5:1), readable at 168px wide | Long sentences, thin fonts, text over busy areas, typos, more than 2 fonts |
| 6 | **Emotion and story** | Face with a clear emotion, or a before/after, or curiosity gap; viewer knows why to care | Neutral expression, generic stock look, no tension |
| 7 | **Brand consistency** | Same colors, fonts, and style as the channel or brand; recognizable in the feed | Random style per post, logo too large or missing in ads |
| 8 | **Platform fit** | Correct aspect and size, safe zones respected, native look for that feed | 16:9 used on Instagram feed, text in the Reels UI zone, Telegram preview crops the key area |

### Step 3 — Thumbnail and ad specific checks

- **Curiosity gap**: thumbnail and title must work together without repeating each other. The image shows the result or emotion; the title adds context.
- **Contrast against the feed**: YouTube's interface is white or dark, Instagram is mostly white or black. Avoid backgrounds that blend with the interface.
- **Face rule**: if a face is used, the eyes should be visible, the emotion exaggerated, and the face should fill about 30-40% of the frame.
- **Ad rule**: product or offer visible, one message, a visual CTA cue, and no more text than needed. Check the ad platform's text and policy rules before final delivery.
- **AI image QC**: count fingers, check teeth, eyes, ears, jewelry symmetry, warped text, melted backgrounds, repeated patterns, and inconsistent shadows. List each artifact with its location.

### Step 4 — Prescribe fixes

Give exact edits:

```bash
# Crop to Instagram 4:5 (1080x1350) keeping the center
ffmpeg -i in.jpg -vf "scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350" out_4x5.jpg
# YouTube thumbnail 1280x720 under 2 MB
ffmpeg -i in.png -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720" -q:v 3 out_thumb.jpg
# Gentle "pop": contrast, saturation, and sharpening
ffmpeg -i in.jpg -vf "eq=contrast=1.1:saturation=1.15,unsharp=5:5:0.8" out_pop.jpg
# Darken and blur the background area behind text (top third example)
ffmpeg -i in.jpg -filter_complex "[0]split[a][b];[b]crop=iw:ih/3:0:0,boxblur=8,eq=brightness=-0.15[t];[a][t]overlay=0:0" out_textbg.jpg
```

For edits that need a mask (subject cut-out, retouching, relighting), give step-by-step instructions for Photoshop, Lightroom, Canva, or Figma, or use a background-removal tool if one is connected. For a full redo, write a prompt with `media-prompt-engineering`, including what to keep from the original.

For A/B choices, rank variants and explain the deciding factor, then suggest one more variant that combines the best parts.

## Examples

### Example finding

> **[High] Headline unreadable at feed size** — The 9-word headline uses a thin font in white over a bright sky. In `glance_168.jpg` it is a blur. **Fix:** cut to 3 words ("I QUIT SUGAR"), use a heavy sans-serif (Montserrat Black or Anton) at about 1/6 of the image height, yellow #FFD400 with a 6px black stroke, and place it on the darker left third.

### Example thumbnail comparison

| Variant | Glance test | Emotion | Contrast | Verdict |
|---------|-------------|---------|----------|---------|
| A | Subject clear, text clear | Strong (surprise) | High | Winner |
| B | Text clear, face small | Weak | Medium | Second |
| C | Busy, nothing reads | None | Low | Drop |

Suggested D: A's face and expression with B's 2-word headline.

## Related

- `media-director` agent
- `media-platform-specs` — image sizes and safe zones per platform
- `media-prompt-engineering` — regenerating or extending an image
- `fal-ai-media` — image generation and editing models
