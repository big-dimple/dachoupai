import {it,expect} from 'vitest';
import {subtractBoxes} from '../src/game/ScoreGeometry';
import {intersects,type Box} from '../src/game/layout';
it('subtracts overlapping real text bounds without losing or leaking CSS area',()=>{
 const area={x:10,y:20,width:100,height:80},guards=[{x:20,y:30,width:30,height:20},{x:35,y:35,width:30,height:30},{x:5,y:90,width:20,height:30}];
 const pieces=subtractBoxes(area,guards);
 for(const piece of pieces){expect(piece.width).toBeGreaterThan(0);expect(piece.height).toBeGreaterThan(0);for(const guard of guards)expect(intersects(piece,guard)).toBe(false);}
 for(let y=20.5;y<100;y++)for(let x=10.5;x<110;x++){const contains=(b:Box)=>x>b.x&&x<b.x+b.width&&y>b.y&&y<b.y+b.height;expect(pieces.filter(contains).length).toBe(guards.some(contains)?0:1);}
});
