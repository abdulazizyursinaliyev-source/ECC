---
name: video-analysis
description: Professional review of user-supplied video — technical QC (format, fps, bitrate, loudness, color), creative critique (hook, story, pacing, composition, lighting, sound, captions), and platform fit for Instagram, YouTube, Telegram, and paid ads. Produces scored findings with timestamps and exact fixes. Use when the user shares a video and asks what is wrong, how to improve it, whether it is ready to post, or why it underperforms.
metadata:
  origin: ECC
---

# Video Analysis

Turn "what do you think of my video?" into a director-level review: measured facts, scored dimensions, timestamped findings, and fixes the user can run today.

## When to Use

- The user shares a video file (or a frame grab, or a link they can download) and asks for feedback
- "Is this ready for Reels / YouTube / Telegram / an ad?"
- "Why does this video get low views / low watch time / no clicks?"
- Before repurposing a long video into Shorts, Reels, or ads
- As the QC step after generating a video with `fal-ai-media` or editing with `video-editing`

## How It Works

### Step 1 — Measure (facts first)

```bash
node scripts/lib/media-probe.js input.mp4 --platform instagram-reels
```

This returns codec, resolution, aspect, fps, bitrate, rotation, audio format, integrated loudness (LUFS), true peak, and a list of platform issues. Use the platform id that matches the destination (see `media-platform-specs`).

### Step 2 — See the video (extract frames)

You can only critique what you have seen. Extract frames, then Read the images.

```bash
mkdir -p frames
# Hook: 4 frames per second for the first 3 seconds
ffmpeg -v error -i input.mp4 -t 3 -vf "fps=4,scale=540:-2" frames/hook_%02d.jpg
# Story: one frame at every scene change (threshold 0.3 works for most edits)
ffmpeg -v error -i input.mp4 -vf "select='gt(scene,0.3)',scale=540:-2,showinfo" -vsync vfr frames/scene_%03d.jpg 2> frames/scenes.log
# Fallback for long videos: one frame every 10 seconds
ffmpeg -v error -i input.mp4 -vf "fps=1/10,scale=540:-2" frames/every10_%03d.jpg
# Last frame (end card / CTA)
ffmpeg -v error -sseof -0.5 -i input.mp4 -frames:v 1 frames/last.jpg
# Contact sheet for an overview in one image
ffmpeg -v error -i input.mp4 -vf "fps=1/5,scale=320:-2,tile=5x4" -frames:v 1 frames/contact.jpg
```

Scene timestamps are in `frames/scenes.log` (`pts_time:`). The number of cuts divided by duration gives cuts per minute, which measures pacing.

### Step 3 — Measure the sound and the speech

```bash
# Silence gaps longer than 0.6s at -35 dB (dead air kills retention)
ffmpeg -v error -i input.mp4 -af "silencedetect=noise=-35dB:d=0.6" -f null - 2>&1 | grep silence_
# Clipping and peak level
ffmpeg -v error -i input.mp4 -af "astats=metadata=0:reset=0" -f null - 2>&1 | grep -E "Peak level|Number of samples clipped" | head -4
# Black frames (accidental black at start or end)
ffmpeg -v error -i input.mp4 -vf "blackdetect=d=0.1:pix_th=0.1" -f null - 2>&1 | grep black_start
```

If a transcription tool is connected (for example an ElevenLabs transcription tool, VideoDB, or a local Whisper), transcribe the audio so you can judge the script, the hook line, filler words, and subtitle accuracy. For deeper semantic search across long footage, hand off to the `videodb` skill.

### Step 4 — Score the 10 dimensions

Score each 1-10 and cite evidence (timestamp, frame file, or measurement).

| # | Dimension | What a 9-10 looks like | Common failures |
|---|-----------|------------------------|-----------------|
| 1 | **Hook (0-3s)** | Payoff, pattern break, bold claim, or question shown in the first second; motion in frame 1 | Logo intro, "Hi guys", slow pan, black frame, text appears late |
| 2 | **Story and structure** | Clear promise, tension, payoff; every scene earns its place | No point of view, payoff buried at the end, repetition |
| 3 | **Pacing** | Cuts on beat and on action; no dead air; Shorts/Reels cut every 1.5-3s, YouTube every 4-8s | Long static shots, silence gaps, slow talking head |
| 4 | **Composition** | Rule of thirds or deliberate symmetry, eye line at upper third, clean background, subject fills frame | Headroom too big, cluttered background, subject cut by UI zones |
| 5 | **Lighting and color** | Soft key light on face, separation from background, consistent white balance, skin tones natural | Underexposed face, mixed color temperatures, clipped highlights, flat log footage left ungraded |
| 6 | **Camera and motion** | Stable or intentional motion, focus on subject, motion blur matches shutter (180 degree rule) | Shaky handheld, focus hunting, jittery 60fps played at 30 |
| 7 | **Audio** | Voice clear and forward, music ducked under speech, -14 LUFS, no clipping, no room echo | Music louder than voice, hiss, echo, plosives, levels jump between clips |
| 8 | **Text and captions** | Captions on all speech, 2-6 words per caption, high contrast, inside safe zones, no typos | No captions, tiny text, white on bright background, covered by platform UI |
| 9 | **Brand and CTA** | Consistent fonts and colors, brand visible early (ads), one clear CTA at the end | No CTA, three CTAs, logo only at the end of an ad |
| 10 | **Platform fit** | Correct aspect and length, native feel (Reels feel like Reels), sound strategy right for the platform | 16:9 posted as a Reel with black bars, YouTube video with a vertical crop, watermark from another app |

