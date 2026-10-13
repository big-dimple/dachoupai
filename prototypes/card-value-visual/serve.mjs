import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
export async function serve(port=5189){const server=http.createServer(async(req,res)=>{
try{const url=new URL(req.url,'http://localhost');const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');const file=path.resolve(root,relative||'prototypes/card-value-visual/index.html');
if(!file.startsWith(root)||(!file.startsWith(path.join(root,'prototypes/card-value-visual'))&&!file.startsWith(path.join(root,'public/assets/handdrawn-p08/cards/')))){res.writeHead(403);res.end();return;}
const data=await readFile(file);const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.json':'application/json'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(data);
}catch{res.writeHead(404);res.end('Not found');}});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});return server;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){await serve();console.log('http://127.0.0.1:5189/prototypes/card-value-visual/index.html');}
