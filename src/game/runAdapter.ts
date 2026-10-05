import type {RunLaunchIntent} from './RunLaunch';
import type Phaser from 'phaser';
import type {SavedRun} from '../application/SavedRun';
import {type Action,type CommandResult,type R2RunState} from '../domain/run';
import type { CharacterId } from '../domain/characters';
import {r2ModeSeedAllowed,r2RunModeConfig,type R2ModeSelection} from '../content/r2Modes';
import {r2ModeUnlocked} from '../domain/r2Progress';
import {readRunProgress} from '../platform/RunProgress';
import {gameSession} from './session';

export async function startRun(scene: Phaser.Scene, seed: string, characterId: CharacterId,
  modeConfig:R2ModeSelection={mode:'standard',difficulty:0,challengeId:null,programsEnabled:true},intent:RunLaunchIntent={kind:'new'}): Promise<SavedRun|undefined> {
  const session=gameSession(),config=r2RunModeConfig(modeConfig);
  if(intent.kind==='new'&&!r2ModeUnlocked(readRunProgress().progress,modeConfig)){session.notice='此模式尚未解锁；请完成对应标准八章首通，或继续已有模式存档。';return;}
  if(!r2ModeSeedAllowed(config,seed)){session.notice='此模式需要使用规定的固定种子。';return;}
  const controller=await session.start(seed,characterId,modeConfig,intent);
  if(!controller)return;
  scene.registry.set('runController', controller);
  scene.registry.set('runState', controller.state);
  return controller;
}

export function runController(scene: Phaser.Scene): SavedRun | undefined {
  return scene.registry.get('runController') as SavedRun | undefined;
}

export async function dispatchRun(scene: Phaser.Scene, action: Action, expectedSeq?:number): Promise<CommandResult<R2RunState>> {
  const controller = runController(scene);
  if (!controller) throw new Error('No active run controller');
  const session=gameSession();
  if(session.pendingRun||session.working)return {ok:false,code:'replacement-pending',state:controller.state};
  if(session.run!==controller)return {ok:false,code:'wrong-run',state:controller.state};
  const result = await controller.dispatch(action,expectedSeq);
  if (result.ok) scene.registry.set('runState', result.state);
  return result;
}
