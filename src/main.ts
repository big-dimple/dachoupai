import Phaser from 'phaser';
import './style.css';
import { CharacterSelectScene } from './game/CharacterSelectScene';
import { GameScene } from './game/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 1280,
  height: 720,
  backgroundColor: '#090711',
  scene: [CharacterSelectScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: { antialias: true, pixelArt: false },
};

new Phaser.Game(config);
