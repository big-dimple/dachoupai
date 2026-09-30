import Phaser from 'phaser';
import { AudioEngine } from '../audio/AudioEngine';
import { rankLabel, SUIT_SYMBOL, type PlayingCard } from '../cards/types';
import { EffectQueue } from '../core/EffectQueue';
import { TriggerEngine } from '../core/TriggerEngine';
import { getR2Joker as getJoker } from '../domain/r2Shop';
import {R2_JOKERS} from '../content/r2Schema';
import {HAND_LABELS} from '../content/handLabels';
import {heatText,fractionText} from './scoreText';
import type {R2RunState as RunState} from '../domain/run';
import {R2_LIMITS,getR2Stage as getStage} from '../domain/r2Run';
import {previewR2Hand,type ScoreTrace,type ScoreEvent} from '../domain/scoreR2';

import { getCharacter, type CharacterId } from './characters';
import type { IntermissionResult } from './IntermissionScene';
import { portraitSquareCrop } from './portraitCrop';
import { dispatchRun, runController, startRun } from './runAdapter';

const MAX_SELECTED = R2_LIMITS.maxSelected;

interface CardView {
  card: PlayingCard;
  container: Phaser.GameObjects.Container;
}

export class GameScene extends Phaser.Scene {
  private get deck(): string[] { return this.run.drawPile; }
  private get hand(): PlayingCard[] { return this.run.handOrder.map(id => this.run.deckInstances.find(card => card.id === id)!); }
  private selectedIds = new Set<string>();
  private cardViews: CardView[] = [];
  private jokerViews = new Map<string, Phaser.GameObjects.Container>();
  private get jokerIds(): readonly string[] { return this.run.jokers.map(j=>j.definitionId); }
  private run!: RunState;
  private stage!: NonNullable<ReturnType<typeof getStage>>;
  private get handsLeft(): number { return this.run.stage?.handsLeft ?? 0; }
  private get heat(): string { return this.run.stage?.heat ?? '0'; }
  private playing = false;
  private characterId!: CharacterId;
  private readonly effects = new EffectQueue();
  private readonly triggers = new TriggerEngine();
  private readonly audio = new AudioEngine();

