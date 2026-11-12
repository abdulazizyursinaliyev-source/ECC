/**
 * Tests for scripts/lib/media-probe.js
 *
 * Run with: node tests/lib/media-probe.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const {
  PLATFORM_SPECS,
  parseFraction,
  aspectLabel,
  parseProbeJson,
  parseLoudnorm,
  checkPlatform,
  probeFile,
  parseArgs,
  main
} = require('../../scripts/lib/media-probe');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function hasBinary(name) {
  const r = spawnSync(name, ['-version'], { encoding: 'utf8' });
  return !r.error && r.status === 0;
}

const reelProbeJson = {
  streams: [
    { codec_type: 'video', codec_name: 'h264', width: 1080, height: 1920, avg_frame_rate: '30000/1001', pix_fmt: 'yuv420p', bit_rate: '8000000' },
    { codec_type: 'audio', codec_name: 'aac', sample_rate: '48000', channels: 2, channel_layout: 'stereo', bit_rate: '192000' }
  ],
  format: { format_name: 'mov,mp4,m4a,3gp,3g2,mj2', duration: '42.5', size: '42000000', bit_rate: '8200000' }
};

function runTests() {
  console.log('\n=== Testing media-probe ===\n');

  let passed = 0;
  let failed = 0;
  const record = ok => { if (ok) passed++; else failed++; };

  record(test('parseFraction handles ratios, plain numbers, and junk', () => {
    assert.strictEqual(parseFraction('30/1'), 30);
    assert.ok(Math.abs(parseFraction('30000/1001') - 29.97) < 0.01);
    assert.strictEqual(parseFraction('25'), 25);
    assert.strictEqual(parseFraction('0/0'), null);
    assert.strictEqual(parseFraction(''), null);
    assert.strictEqual(parseFraction(undefined), null);
  }));

  record(test('aspectLabel maps common social formats', () => {
    assert.strictEqual(aspectLabel(1080, 1920), '9:16');
    assert.strictEqual(aspectLabel(1920, 1080), '16:9');
    assert.strictEqual(aspectLabel(1080, 1350), '4:5');
    assert.strictEqual(aspectLabel(1080, 1080), '1:1');
    assert.strictEqual(aspectLabel(1000, 333), '3.003:1');
    assert.strictEqual(aspectLabel(0, 100), null);
  }));

  record(test('parseProbeJson normalizes a vertical reel', () => {
    const p = parseProbeJson(JSON.stringify(reelProbeJson));
    assert.strictEqual(p.kind, 'video');
    assert.strictEqual(p.durationSec, 42.5);
    assert.strictEqual(p.video.aspect, '9:16');
    assert.strictEqual(p.video.orientation, 'portrait');
    assert.strictEqual(p.video.fps, 29.97);
    assert.strictEqual(p.audio.channels, 2);
    assert.strictEqual(p.audio.sampleRate, 48000);
  }));

  record(test('parseProbeJson applies rotation metadata to dimensions', () => {
    const p = parseProbeJson({
      streams: [{ codec_type: 'video', codec_name: 'h264', width: 1920, height: 1080, avg_frame_rate: '30/1', side_data_list: [{ rotation: -90 }] }],
      format: { duration: '5' }
    });
    assert.strictEqual(p.video.width, 1080);
    assert.strictEqual(p.video.height, 1920);
    assert.strictEqual(p.video.aspect, '9:16');
    assert.strictEqual(p.video.rotation, -90);
  }));

  record(test('parseProbeJson detects still images and audio-only files', () => {
    const img = parseProbeJson({ streams: [{ codec_type: 'video', codec_name: 'png', width: 1280, height: 720 }], format: { format_name: 'png_pipe' } });
    assert.strictEqual(img.kind, 'image');
    assert.strictEqual(img.durationSec, null);
    assert.strictEqual(img.video.fps, null);

    const aud = parseProbeJson({ streams: [{ codec_type: 'audio', codec_name: 'mp3', sample_rate: '44100', channels: 1 }], format: { duration: '60' } });
    assert.strictEqual(aud.kind, 'audio');
    assert.strictEqual(aud.video, null);
  }));

  record(test('parseProbeJson ignores attached cover art in audio files', () => {
    const p = parseProbeJson({
      streams: [
        { codec_type: 'audio', codec_name: 'mp3', sample_rate: '44100', channels: 2 },
        { codec_type: 'video', codec_name: 'mjpeg', width: 600, height: 600, disposition: { attached_pic: 1 } }
      ],
      format: { duration: '180' }
    });
    assert.strictEqual(p.kind, 'audio');
  }));

  record(test('parseLoudnorm extracts the trailing JSON block', () => {
    const stderr = 'Input #0, mov...\n[Parsed_loudnorm_0 @ 0x1]\n{\n\t"input_i" : "-19.42",\n\t"input_tp" : "-0.30",\n\t"input_lra" : "6.10",\n\t"input_thresh" : "-29.70"\n}\n';
    const l = parseLoudnorm(stderr);
    assert.strictEqual(l.integratedLufs, -19.42);
    assert.strictEqual(l.truePeakDbtp, -0.3);
    assert.strictEqual(l.loudnessRangeLu, 6.1);
    assert.strictEqual(parseLoudnorm('no json here'), null);
    assert.strictEqual(parseLoudnorm('{ broken'), null);
    assert.strictEqual(parseLoudnorm(''), null);
  }));

  record(test('checkPlatform passes a compliant reel', () => {
    const p = parseProbeJson(reelProbeJson);
    p.loudness = { integratedLufs: -14.5, truePeakDbtp: -1.5 };
    assert.deepStrictEqual(checkPlatform(p, 'instagram-reels'), []);
  }));

  record(test('checkPlatform flags aspect, duration, loudness, and true peak', () => {
    const p = parseProbeJson(reelProbeJson);
    p.durationSec = 240;
    p.loudness = { integratedLufs: -22, truePeakDbtp: -0.2 };
    const codes = checkPlatform(p, 'instagram-reels').map(i => i.code);
    assert.ok(codes.includes('duration'));
    assert.ok(codes.includes('loudness'));
    assert.ok(codes.includes('true-peak'));

    const yt = checkPlatform(parseProbeJson(reelProbeJson), 'youtube').map(i => i.code);
    assert.ok(yt.includes('aspect'));
  }));

  record(test('checkPlatform flags kind mismatch and oversized thumbnails', () => {
    const p = parseProbeJson(reelProbeJson);
    assert.strictEqual(checkPlatform(p, 'youtube-thumbnail')[0].code, 'kind-mismatch');

    const thumb = parseProbeJson({ streams: [{ codec_type: 'video', codec_name: 'png', width: 1280, height: 720 }], format: { format_name: 'png_pipe', size: String(3 * 1024 * 1024) } });
    const codes = checkPlatform(thumb, 'youtube-thumbnail').map(i => i.code);
    assert.deepStrictEqual(codes, ['file-too-large']);
  }));

  record(test('checkPlatform throws on unknown platform', () => {
    assert.throws(() => checkPlatform(parseProbeJson(reelProbeJson), 'myspace'), /Unknown platform/);
  }));

  record(test('every platform spec has a label and kind', () => {
    for (const [id, spec] of Object.entries(PLATFORM_SPECS)) {
      assert.ok(spec.label, `${id} label`);
      assert.ok(['video', 'image', 'audio', 'any'].includes(spec.kind), `${id} kind`);
    }
  }));

  record(test('parseArgs reads flags', () => {
    const a = parseArgs(['clip.mp4', '--platform', 'youtube', '--no-loudness']);
    assert.strictEqual(a.file, 'clip.mp4');
    assert.strictEqual(a.platform, 'youtube');
    assert.strictEqual(a.loudness, false);
    assert.strictEqual(parseArgs(['--list-platforms']).listPlatforms, true);
  }));

  record(test('probeFile rejects missing files', () => {
    assert.throws(() => probeFile(path.join(os.tmpdir(), 'definitely-missing-media-file.mp4')), /File not found/);
  }));

  record(test('main returns 1 without a file argument', () => {
    const originalWrite = process.stderr.write;
    process.stderr.write = () => true;
    try {
      assert.strictEqual(main([]), 1);
    } finally {
      process.stderr.write = originalWrite;
    }
  }));

  if (hasBinary('ffmpeg') && hasBinary('ffprobe')) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'media-probe-test-'));
    const clip = path.join(tmpDir, 'clip.mp4');
    const gen = spawnSync('ffmpeg', [
      '-v', 'error', '-y',
      '-f', 'lavfi', '-i', 'testsrc=size=1080x1920:rate=30',
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000',
      '-t', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', clip
    ], { encoding: 'utf8' });

    if (gen.status === 0) {
      record(test('probeFile inspects a real vertical clip end to end', () => {
        const p = probeFile(clip, { platform: 'instagram-reels' });
        assert.strictEqual(p.kind, 'video');
        assert.strictEqual(p.video.aspect, '9:16');
        assert.strictEqual(p.video.codec, 'h264');
        assert.strictEqual(p.audio.codec, 'aac');
        assert.ok(p.loudness && typeof p.loudness.integratedLufs === 'number');
        assert.ok(Array.isArray(p.issues));
        assert.ok(!p.issues.some(i => i.code === 'aspect'));
      }));
    } else {
      console.log('  - skipped real-clip test (ffmpeg could not encode libx264/aac)');
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } else {
    console.log('  - skipped real-clip test (ffmpeg/ffprobe not installed)');
  }

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
