import type Phaser from 'phaser';
import type {SavedRun} from '../application/SavedRun';
import {type Action,type CommandResult,type R2RunState} from '../domain/run';
import type { CharacterId } from '../domain/characters';
import {gameSession} from './session';

export async function startRun(scene: Phaser.Scene, seed: string, characterId: CharacterId): Promise<SavedRun|undefined> {
  const controller=await gameSession().start(seed,characterId);
  if(!controller)return;
  scene.registry.set('runController', controller);
  scene.registry.set('runState', controller.state);
  return controller;
}

export function runController(scene: Phaser.Scene): SavedRun | undefined {
  return scene.registry.get('runController') as SavedRun | undefined;
}

export async function dispatchRun(scene: Phaser.Scene, action: Action): Promise<CommandResult<R2RunState>> {
  const controller = runController(scene);
  if (!controller) throw new Error('No active run controller');
  const result = await controller.dispatch(action);
  if (result.ok) scene.registry.set('runState', result.state);
  return result;
}
