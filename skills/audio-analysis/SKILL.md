---
name: audio-analysis
description: Professional review of user-supplied audio — voiceovers, podcasts, music tracks, video soundtracks, Telegram voice content, and AI-generated speech. Measures loudness (LUFS), true peak, dynamics, noise, clipping, silence, and frequency balance, critiques delivery and mix, and prescribes exact FFmpeg chains or re-recording and regeneration guidance. Use when the user shares audio or a video whose sound is the problem and asks how to make it sound professional.
metadata:
  origin: ECC
---

# Audio Analysis

Bad sound loses viewers faster than bad picture. This skill measures the audio objectively, listens through the data, and gives a fix chain that gets it to broadcast-clean.

## When to Use

- The user shares a voiceover, podcast episode, music track, or a video with sound problems
- "My voice sounds bad / echoey / quiet", "the music is too loud", "it sounds cheap"
- QC for speech or music generated with ElevenLabs, fal.ai, or other tools
- Before publishing on a platform that normalizes loudness (YouTube, Instagram, Spotify)

## How It Works

### Step 1 — Measure

```bash
node scripts/lib/media-probe.js voice.wav --platform podcast
```

That gives format, sample rate, channels, integrated LUFS, true peak, and loudness range (LRA). Then run the detail checks:

```bash
# Peak, RMS, noise floor estimate, DC offset, clipped samples
ffmpeg -v error -i voice.wav -af "astats=metadata=0:reset=0" -f null - 2>&1 | grep -E "Peak level|RMS level|Noise floor|DC offset|Number of samples clipped" | head -10
# Silence and dead air
ffmpeg -v error -i voice.wav -af "silencedetect=noise=-40dB:d=0.8" -f null - 2>&1 | grep silence_
# Short-term loudness over time (spot sections that jump)
ffmpeg -v error -i voice.wav -af "ebur128=peak=true" -f null - 2>&1 | grep -E "^\[Parsed_ebur128.*M:" | awk 'NR%30==0'
# Visual spectrum and waveform to inspect with Read
ffmpeg -v error -y -i voice.wav -lavfi "showspectrumpic=s=1280x480:legend=1" spectrum.png
ffmpeg -v error -y -i voice.wav -lavfi "showwavespic=s=1280x240:split_channels=1" waveform.png
```

Read `spectrum.png` and `waveform.png`. Look for: constant hiss band across the top (noise), a hum line at 50 or 60 Hz and its harmonics, flat-topped waveforms (clipping), big level jumps between sections, and energy missing above 8 kHz (dull or low-bitrate source).

If a transcription tool is connected, transcribe speech to judge pace (words per minute), filler words, and pronunciation.

### Step 2 — Score the 7 dimensions

| # | Dimension | Professional target | Common failures |
|---|-----------|---------------------|-----------------|
| 1 | **Loudness** | -14 LUFS for YouTube and social, -16 LUFS for podcast and voice-first Telegram, true peak at or below -1 dBTP | -24 LUFS (too quiet), -8 LUFS (crushed), peaks at 0 dBTP |
| 2 | **Clarity and intelligibility** | Voice sits forward, consonants clear, presence around 2-5 kHz | Muffled, boomy below 200 Hz, harsh sibilance |
| 3 | **Noise and room** | Noise floor below -60 dBFS, dry room, no hum | Fan hiss, 50 Hz hum, echo from bare walls, keyboard clicks |
| 4 | **Dynamics** | LRA 4-8 LU for speech, consistent level sentence to sentence | Whisper then shout, over-compressed pumping |
| 5 | **Mix balance** (voice + music) | Music 12-18 dB under the voice while speaking, ducked automatically, rises in gaps | Music fights the voice, lyrics under speech |
| 6 | **Delivery** (speech) | 130-170 words per minute for social, energy matches content, natural pauses, few fillers | Monotone, reading voice, "uh/um" every sentence, rushed endings |
| 7 | **Technical format** | 48 kHz for video, 44.1 or 48 kHz for audio, 16 or 24 bit source, AAC 192k+ or Opus delivery | 22 kHz source, low-bitrate MP3 artifacts, wrong channel (voice only on left) |

For **music** replace Delivery with **Arrangement and fit**: does the energy match the edit, does it loop cleanly, is it licensed for the use (social, ads, monetized YouTube)?

For **AI speech** also check: wrong stress on words, unnatural pauses, mispronounced names and local words (Uzbek and Russian names are common failures), robotic breathing, and voice drift between takes.

### Step 3 — Prescribe the fix chain

Order matters: clean first, shape second, level last.

```bash
# Standard voice chain: high-pass, hum notch, denoise, de-ess, EQ presence, compress, normalize
ffmpeg -i voice.wav -af "highpass=f=80,bandreject=f=50:width_type=h:w=4,afftdn=nf=-25,deesser=i=0.4,equalizer=f=200:t=q:w=1:g=-2,equalizer=f=3500:t=q:w=1.2:g=3,acompressor=threshold=-20dB:ratio=3:attack=5:release=150:makeup=2,loudnorm=I=-16:TP=-1:LRA=7" -ar 48000 voice_clean.wav

# Fix left-only voice (mono mic recorded to one channel)
ffmpeg -i in.wav -af "pan=mono|c0=c0" -ac 2 voice_center.wav

# Duck music under voice automatically (sidechain)
ffmpeg -i voice.wav -i music.mp3 -filter_complex "[1:a]volume=0.5[m];[m][0:a]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=400[duck];[0:a][duck]amix=inputs=2:duration=first:weights=1 1,loudnorm=I=-14:TP=-1" -ar 48000 mix.wav

# Remove long pauses (tighten speech)
ffmpeg -i voice.wav -af "silenceremove=stop_periods=-1:stop_duration=0.6:stop_threshold=-40dB" voice_tight.wav

# Replace the audio track of a video with the cleaned version
ffmpeg -i video.mp4 -i voice_clean.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest video_fixed.mp4
```

Tune `afftdn nf` from the measured noise floor, and use `bandreject` at 60 Hz instead of 50 Hz in regions with 60 Hz mains. Heavy echo cannot be fully removed with FFmpeg; recommend re-recording (closer to the mic, soft furnishings, lavalier) or a dedicated AI tool (Adobe Podcast Enhance, iZotope RX, Descript Studio Sound).

For delivery problems give coaching notes per timestamp, or, for AI voice, a revised script with phonetic spellings and punctuation for pauses, plus voice settings (see `media-prompt-engineering`).

## Examples

### Example finding

> **[Blocker] Voice clipping at 0:42-0:47** — 312 clipped samples, true peak +0.4 dBTP, flat tops visible in `waveform.png`. Clipping cannot be undone by normalizing. **Fix:** re-record that sentence, or reduce distortion with a declip tool (`adeclip` in FFmpeg: `-af adeclip`), then normalize with `loudnorm=I=-14:TP=-1`.

### Example technical table

| Check | Value | Target | Status |
|-------|-------|--------|--------|
| Integrated loudness | -26.8 LUFS | -14 LUFS | High — too quiet |
| True peak | -9.1 dBTP | at or below -1 dBTP | OK |
| Noise floor | -48 dBFS | below -60 dBFS | High — audible hiss |
| Sample rate | 44.1 kHz | 48 kHz for video | Polish — resample |
| Speaking rate | 195 wpm | 130-170 wpm | High — slow down or cut words |

## Related

- `media-director` agent
- `video-analysis` — when the audio belongs to a video
- `media-prompt-engineering` — AI voice and music prompts
- `video-editing` — ElevenLabs voice and music in an edit pipeline
