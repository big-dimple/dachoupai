export interface BuildIdentity {version:string;revision:string;builtAt:string}
export type BuildInfo=BuildIdentity&(
  |{sourceStatus:'clean';modified:false}
  |{sourceStatus:'dirty';modified:true;modifiedFileCount:number;modifiedFiles:string[]}
  |{sourceStatus:'unknown';modified:null}
);
export type GitOutput={ok:true;output:string}|{ok:false};

/** Only repository-relative names suitable for plain-text diagnostics are public. */
export function safeRepositoryPath(path:string):boolean {
  return !!path&&path.length<=2048&&!/^[A-Za-z]:|^\//.test(path)&&
    !/[\\\u0000-\u001f\u007f-\u009f\u061c\u200e\u200f\u2028-\u202e\u2066-\u2069]/.test(path)&&
    path.split('/').every(part=>!!part&&part!=='.'&&part!=='..'&&part!=='.git');
}

/** Porcelain -z preserves spaces and avoids Git's quoted/escaped path format. */
export function trackedChanges(output:string):{count:number;files:string[]}|null {
  if(output==='')return{count:0,files:[]};
  if(!output.endsWith('\0'))return null;
  const records=output.slice(0,-1).split('\0'),files=new Set<string>();let count=0;
  for(let index=0;index<records.length;index++){
    const entry=records[index],status=entry.slice(0,2),path=entry.slice(3);
    if(!/^[ MADRCUT]{2}$/.test(status)||status==='  '||entry[2]!==' '||!path)return null;
    if(/[RC]/.test(status)&&!records[++index])return null;
    count++;if(safeRepositoryPath(path))files.add(path);
  }
  return{count,files:[...files].sort()};
}

/** A failed command is never interpreted as either a clean or dirty checkout. */
export function makeBuildInfo(identity:{version:string;builtAt:string},revision:GitOutput,status:GitOutput):BuildInfo {
  const hash=revision.ok?revision.output.trim():'';
  const base={...identity,revision:/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(hash)?hash:'unknown'};
  const changes=status.ok?trackedChanges(status.output):null;
  if(base.revision==='unknown'||changes===null)return{...base,sourceStatus:'unknown',modified:null};
  return changes.count?{...base,sourceStatus:'dirty',modified:true,modifiedFileCount:changes.count,modifiedFiles:changes.files}:
    {...base,sourceStatus:'clean',modified:false};
}

/** Legacy boolean-only metadata cannot explain the old "local changes" label. */
export function formatBuildInfo(info:BuildInfo|(BuildIdentity&{modified:boolean})):string {
  const revision=/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(info.revision)?info.revision.slice(0,12):'源码版本无法核对';
  const lines=[`版本 ${info.version} · ${revision}`,`构建时间 ${info.builtAt}`];
  if('sourceStatus' in info&&info.sourceStatus==='clean'&&info.modified===false){
    lines.push('构建时：已核对，没有未提交修改。');
  }else if('sourceStatus' in info&&info.sourceStatus==='dirty'&&info.modified===true&&Number.isSafeInteger(info.modifiedFileCount)&&info.modifiedFileCount>0){
    const files=[...new Set(info.modifiedFiles.filter(safeRepositoryPath))];
    lines.push(`构建时：有尚未提交的文件修改（${info.modifiedFileCount} 个文件）。`);
    if(files.length)lines.push('修改文件（项目内路径）：',...files.map(path=>`• ${path}`));
    if(files.length<info.modifiedFileCount)lines.push(`${info.modifiedFileCount-files.length} 个文件名无法安全展示。`);
  }else lines.push('构建时：无法核对文件是否有修改。');
  return lines.join('\n');
}
