const http=require('http'),fs=require('fs'),p=require('path');
const root=p.join(__dirname,'.web');
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json','.ico':'image/x-icon','.png':'image/png','.ttf':'font/ttf','.css':'text/css'};
http.createServer((req,res)=>{
  let f=p.join(root,decodeURIComponent(req.url.split('?')[0]));
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()) f=p.join(root,'index.html');
  res.writeHead(200,{'Content-Type':mime[p.extname(f)]||'application/octet-stream'});
  fs.createReadStream(f).pipe(res);
}).listen(8940,()=>console.log('serving .web on 8940'));
