---
name: media-prompt-engineering
description: Professional prompt engineering for AI image, video, voice, and music generation — structured prompt formulas, camera and lighting vocabulary, negative prompts, consistency techniques, per-tool adaptation (fal.ai models, Midjourney, Runway, Kling, Veo, ElevenLabs, HeyGen), and ready templates for Instagram, YouTube, Telegram, and ad creatives. Use when the user wants to generate or regenerate media and needs prompts that produce professional, on-brand results instead of generic AI output.
metadata:
  origin: ECC
---

# Media Prompt Engineering

A good generation prompt is a creative brief compressed into one paragraph. This skill gives formulas, vocabulary, and templates so the first batch is already close to usable.

> **Drift-prone skill.** Model names, parameters, and prompt syntax change quickly. Check the current model documentation (for example with the fal.ai MCP `find` tool) before relying on a specific parameter.

## When to Use

- The user wants a new image, video clip, voiceover, or music track
- Regenerating a shot that `video-analysis` or `image-analysis` marked for redo
- Building a consistent series (same character, product, or style across posts)
- Turning a vague idea ("something cool for my coffee shop") into a precise brief

## How It Works

### 1. Write the brief before the prompt

Answer these in one line each. If you cannot, ask the user.

1. **Goal and platform** — "Reel hook shot for a coffee shop, Instagram 9:16"
2. **Subject** — who or what, with concrete details
3. **Emotion or message** — what the viewer should feel or understand in 1 second
4. **Style reference** — photographic, cinematic, 3D, illustration, brand palette
5. **Must keep / must avoid** — logo, colors, faces, text, cultural details

### 2. Image prompt formula

```text
[Shot type] of [subject with 3-5 concrete details], [action or pose], [setting and background],
[lighting], [color palette and mood], [camera and lens], [style and finish], [composition for platform]
```

Example (product, Instagram feed 4:5):

```text
Close-up product photo of a ceramic cup of cappuccino with latte-art heart, steam rising,
on a dark walnut table beside a cinnamon stick, warm morning window light from the left with soft shadows,
palette of cream, caramel and deep brown, shot on 85mm f/1.8, shallow depth of field,
editorial food photography, crisp detail, subject in the lower third with empty space at the top for a headline, 4:5
```

Vocabulary that changes results:

| Category | Terms |
|----------|-------|
| Shot type | extreme close-up, close-up, medium shot, cowboy shot, wide shot, establishing shot, overhead flat lay, low angle, high angle, Dutch angle, POV |
| Lighting | soft window light, golden hour, blue hour, Rembrandt lighting, butterfly lighting, rim light, backlit, softbox key with fill, practical lights, neon, hard noon sun, overcast diffused |
| Lens and camera | 24mm wide, 35mm documentary, 50mm natural, 85mm portrait, 100mm macro, f/1.4 shallow depth, f/8 deep focus, tilt-shift, anamorphic flare |
| Finish | editorial, commercial, cinematic still, film grain Kodak Portra 400, matte, high-key, low-key, clean studio, hyperreal 3D render, flat vector illustration |
| Mood | calm, premium, playful, urgent, nostalgic, luxurious, trustworthy, energetic |

**Negative prompt** (where the tool supports it): `blurry, low resolution, watermark, text artifacts, extra fingers, deformed hands, distorted face, oversaturated, cluttered background, duplicate objects`.

**Text in images**: ask for short text in quotes (`with the headline "OPEN 24/7" in bold white sans-serif`). Most models still misspell longer text, so add headlines in an editor when accuracy matters.

### 3. Video prompt formula

```text
[Shot and camera movement], [subject and action with timing], [setting], [lighting and time of day],
[style and film look], [pace and mood], [duration and aspect ratio], [audio cue if the model generates sound]
```

Example (Reel hook, 9:16, 5s):

```text
Slow push-in handheld shot, a barista pours steamed milk into a cup and a latte-art heart forms in one smooth motion,
cozy coffee shop counter with blurred warm bokeh behind, morning light through the window,
cinematic 35mm look, soft contrast, satisfying and calm, 5 seconds, vertical 9:16,
ambient cafe sounds and the hiss of the steam wand
```

Camera movement vocabulary: static locked-off, slow push-in, pull-out reveal, pan left/right, tilt up/down, tracking shot, orbit around subject, crane up, drone fly-over, whip pan, handheld, gimbal smooth, dolly zoom.

Rules for video models:

