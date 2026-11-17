/* ============================================================================
   Gravity Tale ── 本の挿絵 (bookart.js)
   ----------------------------------------------------------------------------
   「本を読みかえす」画面（bookview.js）で、埋まったページに載せる挿絵。
   ページの key（playlist.js の GT.definePages）ごとに、その場面の特徴的なところを描く。
   分岐（GT.flags）によって、絵も変わる（狼に告げたか・戸口で止めたか・結末など）。

   挿絵を足す・変えるときは、下の SCENES に key と描く関数を書くだけ。
     SCENES.key = (c, A) => { ... }   … c は 600×330 のキャンバス、A は画像と小道具
   背景画像・立ち絵は assets/background/ と assets/character/ のものを使う。
   読み込む順番：bookview.js の前。
   ========================================================================== */
(function(){
"use strict";
const AW=600, AH=330;                    // 挿絵の大きさ
const SRC={
  day:'assets/background/ohiru no mori.webp', eve:'assets/background/yuugata no mori.webp', castle:'assets/background/水彩で描く静かな森と遠い城.webp',
  boy:{src:'assets/character/syuzinkou1.webp', box:[3,15,282,402]},   // 主人公（ちびキャラ・立ち姿。box はゲームと同じ、余白を切った範囲）
  // ゲームの中と同じ二頭身の絵（マリミニ (1)〜(5)）。box＝使う範囲、flip＝左右反転（元の絵はどれも少し左向き）
  mari:  {src:'assets/character/マリミニ (1).webp', box:[6,39,244,361]},
  mother:{src:'assets/character/マリミニ (3).webp', box:[18,13,290,387], flip:true},    // 右向き
  granny:{src:'assets/character/マリミニ (2).webp', box:[43,24,282,378], flip:true},   // 右向き
  hoodR: {src:'assets/character/マリミニ (5).webp', box:[11,4,277,391], flip:true},
  hoodL: {src:'assets/character/マリミニ (5).webp', box:[11,4,277,391]},
  hoodWalkR:{src:'assets/character/マリミニ (4).webp', box:[25,1,295,387], flip:true},
};
const IMG={}, cache={};
let onReady=null;
for(const k in SRC){ const d=typeof SRC[k]==='string'?{src:SRC[k]}:SRC[k], im=new Image(); im._box=d.box; im._flip=!!d.flip; im.onload=()=>{ for(const c in cache) delete cache[c]; if(onReady) onReady(); }; im.src=encodeURI(d.src); IMG[k]=im; }
const ok=im=>im && im.complete && im.naturalWidth>0;

/* ---- 小道具 ---- */
const INK='#3a2a1a';
function bg(c,im,fx,fy,zoom){            // 背景画像を枠いっぱいに（fx,fy は使う位置 0〜1）
  if(!ok(im)){ c.fillStyle='#d8caa4'; c.fillRect(0,0,AW,AH); return; }
  const s=Math.max(AW/im.naturalWidth, AH/im.naturalHeight)*(zoom||1), w=im.naturalWidth*s, h=im.naturalHeight*s;
  c.drawImage(im, -(w-AW)*(fx==null?0.5:fx), -(h-AH)*(fy==null?0.5:fy), w, h);
}
function wash(c,col){ c.fillStyle=col; c.fillRect(0,0,AW,AH); }
function ell(c,x,y,rx,ry,col,rot){ c.beginPath(); c.ellipse(x,y,rx,ry,rot||0,0,Math.PI*2); c.fillStyle=col; c.fill(); }
function rr(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function inked(c,fill,lw){ c.fillStyle=fill; c.fill(); c.strokeStyle=INK; c.lineWidth=lw||2; c.stroke(); }
// 立ち絵を、足もと(x,y)・高さ h で置く（clip は上から何割まで見せるか）
function figure(c,im,x,y,h,opt){
  if(!ok(im)) return; opt=opt||{};
  const [bx,by,bx1,by1]=im._box||[0,0,im.naturalWidth,im.naturalHeight], bw=bx1-bx, bh=by1-by;   // 余白を切って足もとをそろえる
  const s=h/bh, w=bw*s, flip=!!opt.flip!==im._flip;
  c.save(); if(opt.alpha!=null) c.globalAlpha=opt.alpha; if(opt.filter) c.filter=opt.filter;
  if(flip){ c.translate(x,0); c.scale(-1,1); c.drawImage(im,bx,by,bw,bh,-w/2,y-h,w,h); }
  else c.drawImage(im,bx,by,bw,bh,x-w/2,y-h,w,h);
  c.restore();
}
// 少年（ゲームの主人公と同じ形）。lying で寝ころぶ。s=1.4 で、となりに立つ人物（高さ 150）と同じくらい
const BOY_H=108;
function boy(c,x,y,s,opt){
  opt=opt||{};
  if(ok(IMG.boy)){                                   // 主人公のちびキャラの絵（syuzinkou1）。ほかの人物（2頭身の絵）と同じくらいの大きさ：高さ 108×s
    const h=BOY_H*s;
    if(opt.lying){ c.save(); c.translate(x,y); c.rotate(-Math.PI/2); figure(c,IMG.boy,0,h*0.25,h); c.restore(); }
    else figure(c,IMG.boy,x,y,h);
    return;
  }
  c.save(); c.translate(x,y); c.scale(s*(opt.face||1),s);
  if(opt.lying){ c.rotate(-Math.PI/2); }
  rr(c,-15,-40,30,40,10); inked(c,'#2b2e4a',2.2);
  c.beginPath(); c.moveTo(-5,-40); c.lineTo(0,-51); c.lineTo(5,-40); c.closePath(); c.fillStyle='#b08d57'; c.fill();
  ell(c,-5,-24,2.6,2.6,'#e8dcc0'); ell(c,5,-24,2.6,2.6,'#e8dcc0');
  if(opt.book){ c.save(); c.translate(11,-12); c.rotate(-0.2);
    rr(c,-2,-9,20,14,2); inked(c,'#f3ead3',1.4); c.beginPath(); c.moveTo(8,-9); c.lineTo(8,5); c.strokeStyle=INK; c.lineWidth=1; c.stroke(); c.restore(); }
  c.restore();
}
function mari(c,x,y,s){
  c.save(); c.translate(x,y); c.scale(s,s);
  rr(c,-15,-40,30,40,10); inked(c,'#4a4e6d',2.2);
  c.beginPath(); c.moveTo(-5,-40); c.lineTo(0,-50); c.lineTo(5,-40); c.closePath(); c.fillStyle='#a9b0d6'; c.fill();
  ell(c,-5,-25,2.6,2.6,'#e8dcc0'); ell(c,5,-25,2.6,2.6,'#e8dcc0');
  c.restore();
}
// 狼のかげ（横向き）。face=1 で右向き
function wolf(c,x,y,s,face){
  c.save(); c.translate(x,y); c.scale(s*(face||1),s);
  c.beginPath();
  c.moveTo(-70,-8); c.quadraticCurveTo(-100,-30,-118,-14); c.quadraticCurveTo(-98,-22,-78,-2);        // しっぽ
  c.lineTo(-62,0); c.lineTo(-60,40); c.lineTo(-50,40); c.lineTo(-46,6);                               // 後ろ足
  c.lineTo(20,6); c.lineTo(24,40); c.lineTo(34,40); c.lineTo(36,0);                                    // 前足
  c.quadraticCurveTo(48,-14,50,-30); c.lineTo(76,-26); c.lineTo(80,-34); c.lineTo(56,-46);            // 鼻先
  c.lineTo(52,-62); c.lineTo(44,-48); c.lineTo(38,-60); c.lineTo(32,-44);                               // 耳
  c.quadraticCurveTo(0,-34,-70,-30); c.closePath();
  c.fillStyle='#2a2420'; c.fill(); c.strokeStyle='rgba(20,14,8,0.8)'; c.lineWidth=2; c.stroke();
  ell(c,50,-38,3.2,2.2,'#f2c14e'); c.globalAlpha=0.35; ell(c,50,-38,8,6,'#f2c14e'); c.globalAlpha=1;   // 光る目
  c.restore();
}
// おばあさんの家（外）：ゲームの家と同じ、石積みの壁・わらぶき屋根・緑のよろい戸・花の箱・アーチの戸。
// door: 'closed' / 'ajar'（すきまに目）/ 'open'。lit で窓に明かり
function cottage(c,x,y,s,door,lit){
  c.save(); c.translate(x,y); c.scale(s,s);
  let sd=11; const R=()=>{ sd=(sd*9301+49297)%233280; return sd/233280; };
  // 煙突（石）
  c.beginPath(); c.rect(52,-176,24,60); inked(c,'#8c806e',1.8); c.fillStyle='#5f564a'; c.fillRect(48,-182,32,7);
  // 石の壁
  c.save(); c.beginPath(); c.rect(-110,-112,220,112); c.clip();
  c.fillStyle='#6e6658'; c.fillRect(-110,-112,220,112);
  for(let yy=-112; yy<0; ){ const h=10+R()*4; let xx=-114-R()*12;
    while(xx<112){ const w=14+R()*14; rr(c,xx+1,yy+1,w-2,h-2,Math.min(4,h*0.4)); c.fillStyle=['#b3a891','#a89d86','#bdb29b','#9f947e','#c4b9a1'][Math.floor(R()*5)]; c.fill();
      c.strokeStyle='rgba(60,50,40,0.45)'; c.lineWidth=0.8; c.stroke(); xx+=w; }
    yy+=h; }
  const sh=c.createLinearGradient(0,-112,0,-82); sh.addColorStop(0,'rgba(40,30,20,0.5)'); sh.addColorStop(1,'rgba(40,30,20,0)'); c.fillStyle=sh; c.fillRect(-110,-112,220,30);
  c.restore(); c.beginPath(); c.rect(-110,-112,220,112); c.strokeStyle=INK; c.lineWidth=2.2; c.stroke();
  // わらぶき屋根（ふっくら）
  c.beginPath(); c.moveTo(-130,-108); c.quadraticCurveTo(-70,-150,-10,-196); c.quadraticCurveTo(0,-202,10,-196); c.quadraticCurveTo(70,-150,130,-108); c.closePath();
  const rg=c.createLinearGradient(0,-200,0,-104); rg.addColorStop(0,'#c9a466'); rg.addColorStop(1,'#8f6c3c'); c.fillStyle=rg; c.fill(); c.strokeStyle=INK; c.lineWidth=2.2; c.stroke();
  c.save(); c.clip();
  c.strokeStyle='rgba(110,82,44,0.5)'; c.lineWidth=1.2;
  for(let k=0;k<5;k++){ const yy=-180+k*16; c.beginPath(); for(let xx=-130;xx<=130;xx+=6) xx===-130?c.moveTo(xx,yy+Math.sin(xx*0.1+k)*1.6):c.lineTo(xx,yy+Math.sin(xx*0.1+k)*1.6); c.stroke(); }
  for(let i=0;i<160;i++){ const xx=-125+R()*250, yy=-196+R()*90, d=xx<0?-1:1, l=3+R()*5; c.beginPath(); c.moveTo(xx,yy); c.lineTo(xx+d*l,yy+l*0.55);
    c.strokeStyle=R()<0.5?'rgba(232,206,140,0.4)':'rgba(110,80,42,0.3)'; c.lineWidth=0.8; c.stroke(); }
  c.restore();
  for(let xx=-128; xx<=128; xx+=3.5){ c.beginPath(); c.moveTo(xx,-108); c.lineTo(xx+(R()-0.5)*2,-102+R()*4); c.strokeStyle=R()<0.5?'#a07a44':'#c49c5c'; c.lineWidth=1.6; c.stroke(); }   // 軒先のわら
  c.beginPath(); c.moveTo(-40,-178); c.quadraticCurveTo(0,-208,40,-178); c.strokeStyle='#8a6a3a'; c.lineWidth=6; c.lineCap='round'; c.stroke();   // 棟
  // 窓：緑のよろい戸・十字の桟・花の箱
  const wx=-82, wy=-90, ww=40, wh=32;
  for(const sx of [wx-18, wx+ww+2]){ rr(c,sx,wy-2,16,wh+4,2); inked(c,'#5f7a5a',1.4);
    for(let yy=wy+3; yy<wy+wh; yy+=5){ c.beginPath(); c.moveTo(sx+2,yy); c.lineTo(sx+14,yy); c.strokeStyle='rgba(40,56,36,0.7)'; c.lineWidth=0.8; c.stroke(); } }
  c.beginPath(); c.rect(wx,wy,ww,wh); inked(c, lit?'#f2c97a':'#7a5056',1.8);
  if(!lit){ c.fillStyle='#9b6a6f'; for(let k=0;k<4;k++) c.fillRect(wx+3+k*10,wy+1,4,wh-2); }                     // カーテン
  c.strokeStyle='#4a3a28'; c.lineWidth=2.4; c.beginPath(); c.moveTo(wx+ww/2,wy); c.lineTo(wx+ww/2,wy+wh); c.moveTo(wx,wy+wh/2); c.lineTo(wx+ww,wy+wh/2); c.stroke();
  rr(c,wx-5,wy+wh+3,ww+10,8,2); inked(c,'#7a5434',1.2);
  for(let i=0;i<6;i++){ const fx=wx-2+i*9; ell(c,fx,wy+wh+2,3.4,2.4,'#5d7034'); ell(c,fx,wy+wh-1,2.2,2.2,['#c9503f','#e2a3b6','#f2d27a','#ffffff'][i%4]); }
  // 戸：石のアーチ・板の戸・鉄のちょうつがい
  const dx=30, dw=40, dt=-82;
  for(let i=0;i<=6;i++){ const a=Math.PI+i/6*Math.PI, ax=dx+dw/2+Math.cos(a)*(dw/2+6), ay=dt+dw/2+Math.sin(a)*(dw/2+6);
    ell(c,ax,ay,6,5,i===3?'#d0c4a8':'#b8ac92'); }
  const arch=()=>{ c.beginPath(); c.moveTo(dx,0); c.lineTo(dx,dt+dw/2); c.arc(dx+dw/2,dt+dw/2,dw/2,Math.PI,0); c.lineTo(dx+dw,0); c.closePath(); };
  arch(); inked(c,'#2a221a',2);
  const open = door==='open'?0.85 : door==='ajar'?0.3 : 0;
  if(open>0){ const g=c.createLinearGradient(0,dt,0,0); g.addColorStop(0,'rgba(242,201,122,0.9)'); g.addColorStop(1,'rgba(242,201,122,0.45)'); arch(); c.fillStyle=g; c.fill(); }
  c.save(); arch(); c.clip(); const pw=dw*(1-open*0.8);
  c.fillStyle='#5e3a28'; c.fillRect(dx,dt,pw,-dt); c.strokeStyle='rgba(30,18,10,0.45)'; c.lineWidth=1.2;
  for(let i=1;i<4;i++){ c.beginPath(); c.moveTo(dx+pw*i/4,dt); c.lineTo(dx+pw*i/4,0); c.stroke(); }
  c.fillStyle='#2e2620'; c.fillRect(dx,dt+20,pw*0.7,3); c.fillRect(dx,-16,pw*0.7,3);
  c.restore();
  if(door==='ajar'){ ell(c,dx+pw+6,dt+34,2.4,1.6,'#f2c14e'); ell(c,dx+pw+11,dt+33,2.4,1.6,'#f2c14e'); }        // すきまに光る目
  // ランプ・つた・植木鉢
  c.fillStyle='#3a2f26'; c.fillRect(dx-16,dt+2,2,8); rr(c,dx-19,dt+10,8,10,1); inked(c,'#f0d9a0',1.2);
  c.strokeStyle='#4a4a24'; c.lineWidth=1.6; c.beginPath(); c.moveTo(-104,0); c.quadraticCurveTo(-96,-50,-102,-96); c.stroke();
  for(let i=0;i<8;i++) ell(c,-102+(i%2?5:-3),-8-i*11,3.6,2.6,i%3?'#5d7034':'#7f9040',i%2?0.5:-0.5);
  c.beginPath(); c.moveTo(dx+dw+8,-12); c.lineTo(dx+dw+22,-12); c.lineTo(dx+dw+20,0); c.lineTo(dx+dw+10,0); c.closePath(); c.fillStyle='#b0643e'; c.fill();
  ell(c,dx+dw+15,-16,7,5,'#5d7034'); ell(c,dx+dw+13,-19,2.2,2.2,'#c9503f'); ell(c,dx+dw+18,-18,2.2,2.2,'#c9503f');
  c.restore();
}
// 赤ずきんの家（窓のまわり）：しっくいの壁に木の梁、赤いよろい戸、赤い瓦の軒
function hoodHouseWall(c){
  c.fillStyle='#e6d4ae'; c.fillRect(110,0,AW-110,AH);
  for(let i=0;i<80;i++) ell(c,110+Math.random()*(AW-110),Math.random()*AH,2+Math.random()*6,1+Math.random()*2,'rgba(170,140,96,0.12)');
  c.strokeStyle='#5e432c'; c.lineWidth=10;
  c.beginPath(); c.moveTo(118,0); c.lineTo(118,AH); c.moveTo(110,46); c.lineTo(AW,46); c.moveTo(110,AH-22); c.lineTo(AW,AH-22); c.stroke();
  c.lineWidth=7; c.beginPath(); c.moveTo(126,AH-26); c.lineTo(172,52); c.stroke();                                   // 筋かい
  // 赤い瓦の軒
  c.save(); c.beginPath(); c.rect(110,0,AW-110,40); c.clip();
  for(let row=0, y=-8; y<40; y+=10, row++) for(let x=110-(row%2)*8; x<AW+16; x+=16){
    c.beginPath(); c.moveTo(x,y); c.lineTo(x,y+6); c.arc(x+8,y+6,8,Math.PI,0,true); c.lineTo(x+16,y); c.closePath();
    c.fillStyle=['#a8503f','#b45a46','#9c4a3a','#bd6650'][(row+Math.floor(x/16))%4]; c.fill(); c.strokeStyle='rgba(60,24,16,0.5)'; c.lineWidth=0.8; c.stroke(); }
  c.restore(); c.fillStyle='#4e3626'; c.fillRect(110,38,AW-110,6);
  // 赤いよろい戸
  for(const sx of [140,544]){ rr(c,sx,64,40,230,3); inked(c,'#9a4a3e',2);
    for(let y=74;y<290;y+=9){ c.beginPath(); c.moveTo(sx+5,y); c.lineTo(sx+35,y); c.strokeStyle='rgba(70,24,18,0.55)'; c.lineWidth=1.2; c.stroke(); }
    c.strokeStyle='#5e2a22'; c.lineWidth=2; c.beginPath(); c.moveTo(sx+6,70); c.lineTo(sx+34,288); c.stroke(); }
}
// 部屋の中（おばあさんの家）
function room(c,warm){
  const g=c.createLinearGradient(0,0,0,AH); g.addColorStop(0,warm?'#a8805a':'#5a4a40'); g.addColorStop(1,warm?'#7a5638':'#3a2e28'); c.fillStyle=g; c.fillRect(0,0,AW,AH);
  c.strokeStyle='rgba(30,18,8,0.25)'; c.lineWidth=2; for(let x=0;x<AW;x+=46){ c.beginPath(); c.moveTo(x,0); c.lineTo(x,AH*0.72); c.stroke(); }  // 板壁
  c.fillStyle=warm?'#6a4a2e':'#3a2e26'; c.fillRect(0,AH*0.72,AW,AH*0.28);                                                                          // 床
  c.strokeStyle='rgba(20,12,6,0.3)'; for(let y=AH*0.72;y<AH;y+=16){ c.beginPath(); c.moveTo(0,y); c.lineTo(AW,y); c.stroke(); }
  // 暖炉
  c.beginPath(); c.rect(40,120,130,118); inked(c,'#8a7a6a',2.4);
  rr(c,62,160,86,78,30); inked(c,'#1e1610',2);
  if(warm){ const f=c.createRadialGradient(105,225,4,105,220,60); f.addColorStop(0,'rgba(255,200,90,0.95)'); f.addColorStop(1,'rgba(255,140,40,0)');
    c.fillStyle=f; c.fillRect(40,150,140,90);
    c.beginPath(); c.moveTo(85,236); c.quadraticCurveTo(92,200,104,186); c.quadraticCurveTo(110,206,126,236); c.closePath(); c.fillStyle='#f2a63a'; c.fill();
    const glow=c.createRadialGradient(105,220,10,105,220,260); glow.addColorStop(0,'rgba(255,190,90,0.35)'); glow.addColorStop(1,'rgba(255,190,90,0)'); c.fillStyle=glow; c.fillRect(0,0,AW,AH); }
  c.beginPath(); c.rect(30,110,150,12); inked(c,'#6a4a2e',2);
}
function bed(c,x,y,empty,cloth){
  c.beginPath(); c.rect(x,y-60,190,60); inked(c,'#7a5232',2.2);
  c.beginPath(); c.rect(x-6,y-110,16,110); inked(c,'#6a4a2e',2);
  rr(c,x+8,y-84,178,30,8); inked(c,'#efe4c8',2);                                                // ふとん
  rr(c,x+14,y-98,46,22,8); inked(c,'#f6eed8',1.6);                                              // まくら
  if(!empty){ c.beginPath(); c.moveTo(x+70,y-84); c.quadraticCurveTo(x+130,y-112,x+186,y-84); inked(c,'#d9cba6',2); }
  if(cloth==='shawl'){ c.beginPath(); c.moveTo(x+90,y-56); c.quadraticCurveTo(x+120,y-70,x+150,y-54); c.lineTo(x+156,y-20); c.quadraticCurveTo(x+122,y-34,x+86,y-22); c.closePath(); inked(c,'#9a7a9a',1.8); }
  if(cloth==='hood'){ c.beginPath(); c.moveTo(x+70,y-80); c.quadraticCurveTo(x+110,y-112,x+150,y-80); c.lineTo(x+160,y-56); c.quadraticCurveTo(x+110,y-64,x+62,y-56); c.closePath(); inked(c,'#b8423f',1.8); }
}
// 部屋の窓（近道で着いたら昼の青空、遠回りなら夕焼け）
function roomWindow(c,noon){
  const g=c.createLinearGradient(0,60,0,140);
  if(noon){ g.addColorStop(0,'#9cc4dc'); g.addColorStop(1,'#d8e8e4'); } else { g.addColorStop(0,'#c8785a'); g.addColorStop(1,'#f0c48a'); }
  c.beginPath(); c.rect(250,60,90,80); c.fillStyle=g; c.fill(); c.strokeStyle=INK; c.lineWidth=2; c.stroke();
  ell(c,noon?318:300,noon?82:124,10,10,noon?'rgba(255,250,225,0.9)':'rgba(255,214,140,0.95)');
  c.strokeStyle='#5a3f22'; c.lineWidth=4; c.beginPath(); c.moveTo(295,60); c.lineTo(295,140); c.moveTo(250,100); c.lineTo(340,100); c.stroke();
}
// 外（結末のあと）：近道なら夕暮れ、遠回りなら夜明け。丘と、おばあさんの家のかげ
function outside(c,dusk){
  const sky=c.createLinearGradient(0,0,0,AH);
  if(dusk){ sky.addColorStop(0,'#7a5c78'); sky.addColorStop(0.55,'#e08a5a'); sky.addColorStop(1,'#f2b878'); }
  else { sky.addColorStop(0,'#5a6488'); sky.addColorStop(0.55,'#d9a27a'); sky.addColorStop(1,'#efd2a0'); }
  c.fillStyle=sky; c.fillRect(0,0,AW,AH);
  ell(c,460,250,60,60,dusk?'rgba(255,170,100,0.8)':'rgba(255,230,170,0.75)');
  c.fillStyle='rgba(70,64,60,0.55)'; c.beginPath(); c.moveTo(0,AH); c.quadraticCurveTo(200,190,380,236); c.quadraticCurveTo(500,262,AW,210); c.lineTo(AW,AH); c.closePath(); c.fill();
  c.fillStyle='rgba(60,52,44,0.9)'; c.fillRect(70,214,64,40); c.beginPath(); c.moveTo(62,216); c.lineTo(102,186); c.lineTo(142,216); c.closePath(); c.fill();
  c.fillStyle='rgba(255,200,110,0.85)'; c.fillRect(90,226,10,10);
  for(const [x,y,r] of [[30,170,40],[250,190,34],[560,160,46]]){ c.fillStyle='rgba(50,56,44,0.7)'; c.fillRect(x-3,y,6,AH-y); ell(c,x,y,r*0.7,r,'rgba(50,56,44,0.7)'); }
  c.fillStyle='rgba(60,50,40,0.35)'; c.fillRect(0,AH-24,AW,24);
}
function pages(c,list){ for(const [x,y,r] of list){ c.save(); c.translate(x,y); c.rotate(r); c.fillStyle='#f6eed8'; c.fillRect(-14,-5,28,9);
  c.strokeStyle='rgba(90,74,51,0.6)'; c.lineWidth=1; c.strokeRect(-14,-5,28,9); c.restore(); } }
function rays(c,list,col){ c.save(); c.globalCompositeOperation='lighter';
  for(const [x,w] of list){ const g=c.createLinearGradient(0,0,0,AH); g.addColorStop(0,col); g.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=g; c.beginPath(); c.moveTo(x,0); c.lineTo(x+w,0); c.lineTo(x+w-80,AH); c.lineTo(x-120,AH); c.closePath(); c.fill(); }
  c.restore(); }
function flowers(c,list){ const fc=['#e8c35a','#c98bb0','#f3ead0','#d98a90'];
  for(const [x,y,k] of list){ c.strokeStyle='#5e7d44'; c.lineWidth=1.4; c.beginPath(); c.moveTo(x,y); c.lineTo(x,y-12); c.stroke();
    for(let a=0;a<5;a++) ell(c,x+Math.cos(a*1.26)*3.4,y-12+Math.sin(a*1.26)*3.4,2.6,2.6,fc[k%4]); ell(c,x,y-12,1.8,1.8,'#8a6a2a'); } }

/* ---- 場面ごとの挿絵 ---------------------------------------------------- */
const SCENES={
  // 序：森で目を覚ます少年と、木の陰からのぞくマリ
  prologue(c){
    bg(c,IMG.day,0.25,0.75,1.1); wash(c,'rgba(244,236,214,0.15)');
    rays(c,[[150,60],[330,40]],'rgba(255,236,170,0.22)');
    pages(c,[[120,300,-0.3],[260,312,0.2],[340,296,0.5],[90,270,0.1]]);
    boy(c,210,272,1.25,{lying:true,book:true});
    // マリ（木の幹のうしろに立っていて、体の半分が幹にかくれている＝木のかげからのぞいている）
    if(ok(IMG.mari)) figure(c,IMG.mari,482,306,150); else mari(c,482,300,1.5);
    // 木の幹（マリより手前）
    c.beginPath(); c.moveTo(470,AH); c.lineTo(486,60); c.lineTo(548,60); c.lineTo(566,AH); c.closePath(); inked(c,'#5a4632',2.4);
    c.strokeStyle='rgba(30,20,10,0.35)'; c.lineWidth=1.4; for(let i=0;i<4;i++){ c.beginPath(); c.moveTo(498+i*12,90); c.lineTo(494+i*13,AH); c.stroke(); }
    for(const [x,y,r,col] of [[515,40,80,'#4d6843'],[440,70,56,'#5b7a4e'],[590,60,56,'#5b7a4e']]) ell(c,x,y,r,r*0.8,col);
  },
  // 森の小道：本を裏返して、天井を歩く少年（ひとりだけ）。道をふさぐ大木と、押して動かす木箱
  komichi(c){
    bg(c,IMG.day,0.45,0.7,1.1); wash(c,'rgba(244,236,214,0.15)');
    rays(c,[[220,50],[430,40]],'rgba(255,236,170,0.2)');
    c.fillStyle='rgba(150,120,80,0.32)'; c.beginPath(); c.moveTo(0,AH); c.quadraticCurveTo(300,282,AW,300); c.lineTo(AW,AH); c.closePath(); c.fill();   // 小道
    c.beginPath(); c.moveTo(212,AH); c.lineTo(222,40); c.lineTo(262,40); c.lineTo(274,AH); c.closePath(); inked(c,'#5a4632',2.4);                  // 道をふさぐ大木
    for(const [x,y,r,col] of [[242,96,66,'#4d6843'],[192,128,44,'#5b7a4e'],[294,122,46,'#5b7a4e']]) ell(c,x,y,r,r*0.75,col);
    rr(c,350,74,190,22,9); inked(c,'#6f8a5a',2);                                                                    // 天井からさがる足場（本を裏返すと、ここが床になる）
    c.save(); c.translate(0,2*96); c.scale(1,-1); boy(c,440,96,1.3,{face:1}); c.restore();                        // 天井を歩く少年（さかさま）
    rr(c,470,262,48,46,4); inked(c,'#9a7448',2);                                                                    // 木箱
    c.strokeStyle='rgba(60,40,20,0.6)'; c.lineWidth=2; c.beginPath(); c.moveTo(470,262); c.lineTo(518,308); c.moveTo(518,262); c.lineTo(470,308); c.stroke();
    flowers(c,[[40,318,0],[86,324,1],[560,320,2],[590,316,3]]);
  },
  // 窓の向こう：お母さんが、赤ずきんにお使いを頼む
  window(c){
    bg(c,IMG.day,0.75,0.4,1); wash(c,'rgba(244,236,214,0.2)');
    hoodHouseWall(c);                                                                                        // 赤ずきんの家（木組みの壁）
    // 窓の中
    c.save(); c.beginPath(); c.rect(190,70,350,210); c.clip();
    const g=c.createLinearGradient(0,70,0,280); g.addColorStop(0,'#c8a070'); g.addColorStop(1,'#8a6440'); c.fillStyle=g; c.fillRect(190,70,350,210);
    ell(c,450,140,90,70,'rgba(255,220,150,0.35)');
    figure(c,IMG.mother,290,282,205); figure(c,IMG.hoodL,450,282,190);                                    // お母さんと赤ずきん（ゲームと同じ 2頭身）

    c.restore();
    c.beginPath(); c.rect(190,70,350,210); c.strokeStyle='#5a3f22'; c.lineWidth=10; c.stroke();             // 窓わく
    c.lineWidth=5; c.beginPath(); c.moveTo(365,70); c.lineTo(365,280); c.stroke();
    c.beginPath(); c.rect(176,280,378,16); inked(c,'#7a5232',2);                                            // 窓台（花の箱）
    for(let i=0;i<14;i++){ const fx=186+i*26; ell(c,fx,280,9,5,'#57644a'); ell(c,fx,274,4.4,4.4,['#c9503f','#e8c35a','#e2a3b6','#ffffff'][i%4]); }
    // のぞく少年（手前の左）
    boy(c,72,AH+6,1.7,{face:1});
  },
  // 赤い頭巾の少女：水たまりの上を、一緒に
  meet(c){
    bg(c,IMG.day,0.6,0.8,1.15); wash(c,'rgba(244,236,214,0.12)');
    ell(c,250,300,190,26,'rgba(120,150,170,0.55)'); ell(c,250,296,170,18,'rgba(200,220,230,0.35)');    // 水たまり
    flowers(c,[[40,316,0],[70,322,1],[540,318,2],[570,324,3],[512,326,1]]);
    figure(c,IMG.hoodWalkR,430,316,210);                                                                     // 歩いていく赤ずきん（2頭身）
    boy(c,200,286,1.85,{face:1});                                                                            // 赤ずきんと同じくらいの高さ
    c.save(); c.globalAlpha=0.35; c.translate(0,572); c.scale(1,-1); boy(c,200,286,1.85,{face:1}); c.restore();   // 水にうつる
  },
  // 森で出会った狼：告げたか、黙ったか
  wolf(c,f){
    bg(c,IMG.day,0.35,0.6,1.1); wash(c,'rgba(40,24,30,0.08)');   // 昼の森
    ell(c,300,330,320,40,'rgba(20,12,10,0.35)');
    if(f.warnedHood){
      wolf(c,470,262,1.25,-1);
      figure(c,IMG.hoodR,150,318,190,{filter:'brightness(0.92)'});
      boy(c,300,300,1.7,{face:1});
      c.font="700 40px 'Zen Old Mincho',serif"; c.fillStyle='#f3ead0'; c.textAlign='center'; c.fillText('！',300,200);
    } else {
      wolf(c,500,262,1.1,1);                                                                             // 脇道へ去っていく
      figure(c,IMG.hoodR,200,318,190,{filter:'brightness(0.92)'});
      boy(c,340,300,1.7,{face:1});
    }
  },
  // おばあさんの家の前
  front(c,f){
    if(f.route==='shortcut'){ bg(c,IMG.day,0.85,0.5,1.05); wash(c,'rgba(40,24,30,0.06)'); }   // 近道：まだ昼
    else { bg(c,IMG.eve,0.85,0.5,1.05); wash(c,'rgba(40,24,30,0.18)'); }                      // 遠回り：夕方
    cottage(c,370,306,1.2, f.stoppedAtDoor?'ajar':(f.route==='shortcut'?'ajar':'open'), f.route==='shortcut');
    if(f.route==='shortcut'){ boy(c,170,306,1.4,{face:1}); }
    else if(f.stoppedAtDoor){ boy(c,200,306,1.4,{face:1}); figure(c,IMG.hoodR,120,312,150,{filter:'brightness(0.92)'}); }   // 戸の前で止めた
    else { figure(c,IMG.hoodR,410,306,110,{filter:'brightness(0.95)'}); boy(c,150,306,1.3,{face:1}); }             // 赤ずきんが先に入っていく
  },
  // おばあさんの家：無事だったか
  granny(c,f){
    if(f.grannyAlive){ room(c,true); roomWindow(c,f.route==='shortcut'); bed(c,360,300,false); figure(c,IMG.granny,250,306,210); }     // おばあさん（2頭身）
    else { room(c,false); bed(c,360,300,true,'shawl'); wash(c,'rgba(20,24,40,0.25)');
      roomWindow(c,f.route==='shortcut'); }
  },
  // 第一章の結末：外に出て、マリたちと話す（近道=夕暮れ、遠回り=夜明け）。生きている人だけがいる
  result(c,f){
    const dusk=f.route==='shortcut'; outside(c,dusk);
    if(f.ending==='true'){
      figure(c,IMG.granny,150,314,150,{filter:'brightness(0.92)'});                                     // おばあさん（2頭身）
      figure(c,IMG.hoodR,270,314,150);
      boy(c,370,306,1.4,{face:1,book:true});
      figure(c,IMG.mari,470,314,150);
    } else if(f.ending==='normal'){
      figure(c,IMG.hoodR,220,314,150,{filter:'saturate(0.85)'});
      c.save(); c.translate(222,262); c.beginPath(); c.ellipse(0,0,24,12,0.15,0,Math.PI*2); inked(c,'#9a7a9a',1.6); c.restore();   // 胸に抱いた肩掛け
      boy(c,340,306,1.4,{face:1,book:true});
      figure(c,IMG.mari,460,314,150);
    } else {
      wash(c,'rgba(20,20,40,0.25)');
      c.save(); c.translate(250,300); c.rotate(-0.15); c.beginPath(); c.moveTo(-26,0); c.quadraticCurveTo(0,-30,26,0); c.lineTo(20,8); c.lineTo(-20,8); c.closePath(); inked(c,'#b8423f',1.8); c.restore();   // 手に残った赤い頭巾
      boy(c,300,306,1.4,{face:1,book:true});
      figure(c,IMG.mari,450,314,150,{filter:'brightness(0.9)'});
    }
  },
};

/* ---- 仕上げ：紙の色をかぶせ、ふちを刷毛のようにぼかす ---- */
function mask(){
  const m=document.createElement('canvas'); m.width=AW; m.height=AH; const p=m.getContext('2d');
  p.filter='blur(7px)'; p.fillStyle='#000';
  p.beginPath(); const pad=16, n=40;
  for(let i=0;i<=n;i++){ const t=i/n, a=t*Math.PI*2, rx=AW/2-pad, ry=AH/2-pad;
    const k=0.97+Math.sin(i*7.3)*0.02+Math.sin(i*2.1)*0.015, sq=Math.pow(Math.abs(Math.cos(a)),0.4)*Math.sign(Math.cos(a)), sy=Math.pow(Math.abs(Math.sin(a)),0.4)*Math.sign(Math.sin(a));
    p.lineTo(AW/2+sq*rx*k, AH/2+sy*ry*k); }
  p.closePath(); p.fill();
  return m;
}
let MASK=null;
function render(key,flags){
  const draw=SCENES[key]; if(!draw) return null;
  const id=key+'|'+JSON.stringify(flags||{});
  if(cache[id]) return cache[id];
  const cv=document.createElement('canvas'); cv.width=AW; cv.height=AH;
  const c=cv.getContext('2d');
  c.save(); draw(c, flags||{}); c.restore();
  c.fillStyle='rgba(240,228,200,0.12)'; c.fillRect(0,0,AW,AH);                  // 古い紙の色
  if(!MASK) MASK=mask();
  c.globalCompositeOperation='destination-in'; c.drawImage(MASK,0,0);
  return (cache[id]=cv);
}

/* bookview.js から使う：GT.bookArt.has(key) / GT.bookArt.mount(canvas要素, key) */
GT.bookArt={
  W:AW, H:AH,
  has:key=>!!SCENES[key],
  mount(el,key){ const src=render(key,GT.flags); if(!src) return; el.width=AW; el.height=AH; const c=el.getContext('2d'); c.clearRect(0,0,AW,AH); c.drawImage(src,0,0); },
  onReady(fn){ onReady=fn; },
  SCENES,
};
})();
