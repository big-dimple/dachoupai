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
    expect(gesture.move(1,center('c')+dx,160+dy)).toMatchObject({phase:'interrupted',reason:'vertical',selectedIds:['b','f'],visitedIds:[]});
    expect(gesture.state).toBeUndefined();
    expect(gesture.up(1,center('e'),160)).toBeUndefined();
  });

  it('explicit Escape restores the snapshot after a preview and allows a fresh gesture',()=>{
    const gesture=new HandSelectionGesture(),selected=new Set(['b','f']);start(gesture,'c',selected);
    expect(gesture.move(1,center('e'),160)?.selectedIds).toEqual(['b','c','d','e','f']);
    expect(gesture.cancel('escape')).toMatchObject({phase:'cancelled',reason:'escape',selectedIds:['b','f']});
    expect([...selected]).toEqual(['b','f']);
    expect(gesture.state).toBeUndefined();
    expect(gesture.up(1,center('e'),160)).toBeUndefined();
    start(gesture,'h',selected);
    expect(gesture.up(1,center('h'),160)?.selectedIds).toEqual(['b','f','h']);
  });

  it.each([false,true])('departure preserves applied selection and deselection (deselect: %s)',deselect=>{
    const gesture=new HandSelectionGesture();start(gesture,'b',deselect?['b','c','d','f']:['f']);
    gesture.move(1,center('d'),160);
    expect(gesture.interrupt('outside')).toMatchObject({phase:'interrupted',reason:'outside',selectedIds:deselect?['f']:['b','c','d','f'],visitedIds:['b','c','d']});
    expect(gesture.state).toBeUndefined();expect(gesture.up(1,center('h'),160)).toBeUndefined();
  });

  it('viewport departure ends a pending tap without visiting the pressed card',()=>{
    const gesture=new HandSelectionGesture();start(gesture,'b',['f']);
    expect(gesture.interrupt('viewport')).toMatchObject({phase:'interrupted',selectedIds:['f'],visitedIds:[]});
    expect(gesture.up(1,center('b'),160)).toBeUndefined();
  });

  it('rolls back a deselection preview as well as a selection preview',()=>{
    const gesture=new HandSelectionGesture();start(gesture,'d',['b','d','f']);
    expect(gesture.move(1,center('b'),160)?.selectedIds).toEqual(['f']);
    expect(gesture.cancel()?.selectedIds).toEqual(['b','d','f']);
  });

  it('a second pointer interrupts without changing the already-applied selection',()=>{
    const gesture=new HandSelectionGesture();start(gesture,'b',['f']);gesture.move(1,center('d'),160);
    expect(gesture.begin(2,center('h'),160,'h',[],boxes)).toMatchObject({phase:'interrupted',reason:'multitouch',pointerId:1,selectedIds:['b','c','d','f']});
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
  it('starts vertically in two rows, traverses both ways, deduplicates and cancels',()=>{
    const twoRows=Array.from('abcdefgh',(id,i)=>({id,x:(i%4)*40,y:100+Math.floor(i/4)*60,width:40,height:60}));
    const g=new HandSelectionGesture();g.begin(1,20,130,'a',[],twoRows,5,true);
    expect(g.move(1,20,190)).toMatchObject({phase:'sweeping',selectedIds:['a','e']});
    expect(g.move(1,100,190)).toMatchObject({selectedIds:['a','e','f','g']});
    expect(g.move(1,100,130)).toMatchObject({selectedIds:['a','c','e','f','g']});
    expect(g.move(1,20,130)).toMatchObject({selectedIds:['a','c','e','f','g'],limitReached:true});
    g.up(1,20,130);g.begin(1,100,190,'g',['a','c','e','f','g'],twoRows,5,true);
    g.move(1,100,130);g.move(1,20,130);g.move(1,20,190);g.move(1,100,190);
    expect(g.up(1,100,190)?.selectedIds).toEqual([]);
    g.begin(1,20,130,'a',['h'],twoRows,5,true);g.move(1,20,190);
    expect(g.cancel('escape')?.selectedIds).toEqual(['h']);expect(g.up(1,100,190)).toBeUndefined();
  });
  it.each(['resize','capture','pointercancel','outside'] as const)('retains cross-row applied choices on %s and ignores the old release',reason=>{
    const twoRows=[{id:'a',x:0,y:0,width:40,height:60},{id:'b',x:0,y:60,width:40,height:60}];
    const g=new HandSelectionGesture();g.begin(1,20,30,'a',[],twoRows,5,true);g.move(1,20,90);
    expect(g.interrupt(reason)?.selectedIds).toEqual(['a','b']);expect(g.up(1,20,30)).toBeUndefined();
    g.begin(2,20,90,'b',['a','b'],twoRows,5,true);expect(g.up(2,20,90)?.selectedIds).toEqual(['a']);
  });

});
