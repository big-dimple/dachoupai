import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {DetailDialog} from '../src/game/DetailDialog';
import {cardAbilityCopy} from '../src/game/CardCopy';

const art=vi.hoisted(()=>({progressive:vi.fn(),decode:vi.fn(),mountF09:vi.fn()}));
vi.mock('../src/game/DetailArt',()=>({progressiveArt:art.progressive,decodeArtImage:art.decode}));
vi.mock('../src/game/F09Art',()=>({mountF09Detail:art.mountF09}));

/** Only the tree, event and focus operations used by the dialog; no image loading or layout. */
class Element {
  readonly children:Element[]=[];
  parentElement:Element|null=null;
  className='';dataset:Record<string,string>={};hidden=false;disabled=false;
  src='';alt='';width=0;height=0;naturalWidth=0;complete=false;scrollTop=0;title='';type='';decoding='';
  onclick:((event:Event)=>unknown)|null=null;
  onerror:((event:Event)=>unknown)|null=null;
  onload:((event:Event)=>unknown)|null=null;
  private text='';
  private readonly attributes=new Map<string,string>();
  private readonly listeners=new Map<string,Set<(event:Event)=>void>>();
  readonly style={setProperty:vi.fn(),removeProperty:vi.fn()};
  readonly classList={
    contains:(name:string)=>this.className.split(/\s+/).includes(name),
    add:(...names:string[])=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...names])].join(' ');},
    remove:(...names:string[])=>{this.className=this.className.split(/\s+/).filter(name=>!names.includes(name)).join(' ');},
    toggle:(name:string,force?:boolean)=>{const present=force??!this.classList.contains(name);if(present)this.classList.add(name);else this.classList.remove(name);return present;},
  };
  constructor(readonly tagName:string){}
  get childElementCount(){return this.children.length;}
  get firstChild(){return this.children[0]??null;}
  get parentNode(){return this.parentElement;}
  get isConnected():boolean{return this===dom.body||!!this.parentElement?.isConnected;}
  get textContent():string{return this.text+this.children.map(child=>child.textContent).join('');}
  set textContent(value:string){this.text=value;this.replaceChildren();}
  append(...nodes:Element[]){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  prepend(...nodes:Element[]){for(const node of [...nodes].reverse()){node.remove();node.parentElement=this;this.children.unshift(node);}}
  appendChild(node:Element){this.append(node);return node;}
  replaceChildren(...nodes:Element[]){for(const child of [...this.children])child.remove();this.append(...nodes);}
  remove(){if(!this.parentElement)return;const siblings=this.parentElement.children;siblings.splice(siblings.indexOf(this),1);this.parentElement=null;}
  replaceWith(node:Element){const parent=this.parentElement;if(!parent)return;const index=parent.children.indexOf(this);node.remove();parent.children.splice(index,1,node);node.parentElement=parent;this.parentElement=null;}
  insertAdjacentElement(where:string,node:Element){if(where==='afterend'&&this.parentElement){const parent=this.parentElement;node.remove();parent.children.splice(parent.children.indexOf(this)+1,0,node);node.parentElement=parent;}return node;}
  setAttribute(name:string,value:string){this.attributes.set(name,value);if(name==='class')this.className=value;if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase())]=value;}
  getAttribute(name:string){if(name==='class')return this.className;if(name.startsWith('data-'))return this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase())]??null;return this.attributes.get(name)??null;}
  removeAttribute(name:string){this.attributes.delete(name);if(name.startsWith('data-'))delete this.dataset[name.slice(5).replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase())];}
  matches(selector:string):boolean {
    const tag=selector.match(/^[a-z]+/i)?.[0];
    return (!tag||this.tagName===tag.toUpperCase())&&[...selector.matchAll(/\.([\w-]+)/g)].every(([,name])=>this.classList.contains(name))&&[...selector.matchAll(/\[([\w-]+)(?:=["']?([^"'\]]+)["']?)?\]/g)].every(([,name,value])=>value===undefined?this.getAttribute(name)!==null:this.getAttribute(name)===value);
  }
  querySelectorAll(selector:string):Element[]{return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector:string):Element|null{return this.querySelectorAll(selector)[0]??null;}
  contains(node:Element):boolean{return this===node||this.children.some(child=>child.contains(node));}
  addEventListener(name:string,listener:(event:Event)=>void){let listeners=this.listeners.get(name);if(!listeners)this.listeners.set(name,listeners=new Set());listeners.add(listener);}
  removeEventListener(name:string,listener:(event:Event)=>void){this.listeners.get(name)?.delete(listener);}
  dispatchEvent(event:Event){const handler=event.type==='click'?this.onclick:event.type==='error'?this.onerror:event.type==='load'?this.onload:null;handler?.call(this,event);for(const listener of this.listeners.get(event.type)??[])listener.call(this,event);return !event.defaultPrevented;}
  click(){if(!this.disabled)this.dispatchEvent(new Event('click'));}
  focus(){dom.activeElement=this;}
  showModal(){this.setAttribute('open','');}
  close(){this.removeAttribute('open');}
}

