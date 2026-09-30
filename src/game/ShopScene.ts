import Phaser from 'phaser';
import {getR2Joker as getJoker,r2Pool,rerollPrice,salePrice} from '../domain/r2Shop';
import type { JokerRarity } from '../jokers/types';
import type {R2RunState as RunState} from '../domain/run';
import type {R2Offer as ShopOffer} from '../domain/r2Shop';
import {heatText} from './scoreText';
import {getR2Stage as getStage,R2_LIMITS} from '../domain/r2Run';
import { dispatchRun, runController } from './runAdapter';
const MAX_JOKER_SLOTS=R2_LIMITS.jokerSlots;

const RARITY_COLOR: Record<JokerRarity, number> = {
  common: 0xb88b3d,
  uncommon: 0x4f8f6f,
  rare: 0xc84b31,
};

const BUY_ERROR_TEXT = {
  'already-owned': '已装备',
  'slots-full': '槽位已满',
  'not-enough-gold': '金币不足',
} as const;

/**
 * r2 货摊适配器：展示已保存货架，点击提交领域命令。
 */
export class ShopScene extends Phaser.Scene {
  private run!: RunState;
  private busy=false;
  private lifecycle=0;
  private get shelf(): ShopOffer[] { return this.run.shop?.offers.filter(offer => !offer.consumed) ?? []; }

