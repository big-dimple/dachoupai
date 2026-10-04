import {execFileSync} from 'node:child_process';
import {makeBuildInfo,type BuildInfo,type GitOutput} from '../src/platform/buildMetadata';

type GitRunner=(args:readonly string[],cwd:string)=>string;
const runGit:GitRunner=(args,cwd)=>execFileSync('git',[...args],{cwd,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore']});

export function collectBuildInfo(cwd:string,builtAt:string,runner:GitRunner=runGit):BuildInfo {
  const read=(args:readonly string[]):GitOutput=>{
    try{return{ok:true,output:runner(args,cwd)};}catch{return{ok:false};}
  };
  return makeBuildInfo({version:'C03',builtAt},read(['rev-parse','--verify','HEAD']),read(['status','--porcelain=v1','-z','--untracked-files=no']));
}