let dom:{body:Element;activeElement:Element|null;createElement:(tag:string)=>Element;querySelector:(selector:string)=>Element|null};
const upgrades:{image:HTMLImageElement;ready:()=>void;stop:ReturnType<typeof vi.fn>}[]=[];
const portrait={url:'/hd.webp',thumbnailUrl:'/thumbnail.webp',alt:'不换词原画',layout:'card' as const,caption:'不换词'};
const node=(element:unknown)=>element as Element;
const find=(root:unknown,selector:string)=>{const found=node(root).querySelector(selector);expect(found,selector).not.toBeNull();return found!;};
const flush=async()=>{for(let i=0;i<4;i++)await Promise.resolve();};

beforeEach(()=>{
  vi.clearAllMocks();upgrades.length=0;
  const body=new Element('BODY');dom={body,activeElement:body,createElement:tag=>new Element(tag.toUpperCase()),querySelector:selector=>body.querySelector(selector)};
  vi.stubGlobal('document',dom);vi.stubGlobal('HTMLElement',Element);vi.stubGlobal('HTMLImageElement',Element);
  art.decode.mockResolvedValue(undefined);
  art.progressive.mockImplementation((frame:HTMLElement,image:HTMLImageElement,_url:string,ready:()=>void)=>{
    const status=document.createElement('div'),retry=document.createElement('button');status.className='detail-art-status';status.setAttribute('role','status');status.textContent='高清细节加载中…';retry.className='detail-art-retry';retry.hidden=true;frame.append(status,retry);
    const stop=vi.fn();upgrades.push({image,ready,stop});return stop;
  });
  art.mountF09.mockImplementation((_frame:HTMLElement,image:HTMLImageElement,inactive:boolean)=>{
    const window=document.createElement('div');window.className='f09-art-window';window.dataset.inactive=String(inactive);image.replaceWith(window);window.append(image);
    const layer=document.createElement('img');layer.className='f09-layer';layer.src=image.src;window.append(layer);
  });
});
afterEach(()=>{vi.unstubAllGlobals();});

