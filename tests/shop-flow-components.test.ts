import {describe,expect,it} from 'vitest';
import {applyCommand,createRun,type R2RunState} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {r2ToolPrice} from '../src/domain/r2Shop';
import {intersects,type Box} from '../src/game/layout';
import {shopAnchoredTip} from '../src/game/ShopAnchoredTip';
import {shopOfferGeometry,SHOP_CATEGORIES} from '../src/game/ShopOfferLayout';
import {shopPurchaseContinuation,shopToolContinuation,shopToolPurchaseContinuation} from '../src/game/ShopPurchaseFlow';

const inside=(a:Box,b:Box)=>a.x>=b.x&&a.y>=b.y&&a.x+a.width<=b.x+b.width&&a.y+a.height<=b.y+b.height;

describe('shop tips stay beside the relevant card and outside protected regions',()=>{
  const region={x:24,y:24,width:1232,height:672},sidebar={x:24,y:24,width:224,height:672};
  it('uses the near side and flips at the right edge without covering the sidebar',()=>{
    const size={width:260,height:220};
    const middle=shopAnchoredTip({x:560,y:180,width:128,height:180},size,region,[sidebar])!;
    const edge=shopAnchoredTip({x:1100,y:180,width:128,height:180},size,region,[sidebar])!;
    expect(middle.side).toBe('right');expect(middle.box.x).toBe(700);
    expect(edge.side).toBe('left');expect(edge.box.x).toBe(828);
    for(const tip of [middle,edge]){expect(inside(tip.box,region)).toBe(true);expect(intersects(tip.box,sidebar)).toBe(false);}
  });
  it('flips vertically when horizontal space is unavailable and respects safe insets',()=>{
    const safe={x:12,y:34,width:366,height:672},anchor={x:170,y:570,width:72,height:100};
    const tip=shopAnchoredTip(anchor,{width:240,height:160},safe)!;
    expect(tip.side).toBe('above');expect(tip.box.y).toBe(398);expect(inside(tip.box,safe)).toBe(true);expect(intersects(tip.box,anchor)).toBe(false);
  });
  it('leaves the tip hidden when every nearby location would cover the character or actions',()=>{
    const anchor={x:280,y:200,width:100,height:140},size={width:250,height:200};
    expect(shopAnchoredTip(anchor,size,{x:12,y:12,width:620,height:350},[{x:392,y:12,width:228,height:326},{x:12,y:12,width:250,height:326}])).toBeUndefined();
    expect(shopAnchoredTip(anchor,{width:1000,height:1000},region)).toBeUndefined();
  });
});

describe('shop goods have a stable title, summary and price grid',()=>{
  it.each([['tools',320,180],['items',320,180],['tools',220,150],['jokers',280,400]] as const)('%s keeps complete art and all copy inside a %s×%s seat',(kind,width,height)=>{
    const tile={x:400,y:240,width,height},geometry=shopOfferGeometry(tile,kind)!;
    expect(geometry).toBeDefined();expect(geometry.art.height/geometry.art.width).toBeCloseTo(1.4);
    const boxes=Object.values(geometry);for(const box of boxes){expect(inside(box,tile)).toBe(true);expect(box.width).toBeGreaterThan(0);expect(box.height).toBeGreaterThan(0);}
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)expect(intersects(boxes[i],boxes[j])).toBe(false);
    if(width===320)expect(geometry.art.width).toBeGreaterThan(100);
  });
  it('aligns tools and long term goods identically regardless of description length',()=>{
    const a=shopOfferGeometry({x:0,y:20,width:320,height:180},'tools')!;
    const b=shopOfferGeometry({x:340,y:20,width:320,height:180},'items')!;
    expect(a.art.y).toBe(b.art.y);expect(a.title.y).toBe(b.title.y);expect(a.summary.y).toBe(b.summary.y);expect(a.price.y).toBe(b.price.y);
    expect(Object.values(SHOP_CATEGORIES).map(c=>c.title)).toEqual(['唐宋牌','消耗工具','长期物品']);
  });
  it('reports insufficient space instead of shrinking art or moving price into the summary',()=>{
    expect(shopOfferGeometry({x:0,y:0,width:160,height:100},'tools')).toBeUndefined();
    expect(shopOfferGeometry({x:0,y:0,width:100,height:200},'jokers')).toBeUndefined();
  });
});

function fixture():R2RunState {
  const run=createRun({rulesVersion:'r2',runId:'shop-flow',seed:'shop-flow',characterId:'laohuan',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group'});
  run.gold=30;run.consumables=[];run.handLevels={'high-card':1,pair:1};return run;
}

describe('saved tool purchases continue without choosing or consuming for the player',()=>{
  it.each(['T02','T01','T18'])('projects a real %s purchase into one next step and leaves complete state unchanged',id=>{
    const before=fixture(),offer=before.shop!.toolOffers[0];offer.definitionId=id;offer.price=r2ToolPrice(id,before);
    const result=applyCommand(before,{runId:before.runId,commandId:'buy/'+id,expectedSeq:before.commandSeq,action:{type:'BuyOffer',offerId:offer.offerId}});
    if(!result.ok)throw Error(result.code);expect(result.ok).toBe(true);
    const snapshot=structuredClone(result.state),flow=shopToolPurchaseContinuation(before,result.state,offer)!;
    expect(flow).toBeDefined();expect(flow.continuation.expectedSeq).toBe(result.state.commandSeq);
    expect(flow.continuation.next).toBe(id==='T18'?'confirmation':'targets');
    expect(flow.continuation.secondaryLabel).toBe('稍后使用');
    expect(flow.continuation).not.toHaveProperty('targetIds');expect(flow.continuation).not.toHaveProperty('handType');
    expect(result.state).toEqual(snapshot);expect(result.state.consumables).toHaveLength(1);
    expect(shopToolPurchaseContinuation(result.state,result.state,offer)).toBeUndefined();
    expect(shopToolPurchaseContinuation(before,{...result.state,runId:'different-run'},offer)).toBeUndefined();
    expect(shopPurchaseContinuation({...result.state,commandSeq:result.state.commandSeq+1},flow.receipt)).toBeUndefined();
    expect(shopPurchaseContinuation({...result.state,consumables:[]},flow.receipt)).toBeUndefined();
  });
  it('explains phase restrictions and keeps the tool without inventing a hand target or carry intent',()=>{
    const run=fixture();run.consumables=[{instanceId:'held',definitionId:'T17'}];
    const snapshot=structuredClone(run),flow=shopToolContinuation(run,'held')!;
    expect(flow.next).toBe('later');expect(flow.primaryLabel).toBeUndefined();expect(flow.status).toContain('留到可用阶段');expect(flow).not.toHaveProperty('carryIntent');expect(run).toEqual(snapshot);
  });
});
