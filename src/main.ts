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

// harness 挂钩：仅 ?harness=1 时暴露给本地冒烟脚本，正常游玩路径不挂全局
if (new URLSearchParams(window.location.search).has('harness')) {
  (window as unknown as { __harness: { game: Phaser.Game } }).__harness = { game };
}
