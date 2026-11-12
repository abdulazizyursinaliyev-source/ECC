#!/usr/bin/env node
/**
 * media-probe — technical inspection of video, image, and audio files.
 *
 * Wraps ffprobe (and optionally ffmpeg's loudnorm filter) and normalizes the
 * output into a compact report that the media-director agent and the
 * video/image/audio analysis skills use as their objective baseline.
 *
 * Usage:
 *   node scripts/lib/media-probe.js <file> [--platform <id>] [--no-loudness]
 *   node scripts/lib/media-probe.js --list-platforms
 *
 * Output is JSON on stdout. Requires ffprobe/ffmpeg on PATH.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

/**
 * Platform delivery targets. These values drift; skills instruct the agent to
 * re-check current platform documentation before promising exact limits.
 * maxDurationSec null = no practical limit for review purposes.
 */
const PLATFORM_SPECS = {
  'instagram-reels': {
    label: 'Instagram Reels',
    kind: 'video',
    aspects: ['9:16'],
    minShortSide: 1080,
    maxDurationSec: 180,
    fps: [23, 60],
    targetLufs: -14,
    videoCodecs: ['h264', 'hevc'],
    audioCodecs: ['aac']
  },
  'instagram-story': {
    label: 'Instagram Story',
    kind: 'video',
    aspects: ['9:16'],
    minShortSide: 1080,
    maxDurationSec: 60,
    fps: [23, 60],
    targetLufs: -14,
    videoCodecs: ['h264', 'hevc'],
    audioCodecs: ['aac']
  },
  'instagram-feed': {
    label: 'Instagram Feed (post / carousel)',
    kind: 'any',
    aspects: ['4:5', '1:1'],
    minShortSide: 1080,
    maxDurationSec: 3600,
    fps: [23, 60],
    targetLufs: -14,
    videoCodecs: ['h264', 'hevc'],
    audioCodecs: ['aac']
  },
  youtube: {
    label: 'YouTube (long-form)',
    kind: 'video',
    aspects: ['16:9'],
    minShortSide: 1080,
    maxDurationSec: null,
    fps: [24, 60],
    targetLufs: -14,
    videoCodecs: ['h264', 'hevc', 'vp9', 'av1', 'prores'],
    audioCodecs: ['aac', 'opus', 'mp3', 'pcm_s16le', 'pcm_s24le']
  },
  'youtube-shorts': {
    label: 'YouTube Shorts',
    kind: 'video',
    aspects: ['9:16', '1:1'],
    minShortSide: 1080,
    maxDurationSec: 180,
    fps: [24, 60],
    targetLufs: -14,
    videoCodecs: ['h264', 'hevc', 'vp9', 'av1'],
    audioCodecs: ['aac', 'opus']
  },
  'youtube-thumbnail': {
    label: 'YouTube Thumbnail',
    kind: 'image',
    aspects: ['16:9'],
    minShortSide: 720,
    maxSizeBytes: 2 * 1024 * 1024
  },
  'telegram-video': {
    label: 'Telegram channel video',
    kind: 'video',
    aspects: ['16:9', '9:16', '1:1', '4:5'],
    minShortSide: 720,
    maxDurationSec: null,
    maxSizeBytes: 2 * 1024 * 1024 * 1024,
    fps: [24, 60],
    targetLufs: -16,
    videoCodecs: ['h264'],
    audioCodecs: ['aac']
  },
  'telegram-round': {
    label: 'Telegram video message (circle)',
    kind: 'video',
    aspects: ['1:1'],
    minShortSide: 384,
    maxDurationSec: 60,
    fps: [24, 30],
    targetLufs: -16,
    videoCodecs: ['h264'],
    audioCodecs: ['aac']
  },
  'telegram-photo': {
    label: 'Telegram channel photo',
    kind: 'image',
    aspects: ['16:9', '4:5', '1:1', '9:16', '3:4', '4:3'],
    minShortSide: 1080,
    maxSizeBytes: 10 * 1024 * 1024
  },
  'ads-vertical': {
    label: 'Paid ads — vertical (Meta / TikTok / Shorts placements)',
    kind: 'video',
    aspects: ['9:16'],
    minShortSide: 1080,
    maxDurationSec: 60,
    fps: [24, 60],
    targetLufs: -14,
    videoCodecs: ['h264', 'hevc'],
    audioCodecs: ['aac']
  },
  'ads-feed': {
    label: 'Paid ads — feed (Meta 4:5 / 1:1)',
    kind: 'any',
    aspects: ['4:5', '1:1'],
    minShortSide: 1080,
    maxDurationSec: 60,
    fps: [24, 60],
    targetLufs: -14,
    videoCodecs: ['h264', 'hevc'],
    audioCodecs: ['aac']
  },
  'ads-youtube': {
    label: 'Paid ads — YouTube in-stream',
    kind: 'video',
    aspects: ['16:9'],
    minShortSide: 1080,
    maxDurationSec: 180,
    fps: [24, 60],
    targetLufs: -14,
    videoCodecs: ['h264', 'hevc', 'vp9'],
    audioCodecs: ['aac', 'opus']
  },
  podcast: {
    label: 'Podcast / voice audio',
    kind: 'audio',
    targetLufs: -16,
    audioCodecs: ['aac', 'mp3', 'opus', 'pcm_s16le', 'pcm_s24le', 'flac']
  }
};

