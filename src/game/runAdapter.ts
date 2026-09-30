import type Phaser from 'phaser';
import { RunController } from '../application/RunController';
import { createRun, type Action, type CommandResult, type R2RunState } from '../domain/run';
import type { CharacterId } from '../domain/characters';

export function startRun(scene: Phaser.Scene, seed: string, characterId: CharacterId): RunController<R2RunState> {
  const controller = new RunController(createRun({ seed, characterId, runId: `run/${seed}/${characterId}`,rulesVersion:'r2' }));
  scene.registry.set('runController', controller);
  scene.registry.set('runState', controller.state);
  return controller;
}

export function runController(scene: Phaser.Scene): RunController<R2RunState> | undefined {
  return scene.registry.get('runController') as RunController<R2RunState> | undefined;
}

export function dispatchRun(scene: Phaser.Scene, action: Action): CommandResult<R2RunState> {
  const controller = runController(scene);
  if (!controller) throw new Error('No active run controller');
  const result = controller.dispatch(action);
  if (result.ok) scene.registry.set('runState', result.state);
  return result;
}
