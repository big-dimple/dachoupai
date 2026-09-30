import type Phaser from 'phaser';
import { RunController } from '../application/RunController';
import { createRun, type Action, type CommandResult } from '../domain/run';
import type { CharacterId } from '../domain/characters';

export function startRun(scene: Phaser.Scene, seed: string, characterId: CharacterId): RunController {
  const controller = new RunController(createRun({ seed, characterId, runId: `run/${seed}/${characterId}` }));
  scene.registry.set('runController', controller);
  scene.registry.set('runState', controller.state);
  return controller;
}

export function runController(scene: Phaser.Scene): RunController | undefined {
  return scene.registry.get('runController') as RunController | undefined;
}

export function dispatchRun(scene: Phaser.Scene, action: Action): CommandResult {
  const controller = runController(scene);
  if (!controller) throw new Error('No active run controller');
  const result = controller.dispatch(action);
  if (result.ok) scene.registry.set('runState', result.state);
  return result;
}
