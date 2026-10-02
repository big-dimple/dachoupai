import Phaser from 'phaser';
import {getR2Joker} from '../domain/r2Shop';

/** Shared mechanism woodcuts for cards without a dedicated illustration. */
export function drawJokerMotif(scene:Phaser.Scene,container:Phaser.GameObjects.Container,definitionId:string,x:number,y:number,size:number):void {
  const definition=getR2Joker(definitionId),operations=definition.hooks.flatMap(hook=>hook.operations);
  const art=scene.add.container(x,y).setScale(Math.max(1,size)/100),g=scene.add.graphics();container.add(art);art.add(g);
  const ink=0x294852,brass=0xb68b4c,paper=0xeed5a2,jade=0x448773,rose=0xb15b55;
  // A quiet etched ground, shared by all mechanisms; the object carries the identity.
  g.lineStyle(1,ink,.1);
  for(let line=-38;line<=38;line+=8)g.lineBetween(-39,line,39,line-10);
  g.fillStyle(ink,.1).fillEllipse(2,37,70,12);
  const hourglass=definitionId==='d01'||definitionId==='d03';
  if(definitionId==='d08'){
    // An etched gramophone: held voice-paper keeps its own effect before the horn responds.
    g.fillStyle(jade).fillRoundedRect(-29,15,58,22,4);
    g.lineStyle(2,ink).strokeRoundedRect(-29,15,58,22,4);
    g.fillStyle(brass).fillEllipse(-3,12,40,10);
    g.lineStyle(2,ink).strokeEllipse(-3,12,40,10).lineBetween(-8,10,-8,-14).lineBetween(-8,-14,4,-22);
    g.fillStyle(paper).fillTriangle(1,-24,37,-41,32,-2);
    g.fillStyle(brass).fillEllipse(34,-21,16,40);
    g.lineStyle(2,ink).strokeTriangle(1,-24,37,-41,32,-2).strokeEllipse(34,-21,16,40);
    g.lineStyle(2,brass).lineBetween(-29,23,-39,23).lineBetween(-39,23,-39,31);
    g.lineStyle(2,jade).beginPath().arc(37,-20,15,-.6,.6).strokePath().beginPath().arc(37,-20,23,-.5,.5).strokePath();
  }else if(definition.modifiers?.some(modifier=>modifier.kind==='consumable-capacity')){
    g.fillStyle(jade).fillRoundedRect(-32,-13,64,47,4);
    g.fillStyle(paper).fillRoundedRect(-34,-29,68,22,4);
    g.lineStyle(2,ink).strokeRoundedRect(-32,-13,64,47,4).strokeRoundedRect(-34,-29,68,22,4);
    g.lineStyle(3,brass).lineBetween(-24,-24,-24,29).lineBetween(24,-24,24,29);
    g.fillStyle(brass).fillRoundedRect(-7,-12,14,14,2);g.lineStyle(2,ink).strokeRoundedRect(-7,-12,14,14,2);
    g.lineStyle(3,paper).lineBetween(0,9,0,24).lineBetween(-8,17,8,17);
  }else if(operations.some(operation=>operation.kind==='chance-add-heat')){
    g.fillStyle(paper).beginPath().moveTo(-27,-20).lineTo(11,-34).lineTo(32,-17).lineTo(-5,-3).closePath().fillPath();
    g.fillStyle(brass).beginPath().moveTo(-27,-20).lineTo(-5,-3).lineTo(-5,34).lineTo(-27,18).closePath().fillPath();
    g.fillStyle(jade).beginPath().moveTo(-5,-3).lineTo(32,-17).lineTo(32,19).lineTo(-5,34).closePath().fillPath();
    g.lineStyle(2,ink).beginPath().moveTo(-27,-20).lineTo(11,-34).lineTo(32,-17).lineTo(32,19).lineTo(-5,34).lineTo(-27,18).closePath().strokePath();
    g.lineBetween(-27,-20,-5,-3).lineBetween(-5,-3,32,-17).lineBetween(-5,-3,-5,34);
    for(const [cx,cy] of [[-1,-22],[-14,0],[-14,14],[7,6],[14,12],[21,18]])g.fillStyle(ink).fillCircle(cx,cy,2.8);
    g.lineStyle(1.5,brass,.9).lineBetween(-37,-32,-32,-28).lineBetween(26,-36,30,-29).lineBetween(39,27,43,24);
  }else if(definition.modifiers?.some(modifier=>modifier.kind==='four-flush')){
    for(const [cx,cy] of [[-18,-20],[15,-20],[-18,16],[15,16]]){
      g.fillStyle(paper).fillRoundedRect(cx-14,cy-17,28,34,3);g.lineStyle(1.5,ink).strokeRoundedRect(cx-14,cy-17,28,34,3);
      g.fillStyle(rose).fillTriangle(cx,cy-10,cx+7,cy,cx,cy+10).fillTriangle(cx,cy-10,cx-7,cy,cx,cy+10);
    }
    g.lineStyle(2,brass).beginPath().arc(0,0,43,-Math.PI*.8,Math.PI*.1).strokePath();
  }else if(operations.some(operation=>operation.kind==='reward-consumable-pool')){
    for(let index=0;index<4;index++){
      const cx=-27+index*18;
      g.fillStyle(index%2?rose:jade).fillRoundedRect(cx-7,-4,14,28,3);
      g.fillStyle(brass).fillRect(cx-8,-9,16,5);g.lineStyle(1.5,ink).strokeRoundedRect(cx-7,-4,14,28,3);
      g.lineStyle(1,paper).lineBetween(cx-4,4,cx+4,4).lineBetween(cx-4,8,cx+4,8);
    }
    g.lineStyle(3,ink).lineBetween(-20,-32,24,-21);g.fillStyle(brass).fillTriangle(24,-25,34,-18,23,-17);
    g.lineStyle(2,brass).strokeRoundedRect(-37,26,74,7,2);
  }else if(operations.some(operation=>operation.kind==='read-coefficient')){
    g.fillStyle(jade).fillCircle(-14,2,25);g.fillStyle(paper).fillCircle(15,2,25);
    g.lineStyle(2,ink).strokeCircle(-14,2,25).strokeCircle(15,2,25);
    g.lineStyle(2,brass).strokeCircle(-14,2,19).strokeCircle(15,2,19);
    g.lineStyle(3,rose).lineBetween(-6,-6,7,8).lineBetween(7,-6,-6,8);
    g.lineStyle(3,brass).lineBetween(-26,-33,21,-33);g.fillStyle(brass).fillTriangle(20,-38,31,-33,20,-28);
    g.lineStyle(1,paper).lineBetween(-18,-13,-10,-17);
  }else if(operations.some(operation=>operation.kind==='refund-hand-limited')){
    for(let index=0;index<4;index++){
      const cx=-27+index*18;g.fillStyle(paper).fillRoundedRect(cx-8,-26,16,45,2);g.lineStyle(1.5,ink).strokeRoundedRect(cx-8,-26,16,45,2);
      g.fillStyle(rose).fillCircle(cx,-12,3);
    }
    g.lineStyle(3,jade).beginPath().arc(0,3,34,Math.PI*.12,Math.PI*.94).strokePath();
    g.fillStyle(jade).fillTriangle(-33,9,-23,14,-29,22);
  }else if(hourglass){
    g.fillStyle(0x688a88,.18).beginPath().moveTo(-23,-32).lineTo(23,-32).lineTo(5,0).lineTo(23,31).lineTo(-23,31).lineTo(-5,0).closePath().fillPath();
    g.lineStyle(3,ink).beginPath().moveTo(-23,-32).lineTo(-20,-20).lineTo(-4,0).lineTo(-20,21).lineTo(-23,31).moveTo(23,-32).lineTo(20,-20).lineTo(4,0).lineTo(20,21).lineTo(23,31).strokePath();
    g.fillStyle(brass).fillRoundedRect(-31,-39,62,8,2).fillRoundedRect(-31,31,62,8,2);
    g.lineStyle(2,ink).lineBetween(-27,-30,-27,31).lineBetween(27,-30,27,31);
    g.fillStyle(paper).fillTriangle(-15,-24,15,-24,0,-4).fillTriangle(-17,27,17,27,0,12);
    g.fillStyle(brass).fillCircle(0,4,2).fillCircle(0,10,1.5);
    g.lineStyle(1,0xfff5d7,.85).lineBetween(-16,-25,-7,-14).lineBetween(-27,-36,25,-36);
  }else if(operations.some(operation=>operation.kind==='add-growth')){
    g.fillStyle(brass).beginPath().moveTo(-23,13).lineTo(23,13).lineTo(17,37).lineTo(-17,37).closePath().fillPath();
    g.lineStyle(2,ink).strokeRect(-23,12,46,5).lineBetween(-23,17,-17,37).lineBetween(23,17,17,37).lineBetween(-17,37,17,37);
    g.lineStyle(4,ink).beginPath().moveTo(0,13).lineTo(0,-11).lineTo(7,-34).strokePath();
    g.fillStyle(jade).fillEllipse(-16,-10,29,17).fillEllipse(17,-24,30,18);
    g.lineStyle(2,ink).lineBetween(-28,-14,0,-3).lineBetween(5,-13,28,-30);
    g.lineStyle(1,0xdde9bb).lineBetween(-26,-11,-8,-7).lineBetween(15,-23,25,-27);
    g.lineStyle(1,ink,.35).lineBetween(-12,21,-9,32).lineBetween(-3,21,-2,32).lineBetween(7,21,6,32).lineBetween(16,21,12,32);
  }else if(operations.some(operation=>operation.kind==='refund-discard')){
    g.fillStyle(paper).fillRoundedRect(-26,-30,37,55,4).fillRoundedRect(-9,-19,37,55,4);
    g.lineStyle(2,ink).strokeRoundedRect(-26,-30,37,55,4).strokeRoundedRect(-9,-19,37,55,4);
    g.lineStyle(1,brass).strokeRect(-4,-13,27,42);
    g.fillStyle(jade).fillTriangle(9,-6,18,9,9,24).fillTriangle(9,-6,0,9,9,24);
    g.lineStyle(3,rose).beginPath().arc(0,0,43,-Math.PI*.8,Math.PI*.1).strokePath();
    g.fillStyle(rose).fillTriangle(41,15,31,12,38,3);
  }else if(operations.some(operation=>operation.kind==='multiply-multiplier')){
    g.fillStyle(brass,.45).fillTriangle(-43,-14,-43,-3,-8,0);
    g.fillStyle(jade,.45).fillTriangle(4,0,43,-27,43,-12);
    g.fillStyle(rose,.4).fillTriangle(4,1,43,14,43,30);
    g.fillStyle(paper).fillTriangle(-22,28,2,-34,27,28);
    g.fillStyle(0x78a5a4).fillTriangle(2,-34,27,28,4,12);
    g.lineStyle(2,ink).strokeTriangle(-22,28,2,-34,27,28).lineBetween(2,-34,4,12).lineBetween(-22,28,4,12).lineBetween(4,12,27,28);
    g.lineStyle(1,0xfff6d6).lineBetween(-15,19,0,-18);
    g.lineStyle(2,brass,.9).lineBetween(-40,-8,-10,0).lineBetween(13,-1,40,-20).lineBetween(15,11,41,22);
  }else if(operations.some(operation=>operation.kind==='add-multiplier')){
    g.fillStyle(brass).fillEllipse(1,2,65,78);
    g.fillStyle(paper).fillEllipse(-2,-1,57,72);
    g.lineStyle(2,ink).strokeEllipse(1,2,65,78);
    g.fillStyle(ink).fillEllipse(-15,-12,15,9).fillEllipse(14,-12,15,9);
    g.lineStyle(2,ink).beginPath().moveTo(-24,-23).lineTo(-15,-25).lineTo(-6,-22).moveTo(6,-22).lineTo(15,-25).lineTo(24,-23).moveTo(1,-12).lineTo(-4,6).lineTo(4,7).strokePath();
    g.lineStyle(3,rose).beginPath().arc(0,7,16,0,Math.PI).strokePath();
    g.lineStyle(1,0xfff4d6).lineBetween(-24,1,-20,12).lineBetween(-20,12,-13,23);
    g.lineStyle(2,ink).lineBetween(-33,-9,-43,-14).lineBetween(33,-9,43,-14);
  }else if(operations.some(operation=>operation.kind==='add-gold'||operation.kind==='add-heat-per-gold')){
    g.fillStyle(jade).beginPath().moveTo(-12,-19).lineTo(12,-19).lineTo(26,19).lineTo(19,35).lineTo(-19,35).lineTo(-26,19).closePath().fillPath();
    g.lineStyle(2,ink).beginPath().moveTo(-12,-19).lineTo(-26,19).lineTo(-19,35).lineTo(19,35).lineTo(26,19).lineTo(12,-19).strokePath();
    g.fillStyle(brass).fillEllipse(0,-20,31,8).fillCircle(-19,-28,11).fillCircle(2,-34,12).fillCircle(22,-25,10).fillCircle(1,10,14);
    for(const [cx,cy,r] of [[-19,-28,11],[2,-34,12],[22,-25,10],[1,10,14]]){
      g.lineStyle(1.5,ink).strokeCircle(cx,cy,r);g.lineStyle(1,0xffe7ab).strokeCircle(cx-1,cy-1,r-4);
    }
    g.lineStyle(2,ink).lineBetween(-12,-18,12,-18).lineBetween(0,-17,8,-9);
  }else if(operations.some(operation=>operation.kind==='add-heat-per-empty-slot')){
    g.fillStyle(jade).fillRoundedRect(-21,-33,42,41,4).fillRoundedRect(-25,8,50,9,2);
    g.lineStyle(2,ink).strokeRoundedRect(-21,-33,42,41,4).lineBetween(-21,16,-24,36).lineBetween(21,16,24,36);
    g.lineStyle(1,brass).strokeRoundedRect(-15,-26,30,27,3);
    g.lineStyle(2,brass).lineBetween(-32,29,-24,25).lineBetween(28,2,39,-3).lineBetween(28,6,42,8);
  }else {
    g.fillStyle(paper).beginPath().moveTo(-29,-34).lineTo(29,-34).lineTo(29,-9).lineTo(22,-4).lineTo(29,2).lineTo(29,35).lineTo(-29,35).lineTo(-29,2).lineTo(-22,-4).lineTo(-29,-9).closePath().fillPath();
    g.lineStyle(2,ink).beginPath().moveTo(-29,-34).lineTo(29,-34).lineTo(29,-9).lineTo(22,-4).lineTo(29,2).lineTo(29,35).lineTo(-29,35).lineTo(-29,2).lineTo(-22,-4).lineTo(-29,-9).closePath().strokePath();
    g.lineStyle(1,brass).lineBetween(-22,-25,22,-25).lineBetween(-22,26,22,26);
    g.lineStyle(3,rose).lineBetween(-15,-13,-15,11).lineBetween(-5,-13,-5,11).lineBetween(5,-13,5,11).lineBetween(15,-13,15,11).lineBetween(-21,8,20,-9);
    g.lineStyle(1,ink,.35).lineBetween(-21,19,21,19);
  }
}