describe('detail art recovery and stable rarity',()=>{
  it.each(['f09','f04','a03','pengci','huimaqiang'])('keeps %s ability and edition above art with one flavor and collapsed rules',id=>{
    const owner=new DetailDialog(),ability=cardAbilityCopy(id,{gold:3,inStage:false})!;
    const operations='出售可得 2 金。调序不花金币。',editionBody='版次：闪箔（热度+25） · 独立于本体条件';
    const dialog=owner.open(id,operations,[],{portrait,rarity:'common',ability,editionBody,summaryBody:'实付 4 金 · 余额 7 → 3 金'});
    const layout=find(dialog,'.dialog-content'),intro=find(layout,'.dialog-intro'),main=find(intro,'.card-ability'),edition=find(intro,'.dialog-edition-summary'),frame=find(dialog,'.dialog-card-art'),rules=find(dialog,'.card-rules');
    expect(find(main,'span').textContent).toBe(ability.condition);expect(find(main,'strong').textContent).toBe(ability.value);expect(find(main,'small').textContent).toBe(ability.state);
    expect(edition.textContent).toBe(editionBody);expect(main.contains(edition)).toBe(false);expect(layout.children.indexOf(intro)).toBeLessThan(layout.children.indexOf(frame));
    expect(node(dialog).querySelectorAll('.card-flavor')).toHaveLength(1);expect(node(dialog).textContent.split(ability.flavor)).toHaveLength(2);
    expect(rules.getAttribute('open')).toBeNull();expect(find(rules,'p').textContent).toBe(ability.rules+'\n\n'+operations);
    expect(find(frame,'.joker-rarity-badge').dataset.rarity).toBe('common');expect(node(dialog).querySelectorAll('.dialog-card-art')).toHaveLength(1);
  });

  it('keeps inactive ability separate from edition and supports a specifically named folded ledger',()=>{
    const owner=new DetailDialog(),ability={...cardAbilityCopy('f09',{gold:3,inStage:true,disabledReason:'本场封禁'})!,flavor:' ',state:undefined};
    const dialog=owner.open('本手来源','实际来源一\n实际来源二',[],{portrait,rarity:'rare',ability,editionBody:'版次：闪箔 · 本场计分封禁',f09:{inactive:true,reduced:true},rulesLabel:'完整计分明细'});
    const main=find(dialog,'.card-ability'),edition=find(dialog,'.dialog-edition-summary'),rules=find(dialog,'.card-rules');
    expect(main.dataset.inactive).toBe('true');expect(main.contains(edition)).toBe(false);expect(main.querySelectorAll('small')).toHaveLength(0);expect(node(dialog).querySelectorAll('.card-flavor')).toHaveLength(0);
    expect(find(rules,'summary').textContent).toBe('完整计分明细');expect(rules.getAttribute('open')).toBeNull();expect(find(dialog,'.joker-rarity-badge').dataset.rarity).toBe('rare');
  });

  it('keeps a failed role portrait in a fixed window and aborts an explicit retry on close',async()=>{
    const owner=new DetailDialog(),dialog=owner.open('角色','完整能力',[],{portrait:{url:'/role-hd.webp',thumbnailUrl:'/role-small.webp',alt:'角色立绘'}});
    const frame=find(dialog,'.dialog-portrait-art'),image=find(frame,'.dialog-portrait'),scroll=find(dialog,'.dialog-scroll');
    image.dispatchEvent(new Event('error'));expect(image.parentElement).toBe(frame);expect(image.width).toBe(615);expect(image.height).toBe(768);
    const retry=find(dialog,'.detail-art-retry');expect(retry.parentElement).toBe(scroll);expect(retry.hidden).toBe(false);expect(find(dialog,'.detail-art-status').hidden).toBe(false);
    let finish!:()=>void;art.decode.mockReturnValueOnce(new Promise<void>(resolve=>finish=resolve));retry.click();await flush();
    const signal=art.decode.mock.calls.at(-1)![1] as AbortSignal;owner.close(dialog);expect(signal.aborted).toBe(true);expect(upgrades[0].stop).toHaveBeenCalledOnce();
    const current=owner.open('新详情','完整规则');finish();await flush();expect(owner.active(current)).toBe(true);expect(image.src).toBe('/role-small.webp');expect(image.onerror).toBeNull();
  });

  it('cleans ghost ownership once on close/reopen and an old close cannot clean a new dialog',()=>{const owner=new DetailDialog(),oldCleanup=vi.fn(),currentCleanup=vi.fn(),old=owner.open('旧候选','仅示例',[],{onClose:oldCleanup}),current=owner.open('新候选','当前',[],{onClose:currentCleanup});expect(oldCleanup).toHaveBeenCalledTimes(1);owner.close(old);expect(currentCleanup).not.toHaveBeenCalled();owner.close(current);owner.close();expect(currentCleanup).toHaveBeenCalledTimes(1);});

  it('tracks automatic Phaser retry and recovery without reopening the modal or marking recovered art failed',()=>{
    let currentStatus:'failed'|'loading'|'loaded'='failed';const readStatus=vi.fn(()=>currentStatus),owner=new DetailDialog();
    const dialog=owner.open('不换词','规则',[],{portrait,artLoad:{status:currentStatus,readStatus}}),frame=find(dialog,'.dialog-card-art'),image=find(frame,'.dialog-card-image');
    const status=find(dialog,'.dialog-art-load-status'),retry=find(dialog,'.dialog-art-load-retry');expect(retry.hidden).toBe(false);
    image.src='blob:hd';upgrades[0].ready();expect(status.hidden).toBe(false);
    currentStatus='loading';owner.refreshArtLoad();expect(status.textContent).toContain('加载中');expect(retry.hidden).toBe(true);
    currentStatus='loaded';owner.refreshArtLoad();expect(status.hidden).toBe(true);expect(retry.hidden).toBe(true);expect(image.src).toBe('blob:hd');expect(frame.classList.contains('art-unavailable')).toBe(false);expect(owner.active(dialog)).toBe(true);
    owner.close();const reads=readStatus.mock.calls.length;owner.refreshArtLoad();expect(readStatus).toHaveBeenCalledTimes(reads);
  });

  it('exposes Phaser terminal failure after opening while loading even if the HTML thumbnail loaded',()=>{
    let currentStatus:'loading'|'failed'='loading';const owner=new DetailDialog();
    const dialog=owner.open('不换词','规则',[],{portrait,artLoad:{status:currentStatus,readStatus:()=>currentStatus}}),frame=find(dialog,'.dialog-card-art'),image=find(frame,'.dialog-card-image');
    image.dispatchEvent(new Event('load'));expect(find(dialog,'.dialog-art-load-retry').hidden).toBe(true);
    currentStatus='failed';owner.refreshArtLoad();expect(find(dialog,'.dialog-art-load-retry').hidden).toBe(false);expect(find(dialog,'.dialog-art-load-status').hidden).toBe(false);expect(find(dialog,'.dialog-art-load-status').textContent).toContain('牌桌卡面暂未加载');expect(image.src).toBe(portrait.thumbnailUrl);expect(frame.classList.contains('art-unavailable')).toBe(false);
  });

  it('keeps the rare badge outside inactive F09 art, and caption and loading controls outside the visual',()=>{
    const owner=new DetailDialog(),dialog=owner.open('不换词','规则',[],{rarity:'rare',portrait,f09:{inactive:true,reduced:true}});
    const frame=find(dialog,'.dialog-card-art'),visual=find(frame,'.dialog-art-visual'),window=find(visual,'.f09-art-window'),badge=find(visual,'.joker-rarity-badge');
    expect(visual.parentElement).toBe(frame);expect(badge.parentElement).toBe(visual);expect(window.contains(badge)).toBe(false);expect(badge.dataset.rarity).toBe('rare');
    expect(window.dataset.inactive).toBe('true');expect(find(dialog,'figcaption').textContent).toBe(portrait.caption);
    for(const selector of ['figcaption','.detail-art-status','.detail-art-retry'])expect(find(dialog,selector).parentElement).toBe(find(dialog,'.dialog-scroll'));
    expect(find(dialog,'.detail-art-status').getAttribute('role')).toBe('status');expect(find(frame,'.dialog-card-image').src).toBe(portrait.thumbnailUrl);
  });

  it('retains a working thumbnail when a mechanism snapshot arrives, then reuses the same figure after an image error',async()=>{
    const owner=new DetailDialog(),dialog=owner.open('不换词','规则',[],{rarity:'uncommon',portrait});
    const frame=find(dialog,'.dialog-card-art'),image=find(frame,'.dialog-card-image');
    owner.attachCardArt(dialog,'data:image/png;base64,fallback','机制示意','mechanism');await flush();
    expect(image.src).toBe(portrait.thumbnailUrl);expect(node(dialog).querySelectorAll('.dialog-card-art')).toHaveLength(1);
    image.dispatchEvent(new Event('error'));await flush();
    expect(image.src).toBe('data:image/png;base64,fallback');expect(image.alt).toBe('机制示意');expect(frame.dataset.artFallback).toBe('mechanism');expect(find(dialog,'.dialog-card-art')).toBe(frame);expect(node(dialog).querySelectorAll('.dialog-card-art')).toHaveLength(1);expect(find(frame,'.joker-rarity-badge').dataset.rarity).toBe('uncommon');
  });

  it('accepts a snapshot after thumbnail failure and clears fallback state when HD recovers all F09 layers',async()=>{
    const owner=new DetailDialog(),dialog=owner.open('不换词','规则',[],{rarity:'rare',portrait,f09:{inactive:false,reduced:true}});
    const frame=find(dialog,'.dialog-card-art'),image=find(frame,'.dialog-card-image');
    image.dispatchEvent(new Event('error'));expect(frame.classList.contains('art-unavailable')).toBe(true);
    owner.attachCardArt(dialog,'data:image/png;base64,fallback','机制示意','mechanism');await flush();expect(image.src).toBe('data:image/png;base64,fallback');
    image.src='blob:recovered';upgrades[0].ready();
    expect(image.alt).toBe(portrait.alt);expect(frame.classList.contains('art-unavailable')).toBe(false);expect(frame.dataset.artFallback).toBeUndefined();expect(node(dialog).querySelectorAll('.dialog-card-art')).toHaveLength(1);
    for(const layer of frame.querySelectorAll('.f09-layer'))expect(layer.src).toBe('blob:recovered');
    expect(find(frame,'.joker-rarity-badge').dataset.rarity).toBe('rare');
  });

  it('uses explicit rarity for a mechanism snapshot and adds no rarity to a poker detail',async()=>{
    const owner=new DetailDialog(),mechanism=owner.open('机制牌','规则',[],{rarity:'common'});
    owner.attachCardArt(mechanism,'data:image/png;base64,mechanism','机制示意','mechanism');await flush();
    const visual=find(mechanism,'.dialog-art-visual');expect(find(visual,'.joker-rarity-badge').dataset.rarity).toBe('common');
    const caption=find(mechanism,'figcaption');expect(caption.textContent).toBe('机制示意');expect(caption.parentElement).toBe(find(mechanism,'.dialog-scroll'));expect(visual.contains(caption)).toBe(false);
    const poker=owner.open('红桃十','规则');owner.attachCardArt(poker,'data:image/png;base64,poker','红桃十');await flush();
    expect(node(poker).querySelectorAll('.dialog-card-art')).toHaveLength(1);expect(node(poker).querySelectorAll('.joker-rarity-badge')).toHaveLength(0);
  });

  it('cleans up image work on close and ignores late decoding, snapshots and an old close after reopening',async()=>{
    const owner=new DetailDialog(),closed=owner.open('旧卡','规则',[],{portrait,artLoad:{status:'failed',retry:vi.fn(async()=>true)}});const closedFrame=find(closed,'.dialog-card-art'),image=find(closedFrame,'.dialog-card-image');
    image.dispatchEvent(new Event('error'));owner.attachCardArt(closed,'data:image/png;base64,fallback','机制示意','mechanism');await flush();
    let finishDecode!:()=>void;art.decode.mockReturnValueOnce(new Promise<void>(resolve=>{finishDecode=resolve;}));find(closed,'.dialog-art-load-retry').click();
    const decodeSignal=art.decode.mock.calls.at(-1)?.[1] as AbortSignal;expect(decodeSignal.aborted).toBe(false);
    owner.close(closed);expect(upgrades[0].stop).toHaveBeenCalledTimes(1);expect(node(closed).isConnected).toBe(false);
    const current=owner.open('新卡','规则');owner.attachCardArt(closed,'data:image/png;base64,late','旧机制','mechanism');owner.close(closed);finishDecode();await flush();
    expect(decodeSignal.aborted).toBe(true);expect(image.src).toBe('data:image/png;base64,fallback');expect(owner.active(current)).toBe(true);expect(node(current).isConnected).toBe(true);expect(node(current).querySelectorAll('.dialog-card-art')).toHaveLength(0);expect(node(closed).querySelectorAll('.dialog-card-art')).toEqual([closedFrame]);
    owner.close(current);expect(upgrades[0].stop).toHaveBeenCalledTimes(1);
  });

  it('keeps a mechanism fallback during explicit retry, then replaces it only after the thumbnail decodes',async()=>{
    const retry=vi.fn(async()=>true),owner=new DetailDialog(),dialog=owner.open('机制牌','规则',[],{rarity:'uncommon',portrait,artLoad:{status:'failed',retry}});
    find(dialog,'.dialog-card-image').dispatchEvent(new Event('error'));
    owner.attachCardArt(dialog,'data:image/png;base64,fallback','机制示意','mechanism');await flush();
    const frame=find(dialog,'.dialog-card-art'),image=find(frame,'.dialog-card-image');
    const button=find(dialog,'.dialog-art-load-retry'),status=find(dialog,'.dialog-art-load-status');expect(button.hidden).toBe(false);expect(button.parentElement).toBe(find(dialog,'.dialog-scroll'));expect(status.parentElement).toBe(find(dialog,'.dialog-scroll'));expect(status.getAttribute('role')).toBe('status');expect(status.textContent).not.toBe('');
    let finishDecode!:()=>void;art.decode.mockReturnValueOnce(new Promise<void>(resolve=>{finishDecode=resolve;}));button.click();await flush();
    expect(retry).toHaveBeenCalledTimes(1);expect(image.src).toBe('data:image/png;base64,fallback');expect(node(dialog).querySelectorAll('.dialog-card-art')).toEqual([frame]);expect(find(frame,'.joker-rarity-badge').dataset.rarity).toBe('uncommon');
    expect(art.decode).toHaveBeenCalledWith(portrait.thumbnailUrl,expect.any(AbortSignal));finishDecode();await flush();
    expect(image.src).toBe(portrait.thumbnailUrl);expect(image.alt).toBe(portrait.alt);expect(frame.classList.contains('art-unavailable')).toBe(false);expect(frame.dataset.artFallback).toBeUndefined();expect(button.hidden).toBe(true);expect(status.hidden).toBe(true);
  });

  it.each(['false','rejected'] as const)('keeps retry visible after a %s Phaser retry even when HTML decoding succeeds, then clears it after Phaser recovery',async result=>{
    const retry=vi.fn(async()=>true);
    if(result==='false')retry.mockResolvedValueOnce(false);else retry.mockRejectedValueOnce(new Error('thumbnail-load-failed'));
    const owner=new DetailDialog(),dialog=owner.open('不换词','规则',[],{rarity:'rare',portrait,artLoad:{status:'failed',retry}});
    const frame=find(dialog,'.dialog-card-art'),image=find(frame,'.dialog-card-image'),button=find(dialog,'.dialog-art-load-retry'),status=find(dialog,'.dialog-art-load-status');
    image.dispatchEvent(new Event('error'));owner.attachCardArt(dialog,'data:image/png;base64,fallback','机制示意','mechanism');
    await button.onclick!(new Event('click'));
    expect(retry).toHaveBeenCalledTimes(1);expect(art.decode).toHaveBeenCalledTimes(1);expect(image.src).toBe(portrait.thumbnailUrl);expect(image.alt).toBe(portrait.alt);
    expect(frame.dataset.artFallback).toBeUndefined();expect(frame.classList.contains('art-unavailable')).toBe(false);expect(button.hidden).toBe(false);expect(button.disabled).toBe(false);expect(status.hidden).toBe(false);expect(status.textContent).not.toBe('');expect(button.getAttribute('aria-busy')).toBeNull();
    await button.onclick!(new Event('click'));
    expect(retry).toHaveBeenCalledTimes(2);expect(art.decode).toHaveBeenCalledTimes(1);expect(image.src).toBe(portrait.thumbnailUrl);expect(button.hidden).toBe(true);expect(status.hidden).toBe(true);expect(node(dialog).querySelectorAll('.dialog-card-art')).toEqual([frame]);
  });

  it('keeps the mechanism fallback and retry available when Phaser succeeds but HTML decoding fails',async()=>{
    const retry=vi.fn(async()=>true),owner=new DetailDialog(),dialog=owner.open('不换词','规则',[],{rarity:'uncommon',portrait,artLoad:{status:'failed',retry}});
    const frame=find(dialog,'.dialog-card-art'),image=find(frame,'.dialog-card-image'),button=find(dialog,'.dialog-art-load-retry'),status=find(dialog,'.dialog-art-load-status');
    image.dispatchEvent(new Event('error'));owner.attachCardArt(dialog,'data:image/png;base64,fallback','机制示意','mechanism');art.decode.mockRejectedValueOnce(new Error('html-decode-failed'));
    await button.onclick!(new Event('click'));
    expect(retry).toHaveBeenCalledTimes(1);expect(image.src).toBe('data:image/png;base64,fallback');expect(image.alt).toBe('机制示意');expect(frame.dataset.artFallback).toBe('mechanism');expect(frame.classList.contains('art-unavailable')).toBe(true);
    expect(button.hidden).toBe(false);expect(button.disabled).toBe(false);expect(button.getAttribute('aria-busy')).toBeNull();expect(status.hidden).toBe(false);expect(status.textContent).not.toBe('');expect(node(dialog).querySelectorAll('.dialog-card-art')).toEqual([frame]);expect(find(frame,'.joker-rarity-badge').dataset.rarity).toBe('uncommon');
  });
});