  private heatText!: Phaser.GameObjects.Text;
  private handsText!: Phaser.GameObjects.Text;
  private resultText!: Phaser.GameObjects.Text;
  private breakdownText!: Phaser.GameObjects.Text;
  private roleText!: Phaser.GameObjects.Text;
  private playButton!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('game');
  }

  create(): void {
    let controller = runController(this);
    if (!controller) {
      const characterId = this.registry.get('characterId') as CharacterId | undefined;
      if (!characterId) { this.scene.start('character-select'); return; }
      controller = startRun(this, String(this.registry.get('seed') ?? Date.now()), characterId);
      dispatchRun(this, { type: 'LeaveShop' });
    }
    if (controller.state.phase === 'stage-ready') dispatchRun(this, { type: 'EnterStage' });
    this.run = controller.state;
    if (this.run.phase !== 'await-input' || !this.run.stage) { this.scene.start('character-select'); return; }
    this.stage = getStage(this.run.stage.index)!;
    this.characterId = this.run.characterId;
    this.selectedIds.clear();
    this.playing = false;
    this.effects.clear();
    const seed = this.run.seed;

    const { width } = this.scale;
    const character = getCharacter(this.characterId);
    this.cameras.main.setBackgroundColor('#14120d');

    this.add.text(42, 24, '大丑牌', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#fff1c8',
    });
    this.add.text(42, 66, `SEED  ${seed}`, {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#8f8267',
    });
    this.add.text(42, 88, this.stage.name, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#f3cf7c',
    });

    const roleBg = this.add
      .rectangle(width - 200, 56, 344, 76, 0x2b2317, 0.98)
      .setStrokeStyle(2, character.accent, 0.72);

    // HUD 角色区：小型立绘（按 focal 点正方裁切，保住脸）+ 称号 · 名称 + 当前被动
    const portraitSize = 58;
    const portraitX = roleBg.x - roleBg.width / 2 + portraitSize / 2 + 8;
    const portraitKey = `portrait-${character.id}`;
    if (this.textures.exists(portraitKey)) {
      const frame = this.textures.get(portraitKey).getSourceImage() as HTMLImageElement;
      const crop = portraitSquareCrop(frame.width, frame.height, character.portraitFocusX, character.portraitFocusY);
      this.add.image(portraitX, roleBg.y, portraitKey)
        .setCrop(crop.x, crop.y, crop.width, crop.height)
        .setDisplaySize(portraitSize, portraitSize);
    } else {
      this.add.rectangle(portraitX, roleBg.y, portraitSize, portraitSize, character.accent, 0.28)
        .setStrokeStyle(2, character.accent, 0.8);
      this.add.text(portraitX, roleBg.y, character.name.slice(0, 1), {
        fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
      }).setOrigin(0.5);
    }
    this.add.rectangle(portraitX, roleBg.y, portraitSize, portraitSize, 0x000000, 0)
      .setStrokeStyle(2, character.accent, 0.9);

    this.add.text(roleBg.x - 96, roleBg.y - 22, `${character.title} · ${character.name}`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#fff4d7',
    });
    this.roleText = this.add.text(roleBg.x - 96, roleBg.y + 5, character.passiveName, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: '#f3cf7c',
    });

    this.heatText = this.add.text(42, 118, '', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '30px',
      fontStyle: 'bold',
      color: '#fff7df',
    });
    this.handsText = this.add.text(42, 160, '', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#bdb197',
    });

    this.renderJokerRack();

    this.resultText = this.add
      .text(width / 2, 254, '选 1～5 张牌，开始你的第一个包袱。', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '27px',
        fontStyle: 'bold',
        color: '#f1e6cc',
        align: 'center',
      })
      .setOrigin(0.5);

    this.breakdownText = this.add
      .text(width / 2, 314, '计分来源会在这里逐项展开', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '15px',
        color: '#b9aa8a',
        align: 'center',
        lineSpacing: 5,
      })
      .setOrigin(0.5, 0);

    this.playButton = this.add
      .rectangle(width / 2, 650, 220, 58, 0xa43d2f, 1)
      .setStrokeStyle(2, 0xf1bd68, 0.8)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2, 650, '出 牌', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#fff8e9',
      })
      .setOrigin(0.5)
      .setDepth(2);
    this.playButton.on('pointerdown', () => void this.playSelected());
    const discard=this.add.rectangle(width/2-250,650,190,58,0x2b3a4a).setStrokeStyle(2,0x7fb3d5).setInteractive({useHandCursor:true});
    this.add.text(discard.x,discard.y,'弃 牌',{fontSize:'22px',color:'#dceefb'}).setOrigin(0.5);
    discard.on('pointerdown',()=>this.discardSelected());
    if(this.characterId==='touye'){
      const wager=this.add.text(width/2+190,650,'本手押注：否',{fontSize:'18px',color:'#ffba66'}).setOrigin(0,0.5).setInteractive({useHandCursor:true});
      wager.on('pointerdown',()=>{
        if(this.playing)return;
        const result=dispatchRun(this,{type:'SetWager',enabled:!this.run.stage!.wagerSelected});
        if(result.ok){this.run=result.state;wager.setText(this.run.stage!.wagerSelected?'本手押注：是':'本手押注：否');this.previewSelection();}
        else wager.setText('本场押注已使用');
      });
    }

    this.add
      .text(width - 42, 686, '重新选角色', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#a99c82',
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if(!window.confirm('结束当前局并重新选角色？'))return;
        dispatchRun(this, { type: 'AbandonRun' });
        this.scene.start('character-select');
      });

    this.updateHud();
    this.renderHand();
  }

  private renderJokerRack(): void {
    const startX = 390;
    const y = 145;
    const cardWidth = 132;
    const gap = 12;

    if (this.jokerIds.length === 0) {
      this.add.text(startX, y, '尚未装备大丑牌——过关后去货摊淘几张。', {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '15px',
        color: '#8f8267',
      }).setOrigin(0, 0.5);
      return;
    }

    this.jokerIds.forEach((id, index) => {
      const joker = getJoker(id);
      const x = startX + index * (cardWidth + gap);
      const container = this.add.container(x, y);
      const bg = this.add
        .rectangle(0, 0, cardWidth, 74, 0xf3e5bd, 1)
        .setStrokeStyle(2, joker.rarity === 'rare' ? 0xc84b31 : 0xb88b3d, 0.85);
      const name = this.add
        .text(0, -18, joker.name, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          color: '#3e2c1e',
        })
        .setOrigin(0.5);
      const desc = this.add
        .text(0, 12, joker.description, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '10px',
          color: '#6b5840',
          align: 'center',
          wordWrap: { width: cardWidth - 16,useAdvancedWrap:true },
        })
        .setOrigin(0.5);
      container.add([bg, name, desc]);
      this.jokerViews.set(id, container);
    });
  }

  private renderHand(): void {
    this.cardViews.forEach((view) => view.container.destroy());
    this.cardViews = [];

    const { width } = this.scale;
    const cardWidth = 126;
    const gap = 16;
    const total = this.hand.length * cardWidth + Math.max(0, this.hand.length - 1) * gap;
    const startX = (width - total) / 2 + cardWidth / 2;

    this.hand.forEach((card, index) => {
      const x = startX + index * (cardWidth + gap);
      const y = 490;
      const container = this.add.container(x, y);
      const red = card.suit === 'hearts' || card.suit === 'diamonds';
      const bg = this.add
        .rectangle(0, 0, cardWidth, 174, 0xf6eedf, 1)
        .setStrokeStyle(2, 0x8b7455, 0.72)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(-46, -69, `${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '25px',
        fontStyle: 'bold',
        color: red ? '#b83132' : '#252019',
      });
      const suit = this.add
        .text(0, 8, SUIT_SYMBOL[card.suit], {
          fontFamily: 'Georgia, serif',
          fontSize: '62px',
          color: red ? '#bd3435' : '#292219',
        })
        .setOrigin(0.5);

      container.add([bg, label, suit]);
      bg.on('pointerdown', () => this.toggleCard(card.id));
      this.cardViews.push({ card, container });
      if (this.selectedIds.has(card.id)) container.y -= 30;
    });
  }

  private toggleCard(id: string): void {
    if (this.playing) return;
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      if (this.selectedIds.size >= MAX_SELECTED) {this.resultText.setText('每手最多选择 5 张牌');return;}
      this.selectedIds.add(id);
    }
    this.audio.select();
    this.renderHand();
    this.previewSelection();
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.time.delayedCall(ms, resolve);
    });
  }

  private animateRole(note?: string): Promise<void> {
    if (!note) return Promise.resolve();
    this.roleText.setText(note);
    this.audio.role();
    return new Promise((resolve) => {
      this.tweens.add({
        targets: this.roleText,
        scale: { from: 1.28, to: 1 },
        duration: 230,
        ease: 'Back.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  private animateJoker(joker: ScoreEvent, chainIndex: number): Promise<void> {
    const view = this.jokerViews.get(joker.sourceDefinitionId);
    if (!view) return Promise.resolve();
    this.audio.joker(chainIndex);
    return new Promise((resolve) => {
      this.tweens.add({
        targets: view,
        y: view.y - 14,
        scale: 1.12,
        duration: 120,
        yoyo: true,
        hold: 70,
        ease: 'Back.easeOut',
        onComplete: () => resolve(),
      });
    });
  }

  private formatBreakdown(score: ScoreTrace): string {
    const first=score.events[0].after;
    return '牌型 '+fractionText(first.H)+' 热度 × '+fractionText(first.M)+' 倍率\n'
      +'计分 '+score.sets.activeScoringIds.length+' 张 / 打出 '+score.sets.playedIds.length+' 张\n'
      +'结算 '+fractionText(score.accumulator.H)+' × '+fractionText(score.accumulator.M)+' = '+heatText(score.finalScore);
  }

  private previewSelection():void {
    if(!this.selectedIds.size){this.resultText.setText('选 1～5 张牌，选择出牌或弃牌');return;}
    const stage=this.run.stage!;
    const preview=previewR2Hand({rulesVersion:'r2',runId:this.run.runId,rootId:'preview',characterId:this.characterId,hand:this.hand,selectedIds:[...this.selectedIds],disabledIds:stage.disabledIds,jokers:this.run.jokers,definitions:R2_JOKERS,handLevels:this.run.handLevels,playIndex:stage.playIndex+1,handsBeforePlay:stage.handsLeft,previousHandType:stage.previousHandType,wager:stage.wagerSelected});
    this.resultText.setText(HAND_LABELS[preview.handType]+' · 已选 '+this.selectedIds.size+' 张');
    this.breakdownText.setText(preview.possibleScores.length===2?'押注：50% '+heatText(preview.possibleScores[0])+' / 50% '+heatText(preview.possibleScores[1]):'本手预览 '+heatText(preview.possibleScores[0])+' 热度');
  }

  private discardSelected():void {
    if(this.playing)return;
    const result=dispatchRun(this,{type:'DiscardHand',selectedIds:[...this.selectedIds]});
    if(!result.ok){this.resultText.setText(result.code==='no-discards-left'?'本场弃牌次数已用完':'请选择 1～5 张牌再弃牌');return;}
    this.run=result.state;this.selectedIds.clear();this.updateHud();this.renderHand();this.previewSelection();
    if(this.run.phase==='run-lost')this.finishStage(false);
  }

  private async playSelected(): Promise<void> {
    if (this.playing || this.selectedIds.size === 0 || this.handsLeft <= 0) return;
    this.playing = true;
    this.playButton.disableInteractive();

    const result = dispatchRun(this, { type: 'PlayHand', selectedIds: [...this.selectedIds] });
    if (!result.ok || result.duplicate) {
      if(!result.ok)this.resultText.setText(result.code==='score-diagnostic'?'本手无法结算，资源与原状态已保留。':'出牌未提交，请检查所选牌。');
      this.playButton.setInteractive({ useHandCursor: true });
      this.playing = false;
      return;
    }
    this.run = result.state;
    const event = result.events.find(event => event.type === 'hand-scored-r2');
    if (!event || event.type !== 'hand-scored-r2') throw new Error('Successful play missing score event');
    const score = event.score;
    this.triggers.emit('hand:played',score.sets);

    const selectedViews = this.cardViews.filter((view) => this.selectedIds.has(view.card.id));
    this.effects.enqueue(() => {
      this.audio.playHand();
      return Promise.all(
        selectedViews.map(
          (view, index) =>
            new Promise<void>((resolve) => {
              this.tweens.add({
                targets: view.container,
                y: view.container.y - 70,
                angle: index % 2 === 0 ? -4 : 4,
                alpha: 0.25,
                duration: 210,
                delay: index * 30,
                ease: 'Cubic.easeIn',
                onComplete: () => resolve(),
              });
            }),
        ),
      ).then(() => undefined);
    });

    for(const [index,event] of score.events.entries()){
      if(event.phase==='base'||event.phase==='finalScore'||event.phase==='afterHand')continue;
      this.effects.enqueue(async()=>{
        const operation=event.operation==='multiply-multiplier'?'×倍率':event.operation==='add-multiplier'?'+倍率':'+热度';
        const source=event.sourceType==='joker'?getJoker(event.sourceDefinitionId).name:event.sourceType==='character'?getCharacter(this.characterId).name:'计分牌';
        this.resultText.setText(source+' '+operation+' '+fractionText(event.value));
        this.breakdownText.setText('热度 '+fractionText(event.after.H)+' · 倍率 '+fractionText(event.after.M));
        if(event.sourceType==='character'){this.triggers.emit('role:triggered',event);await this.animateRole(operation+' '+fractionText(event.value));}
        else if(event.sourceType==='joker'){this.triggers.emit('joker:triggered',event);await this.animateJoker(event,index);}
        else await this.wait(50);
      });
    }
    this.effects.enqueue(()=>{
      this.triggers.emit('score:resolved',score);
      this.resultText.setText(HAND_LABELS[score.handType]+'   +'+heatText(score.finalScore)+' 热度');
      this.breakdownText.setText(this.formatBreakdown(score));this.audio.score(2);
    });

    await this.effects.drain();

    this.selectedIds.clear();
    this.updateHud();

    if (this.run.phase === 'stage-cleared' || this.run.phase === 'run-won') {
      this.finishStage(true);
      return;
    }

    if (this.run.phase === 'run-lost') {
      this.finishStage(false);
      return;
    }

    this.renderHand();
    this.playButton.setInteractive({ useHandCursor: true });
    this.playing = false;
  }

  /** 本关结束：先让玩家看清结果，再进入明确的过场状态 */
  private finishStage(cleared: boolean): void {
    const completedIndex = this.run.stage!.index;
    const stageHeat = this.heat;
    const goldEarned = this.run.stage!.goldEarned;

    if (cleared) {
      this.resultText.setText(`全场失控！\n${heatText(stageHeat)} 热度`);
      this.cameras.main.flash(420, 255, 231, 181, false);
    } else {
      this.resultText.setText(
        `冷场了。\n差 ${heatText((BigInt(this.stage.targetHeat)>BigInt(stageHeat)?BigInt(this.stage.targetHeat)-BigInt(stageHeat):0n).toString())} 热度`,
      );
    }

    this.time.delayedCall(1000, () => {
      this.scene.start('intermission', {
        cleared,
        stageIndex: completedIndex,
        stageHeat,
        handsLeft: this.handsLeft,
        goldEarned,
      } satisfies IntermissionResult);
    });
  }

  private updateHud(): void {
    this.heatText.setText(`热度  ${heatText(this.heat)} / ${heatText(this.stage.targetHeat)}`);
    this.handsText.setText(`剩余出牌  ${this.handsLeft} · 弃牌 ${this.run.stage!.discardsLeft} · 金币 ${this.run.gold} · 牌堆 ${this.deck.length}`);
  }
}
