import {describe,expect,it} from 'vitest';
import {HandSelectionGesture,type HandSelectionHitBox} from '../src/game/HandSelectionGesture';

const ids=['a','b','c','d','e','f','g','h'];
const boxes:HandSelectionHitBox[]=ids.map((id,index)=>({id,x:index*40,y:100,width:40,height:120}));
const center=(id:string)=>boxes.find(box=>box.id===id)!.x+20;
const start=(gesture:HandSelectionGesture,id:string,selected:Iterable<string>=[])=>gesture.begin(1,center(id),160,id,selected,boxes);

describe('hand press-sweep selection',()=>{
  it('waits for release or 10 CSS px of horizontal intent before changing selection',()=>{
    const gesture=new HandSelectionGesture();
    expect(start(gesture,'b',['d'])).toMatchObject({phase:'pending',mode:'select',selectedIds:['d'],visitedIds:[]});
    expect(gesture.move(1,center('b')+9,165)).toMatchObject({phase:'pending',selectedIds:['d'],visitedIds:[]});
    expect(gesture.move(1,center('b')+10,165)).toMatchObject({phase:'sweeping',selectedIds:['b','d'],visitedIds:['b']});
    expect(gesture.up(1,center('b')+10,165)).toMatchObject({phase:'committed',selectedIds:['b','d']});
    expect(gesture.state).toBeUndefined();
    expect(gesture.up(1,center('b'),160)).toBeUndefined();
  });

  it('a stationary tap selects or deselects exactly the pressed card',()=>{
    const gesture=new HandSelectionGesture();
    start(gesture,'d',['f','b']);
    expect(gesture.up(1,center('d'),160)).toMatchObject({mode:'select',selectedIds:['b','d','f'],visitedIds:['d']});
    start(gesture,'d',['d','b']);
    expect(gesture.up(1,center('d'),160)).toMatchObject({mode:'deselect',selectedIds:['b'],visitedIds:['d']});
  });

  it.each([
    ['a','d',['a','b','c','d']],
    ['d','a',['d','c','b','a']],
  ] as const)('interpolates a sparse sweep from %s to %s', (from,to,visited)=>{
    const gesture=new HandSelectionGesture();start(gesture,from);
    const result=gesture.move(1,center(to),160);
    expect(result).toMatchObject({phase:'sweeping',selectedIds:['a','b','c','d'],visitedIds:visited});
    expect(gesture.up(1,center(to),160)?.selectedIds).toEqual(['a','b','c','d']);
  });

  it('processes the final release segment even when no pointermove was delivered',()=>{
    const gesture=new HandSelectionGesture();start(gesture,'e');
    expect(gesture.up(1,center('b'),160)).toMatchObject({phase:'committed',selectedIds:['b','c','d','e'],visitedIds:['e','d','c','b']});
  });

  it.each([['a','e'],['e','a']])('keeps select mode across already-selected cards moving %s to %s',(from,to)=>{
    const gesture=new HandSelectionGesture();start(gesture,from,['b','d']);
    expect(gesture.move(1,center(to),160)).toMatchObject({mode:'select',selectedIds:['a','b','c','d','e']});
  });

  it.each([['a','e'],['e','a']])('keeps deselect mode across unselected cards moving %s to %s',(from,to)=>{
    const gesture=new HandSelectionGesture();start(gesture,from,['a','c','e','h']);
    expect(gesture.move(1,center(to),160)).toMatchObject({mode:'deselect',selectedIds:['h']});
  });

  it.each([
    ['a','h',['a','b','c','d','e']],
    ['h','a',['d','e','f','g','h']],
  ] as const)('caps a long sweep %s to %s at the first five encountered cards',(from,to,selected)=>{
    const gesture=new HandSelectionGesture();start(gesture,from);
    const result=gesture.up(1,center(to),160);
    expect(result?.selectedIds).toEqual(selected);
    expect(result?.visitedIds).toHaveLength(8);
    expect(result?.limitReached).toBe(true);
  });

  it('preserves existing selections at the cap and counts hidden selected cards',()=>{
    const gesture=new HandSelectionGesture(),withHidden=boxes.map(box=>({...box,visible:box.id!=='a'}));
    gesture.begin(1,center('h'),160,'h',['a','b','c','d'],withHidden);
    expect(gesture.move(1,center('f'),160)?.selectedIds).toEqual(['a','b','c','d','h']);
    gesture.up(1,center('f'),160);
    start(gesture,'g',['a','b','c','d','h']);
    expect(gesture.up(1,center('g'),160)?.selectedIds).toEqual(['a','b','c','d','h']);
  });

  it('supports a smaller limit without ever allowing more than five',()=>{
    const gesture=new HandSelectionGesture();
    gesture.begin(1,20,160,'a',[],boxes,3);
    expect(gesture.up(1,300,160)?.selectedIds).toEqual(['a','b','c']);
    gesture.begin(1,20,160,'a',[],boxes,20);
    expect(gesture.up(1,300,160)?.selectedIds).toHaveLength(5);
  });

  it('reports a limit only for a newly encountered card that cannot fit',()=>{
    const gesture=new HandSelectionGesture();start(gesture,'a',['b','c','d','h']);
    expect(gesture.move(1,center('d'),160)).toMatchObject({selectedIds:['a','b','c','d','h'],limitReached:false});
    expect(gesture.move(1,center('e'),160)).toMatchObject({selectedIds:['a','b','c','d','h'],limitReached:true});
    expect(gesture.move(1,center('d'),160)?.visitedIds).toEqual(['a','b','c','d','e']);
    expect(gesture.cancel()).toMatchObject({selectedIds:['b','c','d','h'],limitReached:false});
  });

  it.each([false,true])('visits each card only once after reversal (initially selected: %s)',selected=>{
    const gesture=new HandSelectionGesture();start(gesture,'b',selected?['a','b','c','d','h']:[]);
    gesture.move(1,center('d'),160);
    gesture.move(1,center('a'),160);
    expect(gesture.move(1,center('d'),160)).toMatchObject({selectedIds:selected?['h']:['a','b','c','d'],visitedIds:['b','c','d','a']});
  });

  it.each([[3,10],[10,10],[-11,-14]])('rejects vertical intent (%s,%s) and leaves its release inert',(dx,dy)=>{
    const gesture=new HandSelectionGesture();start(gesture,'c',['b','f']);
    expect(gesture.move(1,center('c')+dx,160+dy)).toMatchObject({phase:'cancelled',reason:'vertical',selectedIds:['b','f'],visitedIds:[]});
    expect(gesture.state).toBeUndefined();
    expect(gesture.up(1,center('e'),160)).toBeUndefined();
  });

  it.each(['cancel','outside','multitouch'] as const)('%s restores the snapshot after a preview and allows a fresh gesture',reason=>{
    const gesture=new HandSelectionGesture(),selected=new Set(['b','f']);start(gesture,'c',selected);
    expect(gesture.move(1,center('e'),160)?.selectedIds).toEqual(['b','c','d','e','f']);
    expect(gesture.cancel(reason)).toMatchObject({phase:'cancelled',reason,selectedIds:['b','f']});
    expect([...selected]).toEqual(['b','f']);
    expect(gesture.state).toBeUndefined();
    expect(gesture.up(1,center('e'),160)).toBeUndefined();
    start(gesture,'h',selected);
    expect(gesture.up(1,center('h'),160)?.selectedIds).toEqual(['b','f','h']);
  });

  it('rolls back a deselection preview as well as a selection preview',()=>{
    const gesture=new HandSelectionGesture();start(gesture,'d',['b','d','f']);
    expect(gesture.move(1,center('b'),160)?.selectedIds).toEqual(['f']);
    expect(gesture.cancel()?.selectedIds).toEqual(['b','d','f']);
  });

  it('a second pointer cancels without replacing the original snapshot',()=>{
    const gesture=new HandSelectionGesture();start(gesture,'b',['f']);gesture.move(1,center('d'),160);
    expect(gesture.begin(2,center('h'),160,'h',[],boxes)).toMatchObject({phase:'cancelled',reason:'multitouch',pointerId:1,selectedIds:['f']});
    expect(gesture.up(2,center('h'),160)).toBeUndefined();
    expect(gesture.up(1,center('d'),160)).toBeUndefined();
  });

  it('ignores unrelated pointer motion and release without discarding the owning gesture',()=>{
    const gesture=new HandSelectionGesture();start(gesture,'b',['f']);
    expect(gesture.move(2,center('e'),160)).toBeUndefined();
    expect(gesture.up(2,center('e'),160)).toBeUndefined();
    expect(gesture.state).toMatchObject({phase:'pending',pointerId:1,selectedIds:['f']});
    expect(gesture.up(1,center('b'),160)?.selectedIds).toEqual(['b','f']);
  });

  it('snapshots caller-owned selection and geometry and returns detached preview arrays',()=>{
    const gesture=new HandSelectionGesture(),selected=new Set(['f']),mutableBoxes=boxes.map(box=>({...box}));
    const initial=gesture.begin(1,center('b'),160,'b',selected,mutableBoxes)!;
    selected.clear();mutableBoxes[2].x=1000;(initial.selectedIds as string[]).push('h');
    expect(gesture.move(1,center('d'),160)?.selectedIds).toEqual(['b','c','d','f']);
    expect(gesture.cancel()?.selectedIds).toEqual(['f']);
  });

  it('uses the full two-dimensional path, skips invisible boxes, and crosses empty gaps',()=>{
    const gesture=new HandSelectionGesture(),pathBoxes:HandSelectionHitBox[]=[
      {id:'a',x:0,y:0,width:30,height:100},
      {id:'b',x:50,y:0,width:30,height:100,visible:false},
      {id:'c',x:100,y:0,width:30,height:20},
      {id:'d',x:150,y:0,width:30,height:100},
    ];
    gesture.begin(1,15,40,'a',[],pathBoxes);
    expect(gesture.up(1,165,70)).toMatchObject({selectedIds:['a','d'],visitedIds:['a','d']});
  });
});
