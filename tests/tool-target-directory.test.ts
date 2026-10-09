import {expect,it} from 'vitest';
import {toolCardTargetStatus,toolCardMatches} from '../src/game/ToolTargetDirectory';
import {R2_TOOLS} from '../src/content/r2Tools';
import type {PlayingCard} from '../src/cards/types';
const c:PlayingCard={id:'stable-instance',rank:14,suit:'hearts',enhancement:'heat-paper'};
const tool=(id:string)=>R2_TOOLS.find(t=>t.id===id)!;
it('no-change companions stay legal for mixed multi-card tools while useful targets can be prioritized',()=>{expect(toolCardTargetStatus(tool('T08'),c,'target')).toMatchObject({eligible:true,changes:false});expect(toolCardTargetStatus(tool('T08'),{...c,rank:9},'target')).toMatchObject({eligible:true,changes:true});expect(toolCardTargetStatus(tool('T10'),c,'target')).toMatchObject({eligible:true,changes:false});});
it('donor and recipient constraints retain distinct instances and special-attribute rules',()=>{expect(toolCardTargetStatus(tool('S01'),c,'donor')).toMatchObject({eligible:true});expect(toolCardTargetStatus(tool('S01'),c,'target')).toMatchObject({eligible:false});expect(toolCardTargetStatus(tool('T02'),c,'target',c.id)).toMatchObject({eligible:false});expect(toolCardTargetStatus(tool('S02'),{...c,edition:'foil'},'target')).toMatchObject({eligible:false});});
it('filters match public rank and suit without changing identity or attributes',()=>{const before=structuredClone(c);expect(toolCardMatches(c,'14','hearts')).toBe(true);expect(toolCardMatches(c,'13','')).toBe(false);expect(toolCardMatches(c,'','clubs')).toBe(false);expect(toolCardMatches(c,'','')).toBe(true);expect(c).toEqual(before);});
