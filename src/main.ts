import Phaser from 'phaser';
import './style.css';
import { BootScene } from './game/BootScene';
import { CharacterSelectScene } from './game/CharacterSelectScene';
import { GameScene } from './game/GameScene';
import { IntermissionScene } from './game/IntermissionScene';
import { ShopScene } from './game/ShopScene';
import {installRunMenu} from './game/RunMenu';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#182b2a',
  scene: [BootScene, CharacterSelectScene, GameScene, IntermissionScene, ShopScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
  render: { antialias: true, pixelArt: false },
  audio: {noAudio:true}, // AudioEngine owns the application context; Phaser's unused manager must not block boot.
};

const game = new Phaser.Game(config);
game.canvas.tabIndex=0;
game.canvas.setAttribute('aria-label','大丑牌牌桌，方向键聚焦手牌，空格选牌，Enter 查看详情');
installRunMenu(game);

// Read-only browser observers are available only in the explicit E2E build mode.
if (import.meta.env.MODE === 'e2e' && new URLSearchParams(window.location.search).get('harness') === '1') {
  (window as unknown as { __harness: { game: Phaser.Game } }).__harness = { game };
}