- **One action per clip.** Chain 3-5 short clips in the edit instead of asking for a whole story.
- **Describe motion speed** ("slowly", "in one smooth motion", "quick snap").
- **Image-to-video beats text-to-video** for consistency: generate or pick the perfect first frame, then animate it.
- **Keep faces and hands simple**; avoid complex finger work and crowds.
- **Specify the end state** for loops ("ends on the same frame it starts on").

### 4. Consistency across a series

- Write a **style sheet** once and paste it into every prompt: palette, lighting, lens, finish, background.
- Use the same **seed** and **reference image** (image-to-image or character reference) where the tool supports it.
- Describe a recurring character with a fixed **character card** (age, face, hair, clothing, accessory) and never change wording between prompts.
- For products, always use the real product photo as the reference; do not let the model invent packaging.

### 5. Voice prompts (ElevenLabs, HeyGen, other TTS)

Script writing for speech:

- Write the way people talk: short sentences, contractions, one idea per sentence.
- Use punctuation for timing: comma for a short pause, period for a full stop, an ellipsis (...) for hesitation, an em dash for an interruption.
- Spell difficult names phonetically for the model (for example "Toshkent" or "Samarqand" written the way they should be pronounced), and test them first in a short line.
- Put emphasis words in CAPITALS sparingly only if the tool interprets it; otherwise rewrite the sentence so the stress falls naturally at the end.

Voice selection brief: `gender and age, accent and language, pitch, pace (words per minute), energy, warmth, use case`. Example: `Warm female voice, about 30, native Uzbek, medium pitch, 150 wpm, friendly and confident, for a cafe promo Reel`.

Typical settings to tune: stability (lower is more expressive, higher is more consistent), similarity or clarity, style exaggeration, and speed. Generate 2 takes of the hook line before generating the whole script.

### 6. Music prompts

```text
[Genre and subgenre], [mood], [tempo in BPM], [key instruments], [structure and duration], [use case and mix note]
```

Example: `Lo-fi hip hop, warm and relaxed, 85 BPM, Rhodes piano, soft vinyl crackle, brushed drums, 30 seconds with a clean loop point, background for voiceover so keep the mids clear, no vocals`.

Always state "no vocals" for music that will sit under speech, and confirm the license terms of the music tool for commercial and ad use.

### 7. Adapt per tool

| Tool | Notes |
|------|-------|
| fal.ai (Nano Banana, Seedance, Kling, Veo) | Use `fal-ai-media`; check model parameters with `find`; set `aspect_ratio`, `duration`, `seed`, `num_images` explicitly |
| Midjourney | Natural language works; add `--ar 9:16`, `--style raw` for realism, `--sref` / `--cref` for style and character reference |
| Runway / Kling / Veo | Start from a reference image; describe camera move first; keep clips 5-10s |
| ElevenLabs | Script formatting above; pick or design the voice; tune stability and speed |
| HeyGen | Avatar and voice must be ones the user has the right to use; write scripts in short scenes |

## Examples

### Weak vs professional prompt

Weak: `a nice picture of a phone for an ad`

Professional:

```text
Hero product shot of a matte black smartphone standing at a slight angle on a reflective black acrylic surface,
screen showing a bright gradient wallpaper, single rim light tracing the edges and a soft gradient backdrop from deep navy to black,
premium tech commercial style, 100mm macro lens, ultra sharp, subtle reflection below,
centered composition with negative space on the right for an offer text, 4:5
Negative: fingerprints, dust, warped edges, extra buttons, text on screen, watermark
```

### Platform templates

| Use | Template start |
|-----|----------------|
| YouTube thumbnail | `Close-up of [person] with an exaggerated [emotion] expression looking at [object], bright rim light, saturated background in [contrasting color], subject on the right third, empty left side for 3-word text, 16:9` |
| Instagram carousel cover | `Clean flat lay of [items] on [surface], soft overhead light, palette [brand colors], top 30% empty for a title, 4:5` |
| Telegram channel post cover | `[Subject] in [setting], simple bold composition that reads at small size, high contrast, 16:9, key subject centered so the preview crop keeps it` |
| Vertical ad hook (video) | `Fast push-in on [product] as [satisfying action] happens, bright and punchy, product readable within the first second, 3 seconds, 9:16` |

## Related

- `media-director` agent
- `fal-ai-media` — running the generation
- `media-platform-specs` — aspect, duration, and safe zones per destination
- `brand-voice` — wording for on-screen text and voice scripts