const KNOWN_ASPECTS = [
  ['9:16', 9 / 16],
  ['3:4', 3 / 4],
  ['4:5', 4 / 5],
  ['1:1', 1],
  ['4:3', 4 / 3],
  ['3:2', 3 / 2],
  ['16:9', 16 / 9],
  ['1.85:1', 1.85],
  ['2.39:1', 2.39]
];

const IMAGE_CODECS = new Set(['png', 'mjpeg', 'jpeg', 'webp', 'bmp', 'tiff', 'gif', 'heic', 'avif']);

function parseFraction(value) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value);
  if (text.includes('/')) {
    const [num, den] = text.split('/').map(Number);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    return num / den;
  }
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round(value, digits = 2) {
  if (value === null || value === undefined) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Map pixel dimensions to the nearest common aspect label (within 3%). */
function aspectLabel(width, height) {
  if (!width || !height) return null;
  const ratio = width / height;
  let best = null;
  let bestDelta = Infinity;
  for (const [label, target] of KNOWN_ASPECTS) {
    const delta = Math.abs(ratio - target) / target;
    if (delta < bestDelta) {
      bestDelta = delta;
      best = label;
    }
  }
  return bestDelta <= 0.03 ? best : `${round(ratio, 3)}:1`;
}

function readRotation(stream) {
  const tagRotate = toNumber(stream.tags && stream.tags.rotate);
  if (tagRotate !== null) return tagRotate;
  const sideData = Array.isArray(stream.side_data_list) ? stream.side_data_list : [];
  for (const entry of sideData) {
    const r = toNumber(entry.rotation);
    if (r !== null) return r;
  }
  return 0;
}

/** Normalize raw `ffprobe -print_format json -show_format -show_streams` output. */
function parseProbeJson(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const streams = Array.isArray(data.streams) ? data.streams : [];
  const format = data.format || {};

  const videoStream = streams.find(s => s.codec_type === 'video' && !(s.disposition && s.disposition.attached_pic));
  const audioStream = streams.find(s => s.codec_type === 'audio');

  let video = null;
  if (videoStream) {
    const rotation = readRotation(videoStream);
    const swap = Math.abs(rotation) % 180 === 90;
    const width = swap ? videoStream.height : videoStream.width;
    const height = swap ? videoStream.width : videoStream.height;
    video = {
      codec: videoStream.codec_name || null,
      profile: videoStream.profile || null,
      width: width || null,
      height: height || null,
      aspect: aspectLabel(width, height),
      orientation: width && height ? (width === height ? 'square' : width > height ? 'landscape' : 'portrait') : null,
      fps: null,
      pixFmt: videoStream.pix_fmt || null,
      bitDepth: toNumber(videoStream.bits_per_raw_sample),
      colorSpace: videoStream.color_space || null,
      colorTransfer: videoStream.color_transfer || null,
      bitrate: toNumber(videoStream.bit_rate),
      rotation
    };
  }

  let audio = null;
  if (audioStream) {
    audio = {
      codec: audioStream.codec_name || null,
      sampleRate: toNumber(audioStream.sample_rate),
      channels: toNumber(audioStream.channels),
      channelLayout: audioStream.channel_layout || null,
      bitrate: toNumber(audioStream.bit_rate)
    };
  }

  const durationSec = toNumber(format.duration);
  const isImage = Boolean(
    video && !audio && IMAGE_CODECS.has(video.codec) &&
      (durationSec === null || durationSec < 0.1 || /image2|_pipe/.test(format.format_name || ''))
  );
  if (video && !isImage) {
    video.fps = round(parseFraction(videoStream.avg_frame_rate) || parseFraction(videoStream.r_frame_rate), 3);
  }
  const kind = isImage ? 'image' : video ? 'video' : audio ? 'audio' : 'unknown';

  return {
    kind,
    container: format.format_name || null,
    durationSec: isImage ? null : round(durationSec, 3),
    sizeBytes: toNumber(format.size),
    bitrate: toNumber(format.bit_rate),
    video,
    audio
  };
}

/** Extract the JSON block printed by ffmpeg's `loudnorm=print_format=json`. */
function parseLoudnorm(stderr) {
  if (!stderr) return null;
  const start = stderr.lastIndexOf('{');
  const end = stderr.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  let parsed;
  try {
    parsed = JSON.parse(stderr.slice(start, end + 1));
  } catch {
    return null;
  }
  const integrated = toNumber(parsed.input_i);
  if (integrated === null) return null;
  return {
    integratedLufs: integrated,
    truePeakDbtp: toNumber(parsed.input_tp),
    loudnessRangeLu: toNumber(parsed.input_lra),
    thresholdLufs: toNumber(parsed.input_thresh)
  };
}

function issue(severity, code, message) {
  return { severity, code, message };
}

/**
 * Compare a normalized probe against a platform spec.
 * Returns an array of { severity: 'error'|'warn'|'info', code, message }.
 */
function checkPlatform(probe, platformId) {
  const spec = PLATFORM_SPECS[platformId];
  if (!spec) {
    throw new Error(`Unknown platform "${platformId}". Known: ${Object.keys(PLATFORM_SPECS).join(', ')}`);
  }
  const issues = [];

  if (spec.kind !== 'any' && probe.kind !== spec.kind) {
    issues.push(issue('error', 'kind-mismatch', `${spec.label} expects ${spec.kind}, got ${probe.kind}`));
    return issues;
  }

  if (spec.maxSizeBytes && probe.sizeBytes && probe.sizeBytes > spec.maxSizeBytes) {
    issues.push(issue('error', 'file-too-large', `File is ${round(probe.sizeBytes / 1048576, 1)} MB; ${spec.label} limit is ${round(spec.maxSizeBytes / 1048576, 1)} MB`));
  }

  const v = probe.video;
  if (v && spec.aspects) {
    if (!spec.aspects.includes(v.aspect)) {
      issues.push(issue('error', 'aspect', `Aspect ${v.aspect} (${v.width}x${v.height}); ${spec.label} wants ${spec.aspects.join(' or ')}`));
    }
    const shortSide = Math.min(v.width || 0, v.height || 0);
    if (spec.minShortSide && shortSide && shortSide < spec.minShortSide) {
      issues.push(issue('warn', 'resolution', `Short side is ${shortSide}px; ${spec.label} looks best with a short side of at least ${spec.minShortSide}px`));
    }
  }

  if (probe.kind === 'video' && v) {
    if (spec.maxDurationSec && probe.durationSec && probe.durationSec > spec.maxDurationSec) {
      issues.push(issue('error', 'duration', `Duration ${probe.durationSec}s exceeds ${spec.label} limit of ${spec.maxDurationSec}s`));
    }
    if (spec.fps && v.fps) {
      const [lo, hi] = spec.fps;
      if (v.fps < lo - 0.5 || v.fps > hi + 0.5) {
        issues.push(issue('warn', 'fps', `Frame rate ${v.fps} is outside the ${lo}-${hi} fps range for ${spec.label}`));
      }
    }
    if (spec.videoCodecs && v.codec && !spec.videoCodecs.includes(v.codec)) {
      issues.push(issue('warn', 'video-codec', `Video codec ${v.codec}; prefer ${spec.videoCodecs.join('/')} for ${spec.label}`));
    }
    if (v.pixFmt && !/^yuv420p/.test(v.pixFmt) && spec.videoCodecs && spec.videoCodecs.includes('h264')) {
      issues.push(issue('warn', 'pix-fmt', `Pixel format ${v.pixFmt}; yuv420p is the safest for mobile playback`));
    }
  }

  if ((probe.kind === 'video' || probe.kind === 'audio') && spec.audioCodecs) {
    if (!probe.audio) {
      if (probe.kind === 'video') issues.push(issue('info', 'no-audio', 'No audio track — fine for silent loops, but most placements reward sound-on creative'));
    } else if (probe.audio.codec && !spec.audioCodecs.includes(probe.audio.codec)) {
      issues.push(issue('warn', 'audio-codec', `Audio codec ${probe.audio.codec}; prefer ${spec.audioCodecs.join('/')}`));
    }
  }

  if (probe.loudness && spec.targetLufs !== undefined) {
    const delta = probe.loudness.integratedLufs - spec.targetLufs;
    if (Math.abs(delta) > 2) {
      issues.push(issue('warn', 'loudness', `Integrated loudness ${probe.loudness.integratedLufs} LUFS; target about ${spec.targetLufs} LUFS (${delta > 0 ? 'too loud' : 'too quiet'} by ${round(Math.abs(delta), 1)} LU)`));
    }
    if (probe.loudness.truePeakDbtp !== null && probe.loudness.truePeakDbtp > -1) {
      issues.push(issue('warn', 'true-peak', `True peak ${probe.loudness.truePeakDbtp} dBTP; keep it at or below -1 dBTP to avoid clipping after transcoding`));
    }
  }

  return issues;
}

function runFfprobe(filePath) {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath
  ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error) {
    throw new Error(result.error.code === 'ENOENT' ? 'ffprobe not found on PATH — install FFmpeg' : result.error.message);
  }
  if (result.status !== 0) {
    throw new Error(`ffprobe failed: ${(result.stderr || '').trim() || `exit ${result.status}`}`);
  }
  return result.stdout;
}

