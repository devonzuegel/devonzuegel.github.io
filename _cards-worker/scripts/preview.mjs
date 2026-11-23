import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const root = new URL('../../remember/', import.meta.url);
const port = Number(process.env.PORT || 8017);
const mime = {html:'text/html',css:'text/css',js:'text/javascript',svg:'image/svg+xml',png:'image/png',webmanifest:'application/manifest+json'};
const server = createServer(async (req,res) => {
  const pathname = new URL(req.url,'http://local').pathname;
  if (pathname === '/remember') { res.writeHead(302,{Location:'/remember/'}); return res.end(); }
  const name = pathname === '/remember/' ? 'index.html' : pathname.replace(/^\/remember\//,'');
  if (!pathname.startsWith('/remember/') || !/^[a-z0-9.-]+$/.test(name)) { res.writeHead(404); return res.end(); }
  try {
    const content = await readFile(new URL(name,root));
    res.writeHead(200,{'Content-Type':mime[name.split('.').at(-1)] || 'application/octet-stream','Cache-Control':'no-store'}); res.end(content);
  } catch { res.writeHead(404); res.end(); }
});
server.listen(port,'127.0.0.1',()=>console.log(`Cards preview: http://127.0.0.1:${port}/remember/`));