  private goldText!: Phaser.GameObjects.Text;
  private slotContainer!: Phaser.GameObjects.Container;
  private shelfContainer!: Phaser.GameObjects.Container;
  private rerollButton!: Phaser.GameObjects.Rectangle;
  private rerollLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('shop');
  }

  create(): void {
    this.busy=false;this.lifecycle++;
    this.events.once('shutdown',()=>{this.lifecycle++;this.tweens.killAll();this.time.removeAllEvents();});
    const run = runController(this)?.state;
    if (!run || run.phase !== 'shop' || !getStage(run.stageIndex)) {
      // 领域阶段不允许进店时返回选角。
      this.scene.start('character-select');
      return;
    }
    this.run = run;

    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#14120d');

    this.add.text(42, 30, '后台货摊', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#fff1c8',
    });
    const nextStage = getStage(this.run.stageIndex)!;
    this.add.text(42, 76, `下一关：${nextStage.name}（目标 ${heatText(nextStage.targetHeat)} 热度）`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '15px',
      color: '#b9aa8a',
    });
    this.goldText = this.add.text(width - 42, 36, '', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#f3cf7c',
    }).setOrigin(1, 0);

    // 装备槽（最多 5 格）
    this.slotContainer = this.add.container(0, 0);
    this.add.text(42, 132, `装备槽（${MAX_JOKER_SLOTS}）`, {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#bdb197',
    });

    // 货架
    this.shelfContainer = this.add.container(0, 0);
    this.add.text(42, 306, '今日货品', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '16px',
      color: '#bdb197',
    });

    // 刷新 + 进入下一关
    this.rerollButton = this.add
      .rectangle(42 + 110, height - 96, 220, 54, 0x2b3a4a, 1)
      .setStrokeStyle(2, 0x7fb3d5, 0.7)
      .setInteractive({ useHandCursor: true });
    this.rerollLabel = this.add.text(42 + 110, height - 96, '', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#dceefb',
    }).setOrigin(0.5);
    this.rerollButton.on('pointerdown', () => this.reroll());

    const isRunStart = this.run.stageIndex === 0;
    const nextButton = this.add
      .rectangle(width - 42 - 130, height - 96, 260, 58, 0xa43d2f, 1)
      .setStrokeStyle(2, 0xf1bd68, 0.8)
      .setInteractive({ useHandCursor: true });
    this.add.text(width - 42 - 130, height - 96, isRunStart ? '开 局' : '进入下一关', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#fff8e9',
    }).setOrigin(0.5).setDepth(2);
    nextButton.on('pointerdown',async()=>{
      const result=await this.send({type:'LeaveShop'});if(result?.ok)this.scene.start('game');
    });

    this.renderAll();
  }

  private renderAll(): void {
    this.goldText.setText(`金币  ${this.run.gold}`);
    this.renderSlots();
    this.renderShelf();
    this.renderReroll();
  }

  private renderSlots(): void {
    this.slotContainer.removeAll(true);
    const slotW = 150;
    const gap = 14;
    const startX = 42 + slotW / 2;
    const y = 206;
    for (let i = 0; i < MAX_JOKER_SLOTS; i += 1) {
      const x = startX + i * (slotW + gap);
      const instance=this.run.jokers[i];
      const equipped = instance?.definitionId;
      const box = this.add.rectangle(x, y, slotW, 96, 0x1d1810, 1);
      if (equipped) {
        const joker = getJoker(equipped);
        box.setStrokeStyle(2, RARITY_COLOR[joker.rarity], 0.9);
        this.slotContainer.add([
          box,
          this.add.text(x, y - 20, joker.name, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '17px', fontStyle: 'bold', color: '#fff4d7',
          }).setOrigin(0.5),
          this.add.text(x, y + 14, joker.description, {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '11px', color: '#c9bb9c',
            align: 'center', wordWrap: { width: slotW - 14,useAdvancedWrap:true },
          }).setOrigin(0.5),
        ]);
        const sell=this.add.text(x,y+65,'出售 +'+salePrice(instance.paidPrice),{fontSize:'14px',color:'#f3cf7c'}).setOrigin(0.5).setInteractive({useHandCursor:true});
        sell.on('pointerdown',async()=>{
          if(this.busy)return;
          if(!window.confirm('出售「'+joker.name+'」获得 '+salePrice(instance.paidPrice)+' 金币？该实例的成长会丢失。'))return;
          const result=await this.send({type:'SellJoker',instanceId:instance.instanceId});
          if(result?.ok){this.run=result.state;this.renderAll();}
        });
        this.slotContainer.add(sell);
        for(const [label,delta] of [['←',-1],['→',1]] as const){
          if(i+delta<0||i+delta>=this.run.jokers.length)continue;
          const move=this.add.text(x+delta*62,y+65,label,{fontSize:'18px',color:'#dceefb'}).setOrigin(0.5).setInteractive({useHandCursor:true});
          move.on('pointerdown',async()=>{
            const ids=this.run.jokers.map(j=>j.instanceId);[ids[i],ids[i+delta]]=[ids[i+delta],ids[i]];
            const result=await this.send({type:'ReorderJokers',ids});if(result?.ok){this.run=result.state;this.renderAll();}
          });this.slotContainer.add(move);
        }
      } else {
        box.setStrokeStyle(1, 0x5a4d38, 0.6);
        this.slotContainer.add([
          box,
          this.add.text(x, y, '空', {
            fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '15px', color: '#5a4d38',
          }).setOrigin(0.5),
        ]);
      }
    }
  }

  private renderShelf(): void {
    this.shelfContainer.removeAll(true);
    if (this.shelf.length === 0) {
      this.shelfContainer.add(
        this.add.text(42, 356, '货摊空了——牌都卖完了。', {
          fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '16px', color: '#8f8267',
        }),
      );
      return;
    }
    const cardW = 250;
    const cardH = 210;
    const gap = 24;
    const startX = 42 + cardW / 2;
    const y = 340 + cardH / 2;

    this.shelf.forEach((offer, index) => {
      const id = offer.definitionId;
      const joker = getJoker(id);
      const price = offer.price;
      const error=this.run.jokers.length>=MAX_JOKER_SLOTS?'slots-full':this.run.jokers.some(j=>j.definitionId===id)?'already-owned':this.run.gold<price?'not-enough-gold':undefined;
      const x = startX + index * (cardW + gap);
      const accent = RARITY_COLOR[joker.rarity];

      const bg = this.add.rectangle(x, y, cardW, cardH, 0xf3e5bd, error ? 0.55 : 1)
        .setStrokeStyle(2, accent, 0.9);
      const children: Phaser.GameObjects.GameObject[] = [
        bg,
        this.add.text(x, y - cardH / 2 + 24, joker.name, {
          fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '22px', fontStyle: 'bold', color: '#3e2c1e',
        }).setOrigin(0.5),
        this.add.text(x, y - 20, joker.description, {
          fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '13px', color: '#6b5840',
          align: 'center', wordWrap: { width: cardW - 28,useAdvancedWrap:true },
        }).setOrigin(0.5),
      ];

      const priceText = error
        ? `${price} 金币 · ${BUY_ERROR_TEXT[error]}`
        : `${price} 金币`;
      children.push(
        this.add.text(x, y + cardH / 2 - 30, priceText, {
          fontFamily: '"Microsoft YaHei", sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
          color: error ? '#322414' : '#a43d2f',
        }).setOrigin(0.5),
      );

      if (!error) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.buy(offer.offerId));
      }
      this.shelfContainer.add(children);
    });
  }

  private renderReroll(): void {
    const cost=rerollPrice(this.run.shop!.rerollCount);
    const affordable = this.run.gold >= cost;
    const hasGoods = r2Pool(this.run.jokers.map(j=>j.definitionId)).length > 0;
    const enabled = affordable && hasGoods;
    this.rerollLabel.setText(
      !hasGoods ? '已无货可换' : affordable ? `换一批（${cost} 金币）` : `换一批需 ${cost} 金币`,
    );
    this.rerollButton.setFillStyle(0x2b3a4a, enabled ? 1 : 0.45);
    if (enabled) {
      this.rerollButton.setInteractive({ useHandCursor: true });
    } else {
      this.rerollButton.disableInteractive();
    }
  }

  private async send(action:import('../domain/run').Action):Promise<import('../domain/run').CommandResult<RunState>|undefined> {
    if(this.busy)return;this.busy=true;const lifecycle=this.lifecycle;
    try {const result=await dispatchRun(this,action);return lifecycle===this.lifecycle&&this.scene.isActive()?result:undefined;}
    finally {if(lifecycle===this.lifecycle)this.busy=false;}
  }

  private async buy(offerId: string): Promise<void> {
    if(this.busy)return;
    const offer=this.shelf.find(o=>o.offerId===offerId);if(!offer)return;
    if(!window.confirm('购买「'+getJoker(offer.definitionId).name+'」：'+offer.price+' 金币，购买后剩 '+(this.run.gold-offer.price)+' 金币？'))return;
    const result = await this.send({type:'BuyOffer',offerId});
    if(!result?.ok) return;
    this.run = result.state;
    this.renderAll();
  }

  private async reroll(): Promise<void> {
    const result=await this.send({type:'RerollShop'});
    if(!result?.ok) return;
    this.run = result.state;
    this.renderAll();
  }
}
