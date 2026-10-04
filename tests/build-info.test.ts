import {describe,it,expect,afterEach} from 'vitest';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {collectBuildInfo} from '../scripts/build-info';
import {makeBuildInfo,formatBuildInfo,trackedChanges,type BuildInfo} from '../src/platform/buildMetadata';

const revision='1'.repeat(40),builtAt='2026-10-04T00:00:00.000Z',identity={version:'C03',builtAt};
const ok=(output:string)=>({ok:true as const,output});
const directories:string[]=[];
afterEach(()=>{for(const directory of directories.splice(0))rmSync(directory,{recursive:true,force:true});});
function fixture():string {
  const directory=mkdtempSync(join(tmpdir(),'dachoupai-build-info-'));directories.push(directory);return directory;
}
function git(cwd:string,...args:string[]):string {return execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','ignore']});}
function repo():string {
  const directory=fixture();git(directory,'init','--quiet');
  writeFileSync(join(directory,'normal.txt'),'initial\n');writeFileSync(join(directory,'with space.txt'),'initial\n');
  git(directory,'add','--all');git(directory,'-c','user.name=Build fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','initial');return directory;
}
function consistent(info:BuildInfo):void {
  const decoded=JSON.parse(JSON.stringify(info));expect(formatBuildInfo(decoded)).toBe(formatBuildInfo(info));
  expect(decoded.revision).toBe(info.revision);expect(decoded.builtAt).toBe(builtAt);
}

describe('build identity with explicit source verification',()=>{
  it('represents a successful empty tracked status as clean',()=>{
    const info=makeBuildInfo(identity,ok(revision+'\n'),ok(''));
    expect(info).toEqual({...identity,revision,sourceStatus:'clean',modified:false});
    expect(formatBuildInfo(info)).toContain('已核对，没有未提交修改');consistent(info);
  });
  it.each(['revision','status'] as const)('represents %s command failure as unknown and omits paths/counts',failed=>{
    const info=makeBuildInfo(identity,failed==='revision'?{ok:false}:ok(revision),failed==='status'?{ok:false}:ok(' M normal.txt\0'));
    expect(info.sourceStatus).toBe('unknown');expect(info.modified).toBeNull();
    expect(info).not.toHaveProperty('modifiedFiles');expect(info).not.toHaveProperty('modifiedFileCount');
    expect(formatBuildInfo(info)).toContain('无法核对');expect(formatBuildInfo(info)).not.toContain('normal.txt');consistent(info);
  });
  it('rejects malformed command output instead of declaring clean or dirty',()=>{
    for(const [hash,status] of [['unknown',''],[revision,' M unterminated.txt'],[revision,'?? untracked.txt\0'],[revision,'R  new.txt\0']]){
      const info=makeBuildInfo(identity,ok(hash),ok(status));expect(info.sourceStatus).toBe('unknown');expect(info.modified).toBeNull();
    }
  });
  it('preserves spaces and counts a rename as one tracked file',()=>{
    expect(trackedChanges('R  renamed with space.txt\0old with space.txt\0 M normal.txt\0')).toEqual({count:2,files:['normal.txt','renamed with space.txt']});
  });
  it('never exposes unsafe paths or raw command errors',()=>{
    const info=makeBuildInfo(identity,ok(revision),ok(' M /private/source.txt\0 M ../parent.txt\0 M C:\\secret.txt\0 M line\nname.txt\0 M src/with space.ts\0'));
    expect(info).toMatchObject({sourceStatus:'dirty',modified:true,modifiedFileCount:5,modifiedFiles:['src/with space.ts']});
    const text=formatBuildInfo(info);expect(text).toContain('5 个文件');expect(text).toContain('src/with space.ts');expect(text).toContain('4 个文件名无法安全展示');
    expect(text).not.toMatch(/private|parent|secret|line\nname/);
    const failed=collectBuildInfo('unpublished-directory',builtAt,()=>{throw Error('credential=private-token, absolute-directory');});
    expect(JSON.stringify(failed)).not.toMatch(/credential|token|directory/);expect(failed.modified).toBeNull();
  });
  it('does not retroactively infer a legacy local-changes label from its boolean',()=>{
    for(const modified of [true,false]){
      const text=formatBuildInfo({...identity,revision,modified});expect(text).toContain('无法核对');expect(text).not.toContain('尚未提交');
    }
  });
  it('reads a real temporary clean Git repo and ignores untracked files',()=>{
    const directory=repo();writeFileSync(join(directory,'not-tracked.txt'),'untracked\n');const info=collectBuildInfo(directory,builtAt);
    expect(info.sourceStatus).toBe('clean');expect(info.modified).toBe(false);expect(info.revision).toBe(git(directory,'rev-parse','HEAD').trim());consistent(info);
  });
  it('reports only tracked changes including a file with spaces, once each',()=>{
    const directory=repo();writeFileSync(join(directory,'normal.txt'),'staged\n');git(directory,'add','normal.txt');writeFileSync(join(directory,'normal.txt'),'staged and unstaged\n');writeFileSync(join(directory,'with space.txt'),'changed\n');writeFileSync(join(directory,'untracked.txt'),'ignored\n');
    const info=collectBuildInfo(directory,builtAt);expect(info).toMatchObject({sourceStatus:'dirty',modified:true,modifiedFileCount:2,modifiedFiles:['normal.txt','with space.txt']});
    expect(formatBuildInfo(info)).toContain('2 个文件');expect(formatBuildInfo(info)).toContain('with space.txt');expect(formatBuildInfo(info)).not.toContain('untracked.txt');consistent(info);
  });
  it('reads a real staged rename with spaces without exposing an escaped Git record',()=>{
    const directory=repo();git(directory,'mv','with space.txt','renamed with space.txt');
    const info=collectBuildInfo(directory,builtAt);expect(info).toMatchObject({sourceStatus:'dirty',modified:true,modifiedFileCount:1,modifiedFiles:['renamed with space.txt']});consistent(info);
  });
  it('reports a non-repository directory as unknown without false modification',()=>{
    const directory=fixture();mkdirSync(join(directory,'nested'));const info=collectBuildInfo(directory,builtAt);
    expect(info).toEqual({...identity,revision:'unknown',sourceStatus:'unknown',modified:null});expect(formatBuildInfo(info)).toContain('无法核对');consistent(info);
  });
});
