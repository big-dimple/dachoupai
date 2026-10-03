import Phaser from 'phaser';
import './style.css';
import { BootScene } from './game/BootScene';
import { TitleScene } from './game/TitleScene';
import { CharacterSelectScene } from './game/CharacterSelectScene';
import { GameScene } from './game/GameScene';
import { IntermissionScene } from './game/IntermissionScene';
import { ShopScene } from './game/ShopScene';
import {installRunMenu} from './game/RunMenu';
import {AudioEngine} from './audio/AudioEngine';
import {installViewport,viewportMetrics} from './platform/Viewport';

const viewport=viewportMetrics();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: viewport.width*viewport.density,
  height: viewport.height*viewport.density,
  backgroundColor: '#F3EADB',
  scene: [BootScene, TitleScene, CharacterSelectScene, GameScene, IntermissionScene, ShopScene],
  scale: {
    mode: Phaser.Scale.NONE,
    zoom: 1/viewport.density,
    autoRound: true,
  },
  render: { antialias: true, pixelArt: false },
  audio: {noAudio:true}, // AudioEngine owns the application context; Phaser's unused manager must not block boot.
  callbacks: {postBoot:installViewport},
};

const game = new Phaser.Game(config);
game.canvas.tabIndex=0;
game.canvas.setAttribute('aria-label','大丑牌牌桌，方向键聚焦手牌，空格选牌，Enter 查看详情');
installRunMenu(game);
const audio=AudioEngine.shared;
const unlockAudio=()=>{void audio.unlock();};
window.addEventListener('pointerdown',unlockAudio,{once:true,capture:true});
window.addEventListener('keydown',unlockAudio,{once:true,capture:true});
document.addEventListener('visibilitychange',()=>audio.setSuspended(document.hidden));

// Read-only browser observers are available only in the explicit E2E build mode.
if (import.meta.env.MODE === 'e2e' && new URLSearchParams(window.location.search).get('harness') === '1') {
  (window as unknown as { __harness: { game: Phaser.Game } }).__harness = { game };
}