**Overall score** = weighted average. Weights by destination:

| Destination | Highest weights |
|-------------|-----------------|
| Reels / Shorts / vertical ads | Hook x3, Pacing x2, Captions x2 |
| YouTube long-form | Story x3, Audio x2, Hook x2 |
| Telegram channel | Audio x2, Captions x2, Story x2 (viewers often watch muted and on slow connections) |
| Paid ads | Hook x3, Brand and CTA x3, Platform fit x2 |

### Step 5 — Write the fixes

Every finding gets an exact fix. Use these FFmpeg recipes and adapt the values from your measurements.

```bash
# Loudness normalize to -14 LUFS / -1 dBTP (two-pass for accuracy: first pass prints measured_* values)
ffmpeg -i input.mp4 -af loudnorm=I=-14:TP=-1:LRA=11:print_format=summary -f null -
ffmpeg -i input.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 192k output_loud.mp4

# 16:9 to 9:16 with a blurred background (no black bars)
ffmpeg -i input.mp4 -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" -c:a copy output_vertical.mp4

# 16:9 to 9:16 center crop (talking head centered)
ffmpeg -i input.mp4 -vf "crop=ih*9/16:ih,scale=1080:1920" -c:a copy output_crop.mp4

# Trim dead intro: start at the first strong moment (example 2.4s)
ffmpeg -ss 2.4 -i input.mp4 -c:v libx264 -crf 18 -preset slow -c:a aac output_trim.mp4

# Burn in subtitles from an SRT, styled for mobile
ffmpeg -i input.mp4 -vf "subtitles=subs.srt:force_style='FontName=Montserrat,FontSize=14,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=3,Alignment=2,MarginV=180'" -c:a copy output_subs.mp4

# Quick color lift: slight contrast and saturation, warm white balance
ffmpeg -i input.mp4 -vf "eq=contrast=1.08:saturation=1.12:gamma=1.02,colortemperature=temperature=5800" -c:a copy output_grade.mp4

# Light denoise for low-light footage
ffmpeg -i input.mp4 -vf "hqdn3d=2:1:3:3" -c:a copy output_denoise.mp4

# Voice cleanup: high-pass, de-noise, gentle compression
ffmpeg -i input.mp4 -c:v copy -af "highpass=f=80,afftdn=nf=-25,acompressor=threshold=-18dB:ratio=3:attack=10:release=200,loudnorm=I=-14:TP=-1" output_voice.mp4

# Delivery export for social (H.264 High, yuv420p, faststart)
ffmpeg -i input.mp4 -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 18 -preset slow -r 30 -c:a aac -b:a 192k -ar 48000 -movflags +faststart output_social.mp4
```

For edits FFmpeg cannot do well (re-ordering a story, adding B-roll, motion graphics), give precise editor instructions (CapCut, Premiere Pro, DaVinci Resolve) or hand off to `video-editing` and `remotion-video-creation`. For shots that must be re-created, write a regeneration prompt with `media-prompt-engineering`.

### Step 6 — Report

Use the format in the `media-director` agent: Verdict, Technical Report, Scores, Top 3 Fixes, All Findings, How to Get More From This Asset, Next Step.

## Examples

### Example finding (good vs bad)

Bad: "The intro is a bit slow, maybe make it more engaging."

Good:

> **[High] Hook arrives at 4.2s** — 0:00-0:04 is a logo animation and a wide shot (frames `hook_01`-`hook_12`). On Reels most viewers decide in the first 1-2 seconds. **Fix:** move the reveal at 0:14 ("the final result") to 0:00 as a 1.5s teaser, then cut back to the start. Trim the logo entirely and place it on the end card. `ffmpeg -ss 14 -t 1.5 -i in.mp4 teaser.mp4`, then concatenate the teaser with the trimmed video.

### Example technical table

| Check | Value | Target (Reels) | Status |
|-------|-------|----------------|--------|
| Aspect | 16:9 (1920x1080) | 9:16 | Blocker — convert with blur background or reframe |
| Duration | 74s | up to 180s | OK |
| Loudness | -23.1 LUFS | about -14 LUFS | High — too quiet by 9 LU |
| True peak | -0.1 dBTP | at or below -1 dBTP | Fix with loudnorm |
| Cuts per minute | 6 | 20+ for Reels | High — pacing too slow |
| Captions | none | burned-in | High |

## Related

- `media-director` agent — orchestrates review, fix, repurpose, and create
- `media-platform-specs` — current platform formats and what each feed rewards
- `audio-analysis` — deeper sound review when audio is the main problem
- `video-editing`, `videodb`, `remotion-video-creation` — executing larger edits
