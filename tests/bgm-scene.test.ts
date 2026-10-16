import {describe, it, expect} from 'vitest';
import {AudioEngine, type AudioScene} from '../src/audio/AudioEngine';
import bgmManifest from '../public/assets/audio/bgm/manifest.json';
import {readFileSync} from 'node:fs';

describe('multi-scene BGM playlist and attribution', () => {
  it('manifest specifies 5 verified tracks with valid files, duration and licenses', () => {
    expect(bgmManifest.tracks).toHaveLength(5);
    for (const track of bgmManifest.tracks) {
      expect(track.id).toBeTruthy();
      expect(track.title).toBeTruthy();
      expect(track.composer).toBeTruthy();
      expect(track.license).toBeTruthy();
      expect(track.durationSeconds).toBeGreaterThan(10);
      expect(track.scenes.length).toBeGreaterThanOrEqual(1);
      const fileBytes = readFileSync(new URL('../public/' + track.runtimePath, import.meta.url));
      expect(fileBytes.length).toBe(track.bytes);
      expect(track.bytes).toBeLessThan(5 * 1024 * 1024); // Compressed under 5MB
    }
  });

  it('assigns specific atmospheric tracks to scenes', () => {
    const engine = new AudioEngine();
    const bossTrack = engine.getTrackForScene('boss');
    expect(bossTrack.title).toContain('Dark Things Loop');
    expect(bossTrack.runtimePath).toContain('boss-dark-things.mp3');

    const menuTrack = engine.getTrackForScene('menu');
    expect(menuTrack.title).toContain('阳关三叠');

    const tableTrack = engine.getTrackForScene('table');
    expect(tableTrack.title).toMatch(/Tango|醉渔唱晚/);

    const shopTrack = engine.getTrackForScene('shop');
    expect(shopTrack.title).toContain('Serenade - Schubert');
  });

  it('allows safe preloading without throwing or breaking game state', () => {
    const engine = new AudioEngine();
    for (const scene of ['menu', 'table', 'boss', 'shop'] as AudioScene[]) {
      expect(() => engine.preloadSceneMusic(scene)).not.toThrow();
    }
  });
});
