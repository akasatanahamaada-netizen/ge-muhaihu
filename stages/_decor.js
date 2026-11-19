/* ============================================================================
   飾りオブジェクト（当たり判定なし）  _decor.js
   ----------------------------------------------------------------------------
   ★ 飾りの「種類」はこのファイル 1つで決まります。
     ここに 1つ足すだけで、ゲームにもエディタ(editor.html)にも自動で出ます。
     （index.html / editor.html / engine.js は、もう触らなくてOK）

   - layer:'back'  … 奥（地形より後ろ）に描く
   - layer:'front' … 手前（プレイヤーより前）に描く
   - w,h           … 置いたときの標準サイズ（あとで自由に変えられる）
   - draw(ctx,x,y,w,h) … 枠 (x,y,w,h) の中に描く関数。engine が無くても動く純粋関数。

   使い方（ステージ側の書き出しに、この配列が入ります）：
     GT.defineStage('id', {
       platforms:[...], boxes:[...], enemies:[...],
       decor:[
         {layer:'back',  kind:'tree',  x:120, y:180, w:90,  h:150},
         {layer:'front', kind:'grass', x:300, y:430, w:70,  h:34 },
       ],
     });
   ========================================================================== */
(function(){
"use strict";
const api = (window.GTDecor = window.GTDecor || {});

/* ===== 飾りの種類：ここに足す ============================================= */
const TYPES = {
  tree:  { label:'木',    layer:'back',  w:90,  h:150, draw:drawTree  },
  bush:  { label:'茂み',  layer:'back',  w:80,  h:46,  draw:drawBush  },
  cloud: { label:'雲',    layer:'back',  w:120, h:50,  draw:drawCloud },
  moon:  { label:'月',    layer:'back',  w:60,  h:60,  draw:drawMoon  },
  rock:  { label:'岩',    layer:'back',  w:70,  h:46,  draw:drawRock  },
  grass: { label:'草',    layer:'front', w:70,  h:34,  draw:drawGrass },
  fern:  { label:'前の葉',layer:'front', w:100, h:80,  draw:drawFern  },
  // ── フラット（輪郭線なしの、平らな色の絵本ふう。序章 00_opening.js が使う） ──
  treeFlat:  { label:'木(フラット)',    layer:'back',  w:100, h:240, draw:drawTreeFlat  },
  bushFlat:  { label:'茂み(フラット)',  layer:'back',  w:80,  h:50,  draw:drawBushFlat  },
  rockFlat:  { label:'岩(フラット)',    layer:'back',  w:60,  h:44,  draw:drawRockFlat  },
  grassFlat: { label:'草(フラット)',    layer:'front', w:60,  h:30,  draw:drawGrassFlat },
  fernFlat:  { label:'前の葉(フラット)',layer:'front', w:96,  h:80,  draw:drawFernFlat  },
  ledgeBack:  { label:'足場(奥)',  layer:'back',  w:120, h:20, draw:drawLedge },
  ledgeFront: { label:'足場(手前)',layer:'front', w:120, h:20, draw:drawLedge },
};
api.TYPES = TYPES;
api.draw  = function(ctx,kind,x,y,w,h){ const d=TYPES[kind]; if(d&&d.draw) d.draw(ctx,x,y,w,h); };

/* ===== 小道具 ============================================================= */
const INK='#3a2a1a';                                  // 古い挿絵の茶色いインク
function blob(ctx,cx,cy,r,c,ink){ ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle=c; ctx.fill();
  if(ink){ ctx.strokeStyle=INK; ctx.lineWidth=1.3; ctx.stroke(); } }
function ell(ctx,cx,cy,rx,ry,c,ink){ ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); ctx.fillStyle=c; ctx.fill();
  if(ink){ ctx.strokeStyle=INK; ctx.lineWidth=1.3; ctx.stroke(); } }

/* ===== 凝った木の絵（葉の茂み・幹）を描く道具 =================================
   GTDecor.paint.canopy(ctx, かたまり[], 種)  … 葉の茂み。かたまりは {x,y,rx,ry}（だ円）か {rect:true,x,y,w,h}（四角）
   GTDecor.paint.trunk(ctx, x, 上, 下, 幅, 種, {roots, branches, hollow, moss})  … 幹（根・木の皮・ふし・苔・枝）
   一度描いた絵は取っておく（毎フレーム描き直さない）。 */
const TP={ base:'#545e2e', mid:'#68722f', mid2:'#7d883a', light:'#9ca14c', hi:'#c9c470', deep:'#3a4220',
           bark0:'#3a2b1b', bark1:'#5e4630', bark2:'#8a6c48' };
function seq(seed){ let s=Math.abs(Math.floor(seed*9973))%233280+1; return ()=>{ s=(s*9301+49297)%233280; return s/233280; }; }
const paintCache={};
function pe(ctx,x,y,rx,ry,c,rot){ ctx.beginPath(); ctx.ellipse(x,y,Math.max(0.1,rx),Math.max(0.1,ry),rot||0,0,Math.PI*2); ctx.fillStyle=c; ctx.fill(); }
function cached(key,bx,by,bw,bh,fn){
  let c=paintCache[key];
  if(!c){ c=document.createElement('canvas'); c.width=Math.max(1,Math.ceil(bw)); c.height=Math.max(1,Math.ceil(bh));
    const p=c.getContext('2d'); p.translate(-bx,-by); fn(p); paintCache[key]=c; }
  return c;
}
function canopyClusters(blobs,seed){
  const rnd=seq(seed), cl=[];
  for(const b of blobs){
    if(b.rect){
      const r=Math.max(9,Math.min(24,Math.min(b.w,b.h)*0.42)), st=r*1.05;
      const pts=[];
      for(let x=b.x+r*0.55;x<=b.x+b.w-r*0.55+0.1;x+=st){ pts.push([x,b.y+r*0.55]); pts.push([x,b.y+b.h-r*0.55]); }
      for(let y=b.y+r*0.55;y<=b.y+b.h-r*0.55+0.1;y+=st){ pts.push([b.x+r*0.55,y]); pts.push([b.x+b.w-r*0.55,y]); }
      for(let x=b.x+r*1.5;x<b.x+b.w-r*1.2;x+=st*1.3) for(let y=b.y+r*1.5;y<b.y+b.h-r*1.2;y+=st*1.3) pts.push([x,y]);
      for(const [x,y] of pts) cl.push({x:x+(rnd()-0.5)*r*0.35, y:y+(rnd()-0.5)*r*0.35, r:r*(0.85+rnd()*0.3)});
    } else {
      // 小さなかたまり（茂みなど）でも、葉のかたまりが小さくなりすぎないように。外周はすき間なくならべる
      const rr=Math.max(8,Math.min(b.rx,b.ry)*0.37), per=Math.PI*(b.rx+b.ry);
      const n=Math.max(6,Math.round((b.rx+b.ry)/8),Math.round(per/(rr*1.35)));
      for(let i=0;i<n;i++){ const a=i/n*Math.PI*2+rnd()*0.35, r=Math.max(8,Math.min(b.rx,b.ry)*(0.30+rnd()*0.14));
        cl.push({x:b.x+Math.cos(a)*(b.rx-r*0.7), y:b.y+Math.sin(a)*(b.ry-r*0.7), r}); }
      // 中を埋める：長い向きにそって、かたまりを1列ならべる（細長い茂みに穴があかないように）
      { const lg=Math.max(b.rx,b.ry), sh=Math.min(b.rx,b.ry), k=Math.max(1,Math.round(lg/sh)), hor=b.rx>=b.ry;
        for(let j=0;j<k;j++){ const t=k===1?0:(j/(k-1)-0.5)*2*(lg-sh*0.8);
          cl.push({x:b.x+(hor?t:0), y:b.y+(hor?0:t), r:sh*0.88}); } }
      const m=Math.max(2,Math.round(b.rx*b.ry/700));
      for(let i=0;i<m;i++){ const a=rnd()*Math.PI*2, d=Math.sqrt(rnd())*0.6;
        cl.push({x:b.x+Math.cos(a)*b.rx*d, y:b.y+Math.sin(a)*b.ry*d, r:Math.max(9,Math.min(b.rx,b.ry)*(0.34+rnd()*0.16))}); }
    }
  }
  cl.sort((p,q)=>p.y-q.y);
  return cl;
}
function paintCanopyRaw(ctx,blobs,seed){
  const rnd=seq(seed+7), cl=canopyClusters(blobs,seed);
  const path=(dx,dy,k)=>{ ctx.beginPath(); for(const c of cl){ ctx.moveTo(c.x+dx+c.r*k,c.y+dy); ctx.arc(c.x+dx,c.y+dy,c.r*k,0,Math.PI*2); } };
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; for(const c of cl){ x0=Math.min(x0,c.x-c.r); y0=Math.min(y0,c.y-c.r); x1=Math.max(x1,c.x+c.r); y1=Math.max(y1,c.y+c.r); }
  ctx.save();
  path(5,8,1); ctx.fillStyle='rgba(30,26,12,0.22)'; ctx.fill();                        // 地面への影
  path(0,0,1); ctx.strokeStyle=INK; ctx.lineWidth=2.6; ctx.lineJoin='round'; ctx.stroke(); // 外側だけのインクの輪郭
  ctx.fillStyle=TP.base; ctx.fill();
  ctx.save(); path(0,0,1); ctx.clip();
  const g=ctx.createLinearGradient(0,y0,0,y1); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(20,24,8,0.35)');
  ctx.fillStyle=g; ctx.fillRect(x0,y0,x1-x0,y1-y0);
  // 茂みのすき間（奥の暗がりと、細い枝）
  for(let i=0;i<Math.max(2,cl.length/7);i++){ const c=cl[Math.floor(rnd()*cl.length)]; if(c.r<13) continue;   // 小さなかたまりには、すき間を描かない
    pe(ctx,c.x+c.r*0.5,c.y+c.r*0.55,c.r*0.45,c.r*0.3,TP.deep);
    ctx.strokeStyle='rgba(50,34,18,0.8)'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(c.x+c.r*0.2,c.y+c.r*0.75); ctx.lineTo(c.x+c.r*0.75,c.y+c.r*0.35); ctx.stroke(); }
  // ひとつひとつの葉のかたまり：影 → 中間 → 日の当たる面 → 光、下のふちにインクの弧
  for(const c of cl){
    pe(ctx,c.x-c.r*0.08,c.y-c.r*0.1,c.r*0.9,c.r*0.86, rnd()<0.5?TP.mid:TP.mid2);
    pe(ctx,c.x-c.r*0.28,c.y-c.r*0.32,c.r*0.55,c.r*0.48,TP.light);
    ctx.globalAlpha=0.7; pe(ctx,c.x-c.r*0.4,c.y-c.r*0.45,c.r*0.22,c.r*0.18,TP.hi); ctx.globalAlpha=1;
    ctx.strokeStyle='rgba(40,30,14,0.5)'; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.arc(c.x,c.y,c.r*0.93,Math.PI*0.12,Math.PI*0.88); ctx.stroke();
  }
  // 小さな葉の模様（上ほど明るい葉が多い）
  const nl=Math.min(420,Math.round((x1-x0)*(y1-y0)/55)), cols=[TP.base,TP.mid,TP.light,TP.hi,TP.deep];
  for(let i=0;i<nl;i++){ const x=x0+rnd()*(x1-x0), y=y0+rnd()*(y1-y0), up=1-(y-y0)/(y1-y0);
    const k=rnd()<up*0.6?(rnd()<0.5?2:3):(Math.floor(rnd()*2)+(rnd()<0.15?4:0));
    ctx.globalAlpha=0.55+rnd()*0.35; pe(ctx,x,y,2.8+rnd()*1.8,1.2+rnd()*0.7,cols[Math.min(4,k)],rnd()*Math.PI); }
  ctx.globalAlpha=1;
  ctx.restore();
  // ふちからはみ出す葉（インクつき）
  for(const c of cl){ if(rnd()<0.55) continue; const a=rnd()*Math.PI*2, x=c.x+Math.cos(a)*c.r, y=c.y+Math.sin(a)*c.r;
    ctx.save(); ctx.translate(x,y); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(-1,0); ctx.quadraticCurveTo(3,-3,7,0); ctx.quadraticCurveTo(3,3,-1,0); ctx.closePath();
    ctx.fillStyle=rnd()<0.5?TP.mid2:TP.light; ctx.fill(); ctx.strokeStyle='rgba(58,42,26,0.7)'; ctx.lineWidth=0.8; ctx.stroke(); ctx.restore(); }
  ctx.restore();
}
function paintCanopy(ctx,blobs,seed){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const b of blobs){ const bx0=b.rect?b.x:b.x-b.rx, by0=b.rect?b.y:b.y-b.ry, bx1=b.rect?b.x+b.w:b.x+b.rx, by1=b.rect?b.y+b.h:b.y+b.ry;
    x0=Math.min(x0,bx0); y0=Math.min(y0,by0); x1=Math.max(x1,bx1); y1=Math.max(y1,by1); }
  const m=24; x0=Math.floor(x0-m); y0=Math.floor(y0-m); x1=Math.ceil(x1+m); y1=Math.ceil(y1+m);
  const key='c|'+seed+'|'+JSON.stringify(blobs);
  ctx.drawImage(cached(key,x0,y0,x1-x0,y1-y0,p=>paintCanopyRaw(p,blobs,seed)),x0,y0);
}
function paintTrunkRaw(ctx,x,top,bot,w,seed,o){
  const rnd=seq(seed+3), h=bot-top, cx=x+w/2, tw=w*0.78, fl=o.roots===false?0:Math.min(26,w*0.55+8);
  // 枝（茂みの中へのびる。幹より先に描いて、付け根を幹で隠す）
  const br=o.branches||(h>90?[{y:top+h*0.06,dir:-1,len:w*1.4+18},{y:top+h*0.16,dir:1,len:w*1.2+16}]:[]);
  for(const b of br){ const bw=Math.max(3,w*0.22), ex=cx+b.dir*b.len, ey=b.y-b.len*0.55;
    ctx.beginPath(); ctx.moveTo(cx-bw*0.5*b.dir,b.y+bw); ctx.quadraticCurveTo(cx+b.dir*b.len*0.5,b.y-bw*0.3,ex,ey);
    ctx.quadraticCurveTo(cx+b.dir*b.len*0.45,b.y-bw*1.6,cx,b.y-bw*1.4); ctx.closePath();
    ctx.fillStyle=TP.bark1; ctx.fill(); ctx.strokeStyle=INK; ctx.lineWidth=1.6; ctx.stroke(); }
  // 幹の形（上は細く、下で根が広がる）
  const shape=()=>{ ctx.beginPath();
    ctx.moveTo(cx-tw/2,top);
    ctx.bezierCurveTo(cx-tw/2-1,top+h*0.4,x+1,bot-h*0.25,x,bot-fl*1.2);
    if(fl) ctx.quadraticCurveTo(x-2,bot-fl*0.3,x-fl,bot); else ctx.lineTo(x,bot);
    ctx.lineTo(x+w+fl,bot);
    if(fl) ctx.quadraticCurveTo(x+w+2,bot-fl*0.3,x+w,bot-fl*1.2); else ctx.lineTo(x+w,bot-fl*1.2);
    ctx.bezierCurveTo(x+w-1,bot-h*0.25,cx+tw/2+1,top+h*0.4,cx+tw/2,top);
    ctx.closePath(); };
  shape();
  const g=ctx.createLinearGradient(x-fl,0,x+w+fl,0);
  g.addColorStop(0,TP.bark0); g.addColorStop(0.32,TP.bark2); g.addColorStop(0.55,TP.bark1); g.addColorStop(1,TP.bark0);
  ctx.fillStyle=g; ctx.fill();
  ctx.save(); shape(); ctx.clip();
  // 木の皮のすじ（波うつ たての線）と、光るすじ
  const nr=Math.max(2,Math.round(w/5));
  for(let i=0;i<nr;i++){ const bx=x+(i+0.5)*w/nr+(rnd()-0.5)*2, amp=1+rnd()*1.6, ph=rnd()*6;
    ctx.beginPath();
    for(let y=top;y<=bot;y+=6){ const spread=y>bot-fl*1.4?(bx-cx)*(y-(bot-fl*1.4))/(fl*1.4+1)*0.9:0, xx=bx+Math.sin(y*0.05+ph)*amp+spread;
      if(y===top) ctx.moveTo(xx,y); else ctx.lineTo(xx,y); }
    ctx.strokeStyle='rgba(28,18,8,0.5)'; ctx.lineWidth=0.8+rnd()*1.2; ctx.stroke();
    if(i%2===0){ ctx.save(); ctx.translate(1.4,0); ctx.strokeStyle='rgba(255,226,180,0.14)'; ctx.lineWidth=0.8; ctx.stroke(); ctx.restore(); } }
  // 横のひび
  for(let i=0;i<Math.round(h/40);i++){ const y=top+rnd()*h, xx=x+rnd()*w*0.8;
    ctx.strokeStyle='rgba(28,18,8,0.45)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(xx,y); ctx.quadraticCurveTo(xx+3,y+1.5,xx+5+rnd()*4,y); ctx.stroke(); }
  // ふし
  if(h>120 && w>=18 && !o.hollow){ const ky=top+h*(0.35+rnd()*0.2), kx=cx+(rnd()-0.5)*w*0.3, kr=Math.min(6,w*0.18);
    pe(ctx,kx,ky,kr,kr*1.4,'#2e2216'); ctx.strokeStyle='rgba(138,108,72,0.8)'; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.ellipse(kx,ky,kr+2.5,kr*1.4+3,0,0,Math.PI*2); ctx.stroke(); }
  // うろ
  if(o.hollow){ pe(ctx,o.hollow.x,o.hollow.y,o.hollow.rx,o.hollow.ry,'#1e160e');
    ctx.strokeStyle='rgba(138,108,72,0.9)'; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(o.hollow.x,o.hollow.y,o.hollow.rx+2,o.hollow.ry+2,0,0,Math.PI*2); ctx.stroke(); }
  // 根元の苔
  if(o.moss!==false){ const mh=Math.min(60,h*0.4), mg=ctx.createLinearGradient(0,bot-mh,0,bot);
    mg.addColorStop(0,'rgba(120,140,60,0)'); mg.addColorStop(1,'rgba(120,140,60,0.55)'); ctx.fillStyle=mg; ctx.fillRect(x-fl,bot-mh,w+fl*2,mh);
    for(let i=0;i<w/3;i++) pe(ctx,x-fl*0.5+rnd()*(w+fl),bot-rnd()*Math.min(40,h*0.3),1.6+rnd()*1.6,1.2,rnd()<0.5?'#8f9a48':'#6f7a34'); }
  ctx.restore();
  shape(); ctx.strokeStyle=INK; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.stroke();
}
function paintTrunk(ctx,x,top,bot,w,seed,o){
  o=o||{}; const fl=Math.min(26,w*0.55+8), br=Math.max(40,w*1.6+30);
  const bx=Math.floor(x-fl-br), by=Math.floor(top-br), bw=Math.ceil(w+fl*2+br*2), bh=Math.ceil(bot-top+br+4);
  const key='t|'+[x,top,bot,w,seed].join(',')+'|'+JSON.stringify(o);
  ctx.drawImage(cached(key,bx,by,bw,bh,p=>paintTrunkRaw(p,x,top,bot,w,seed,o)),bx,by);
}
/* 凝った草のしげみ：奥（暗い）と手前（明るい）の2層の葉。葉は先のとがった形でぬり、
   中心に光のすじ、ふちにうすいインク。ときどき穂や小さな花。根元に影。
   GTDecor.paint.grass(ctx, x, y, 幅, 高さ, 種, {flowers})  … (x,y,幅,高さ) の枠の下を根元にして生やす */
function paintGrassRaw(ctx,x,y,w,h,seed,o){
  const rnd=seq(seed+11), by=y+h;
  pe(ctx,x+w/2,by-1,w*0.52,Math.max(2,h*0.1),'rgba(30,26,12,0.22)');                 // 根元の影
  const blade=(bx,hh,lean,bw,c0,c1,ink)=>{
    const tx=bx+lean, ty=by-hh, cx=bx+lean*0.25, cy=by-hh*0.55;
    ctx.beginPath(); ctx.moveTo(bx-bw,by); ctx.quadraticCurveTo(cx-bw*0.6,cy,tx,ty); ctx.quadraticCurveTo(cx+bw*0.6,cy,bx+bw,by); ctx.closePath();
    const g=ctx.createLinearGradient(0,by,0,ty); g.addColorStop(0,c0); g.addColorStop(1,c1); ctx.fillStyle=g; ctx.fill();
    if(ink){ ctx.strokeStyle='rgba(40,30,14,0.55)'; ctx.lineWidth=0.7; ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(bx,by-1); ctx.quadraticCurveTo(cx,cy,tx-lean*0.06,ty+hh*0.08);                // 光のすじ
    ctx.strokeStyle='rgba(230,236,170,0.35)'; ctx.lineWidth=0.6; ctx.stroke();
  };
  const n=Math.max(5,Math.round(w/4));
  // 奥の葉（暗く、低め）
  for(let i=0;i<n;i++){ const bx=x+w*0.06+rnd()*w*0.88, hh=h*(0.45+rnd()*0.4), lean=(rnd()-0.5)*h*0.6;
    blade(bx,hh,lean,1.4+rnd()*1.4,'#33401c','#56622a',false); }
  // 穂（ときどき）
  const stems=Math.round(w/30+rnd());
  for(let i=0;i<stems;i++){ const bx=x+w*0.2+rnd()*w*0.6, hh=h*(0.95+rnd()*0.25), lean=(rnd()-0.5)*h*0.3;
    ctx.strokeStyle='#6a6a30'; ctx.lineWidth=0.9; ctx.beginPath(); ctx.moveTo(bx,by); ctx.quadraticCurveTo(bx+lean*0.3,by-hh*0.6,bx+lean,by-hh); ctx.stroke();
    for(let k=0;k<4;k++) pe(ctx,bx+lean+(k%2?1.6:-1.6),by-hh+k*2.4,1.4,2.4,'#c4ac64',(k%2?0.5:-0.5)); }
  // 手前の葉（明るく、高め）
  for(let i=0;i<n;i++){ const t=(i+0.5)/n, bx=x+w*0.04+t*w*0.92+(rnd()-0.5)*w/n, hh=h*(0.55+rnd()*0.45), lean=(t-0.5)*h*0.7+(rnd()-0.5)*h*0.35;
    blade(bx,hh,lean,1.6+rnd()*1.6, rnd()<0.5?'#55621f':'#4a5622', rnd()<0.4?'#a8ad52':'#8a9440', true); }
  // 小さな花
  if(o.flowers!==false && w>=40){ const fc=['#f3ead0','#e8c35a','#c98bb0'];
    for(let i=0;i<Math.round(w/40);i++){ const fx=x+w*0.15+rnd()*w*0.7, fy=by-h*(0.35+rnd()*0.35), c=fc[Math.floor(rnd()*3)];
      for(let a=0;a<5;a++) pe(ctx,fx+Math.cos(a*1.26)*1.8,fy+Math.sin(a*1.26)*1.8,1.4,1.4,c); pe(ctx,fx,fy,0.9,0.9,'#8a6a2a'); } }
}
function paintGrass(ctx,x,y,w,h,seed,o){
  o=o||{}; const m=Math.ceil(h*0.6)+6, bx=Math.floor(x-m), by=Math.floor(y-m), bw=Math.ceil(w+m*2), bh=Math.ceil(h+m+6);
  const key='g|'+[x,y,w,h,seed].join(',')+'|'+JSON.stringify(o);
  ctx.drawImage(cached(key,bx,by,bw,bh,p=>paintGrassRaw(p,x,y,w,h,seed,o)),bx,by);
}
api.paint={ canopy:paintCanopy, trunk:paintTrunk, grass:paintGrass };

/* 凝った茂み：葉のかたまりを、地面にすわる山の形に重ねる（下は地面でまっすぐ）。根元に草。
   GTDecor.paint.bush(ctx, x, y, 幅, 高さ, 種, {berries})  … (x,y,幅,高さ) の枠に、下を地面にして描く */
function paintBushRaw(ctx,x,y,w,h,seed,o){
  const rnd=seq(seed+5), by=y+h, blobs=[];
  const n=Math.max(2,Math.round(w/(h*0.9)));
  for(let i=0;i<n;i++){ const t=n===1?0.5:i/(n-1), hh=h*(0.62+0.38*Math.sin(Math.PI*(0.15+t*0.7)))*(0.85+rnd()*0.2);
    blobs.push({x:x+w*(0.18+t*0.64), y:by-hh*0.5, rx:w/n*0.62+6, ry:hh*0.52}); }
  blobs.push({x:x+w/2, y:by-h*0.62, rx:w*0.3, ry:h*0.36});
  ctx.save(); ctx.beginPath(); ctx.rect(x-30,y-30,w+60,h+30+1); ctx.clip();       // 地面より下は描かない
  paintCanopyRaw(ctx,blobs,seed);
  ctx.restore();
  if(o.berries){ for(let i=0;i<Math.round(w/14);i++){ const bx=x+w*0.15+rnd()*w*0.7, byy=by-h*(0.2+rnd()*0.6);
    pe(ctx,bx,byy,2.2,2.2,o.berries); pe(ctx,bx-0.7,byy-0.7,0.7,0.7,'rgba(255,240,220,0.8)'); } }
  paintGrassRaw(ctx,x-4,by-Math.max(8,h*0.32),w+8,Math.max(8,h*0.32),seed+1,{flowers:false});   // 根元の草
}
function paintBush(ctx,x,y,w,h,seed,o){
  o=o||{}; const m=34, bx=Math.floor(x-m), by=Math.floor(y-m), bw=Math.ceil(w+m*2), bh=Math.ceil(h+m+4);
  const key='b|'+[x,y,w,h,seed].join(',')+'|'+JSON.stringify(o);
  ctx.drawImage(cached(key,bx,by,bw,bh,p=>paintBushRaw(p,x,y,w,h,seed,o)),bx,by);
}

/* 凝ったシダ（前の葉）：根元から弓なりにのびる葉軸に、先へいくほど小さくなる小葉が左右にならぶ。
   GTDecor.paint.fern(ctx, x, y, 幅, 高さ, 種) */
function paintFernRaw(ctx,x,y,w,h,seed){
  const rnd=seq(seed+13), bx=x+w/2, by=y+h;
  pe(ctx,bx,by-1,w*0.45,Math.max(2,h*0.07),'rgba(30,26,12,0.25)');
  const fronds=[];
  const nf=5+Math.round(rnd()*2);
  for(let i=0;i<nf;i++){ const t=nf===1?0.5:i/(nf-1); fronds.push({ang:-1.25+t*2.5+(rnd()-0.5)*0.2, len:h*(0.75+0.35*(1-Math.abs(t-0.5)*2))*(0.85+rnd()*0.25), back:i%2===0}); }
  fronds.sort((a,b)=>(b.back?1:0)-(a.back?1:0));                                   // 奥の葉から先に
  for(const f of fronds){
    const ex=bx+Math.sin(f.ang)*f.len*0.95, ey=by-Math.cos(f.ang)*f.len*0.75+Math.abs(Math.sin(f.ang))*f.len*0.25;
    const cx=bx+Math.sin(f.ang)*f.len*0.45, cy=by-f.len*0.95;
    const pt=t=>{ const u=1-t; return [u*u*bx+2*u*t*cx+t*t*ex, u*u*by+2*u*t*cy+t*t*ey]; };
    const dk=f.back?'#3d4a20':'#4f5c26', lt=f.back?'#5b6a2a':'#7f8c38';
    const np=Math.max(8,Math.round(f.len/5));
    for(let k=1;k<np;k++){ const t=k/np, [px,py]=pt(t), [qx,qy]=pt(Math.min(1,t+0.02)), a=Math.atan2(qy-py,qx-px);
      const L=Math.max(2,w*0.16*(1-t*0.85)), W2=Math.max(1,L*0.32);
      for(const sd of [-1,1]){ const aa=a+sd*1.05;
        ctx.beginPath(); ctx.moveTo(px,py);
        const tx=px+Math.cos(aa)*L, ty=py+Math.sin(aa)*L;
        ctx.quadraticCurveTo((px+tx)/2+Math.cos(aa+sd*1.57)*W2,(py+ty)/2+Math.sin(aa+sd*1.57)*W2,tx,ty);
        ctx.quadraticCurveTo((px+tx)/2-Math.cos(aa+sd*1.57)*W2*0.4,(py+ty)/2-Math.sin(aa+sd*1.57)*W2*0.4,px,py);
        ctx.fillStyle=(k+(sd>0?1:0))%3===0?lt:dk; ctx.fill();
        ctx.strokeStyle='rgba(40,30,14,0.45)'; ctx.lineWidth=0.6; ctx.stroke(); } }
    ctx.beginPath(); ctx.moveTo(bx,by); ctx.quadraticCurveTo(cx,cy,ex,ey);              // 葉軸
    ctx.strokeStyle='#3a3418'; ctx.lineWidth=1.4; ctx.stroke();
    ctx.strokeStyle='rgba(220,230,160,0.35)'; ctx.lineWidth=0.6; ctx.stroke();
  }
}
function paintFern(ctx,x,y,w,h,seed){
  const m=Math.ceil(Math.max(w,h)*0.5)+10, bx=Math.floor(x-m), by=Math.floor(y-m), bw=Math.ceil(w+m*2), bh=Math.ceil(h+m+6);
  const key='f|'+[x,y,w,h,seed].join(',');
  ctx.drawImage(cached(key,bx,by,bw,bh,p=>paintFernRaw(p,x,y,w,h,seed)),bx,by);
}

/* 凝った花：茎・葉・花びら（ふちにインク・まん中が濃い）・しべ。
   GTDecor.paint.flower(ctx, x, 地面のy, 大きさ, 色の番号0〜3, 種) */
const FLOWER_COLS=[['#f2cf62','#d39a2a'],['#e3a3c6','#b06690'],['#f6efdc','#cdbf98'],['#e79a9e','#b85a62']];
function paintFlowerRaw(ctx,x,gy,s,k,seed){
  const rnd=seq(seed+17), h=(10+rnd()*6)*s, lean=(rnd()-0.5)*4*s, fx=x+lean, fy=gy-h, [c0,c1]=FLOWER_COLS[k%4];
  ctx.strokeStyle='#4e6a34'; ctx.lineWidth=1.2*s; ctx.beginPath(); ctx.moveTo(x,gy); ctx.quadraticCurveTo(x,gy-h*0.5,fx,fy); ctx.stroke();
  for(const sd of [-1,1]){ const lx=x+lean*0.3, ly=gy-h*(0.3+rnd()*0.2);
    ctx.beginPath(); ctx.moveTo(lx,ly); ctx.quadraticCurveTo(lx+sd*4*s,ly-4*s,lx+sd*7*s,ly-1*s); ctx.quadraticCurveTo(lx+sd*4*s,ly+1*s,lx,ly);
    ctx.fillStyle='#6a8a3e'; ctx.fill(); ctx.strokeStyle='rgba(40,30,14,0.5)'; ctx.lineWidth=0.6; ctx.stroke(); }
  const np=5, r=3.4*s, rot=rnd()*Math.PI;
  for(let i=0;i<np;i++){ const a=rot+i/np*Math.PI*2, px=fx+Math.cos(a)*r*0.9, py=fy+Math.sin(a)*r*0.75;
    const g=ctx.createRadialGradient(fx,fy,0,fx,fy,r*1.8); g.addColorStop(0,c1); g.addColorStop(0.55,c0); g.addColorStop(1,c0);
    pe(ctx,px,py,r*0.95,r*0.62,g,a); ctx.strokeStyle='rgba(60,40,24,0.55)'; ctx.lineWidth=0.6; ctx.stroke(); }
  pe(ctx,fx,fy,r*0.5,r*0.45,'#8a6a2a'); pe(ctx,fx-r*0.15,fy-r*0.15,r*0.18,r*0.18,'#f2d890');
}
function paintFlower(ctx,x,gy,s,k,seed){
  s=s||1; const m=Math.ceil(24*s), bx=Math.floor(x-m), by=Math.floor(gy-m-4), key='fl|'+[x,gy,s,k,seed].join(',');
  ctx.drawImage(cached(key,bx,by,m*2,m+6,p=>paintFlowerRaw(p,x,gy,s,k,seed)),bx,by);
}
api.paint.bush=paintBush; api.paint.fern=paintFern; api.paint.flower=paintFlower;

/* 遠くの水車小屋（シルエット）。GTDecor.paint.watermill(ctx, 小屋の真ん中x, 地面y, 大きさ, 時間t, 色)
   色 o … {body:小屋の色, wheel:水車の色, water:水の色, roof:屋根の色(省くと body), light:窓の灯り(省くと なし)}
   小屋の横で水車がゆっくり回り、下を小川が流れる。遠景用なので、輪郭線はつけない */
function paintWatermill(ctx,x,gy,s,t,o){
  s=s||1; o=o||{};
  const body=o.body||'rgba(100,84,66,0.7)', roof=o.roof||body, wheel=o.wheel||'rgba(90,70,52,0.75)', water=o.water||'rgba(150,180,190,0.45)';
  const w=30*s, h=24*s, wx=x+w/2+6*s, wy=gy-11*s, R=13*s;
  ctx.save();
  ctx.fillStyle=water;                                                              // 小川
  ctx.beginPath(); ctx.ellipse(x+8*s,gy-1.5*s,34*s,3*s,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=body; ctx.fillRect(x-w/2,gy-h,w,h);                                 // 小屋
  ctx.fillStyle=roof; ctx.beginPath(); ctx.moveTo(x-w/2-4*s,gy-h); ctx.lineTo(x,gy-h-14*s); ctx.lineTo(x+w/2+4*s,gy-h); ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(40,28,22,0.5)'; ctx.fillRect(x-w/2+5*s,gy-10*s,6*s,10*s);     // 戸
  if(o.light) { ctx.fillStyle=o.light; ctx.fillRect(x+2*s,gy-h+7*s,5*s,5*s); }       // 窓の灯り
  ctx.save(); ctx.translate(wx,wy); ctx.rotate((t||0)*0.5);                         // 水車（輪と、水をくむ板）
  ctx.strokeStyle=wheel; ctx.lineWidth=2*s;
  ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.stroke();
  ctx.lineWidth=1.2*s;
  for(let i=0;i<8;i++){ const a=i*Math.PI/4;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*R,Math.sin(a)*R); ctx.stroke();
    ctx.save(); ctx.rotate(a); ctx.fillStyle=wheel; ctx.fillRect(R-1*s,-2.5*s,4*s,5*s); ctx.restore(); }
  ctx.restore();
  ctx.fillStyle=wheel; ctx.beginPath(); ctx.arc(wx,wy,2*s,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=water;                                                              // 水車から落ちる水
  const k=((t||0)*2)%1;
  for(let i=0;i<3;i++){ ctx.globalAlpha=0.7*(1-((k+i/3)%1)); ctx.beginPath(); ctx.ellipse(wx+R*0.7,wy+R*0.4+((k+i/3)%1)*8*s,1.6*s,2.6*s,0,0,Math.PI*2); ctx.fill(); }
  ctx.restore();
}
api.paint.watermill=paintWatermill;


/* ===== 描画関数（古い絵本の挿絵ふう：くすんだ色・インクの輪郭・葉の弧） ===== */
function drawTree(ctx,x,y,w,h){
  const cx=x+w/2, seed=Math.round(x*3+y*7+w);
  paintTrunk(ctx, cx-w*0.09, y+h*0.30, y+h, w*0.18, seed, {
    branches:[{y:y+h*0.36,dir:-1,len:w*0.36},{y:y+h*0.32,dir:1,len:w*0.4},{y:y+h*0.42,dir:1,len:w*0.26}] });
  paintCanopy(ctx,[
    {x:cx,         y:y+h*0.24, rx:w*0.52, ry:h*0.17},
    {x:cx-w*0.34,  y:y+h*0.33, rx:w*0.32, ry:h*0.11},
    {x:cx+w*0.35,  y:y+h*0.31, rx:w*0.32, ry:h*0.11},
    {x:cx+w*0.06,  y:y+h*0.10, rx:w*0.34, ry:h*0.10},
  ], seed);
}
function drawBush(ctx,x,y,w,h){ paintBush(ctx,x,y,w,h,Math.round(x*5+y*3+w)); }
function drawCloud(ctx,x,y,w,h){
  const cy=y+h*0.6, c='rgba(244,230,196,0.95)'; ctx.save();
  const parts=[[x+w*0.30,cy,w*0.26,h*0.50],[x+w*0.55,cy-h*0.12,w*0.30,h*0.60],[x+w*0.75,cy,w*0.24,h*0.46],[x+w*0.50,cy+h*0.15,w*0.40,h*0.40]];
  ctx.strokeStyle='rgba(120,90,55,0.55)'; ctx.lineWidth=1.1;
  for(const [px,py,rx,ry] of parts){ ctx.beginPath(); ctx.ellipse(px,py,rx,ry,0,0,Math.PI*2); ctx.stroke(); }
  for(const [px,py,rx,ry] of parts) ell(ctx,px,py,rx-0.8,ry-0.8,c);
  ctx.restore();
}
function drawMoon(ctx,x,y,w,h){
  const cx=x+w/2, cy=y+h/2, r=Math.min(w,h)/2; ctx.save();
  const g=ctx.createRadialGradient(cx,cy,r*0.4,cx,cy,r*1.7);
  g.addColorStop(0,'rgba(232,220,192,0.5)'); g.addColorStop(1,'rgba(232,220,192,0)');
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r*1.7,0,Math.PI*2); ctx.fill();
  blob(ctx,cx,cy,r,'#e6dcc0');
  ctx.fillStyle='rgba(120,110,80,0.18)';
  ctx.beginPath(); ctx.arc(cx-r*0.3,cy-r*0.2,r*0.18,0,Math.PI*2); ctx.arc(cx+r*0.25,cy+r*0.3,r*0.12,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawRock(ctx,x,y,w,h){
  const by=y+h; ctx.save();
  ctx.beginPath();
  ctx.moveTo(x,by); ctx.lineTo(x+w*0.2,y+h*0.35); ctx.lineTo(x+w*0.55,y+h*0.1);
  ctx.lineTo(x+w*0.82,y+h*0.4); ctx.lineTo(x+w,by); ctx.closePath();
  ctx.fillStyle='#9a8d74'; ctx.fill();
  ctx.save(); ctx.clip(); ctx.strokeStyle='rgba(58,40,24,0.3)'; ctx.lineWidth=0.8;          // 斜線の陰影
  for(let sx=x; sx<x+w+h; sx+=4){ ctx.beginPath(); ctx.moveTo(sx,by); ctx.lineTo(sx-h*0.5,by-h*0.5); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle=INK; ctx.lineWidth=1.3; ctx.stroke();
  ctx.fillStyle='rgba(250,240,215,0.3)'; ctx.beginPath();
  ctx.moveTo(x+w*0.55,y+h*0.1); ctx.lineTo(x+w*0.82,y+h*0.4); ctx.lineTo(x+w*0.6,y+h*0.45); ctx.closePath(); ctx.fill();
  ctx.restore();
}
/* 床の足場（engine.js の ledge）と同じ見た目：古い挿絵ふう（水彩のぬり・インクの輪郭・斜線）。
   重力が逆のページでは、光の縁と影の向きも上下が入れかわる */
function drawLedge(ctx,x,y,w,h){
  const G=window.GT, page=(G&&x+w/2>=G.SPINE)?'right':'left';
  const inv=!!(G&&G.gravity&&G.gravity[page]===-1), r=8;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  const g=ctx.createLinearGradient(0,y,0,y+h); g.addColorStop(0,inv?'#7c6449':'#a08463'); g.addColorStop(1,inv?'#a08463':'#7c6449');
  ctx.fillStyle=g; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle='rgba(58,40,24,0.28)'; ctx.lineWidth=0.8;
  const y0=inv?y:y+h*0.45, y1=inv?y+h*0.55:y+h;
  for(let sx=x-h; sx<x+w; sx+=5){ ctx.beginPath(); ctx.moveTo(sx,y1); ctx.lineTo(sx+(y1-y0),y0); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle='rgba(255,246,222,0.45)'; ctx.lineWidth=1.4;
  ctx.beginPath(); const hy=inv?y+h-3:y+3; ctx.moveTo(x+6,hy); ctx.lineTo(x+w-6,hy); ctx.stroke();
  ctx.strokeStyle='#3a2a1a'; ctx.lineWidth=1.6;                                    // インクの輪郭
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); ctx.stroke();
  ctx.restore();
}
function drawGrass(ctx,x,y,w,h){ paintGrass(ctx,x,y,w,h,Math.round(x*5+y*3+w)); }
function drawFern(ctx,x,y,w,h){ paintFern(ctx,x,y,w,h,Math.round(x*5+y*3+w)); }
function leaf(ctx,x0,y0,x1,y1,width){
  const mx=(x0+x1)/2,my=(y0+y1)/2, nx=-(y1-y0),ny=(x1-x0), len=Math.hypot(nx,ny)||1;
  const ox=nx/len*width, oy=ny/len*width;
  ctx.beginPath(); ctx.moveTo(x0,y0); ctx.quadraticCurveTo(mx+ox,my+oy,x1,y1);
  ctx.quadraticCurveTo(mx-ox,my-oy,x0,y0); ctx.fill(); ctx.stroke();
}

/* ===== フラットな飾り（輪郭線なし・平らな色。丸を重ねた木など） ===== */
const FLAT={ dark:'#4d6843', mid:'#5b7a4e', light:'#6b8b5c', trunk:'#5a4532', trunkLine:'rgba(30,20,10,0.35)',
             rock:'#716a63', rockLight:'#857d74', grass:'#4b6a42', fern:'#3e5a3b', fernLight:'#557552' };
function flatCircle(ctx,cx,cy,r,c){ ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle=c; ctx.fill(); }
// 木：まっすぐな幹と、4つの丸を重ねた葉（奥が濃く、手前が明るい）
function drawTreeFlat(ctx,x,y,w,h){
  const cx=x+w/2, R=w*0.30, cy=y+R*1.15, tw=Math.max(8,w*0.15);
  ctx.save();
  ctx.fillStyle=FLAT.trunk; ctx.fillRect(cx-tw/2, cy, tw, y+h-cy);
  flatCircle(ctx,cx,      cy-R*0.15,R*1.05,FLAT.dark);
  flatCircle(ctx,cx-R*0.95,cy+R*0.35,R*0.88,FLAT.mid);
  flatCircle(ctx,cx+R*0.95,cy+R*0.35,R*0.88,FLAT.mid);
  flatCircle(ctx,cx-R*0.1, cy+R*0.45,R*1.0, FLAT.light);
  ctx.restore();
}
// 茂み：丸を3つ
function drawBushFlat(ctx,x,y,w,h){ paintBush(ctx,x,y,w,h,Math.round(x*5+y*3+w)); }
// 岩：角ばった灰色に、明るい面をひとつ
function drawRockFlat(ctx,x,y,w,h){
  const by=y+h; ctx.save();
  ctx.beginPath(); ctx.moveTo(x,by); ctx.lineTo(x+w*0.28,y+h*0.25); ctx.lineTo(x+w*0.62,y); ctx.lineTo(x+w*0.82,y+h*0.35); ctx.lineTo(x+w,by); ctx.closePath();
  ctx.fillStyle=FLAT.rock; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x+w*0.62,y); ctx.lineTo(x+w*0.82,y+h*0.35); ctx.lineTo(x+w*0.66,y+h*0.42); ctx.closePath();
  ctx.fillStyle=FLAT.rockLight; ctx.fill();
  ctx.restore();
}
// 草：細い葉をまっすぐ数本（交互に少しかたむける）
function drawGrassFlat(ctx,x,y,w,h){ paintGrass(ctx,x,y,w,h,Math.round(x*5+y*3+w)); }
// 前の葉：とがった葉を放射状に（手前に置いて、うしろを隠す）
function drawFernFlat(ctx,x,y,w,h){ paintFern(ctx,x,y,w,h,Math.round(x*5+y*3+w)); }
api.FLAT=FLAT;

/* ===== 森の絵（ステージの足場に重ねて描く。01_komichi1.js / 02_komichi2.js が使う） =====
   GTDecor.forest.rock([足場,...], 種)   … 苔むした岩（重なった足場をひとつの岩として描く）
   GTDecor.forest.trunk(足場)            … 木の幹（根は床に広がる）
   GTDecor.forest.crown([足場,...], 種)  … 木の葉の茂み
   GTDecor.forest.vine(足場)             … 天井から垂れさがる太いつる
   GTDecor.forest.log(足場, 種)          … 丸太（宙に浮いた細い足場）
   GTDecor.forest.crate(箱)              … 木目のある木箱（engine の箱の上に重ねる）
   GTDecor.forest.ground({flowers:[[x,色],..], mushrooms:[[x,大きさ],..], lights:[[x,ずれ],..]}) … 床の花・きのこ・木漏れ日
   GTDecor.forest.air()                  … ちょうちょと舞う葉
   どれも engine.js の GT.ctx に描く（ゲームの中で呼ぶ）。足場の当たり判定は変えない。 */
(function(){
const GT=window.GT; if(!GT||!GT.ctx) return;
const ctx=GT.ctx, W=GT.W, H=GT.H, EDGE=GT.EDGE, FLOOR=H-GT.EDGE;
const rnd=i=>{ const s=Math.sin(i*127.1+311.7)*43758.5453; return s-Math.floor(s); };
function ell(x,y,rx,ry,c,rot){ ctx.beginPath(); ctx.ellipse(x,y,rx,ry,rot||0,0,Math.PI*2); ctx.fillStyle=c; ctx.fill(); }
function rectsPath(rs,pad,r){ ctx.beginPath(); for(const p of rs) GT.roundRectPath(p.x-pad,p.y-pad,p.w+pad*2,p.h+pad*2,r); }
// 上に何も重なっていない「上の面」の区間（苔や草を生やす場所）
function topEdges(rs){
  const out=[];
  for(const p of rs){ let x0=null;
    for(let x=p.x;x<=p.x+p.w;x+=4){
      const covered=rs.some(q=>q!==p && x>=q.x && x<=q.x+q.w && p.y-1>=q.y && p.y-1<=q.y+q.h);
      if(!covered && x0===null) x0=x;
      if((covered||x+4>p.x+p.w) && x0!==null){ out.push({x0,x1:covered?x:p.x+p.w,y:p.y}); x0=null; } } }
  return out;
}

/* 紙の影：重ねた紙のあいだにできる、やわらかい影 */
function paperShadow(c){ if(GT.castShadow) return GT.castShadow(c); c.shadowColor='rgba(52,38,26,0.34)'; c.shadowBlur=7; c.shadowOffsetX=9; c.shadowOffsetY=6; }   // 奥に落ちる影

/* 苔むした岩（明るい絵本の岩。お話のはじめのほう） */
function drawRockBright(rs,seed){
  ctx.save();
  rectsPath(rs,1.6,12); ctx.fillStyle='#3a2a1a'; ctx.fill();                        // インクの輪郭
  rectsPath(rs,0,11);
  const top=Math.min(...rs.map(p=>p.y)), bot=Math.max(...rs.map(p=>p.y+p.h));
  const g=ctx.createLinearGradient(0,top,0,bot); g.addColorStop(0,'#c2b392'); g.addColorStop(1,'#8a7c62');
  ctx.fillStyle=g; ctx.fill();
  ctx.save(); rectsPath(rs,0,11); ctx.clip();
  for(let i=0;i<40;i++){ const p=rs[i%rs.length], x=p.x+rnd(seed+i)*p.w, y=p.y+14+rnd(seed+i+50)*(p.h-14);
    ell(x,y,3+rnd(seed+i+9)*6,2+rnd(seed+i+7)*3,i%3?'rgba(60,56,46,0.18)':'rgba(240,232,210,0.18)'); }
  ctx.strokeStyle='rgba(58,40,24,0.3)'; ctx.lineWidth=0.8;                         // 斜線の陰影（下のほう）
  for(const p of rs){ const y0=p.y+p.h*0.5, y1=p.y+p.h; for(let sx=p.x-p.h; sx<p.x+p.w; sx+=5){ ctx.beginPath(); ctx.moveTo(sx,y1); ctx.lineTo(sx+(y1-y0),y0); ctx.stroke(); } }
  ctx.strokeStyle='rgba(58,40,24,0.55)'; ctx.lineWidth=1.1;                        // ひび
  for(let i=0;i<4;i++){ const p=rs[i%rs.length], x=p.x+10+rnd(seed+i*3)*(p.w-20), y=p.y+20+rnd(seed+i*5)*(p.h-30);
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+8,y+10); ctx.lineTo(x+4,y+20); ctx.stroke(); }
  // 苔（上の面からたれる）
  for(const e of topEdges(rs)){
    ctx.beginPath(); ctx.moveTo(e.x0-2,e.y-2);
    for(let x=e.x0;x<=e.x1+2;x+=6){ ctx.lineTo(x, e.y+8+Math.sin(x*0.35+seed)*4+rnd(seed+x)*6); }
    ctx.lineTo(e.x1+2,e.y-2); ctx.closePath();
    const mg=ctx.createLinearGradient(0,e.y,0,e.y+18); mg.addColorStop(0,'#a9ad5c'); mg.addColorStop(1,'#727a38');
    ctx.fillStyle=mg; ctx.fill(); ctx.strokeStyle='rgba(58,40,24,0.6)'; ctx.lineWidth=0.9; ctx.stroke(); }
  ctx.restore();
  // 草（上の面の上）
  for(const e of topEdges(rs)) for(let x=e.x0+2;x<e.x1-14;x+=16+rnd(seed+x)*10){ const h=8+rnd(seed+x)*7, w=12+rnd(seed+x+2)*12;
    if(rnd(seed+x+5)<0.25) continue;
    api.paint.grass(ctx, Math.round(x), Math.round(e.y-h+2), Math.round(Math.min(w,e.x1-x)), Math.round(h), Math.round(seed*31+x), {flowers:false}); }
  ctx.restore();
}

/* お話のはじめ（不気味さが小さいうち）は明るい絵本の岩・ちょうちょ、進むとゴシックに。最初の場面は、ゴシックのまま */
const brightNow=()=>!!(window.GT && GT.moodTarget && GT.scene && GT.moodTarget()<0.05);   // 不気味さ 0 の場面だけ、明るい絵本の岩・ちょうちょ
function drawRock(rs,seed){ return brightNow() ? drawRockBright(rs,seed) : drawRockGoth(rs,seed); }

/* 苔むした岩（ゴシック：暗い紫がかった石。ひび・石の欠け・上のふちに月あかり・暗い苔・つたと小さな薔薇） */
/* 岩の形（ゴシック）：四角ではなく、角を大きく丸め、横と下のふちを でこぼこにした石の形。上の面は乗れるように、ほぼ平ら */
function rockPath(rs,pad,seed){
  ctx.beginPath();
  for(const p of rs){
    const x0=p.x-pad, y0=p.y-pad, x1=p.x+p.w+pad, y1=p.y+p.h+pad, rad=Math.min(24,p.w*0.38,p.h*0.42), pts=[];
    const J=(k,a)=>(rnd(seed+k+p.x*0.37+p.y*0.11)-0.5)*a;
    for(let x=x0+rad;x<x1-rad;x+=14) pts.push([x, y0+J(x,1.6)]);                                   // 上（ほぼ平ら）
    for(let k=0;k<=4;k++){ const a=-Math.PI/2+k/4*Math.PI/2; pts.push([x1-rad+Math.cos(a)*rad+J(k+90,3), y0+rad+Math.sin(a)*rad+J(k+91,3)]); }   // 右上の角
    for(let y=y0+rad+12;y<y1-rad;y+=13) pts.push([x1+J(y+7,7)+2, y]);                               // 右（でこぼこ）
    for(let k=0;k<=4;k++){ const a=k/4*Math.PI/2; pts.push([x1-rad+Math.cos(a)*rad+J(k+50,4), y1-rad+Math.sin(a)*rad+J(k+51,4)]); }       // 右下
    for(let x=x1-rad-12;x>x0+rad;x-=15) pts.push([x, y1+J(x+3,5)+1.5]);                            // 下
    for(let k=0;k<=4;k++){ const a=Math.PI/2+k/4*Math.PI/2; pts.push([x0+rad+Math.cos(a)*rad+J(k+70,4), y1-rad+Math.sin(a)*rad+J(k+71,4)]); }  // 左下
    for(let y=y1-rad-12;y>y0+rad;y-=13) pts.push([x0+J(y+11,7)-2, y]);                              // 左（でこぼこ）
    for(let k=0;k<=4;k++){ const a=Math.PI+k/4*Math.PI/2; pts.push([x0+rad+Math.cos(a)*rad+J(k+30,3), y0+rad+Math.sin(a)*rad+J(k+31,3)]); }   // 左上
    const n=pts.length, mid=i=>[(pts[i][0]+pts[(i+1)%n][0])/2,(pts[i][1]+pts[(i+1)%n][1])/2];
    let m=mid(n-1); ctx.moveTo(m[0],m[1]);
    for(let i=0;i<n;i++){ const q=mid(i); ctx.quadraticCurveTo(pts[i][0],pts[i][1],q[0],q[1]); }   // なめらかにつなぐ
    ctx.closePath();
  }
}
function drawRockGoth(rs,seed){
  ctx.save();
  rockPath(rs,3.4,seed); ctx.fillStyle='rgba(225,210,235,0.55)'; ctx.fill();   // 外がわに うすい月あかりのふち（暗い背景から形が見えるように）
  rockPath(rs,1.8,seed); ctx.fillStyle='#140b12'; ctx.fill();                        // 輪郭
  rockPath(rs,0,seed);
  const top=Math.min(...rs.map(p=>p.y)), bot=Math.max(...rs.map(p=>p.y+p.h));
  const g=ctx.createLinearGradient(0,top,0,bot); g.addColorStop(0,'#8a7a88'); g.addColorStop(0.5,'#64566a'); g.addColorStop(1,'#3e3446');   // 暗い場面でも見えるように、明るめ
  ctx.fillStyle=g; ctx.fill();
  ctx.save(); rockPath(rs,0,seed); ctx.clip();
  for(let i=0;i<46;i++){ const p=rs[i%rs.length], x=p.x+rnd(seed+i)*p.w, y=p.y+12+rnd(seed+i+50)*(p.h-12);   // 石のまだら
    ell(x,y,3+rnd(seed+i+9)*7,2+rnd(seed+i+7)*3.5,i%3?'rgba(20,10,18,0.22)':'rgba(220,200,230,0.10)'); }
  for(const p of rs){ for(let i=0;i<Math.max(1,p.w/50);i++){                                                     // 石の欠け（角ばった明るい面）
    const x=p.x+12+rnd(seed+i*11+p.x)*(p.w-30), y=p.y+18+rnd(seed+i*13+p.y)*(p.h-26), s=6+rnd(seed+i+p.w)*7;
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+s,y-s*0.3); ctx.lineTo(x+s*1.3,y+s*0.6); ctx.lineTo(x+s*0.2,y+s*0.8); ctx.closePath();
    ctx.fillStyle='rgba(150,130,155,0.22)'; ctx.fill(); ctx.strokeStyle='rgba(15,8,14,0.5)'; ctx.lineWidth=0.8; ctx.stroke(); } }
  const sh=ctx.createLinearGradient(0,top,0,bot); sh.addColorStop(0,'rgba(10,4,10,0)'); sh.addColorStop(1,'rgba(10,4,10,0.45)');   // 下ほど暗く
  ctx.fillStyle=sh; ctx.fillRect(Math.min(...rs.map(p=>p.x))-4,top,Math.max(...rs.map(p=>p.x+p.w))-Math.min(...rs.map(p=>p.x))+8,bot-top);
  ctx.strokeStyle='rgba(12,6,12,0.75)'; ctx.lineWidth=1.2;                         // ひび（枝わかれ）
  for(let i=0;i<6;i++){ const p=rs[i%rs.length], x=p.x+10+rnd(seed+i*3)*(p.w-20), y=p.y+16+rnd(seed+i*5)*(p.h-30);
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+7,y+9); ctx.lineTo(x+3,y+18); ctx.moveTo(x+7,y+9); ctx.lineTo(x+14,y+13); ctx.stroke(); }
  // 上のふちの月あかり
  for(const e of topEdges(rs)){ ctx.strokeStyle='rgba(235,220,245,0.6)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(e.x0+6,e.y+1.5); ctx.lineTo(e.x1-6,e.y+1.5); ctx.stroke(); }
  // 暗い苔（上の面からたれる）
  for(const e of topEdges(rs)){
    ctx.beginPath(); ctx.moveTo(e.x0-2,e.y-2);
    for(let x=e.x0;x<=e.x1+2;x+=6){ ctx.lineTo(x, e.y+7+Math.sin(x*0.35+seed)*4+rnd(seed+x)*6); }
    ctx.lineTo(e.x1+2,e.y-2); ctx.closePath();
    const mg=ctx.createLinearGradient(0,e.y,0,e.y+18); mg.addColorStop(0,'#55603e'); mg.addColorStop(1,'#2c3522');
    ctx.fillStyle=mg; ctx.fill(); ctx.strokeStyle='rgba(12,6,12,0.6)'; ctx.lineWidth=0.9; ctx.stroke(); }
  // つた（岩の横をはう）と、小さな薔薇
  for(const p of rs){ if(p.h<50) continue; const vx=p.x+6+rnd(seed+p.x)*Math.min(30,p.w*0.3);
    ctx.strokeStyle='#26301e'; ctx.lineWidth=1.6; ctx.beginPath();
    for(let y=p.y+8;y<p.y+p.h;y+=4){ const x=vx+Math.sin(y*0.12+seed)*5; y===p.y+8?ctx.moveTo(x,y):ctx.lineTo(x,y); } ctx.stroke();
    for(let y=p.y+16;y<p.y+p.h-6;y+=12){ const x=vx+Math.sin(y*0.12+seed)*5, s=(y/12)%2<1?-1:1; ell(x+s*5,y,4.5,2.2,'#34422a',s*0.6); }
    if(rnd(seed+p.y)<0.7){ const ry=p.y+p.h*0.45, rx=vx+Math.sin(ry*0.12+seed)*5;
      ell(rx,ry,4.2,4.2,'#6e1024'); ell(rx-1,ry-1,2.6,2.6,'#a8243f'); } }
  ctx.restore();
  // 草（上の面の上）
  for(const e of topEdges(rs)) for(let x=e.x0+2;x<e.x1-14;x+=16+rnd(seed+x)*10){ const h=8+rnd(seed+x)*7, w=12+rnd(seed+x+2)*12;
    if(rnd(seed+x+5)<0.25) continue;
    ctx.save(); ctx.filter='saturate(0.45) brightness(0.6)'; api.paint.grass(ctx, Math.round(x), Math.round(e.y-h+2), Math.round(Math.min(w,e.x1-x)), Math.round(h), Math.round(seed*31+x), {flowers:false}); ctx.restore(); }   // 草も暗く
  ctx.restore();
}

/* 木の幹（根は床に広がる）：凝った幹（GTDecor.paint.trunk） */
function drawTrunk(p){
  if(brightNow()){ api.paint.trunk(ctx, p.x, p.y-6, FLOOR, p.w, p.x*7+p.y); return; }
  // ゴシック：黒ずんだ幹（色を抜いて暗く）に、いばらのつると薔薇、片がわに月あかりのふち
  ctx.save(); ctx.filter='brightness(0.38) saturate(0.3) contrast(1.15)'; api.paint.trunk(ctx, p.x, p.y-6, FLOOR, p.w, p.x*7+p.y); ctx.restore();
  ctx.save(); ctx.strokeStyle='rgba(215,205,225,0.25)'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.moveTo(p.x+p.w-2,p.y); ctx.lineTo(p.x+p.w-2,FLOOR-4); ctx.stroke();
  if(GT.goth){ const P=GT.goth.paint; P.vine(ctx,P.R(p.x|0),p.x+p.w/2,FLOOR,p.y+20,p.w*0.45,0); }
  ctx.restore();
}

/* 木の葉の茂み（足場の四角にそって、葉のかたまりで覆う）：凝った茂み（GTDecor.paint.canopy） */
function drawCrown(rs,seed){
  if(brightNow()){ api.paint.canopy(ctx, rs.map(p=>({rect:true,x:p.x,y:p.y,w:p.w,h:p.h})), seed||1); return; }
  drawCrownGoth(rs,seed||1);
}
/* ゴシックの木の上：葉のない、からみあった黒い枝のかたまり（乗れる足場の形のまま）。とげ・暗い葉・薔薇、上のふちに月あかり */
function drawCrownGoth(rs,seed){
  const P=GT.goth&&GT.goth.paint;
  ctx.save();
  // かたまり（ふちを でこぼこに）
  for(const p of rs){
    ctx.fillStyle='#1b1316';
    rectsPath([p],3,10); ctx.fill();
    for(let i=0;i<Math.max(14,(p.w+p.h)/4);i++){ const e=i%4, u=rnd(seed+i+p.x), out=4+rnd(seed+i*7)*6;   // ふちを大きく でこぼこに（丸い葉むらではなく、ごつごつした かたまり）
      const x=e===0?p.x+u*p.w : e===1?p.x+p.w+out*0.5 : e===2?p.x+u*p.w : p.x-out*0.5, y=e===0?p.y-out*0.4 : e===1?p.y+u*p.h : e===2?p.y+p.h+out*0.4 : p.y+u*p.h;
      ell(x,y,9+rnd(seed+i*3)*9,7+rnd(seed+i*5)*7,'#1b1316',rnd(seed+i*9)*3); }
    const vg=ctx.createRadialGradient(p.x+p.w*0.4,p.y+p.h*0.3,4,p.x+p.w/2,p.y+p.h/2,Math.max(p.w,p.h)*0.8);   // 中を少し明るく（ふくらみ）
    vg.addColorStop(0,'rgba(72,52,60,0.55)'); vg.addColorStop(1,'rgba(72,52,60,0)'); ctx.fillStyle=vg; rectsPath([p],0,10); ctx.fill();
  }
  // 中の、からみあう枝
  ctx.save(); rectsPath(rs,2,10); ctx.clip();
  ctx.strokeStyle='rgba(70,52,58,0.55)'; ctx.lineWidth=1.3; ctx.lineCap='round';
  for(const p of rs) for(let i=0;i<(p.w*p.h)/700;i++){ const x=p.x+rnd(seed+i*7+p.y)*p.w, y=p.y+rnd(seed+i*11+p.x)*p.h, a=rnd(seed+i*13)*Math.PI*2, l=14+rnd(seed+i)*22;
    ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+Math.cos(a+0.6)*l*0.5,y+Math.sin(a+0.6)*l*0.5,x+Math.cos(a)*l,y+Math.sin(a)*l); ctx.stroke(); }
  for(const p of rs) for(let i=0;i<(p.w*p.h)/1600;i++) ell(p.x+rnd(seed+i*17)*p.w,p.y+rnd(seed+i*19)*p.h,4,2.2,i%2?'#1f2a1c':'#26321f',rnd(seed+i)*3);   // 暗い葉
  ctx.restore();
  // 外へ のびる とげのある枝
  if(P){ ctx.strokeStyle='#1b1316'; ctx.lineCap='round';
    for(const p of rs){ const r=P.R((seed*31+p.x)|0);
      for(let i=0;i<Math.max(3,p.w/22);i++){ const x=p.x+6+rnd(seed+i*23+p.x)*(p.w-12); P.branch(ctx,r,x,p.y+6,22+rnd(seed+i)*24,-Math.PI/2+(rnd(seed+i*29)-0.5)*1.6,3.4,3); }   // 上へ
      for(let i=0;i<Math.max(2,p.h/30);i++){ const y=p.y+8+rnd(seed+i*31+p.y)*(p.h-16);
        P.branch(ctx,r,p.x+6,y,20+rnd(seed+i*3)*16,Math.PI+(rnd(seed+i*5)-0.5)*1.0,3,2);                 // 左へ
        P.branch(ctx,r,p.x+p.w-6,y,20+rnd(seed+i*7)*16,(rnd(seed+i*11)-0.5)*1.0,3,2); }                  // 右へ
      for(let i=0;i<2;i++) P.branch(ctx,r,p.x+p.w*(0.25+i*0.5),p.y+p.h-6,14+rnd(seed+i*13)*10,Math.PI/2+(rnd(seed+i*17)-0.5)*0.8,2.4,2); } }   // 下に たれる
  // 上のふちの月あかり
  for(const e of topEdges(rs)){ ctx.strokeStyle='rgba(215,205,225,0.3)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(e.x0+6,e.y+1.5); ctx.lineTo(e.x1-6,e.y+1.5); ctx.stroke(); }
  // 薔薇
  if(P) for(const p of rs) for(let i=0;i<Math.max(1,p.w/50);i++) P.rose(ctx,p.x+10+rnd(seed+i*37+p.y)*(p.w-20),p.y+6+rnd(seed+i*41)*(p.h-12),4+rnd(seed+i)*2);
  ctx.restore();
}

/* 丸太（宙に浮いた細い足場）：木の皮の横すじ・切り口の年輪・上に小さな苔 */
function drawLog(p,seed){
  seed=seed||1;
  ctx.save();
  const r=Math.min(p.h/2,10);
  GT.roundRect(p.x,p.y,p.w,p.h,r);
  const g=ctx.createLinearGradient(0,p.y,0,p.y+p.h); g.addColorStop(0,'#8a6a45'); g.addColorStop(0.45,'#6e5236'); g.addColorStop(1,'#4e3a24');
  ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#3a2a1a'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.save(); GT.roundRect(p.x,p.y,p.w,p.h,r); ctx.clip();
  ctx.strokeStyle='rgba(30,22,12,0.4)'; ctx.lineWidth=1;                          // 木の皮の横すじ
  for(let i=0;i<Math.max(2,p.w/18);i++){ const x=p.x+8+rnd(seed+i)*(p.w-24), y=p.y+3+rnd(seed+i+40)*(p.h-6), l=10+rnd(seed+i+80)*22;
    ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+l/2,y+(rnd(seed+i+5)-0.5)*3,x+l,y); ctx.stroke(); }
  ctx.restore();
  // 右の切り口（年輪）
  const ex=p.x+p.w-r*0.7, ey=p.y+p.h/2;
  ell(ex,ey,r*0.62,p.h/2-1.5,'#c9a874'); ctx.strokeStyle='rgba(90,63,34,0.7)'; ctx.lineWidth=0.9;
  ctx.beginPath(); ctx.ellipse(ex,ey,r*0.36,(p.h/2-1.5)*0.55,0,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(ex,ey,r*0.62,p.h/2-1.5,0,0,Math.PI*2); ctx.strokeStyle='#3a2a1a'; ctx.stroke();
  // 上の苔と、小さな草
  for(let x=p.x+10;x<p.x+p.w-16;x+=9){ if(rnd(seed+x)<0.45) continue;
    ell(x,p.y+1.5,5+rnd(seed+x+3)*4,3,rnd(seed+x+7)<0.5?'#97a04a':'#808a3c'); }
  for(let x=p.x+12;x<p.x+p.w-28;x+=26+rnd(seed+x)*16){ const h=7+rnd(seed+x)*5;
    api.paint.grass(ctx, Math.round(x), Math.round(p.y-h+2), 14, Math.round(h), Math.round(seed*17+x), {flowers:false}); }
  ctx.restore();
}

/* 天井から垂れさがる太いつる */
function drawVine(p){
  if(!brightNow()){ ctx.save(); ctx.filter='brightness(0.45) saturate(0.35)'; drawVineBase(p); ctx.restore();   // ゴシック：暗いつる＋薔薇
    if(GT.goth){ const P=GT.goth.paint; for(let y=p.y+20;y<p.y+p.h-6;y+=34) P.rose(ctx,p.x+p.w/2+((y/34)%2?5:-5),y,3.6); } return; }
  drawVineBase(p);
}
function drawVineBase(p){
  const t=performance.now()/1000;
  ctx.save();
  ctx.fillStyle='#4a3a28';
  ctx.beginPath(); ctx.moveTo(p.x-14,EDGE); ctx.quadraticCurveTo(p.x-2,EDGE+8,p.x,EDGE+24); ctx.lineTo(p.x+p.w,EDGE+24);
  ctx.quadraticCurveTo(p.x+p.w+2,EDGE+8,p.x+p.w+14,EDGE); ctx.closePath(); ctx.fill();   // 天井側の付け根
  const g=ctx.createLinearGradient(p.x,0,p.x+p.w,0); g.addColorStop(0,'#3e3420'); g.addColorStop(0.5,'#6a5a3a'); g.addColorStop(1,'#3a301e');
  GT.roundRect(p.x,p.y,p.w,p.h,9); ctx.fillStyle=g; ctx.fill(); ctx.strokeStyle='#3a2a1a'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.strokeStyle='rgba(30,22,12,0.45)'; ctx.lineWidth=1.4;                       // ねじれ
  for(let y=p.y+10;y<p.y+p.h-6;y+=16){ ctx.beginPath(); ctx.moveTo(p.x+2,y); ctx.quadraticCurveTo(p.x+p.w/2,y+8,p.x+p.w-2,y+4); ctx.stroke(); }
  for(let i=0;i<9;i++){ const y=p.y+14+i*15, left=i%2===0, sw=Math.sin(t*1.5+i)*0.15;   // 葉
    ctx.save(); ctx.translate(left?p.x:p.x+p.w,y); ctx.rotate((left?-0.5:0.5)+sw);
    ell(left?-8:8,0,9,4,i%3?'#808a3c':'#97a04a'); ctx.strokeStyle='rgba(58,40,24,0.6)'; ctx.lineWidth=0.8; ctx.stroke(); ctx.restore(); }
  ell(p.x+p.w/2,p.y+p.h+2,10,6,'#808a3c'); ell(p.x+p.w/2-6,p.y+p.h+6,6,4,'#97a04a'); // 先の葉
  ctx.restore();
}

/* 床の花・きのこ・木漏れ日 */
function drawGround(o){
  o=o||{};
  if(!brightNow()) return drawGroundGoth(o);
  ctx.save();
  const t=performance.now()/1000;
  ctx.globalCompositeOperation='lighter';
  (o.lights||[[110,0],[470,1.7],[600,3.1]]).forEach(([x,s])=>{ ctx.globalAlpha=0.18+0.08*Math.sin(t*0.8+s); ell(x,FLOOR-3,40,6,'#fff0b8'); });
  ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1;
  const flowers=o.flowers||[];
  for(const [x,k] of flowers){                                                     // 根元の小さな草と、凝った花
    if(Math.round(x)%3===0) api.paint.grass(ctx, x-9, FLOOR-12, 18, 12, x*13+k, {flowers:false});
    api.paint.flower(ctx, x, FLOOR, 0.85+k*0.08, k, x*7+k); }
  for(const [x,s] of (o.mushrooms||[])){                                           // きのこ
    ctx.fillStyle='#efe6d2'; ctx.fillRect(x-2*s,FLOOR-8*s,4*s,8*s);
    ctx.beginPath(); ctx.arc(x,FLOOR-8*s,7*s,Math.PI,0); ctx.fillStyle='#b8423f'; ctx.fill();
    ell(x-3*s,FLOOR-11*s,1.4*s,1.4*s,'#f6eed8'); ell(x+2*s,FLOOR-13*s,1.2*s,1.2*s,'#f6eed8'); }
  ctx.restore();
}

function drawGroundGoth(o){
  const t=performance.now()/1000;
  ctx.save();
  for(const [x,k] of (o.flowers||[])){                                            // 暗い草むら。ときどき小さな薔薇
    ctx.save(); ctx.filter='saturate(0.4) brightness(0.55)'; api.paint.grass(ctx, x-10, FLOOR-13, 20, 13, x*13+k, {flowers:false}); ctx.restore();
    if(k%2===0 && GT.goth) GT.goth.paint.rose(ctx, x+3, FLOOR-9, 3.2); }
  for(const [x,s] of (o.mushrooms||[])){                                           // 青白く光る、小さなきのこ
    const a=0.55+0.25*Math.sin(t*1.6+x);
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const g=ctx.createRadialGradient(x,FLOOR-7*s,0,x,FLOOR-7*s,18*s); g.addColorStop(0,`rgba(170,220,255,${0.3*a})`); g.addColorStop(1,'rgba(170,220,255,0)');
    ctx.fillStyle=g; ctx.fillRect(x-20*s,FLOOR-27*s,40*s,40*s); ctx.restore();
    ctx.fillStyle='#cfd4e6'; ctx.fillRect(x-1.4*s,FLOOR-7*s,2.8*s,7*s);
    ctx.beginPath(); ctx.ellipse(x,FLOOR-7*s,6*s,4*s,0,Math.PI,0); ctx.fillStyle=`rgba(190,225,255,${0.7+0.25*a})`; ctx.fill(); }
  ctx.restore();
}

/* ちょうちょと舞う花びら（プレイヤーより手前）
   ゴシック：黒いアゲハ（はねのふちが深紅、うすく光る白い点、長い尾）。ひらひらと はばたく。舞うのは薔薇の花びら */
function drawButterfly(x,y,s,flap,ang,tone){
  ctx.save(); ctx.translate(x,y); ctx.rotate(ang); ctx.scale(s,s);
  for(const side of [-1,1]){ ctx.save(); ctx.scale(side*(0.25+0.75*flap),1);
    ctx.beginPath(); ctx.moveTo(0,-1); ctx.bezierCurveTo(6,-10,16,-12,17,-6); ctx.bezierCurveTo(17,-1,9,1,0,1); ctx.closePath();   // 前ばね
    ctx.fillStyle='#160a12'; ctx.fill(); ctx.strokeStyle=tone; ctx.lineWidth=1.3; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,1); ctx.bezierCurveTo(9,1,13,6,10,10); ctx.lineTo(8,17); ctx.lineTo(6,11); ctx.bezierCurveTo(3,10,1,6,0,3); ctx.closePath();   // 後ろばね（尾つき）
    ctx.fillStyle='#1d0c17'; ctx.fill(); ctx.stroke();
    ell(12,-6,1.4,1.1,'rgba(240,225,245,0.8)'); ell(8,-4,1,0.8,'rgba(240,225,245,0.6)'); ell(8,7,1.6,1.2,tone);   // 白い点・赤い目玉もよう
    ctx.restore(); }
  ell(0,0,1.2,5,'#0d060a');                                                         // からだ
  ctx.strokeStyle='#0d060a'; ctx.lineWidth=0.7; ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(-3,-9); ctx.moveTo(0,-4); ctx.lineTo(3,-9); ctx.stroke();   // 触角
  ctx.restore();
}
function drawAir(){ return brightNow() ? drawAirBright() : drawAirGoth(); }
/* ちょうちょと舞う葉（明るい絵本のころ。お話のはじめのほう） */
function drawAirBright(){
  const t=performance.now()/1000;
  ctx.save();
  [[0,'#f3ead0'],[2.4,'#e8c35a']].forEach(([s,c],i)=>{
    const x=150+i*420+Math.sin(t*0.5+s)*90, y=230+i*-40+Math.sin(t*0.9+s)*40, f=Math.abs(Math.sin(t*12+s));
    ell(x-3,y,4*f+1,3,c,-0.4); ell(x+3,y,4*f+1,3,c,0.4); ell(x,y,1,3,'#4a3a28'); });
  for(let i=0;i<6;i++){ const sp=16+rnd(i+3)*12, span=FLOOR-EDGE+40, y=EDGE-20+((t*sp+rnd(i)*span)%span);
    const x=rnd(i+20)*W+Math.sin(t*1.1+i*2)*24, r=t*2+i;
    ell(x,y,4.5,2.2*Math.abs(Math.cos(r)),i%2?'rgba(130,150,80,0.8)':'rgba(190,160,90,0.8)',Math.sin(r)*0.8); }
  ctx.restore();
}
function drawAirGoth(){
  const t=performance.now()/1000;
  ctx.save();
  [[0,'#b3263f'],[2.4,'#c4344d'],[4.1,'#8a5aa8']].forEach(([s,c],i)=>{
    const x=150+i*300+Math.sin(t*0.5+s)*90, y=210+(i%2?-40:10)+Math.sin(t*0.9+s)*40;
    const flap=Math.abs(Math.sin(t*9+s)), ang=Math.cos(t*0.5+s)*0.35;
    ctx.save(); ctx.shadowColor='rgba(200,60,100,0.45)'; ctx.shadowBlur=8; drawButterfly(x,y,0.95,flap,ang,c); ctx.restore(); });
  for(let i=0;i<6;i++){ const sp=16+rnd(i+3)*12, span=FLOOR-EDGE+40, y=EDGE-20+((t*sp+rnd(i)*span)%span);
    const x=rnd(i+20)*W+Math.sin(t*1.1+i*2)*24, r=t*2+i;
    ell(x,y,4.5,2.4*Math.abs(Math.cos(r)),i%2?'rgba(150,26,52,0.85)':'rgba(196,52,77,0.85)',Math.sin(r)*0.8); }   // 薔薇の花びら
  ctx.restore();
}

/* 木目のある木箱（engine の箱を上から描き直す。つぶれ・のびもそのまま） */
function drawCrate(b){
  const sx=b.squash||1, sy=2-sx, w=b.w*sx, h=b.h*sy, x=b.x+b.w/2-w/2, y=b.y+b.h/2-h/2;
  ctx.save();
  GT.roundRect(x,y,w,h,4); ctx.fillStyle='#a07a4a'; ctx.fill();
  ctx.strokeStyle='#5a3f22'; ctx.lineWidth=2.2; ctx.stroke();
  ctx.strokeStyle='rgba(90,63,34,0.45)'; ctx.lineWidth=1;                          // 板の継ぎ目
  for(let i=1;i<3;i++){ ctx.beginPath(); ctx.moveTo(x+3,y+h*i/3); ctx.lineTo(x+w-3,y+h*i/3); ctx.stroke(); }
  ctx.strokeStyle='#6b4a2b'; ctx.lineWidth=3;                                      // すじかい
  ctx.beginPath(); ctx.moveTo(x+4,y+h-4); ctx.lineTo(x+w-4,y+4); ctx.stroke();
  ctx.fillStyle='rgba(255,240,210,0.18)'; ctx.fillRect(x+3,y+2,w-6,2);
  ctx.fillStyle='#3a2a18'; for(const [px,py] of [[x+4,y+4],[x+w-4,y+4],[x+4,y+h-4],[x+w-4,y+h-4]]){ ctx.beginPath(); ctx.arc(px,py,1.4,0,Math.PI*2); ctx.fill(); }
  ctx.restore();
}

/* 明るい場面では、森の絵（岩・幹・木の上・つる・丸太・木箱）に、紙を切って重ねたような影をつける */
const paperWrap=fn=>function(){ if(!brightNow()) return fn.apply(this,arguments); ctx.save(); paperShadow(ctx); const r=fn.apply(this,arguments); ctx.restore(); return r; };
api.forest={ butterfly:drawButterfly, rock:paperWrap(drawRock), trunk:paperWrap(drawTrunk), crown:paperWrap(drawCrown), vine:paperWrap(drawVine), log:paperWrap(drawLog), crate:paperWrap(drawCrate), ground:drawGround, air:drawAir };
})();

/* ===== ゲーム本体に組み込む（engine.js があるときだけ動く） =============== */
if(window.GT && GT.registerDraw){
  function drawLayer(layer){
    const sc=GT.scene; if(!sc||!sc.stage) return;
    const def=GT.STAGE_DEFS[sc.stage]; if(!def||!def.decor) return;
    const dim = GT.isBright && !GT.isBright();                                  // ゴシックの場面では、草や葉の飾りを暗く・色をおさえる（ポップになりすぎないように）
    if(dim){ GT.ctx.save(); GT.ctx.filter='saturate(0.4) brightness(0.55)'; }
    else { GT.ctx.save(); const c=GT.ctx; GT.castShadow&&GT.castShadow(c); }                               // 明るい場面：紙を切って重ねたような影
    for(const d of def.decor){ if((d.layer||'back')===layer) api.draw(GT.ctx,d.kind,d.x,d.y,d.w,d.h); }
    GT.ctx.restore();
  }
  GT.registerDraw(()=>drawLayer('back'),  'back');     // 地形より奥
  GT.registerDraw(()=>drawLayer('front'), 'overlay');  // プレイヤーより手前
}
})();
