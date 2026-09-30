import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {createServer} from 'vite';

const output=resolve(process.argv[2]??'shots/rules');
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
try {
  const {scoreR2Hand,previewR2Hand}=await server.ssrLoadModule('/src/domain/scoreR2.ts');
  const {Rational}=await server.ssrLoadModule('/src/domain/rational.ts');
  const {R2_JOKERS}=await server.ssrLoadModule('/src/content/r2Schema.ts');
  const {SeededRng}=await server.ssrLoadModule('/src/core/SeededRng.ts');
  const {createRun,applyCommand,stateHash}=await server.ssrLoadModule('/src/domain/run.ts');
  const c=(id,rank,suit='spades')=>({id,rank,suit});
  const j=(id,definitionId)=>({instanceId:id,definitionId,paidPrice:0,growth:{}});
  const input=(hand,extra={})=>({rulesVersion:'r2',runId:'golden',rootId:'golden/hand/1',characterId:'neutral',hand,selectedIds:hand.map(c=>c.id),disabledIds:[],jokers:[],definitions:R2_JOKERS,handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:new SeededRng('rules').snapshot(),...extra});
  const pair=[c('8s',8),c('8h',8,'hearts'),c('kd',13,'diamonds'),c('2c',2,'clubs')];
  const effects=[['plus','add-multiplier','3'],['times','multiply-multiplier','2']].map(([id,kind,n])=>({id,name:id,rarity:'common',description:'golden fixture',hooks:[{phase:'jokerScore',condition:{kind:'always'},operations:[{kind,value:{n,d:'1'}}]}]}));
  const definitions=[
    ['G01',input([c('single',2)]),'22','20','1',['base','add-heat','final-score']],
    ['G02',input([c('single',10)]),'30','20','1',['base','add-heat','final-score']],
    ['G03',input(pair),'102','35','2',['base','add-heat','add-heat','final-score']],
    ['G04',input(pair,{jokers:[j('abacus','tiesuanpan')]}),'102','35','2',['base','add-heat','add-heat','final-score']],
    ['G05',input(pair,{definitions:effects,jokers:[j('plus-i','plus'),j('times-i','times')]}),'510','35','2',['base','add-heat','add-heat','add-multiplier','multiply-multiplier','final-score']],
    ['G06',input([c('a',14),c('2',2,'hearts'),c('3',3),c('4',4),c('5',5)]),'600','125','4',['base',...Array(5).fill('add-heat'),'final-score']],
    ['G07',input([c('k',13)],{characterId:'amo'}),'90','20','1',['base','add-heat','multiply-multiplier','final-score']],
    ['G08',input([c('k',13)],{characterId:'amo',jokers:[j('pengci-i','pengci')]}),'150','20','1',['base','add-heat','multiply-multiplier','add-multiplier','final-score']],
    ['G09',input(pair,{disabledIds:['8s']}),'86','35','2',['base','add-heat','final-score']],
  ];
  // Independent integer fraction identities verify recorded arithmetic, not game rules.
  const normalize=(n,d)=>{let a=n<0n?-n:n,b=d;while(b)[a,b]=[b,a%b];return {n:String(n/a),d:String(d/a)};};
  const add=(a,b)=>normalize(BigInt(a.n)*BigInt(b.d)+BigInt(b.n)*BigInt(a.d),BigInt(a.d)*BigInt(b.d));
  const multiply=(a,b)=>normalize(BigInt(a.n)*BigInt(b.n),BigInt(a.d)*BigInt(b.d));
  const goldens=[];
  const verifyTrace=(trace,expected,H,M,operations,id)=>{
    assert.equal(trace.finalScore,expected,id);
    assert.deepEqual(trace.events.map(e=>e.operation),operations,id);
    let accumulator={H:{n:'0',d:'1'},M:{n:'0',d:'1'}};
    for(const event of trace.events) {
      assert.deepEqual(event.before,accumulator,`${id}/${event.eventId}/before`);
      if(event.operation==='base')accumulator={H:{n:H,d:'1'},M:{n:M,d:'1'}};
      else if(event.operation==='add-heat')accumulator={...accumulator,H:add(accumulator.H,event.value)};
      else if(event.operation==='add-multiplier')accumulator={...accumulator,M:add(accumulator.M,event.value)};
      else if(event.operation==='multiply-multiplier')accumulator={...accumulator,M:multiply(accumulator.M,event.value)};
      else if(event.operation==='final-score') {
        const product=multiply(accumulator.H,accumulator.M);
        assert.equal(String(BigInt(product.n)/BigInt(product.d)),expected,id);
        assert.deepEqual(event.value,{n:expected,d:'1'});
      }
      assert.deepEqual(event.after,accumulator,`${id}/${event.eventId}/after`);
    }
  };
  for(const [id,fixture,expected,H,M,operations] of definitions) {
    const trace=scoreR2Hand(fixture);
    verifyTrace(trace,expected,H,M,operations,id);
    goldens.push({id,status:'PASS',expected,input:fixture,trace});
  }
  const reverse=scoreR2Hand({...definitions[4][1],jokers:[...definitions[4][1].jokers].reverse()});
  assert.equal(reverse.finalScore,'357');goldens[4].reversedTrace=reverse;
  const send=(state,action,commandId)=>{
    const command={runId:state.runId,commandId,expectedSeq:state.commandSeq,action};
    const result=applyCommand(state,command);assert.equal(result.ok,true);return {command,result};
  };
  const table=characterId=>send(send(createRun({seed:'r2-golden',characterId,runId:`golden-${characterId}`,rulesVersion:'r2'}),{type:'LeaveShop'},'leave').result.state,{type:'EnterStage'},'enter').result.state;
  const fourth=table('xiemu');fourth.stage.handsLeft=1;
  const card=fourth.deckInstances.find(c=>c.id===fourth.handOrder[0]);
  fourth.stage.targetHeat=String(2*(20+(card.rank===14?11:Math.min(card.rank,10))));
  const last=send(fourth,{type:'PlayHand',selectedIds:[card.id]},'fourth');
  assert.equal(last.result.state.phase,'stage-cleared');assert.equal(last.result.state.stage.handsLeft,0);
  assert.equal(last.result.state.gold,13);assert.equal(last.result.state.stage.goldEarned,7);
  verifyTrace(last.result.state.lastTrace,fourth.stage.targetHeat,'20','1',['base','add-heat','multiply-multiplier','final-score'],'G10');
  goldens.push({id:'G10',status:'PASS',inputState:fourth,command:last.command,result:last.result,stateHash:stateHash(last.result.state)});
  const selected=send(table('touye'),{type:'SetWager',enabled:true},'wager').result.state;
  const before=JSON.stringify(selected);
  const play=send(selected,{type:'PlayHand',selectedIds:[selected.handOrder[0]]},'play');
  const replay=applyCommand(JSON.parse(before),play.command);
  assert.deepEqual(replay,play.result);assert.equal(stateHash(replay.state),stateHash(play.result.state));
  const wagerCard=selected.deckInstances.find(c=>c.id===selected.handOrder[0]);
  const points=wagerCard.rank===14?11:Math.min(wagerCard.rank,10);
  const wagerRng=SeededRng.restore(selected.rng.rule),win=wagerRng.next()<0.5;
  const wagerExpected=String(win ? (20+points)*2 : Math.floor((20+points)*3/4));
  verifyTrace(play.result.state.lastTrace,wagerExpected,'20','1',['base','add-heat','multiply-multiplier','final-score'],'G11');
  assert.deepEqual(play.result.state.rng.rule,wagerRng.snapshot());
  goldens.push({id:'G11',status:'PASS',inputState:selected,command:play.command,result:play.result,stateHash:stateHash(play.result.state)});
  const previewInput=input(selected.handOrder.map(id=>selected.deckInstances.find(c=>c.id===id)),{selectedIds:[selected.handOrder[0]],characterId:'touye',wager:true});
  delete previewInput.rng;
  let preview;
  for(let i=0;i<100;i++)preview=previewR2Hand(previewInput);
  assert.equal(JSON.stringify(selected),before);assert.equal(preview.possibleScores.length,2);
  assert.deepEqual(applyCommand(selected,play.command),play.result);
  goldens.push({id:'G12',status:'PASS',previewCount:100,preview,unchangedStateHash:stateHash(selected),resultStateHash:stateHash(play.result.state)});
  const duplicate=applyCommand(play.result.state,play.command);
  assert.equal(duplicate.ok,true);assert.equal(duplicate.duplicate,true);assert.deepEqual(duplicate.events,[]);assert.equal(duplicate.state,play.result.state);
  goldens.push({id:'G13',status:'PASS',command:play.command,receipt:duplicate.receipt,duplicate:true,unchangedStateHash:stateHash(duplicate.state)});
  const invalid=applyCommand(selected,{...play.command,action:{type:'PlayHand',selectedIds:[selected.handOrder[0],selected.handOrder[0]]}});
  assert.equal(invalid.ok,false);assert.equal(invalid.state,selected);assert.equal(JSON.stringify(selected),before);
  goldens.push({id:'G14',status:'PASS',code:invalid.code,unchangedStateHash:stateHash(selected),rng:selected.rng});
  const exact=new Rational(21n).multiply(new Rational(3n,2n));
  assert.equal(exact.floor(),31n);
  goldens.push({id:'G15',status:'PASS',input:{H:'21',M:{n:'3',d:'2'}},exactProduct:exact.toJSON(),finalScore:exact.floor().toString()});
  await mkdir(output,{recursive:true});
  const artifact={schemaVersion:1,generatedAt:new Date().toISOString(),sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),kind:'domain fixtures; not phone or human acceptance',goldens};
  await writeFile(resolve(output,'G01-G15.json'),JSON.stringify(artifact,null,2)+'\n');
  console.log(`PASS: G01–G15; scoring traces, every before/after and operations independently checked. ${output}`);
} finally {await server.close();}
