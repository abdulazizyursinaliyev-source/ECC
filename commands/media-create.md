---
description: Create professional images, video clips, voiceovers, or music from an idea — brief, platform specs, engineered prompts, small test batch, QC, and iteration. Targets Instagram, YouTube, Telegram, and paid ads.
argument-hint: <image|video|voice|music|set> <idea> [platform-id]
---

# Media Create

**Input**: $ARGUMENTS

Use the `media-director` agent (`agents/media-director.md`).

## Steps

1. **Brief.** Write the 5-line brief from `skills/media-prompt-engineering/` (goal and platform, subject, emotion, style, must keep / avoid). Ask at most 3 questions if something essential is missing (brand colors, language of voice and text, real product photos).
2. **Specs.** Take aspect ratio, resolution, duration, and safe zones from `skills/media-platform-specs/`.
3. **Prompts.** Write the full prompt(s) with the formulas in `skills/media-prompt-engineering/`. For a `set` (campaign pack) write a shared style sheet first, then one prompt per asset.
4. **Pick the tool.** Use whatever generation tools are connected: fal.ai via `skills/fal-ai-media/`, ElevenLabs for voice and music, HeyGen for avatar video. If no generator is connected, deliver the prompts ready to paste into the user's tool and say so.
5. **Show the plan and cost** (model, count, duration, estimated credits) and get confirmation before generating anything long or expensive.
6. **Generate a small batch** (2-4 images, 1-2 short clips, 2 voice takes of the hook line).
7. **QC every output** with the matching analysis skill and fix or regenerate what fails (AI artifacts, misspelled text, wrong pronunciation, off-brand color).
8. **Deliver** the files with their prompts, seeds, and settings so the result can be reproduced, plus a caption or title suggestion for the target platform.

Do not create content that impersonates real people or brands, fake testimonials, or misleading ad claims.

Reply in the user's language.