function measureLoudness(filePath) {
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-nostats',
    '-i', filePath,
    '-vn',
    '-af', 'loudnorm=print_format=json',
    '-f', 'null', '-'
  ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) return null;
  return parseLoudnorm(result.stderr);
}

/** Probe a file on disk. Options: { loudness: boolean, platform: string } */
function probeFile(filePath, options = {}) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(`File not found: ${filePath}`);
  }
  const probe = parseProbeJson(runFfprobe(resolved));
  probe.file = path.basename(resolved);
  if (options.loudness !== false && probe.audio) {
    probe.loudness = measureLoudness(resolved);
  }
  if (options.platform) {
    probe.platform = options.platform;
    probe.issues = checkPlatform(probe, options.platform);
  }
  return probe;
}

function parseArgs(argv) {
  const args = { file: null, platform: null, loudness: true, listPlatforms: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--platform') args.platform = argv[++i];
    else if (a === '--no-loudness') args.loudness = false;
    else if (a === '--list-platforms') args.listPlatforms = true;
    else if (!args.file) args.file = a;
  }
  return args;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.listPlatforms) {
    const list = Object.entries(PLATFORM_SPECS).map(([id, s]) => ({ id, label: s.label, kind: s.kind }));
    process.stdout.write(`${JSON.stringify(list, null, 2)}\n`);
    return 0;
  }
  if (!args.file) {
    process.stderr.write('Usage: node scripts/lib/media-probe.js <file> [--platform <id>] [--no-loudness] | --list-platforms\n');
    return 1;
  }
  try {
    const probe = probeFile(args.file, { loudness: args.loudness, platform: args.platform });
    process.stdout.write(`${JSON.stringify(probe, null, 2)}\n`);
    return 0;
  } catch (err) {
    process.stderr.write(`[media-probe] ${err.message}\n`);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  PLATFORM_SPECS,
  parseFraction,
  aspectLabel,
  parseProbeJson,
  parseLoudnorm,
  checkPlatform,
  probeFile,
  parseArgs,
  main
};
