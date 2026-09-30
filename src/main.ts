import Phaser from 'phaser';
import './style.css';
import { BootScene } from './game/BootScene';
import { CharacterSelectScene } from './game/CharacterSelectScene';
import { GameScene } from './game/GameScene';
import { IntermissionScene } from './game/IntermissionScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 1280,
  height: 720,
  backgroundColor: '#090711',
  scene: [BootScene, CharacterSelectScene, GameScene, IntermissionScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, pixelArt: false },
};

const game = new Phaser.Game(config);

// harness 挂钩：仅 ?harness=1 时暴露给本地冒烟脚本，正常游玩路径不挂全局
if (new URLSearchParams(window.location.search).has('harness')) {
  (window as unknown as { __harness: { game: Phaser.Game } }).__harness = { game };
}
