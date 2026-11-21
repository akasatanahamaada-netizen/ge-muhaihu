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
  dark:'assets/background/霧深き森のゴシック童話.webp',   // 序章の、霧の深い暗い森（ゲームと同じ絵）
  day:'assets/background/ohiru no mori.webp', eve:'assets/background/yuugata no mori.webp', castle:'assets/background/水彩で描く静かな森と遠い城.webp',
  boy:{src:'assets/character/syuzinkou1.webp', box:[3,15,282,402]},   // 主人公（ちびキャラ・立ち姿。box はゲームと同じ、余白を切った範囲）
  // ゲームの中と同じ二頭身の絵（マリミニ (1)〜(5)）。box＝使う範囲、flip＝左右反転（元の絵はどれも少し左向き）
  mari:  {src:'assets/character/マリミニ (1).webp', box:[6,39,244,361]},
  mother:{src:'assets/character/マリミニ (3).webp', box:[18,13,290,387], flip:true},    // 右向き
  granny:{src:'assets/character/マリミニ (2).webp', box:[43,24,282,378], flip:true},   // 右向き
  hoodR: {src:'assets/character/マリミニ (5).webp', box:[11,4,277,391], flip:true},
  hoodL: {src:'assets/character/マリミニ (5).webp', box:[11,4,277,391]},
  hoodWalkR:{src:'assets/character/マリミニ (4).webp', box:[25,1,295,387], flip:true},
  wolf:   {src:'assets/character/狼ミニ.webp',     box:[11,1,266,392]},     // 狼（左向き。ゲームと同じ 2頭身）
  wolfRun:{src:'assets/character/狼ミニ走る.webp', box:[0,6,280,392]},      // 走る狼（左向き）
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
// 狼（ゲームと同じ 2頭身の絵）。(x, 足もと y)、s=大きさ、face=1 で右向き、run で走る絵
const WOLF_ART_H=170;
function wolf(c,x,y,s,face,run){
  const im=run?IMG.wolfRun:IMG.wolf;
  if(ok(im)){ figure(c,im,x,y,WOLF_ART_H*s,{flip:(face||-1)>0}); return; }
  wolfShadow(c,x,y-40*s,s,face);                       // 絵がまだ読みこめていないときだけ、かげ絵
}
function wolfShadow(c,x,y,s,face){
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
  c.save(); c.filter=dusk?'brightness(0.5) saturate(0.6) sepia(0.3)':'brightness(0.55) saturate(0.5)'; c.globalAlpha=0.85;   // 夕暮れ・夜明けの逆光の木
  for(const [x,y,w,h] of [[-10,120,90,190],[214,150,76,150],[520,104,100,210]]) if(window.GTDecor) GTDecor.draw(c,'tree',x,y,w,h);
  c.restore();
  c.fillStyle='rgba(60,50,40,0.35)'; c.fillRect(0,AH-24,AW,24);
}
/* 木（ゲームの木と同じ描き方：stages/_decor.js の GTDecor.paint）。x=幹の左、top〜bot=幹、w=幹の太さ、
   crown=[[中心x,中心y,横の半径,たての半径],...] 葉の茂み。読みこまれていなければ、だ円だけ */
function tree(c,x,top,bot,w,crown,seed){
  const P=window.GTDecor && GTDecor.paint;
  if(P){ P.trunk(c,x,top,bot,w,seed); P.canopy(c,crown.map(([cx,cy,rx,ry])=>({x:cx,y:cy,rx,ry})),seed); return; }
  c.beginPath(); c.rect(x,top,w,bot-top); inked(c,'#5a4632',2.4);
  for(const [cx,cy,rx,ry] of crown) ell(c,cx,cy,rx,ry,'#5b7a4e');
}
/* 丸太（木の皮・切り口の年輪・上に苔）。ゲームの丸太の足場に合わせた色 */
function log(c,x,y,w,h){
  rr(c,x,y,w,h,h/2); const g=c.createLinearGradient(0,y,0,y+h); g.addColorStop(0,'#8a6c48'); g.addColorStop(0.5,'#6e5236'); g.addColorStop(1,'#4e3a26');
  c.fillStyle=g; c.fill(); c.strokeStyle=INK; c.lineWidth=1.8; c.stroke();
  c.strokeStyle='rgba(40,26,14,0.45)'; c.lineWidth=1.2;
  for(let i=0;i<6;i++){ const lx=x+20+i*28; c.beginPath(); c.moveTo(lx,y+4); c.quadraticCurveTo(lx+8,y+h/2,lx+2,y+h-4); c.stroke(); }   // 木の皮のすじ
  ell(c,x+w-h/2,y+h/2,h/2-2,h/2-2,'#c9a66e'); c.strokeStyle='rgba(90,60,30,0.6)'; c.lineWidth=1;                                      // 切り口と年輪
  for(const r of [3,6]){ c.beginPath(); c.arc(x+w-h/2,y+h/2,r,0,Math.PI*2); c.stroke(); }
  c.fillStyle='rgba(110,140,80,0.85)'; for(let i=0;i<8;i++) ell(c,x+14+i*22,y+h-1,9,3.5,'rgba(110,140,80,0.8)');                      // 下がわ（天井では下）に苔
}
/* 木箱（板を打ちつけた箱。ゲームの木箱に合わせる） */
function crate(c,x,y,w,h){
  rr(c,x,y,w,h,3); c.fillStyle='#a07a4c'; c.fill();
  c.strokeStyle='rgba(70,46,24,0.5)'; c.lineWidth=1; for(let i=1;i<4;i++){ c.beginPath(); c.moveTo(x+3,y+h*i/4); c.lineTo(x+w-3,y+h*i/4); c.stroke(); }   // 板のつなぎ目
  c.lineWidth=5; c.strokeStyle='#7a5530'; c.strokeRect(x+3,y+3,w-6,h-6);                                                                      // 枠
  c.beginPath(); c.moveTo(x+6,y+h-6); c.lineTo(x+w-6,y+6); c.stroke();                                                                          // すじかい
  rr(c,x,y,w,h,3); c.strokeStyle=INK; c.lineWidth=1.8; c.stroke();
  c.fillStyle='#4a3420'; for(const [px,py] of [[x+6,y+6],[x+w-6,y+6],[x+6,y+h-6],[x+w-6,y+h-6]]){ c.beginPath(); c.arc(px,py,1.6,0,Math.PI*2); c.fill(); }   // くぎ
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

/* ---- 物の影（ゲームと同じ：光は左下から、影は右上へ。ふちはくっきり） ----
   人物・木・家・丸太・木箱・花などは、描いたあと、その形の影を右上へずらして、うしろに落とす。
   背景の絵の上に影が落ちるので、奥行きが出る。水にうつった姿など、うすく描くもの（globalAlpha が小さいとき）は影を落とさない */
const SH={ dx:13, dy:-9, a:0.55 };
const LAY=[0,1].map(()=>{ const cv=document.createElement('canvas'); cv.width=AW; cv.height=AH; return cv; });
function shadowed(fn){ return function(c,...args){
  if(c._inShadow || c.globalAlpha<0.9) return fn.call(this,c,...args);
  const L=LAY[0], g=L.getContext('2d'), S=LAY[1], sg=S.getContext('2d');
  g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,AW,AH); g._inShadow=true;
  g.setTransform(c.getTransform()); g.filter=c.filter;
  fn.call(this,g,...args);
  g.setTransform(1,0,0,1,0,0); g.filter='none';
  sg.setTransform(1,0,0,1,0,0); sg.clearRect(0,0,AW,AH); sg.globalCompositeOperation='source-over'; sg.drawImage(L,0,0);
  sg.globalCompositeOperation='source-in'; sg.fillStyle=`rgba(10,6,4,${SH.a})`; sg.fillRect(0,0,AW,AH); sg.globalCompositeOperation='source-over';
  c.save(); c.setTransform(1,0,0,1,0,0); c.filter='none'; c.drawImage(S,SH.dx,SH.dy); c.drawImage(L,0,0); c.restore();
}; }
figure=shadowed(figure); boy=shadowed(boy); mari=shadowed(mari); wolf=shadowed(wolf); cottage=shadowed(cottage);
tree=shadowed(tree); log=shadowed(log); crate=shadowed(crate); bed=shadowed(bed);   // 花は小さいので、影を落とさない（影のほうが目立ってしまう）

/* 高い崖（苔むした岩。上に草）。x … 左, top … 上の面, w … 幅, bot … 下のはし */
const cliffRock=shadowed(function(c,x,top,w,bot,seed){
  let sd=seed||5; const R=()=>{ sd=(sd*9301+49297)%233280; return sd/233280; };
  c.beginPath(); c.moveTo(x+4,bot); c.lineTo(x,top+14); c.quadraticCurveTo(x+2,top,x+16,top); c.lineTo(x+w-14,top); c.quadraticCurveTo(x+w,top+2,x+w-2,top+16); c.lineTo(x+w+4,bot); c.closePath();
  const g=c.createLinearGradient(x,0,x+w,0); g.addColorStop(0,'#cbbd98'); g.addColorStop(0.6,'#b3a47e'); g.addColorStop(1,'#8f8262');
  c.fillStyle=g; c.fill(); c.strokeStyle=INK; c.lineWidth=1.8; c.stroke();
  c.strokeStyle='rgba(70,58,40,0.55)'; c.lineWidth=1.3;                                    // 岩のひび
  for(let i=0;i<5;i++){ const yy=top+30+R()*(bot-top-50), xx=x+10+R()*(w-30); c.beginPath(); c.moveTo(xx,yy); c.lineTo(xx+6,yy+8); c.lineTo(xx+2,yy+16); c.stroke(); }
  c.fillStyle='#8aa25a'; rr(c,x-2,top-4,w+4,12,6); c.fill();                               // 上の苔
  c.fillStyle='#6f8a46'; for(let i=0;i<8;i++) ell(c,x+6+i*(w-12)/7,top+7,6,3.5,'#6f8a46');  // 垂れた苔
});
/* 天井から垂れさがる、いばらのしげみ（近道） */
const thornCeil=shadowed(function(c,x0,x1,depth){
  c.fillStyle='rgba(34,40,28,0.95)';
  for(let x=x0;x<=x1;x+=26){ const r=18+((x*13)%17); c.beginPath(); c.ellipse(x,0,r*1.1,r+depth*0.3,0,0,Math.PI); c.fill(); }
  c.strokeStyle='rgba(50,58,36,0.95)'; c.lineWidth=2;
  for(let i=0;i<12;i++){ const x=x0+((i*61)%(x1-x0)), len=30+((i*37)%depth); c.beginPath(); c.moveTo(x,10); c.quadraticCurveTo(x+8,len*0.6,x-4,len); c.stroke();
    c.fillStyle='rgba(50,58,36,0.95)'; c.beginPath(); c.moveTo(x-1,len*0.5); c.lineTo(x-7,len*0.5+2); c.lineTo(x,len*0.5+4); c.fill(); }
  for(let i=0;i<7;i++){ const x=x0+20+((i*83)%(x1-x0-40)), y=12+((i*29)%26); ell(c,x,y,2.4,2.4,'rgba(120,30,36,0.9)'); }   // 暗い実
});
const mill=shadowed(function(c,x,y,s){ if(window.GTDecor&&GTDecor.paint.watermill) GTDecor.paint.watermill(c,x,y,s,0,{body:'rgba(110,92,72,0.85)',wheel:'rgba(92,72,54,0.9)',water:'rgba(150,185,200,0.6)'}); });

/* ---- 序章のゴシックの森（暗い霧の森の絵・暗い木・月の光・足もとの霧） ---- */
function gothBg(c,fx,fy){ c.save(); c.filter='brightness(1.35) saturate(0.85)'; bg(c,IMG.dark,fx,fy,1.12); c.restore();
  const v=c.createRadialGradient(AW/2,AH*0.55,AH*0.25,AW/2,AH*0.55,AW*0.7); v.addColorStop(0,'rgba(20,12,18,0)'); v.addColorStop(1,'rgba(14,8,14,0.55)');
  c.fillStyle=v; c.fillRect(0,0,AW,AH); }
function moon(c,list){ rays(c,list,'rgba(200,190,230,0.12)'); }                                     // 青白い、うすい月の光
function mist(c){ c.save(); for(let i=0;i<5;i++){ const g=c.createLinearGradient(0,AH-90,0,AH); g.addColorStop(0,'rgba(200,180,200,0)'); g.addColorStop(1,'rgba(200,180,200,0.10)');
  c.fillStyle=g; c.beginPath(); c.ellipse(60+i*130,AH-20,140,40,0,0,Math.PI*2); c.fill(); } c.restore(); }   // 足もとに たなびく霧
function darkTree(c,...a){ c.save(); c.filter='brightness(0.42) saturate(0.45) hue-rotate(-20deg)'; tree(c,...a); c.restore(); }   // 暗い森の木（ゲームの序章の木の色に）

/* ---- 場面ごとの挿絵 ---------------------------------------------------- */
const SCENES={
  // 序：暗い森で目を覚ます少年と、木の陰からのぞくマリ（ゲームの序章と同じ、霧の深いゴシックの森）
  prologue(c){
    gothBg(c,0.5,0.62);
    moon(c,[[170,70],[360,50]]);
    pages(c,[[120,300,-0.3],[260,312,0.2],[340,296,0.5],[90,270,0.1]]);
    boy(c,210,272,1.25,{lying:true,book:true});
    // マリ（木の幹のうしろに立っていて、体の半分が幹にかくれている＝木のかげからのぞいている）
    if(ok(IMG.mari)) figure(c,IMG.mari,482,306,150); else mari(c,482,300,1.5);
    darkTree(c,486,30,AH-14,64,[[515,40,80,64],[440,74,56,44],[592,62,56,44]],7);                          // 木の幹（マリより手前）
    mist(c);
  },
  // 森の小道：本を裏返して、天井を歩く少年（ひとりだけ）。道をふさぐ大木と、押して動かす木箱（暗い森）
  komichi(c){
    gothBg(c,0.42,0.62);
    moon(c,[[240,60],[450,40]]);
    darkTree(c,218,90,AH-12,48,[[242,96,66,50],[192,128,44,33],[294,122,46,34]],3);                       // 道をふさぐ大木
    c.save(); c.filter='brightness(0.62) saturate(0.6)'; log(c,350,74,190,22); crate(c,470,262,48,46); c.restore();   // 天井からさがる丸太の足場・木箱（暗い森の色に）
    c.save(); c.translate(0,2*96); c.scale(1,-1); boy(c,440,96,1.3,{face:1}); c.restore();                        // 天井を歩く少年（さかさま）
    mist(c);
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
  // 森の崖：木箱を踏み台にして、崖をのぼる。赤ずきんは下で見守る
  cliff(c){
    bg(c,IMG.day,0.55,0.7,1.1); wash(c,'rgba(244,236,214,0.14)');
    rays(c,[[120,50],[380,40]],'rgba(255,236,170,0.18)');
    c.fillStyle='rgba(150,120,80,0.3)'; c.beginPath(); c.moveTo(0,AH); c.quadraticCurveTo(300,300,AW,306); c.lineTo(AW,AH); c.closePath(); c.fill();   // 地面
    tree(c,40,40,AH-10,40,[[62,48,62,46],[24,82,40,30],[104,78,40,30]],5);
    cliffRock(c,360,150,200,AH+6,9);                                                                     // 高い崖
    flowers(c,[[390,148,0],[440,147,2],[520,148,1]]);
    crate(c,290,252,66,62);                                                                               // 踏み台の木箱
    boy(c,326,252,1.3,{face:1});                                                                          // 木箱の上の少年（崖の上へ）
    figure(c,IMG.hoodR,150,318,170);                                                                      // 下で見守る赤ずきん
    flowers(c,[[40,322,1],[90,326,3],[230,324,0]]);
  },
  // 森で出会った狼：告げたか、黙ったか
  wolf(c,f){
    bg(c,IMG.day,0.35,0.6,1.1); wash(c,'rgba(40,24,30,0.08)');   // 昼の森
    ell(c,300,330,320,40,'rgba(20,12,10,0.35)');
    if(f.warnedHood){
      wolf(c,470,314,1.25,-1);                                                                           // 少年たちのほうを向く狼
      figure(c,IMG.hoodR,150,318,190,{filter:'brightness(0.92)'});
      boy(c,300,300,1.7,{face:1});
      c.font="700 40px 'Zen Old Mincho',serif"; c.fillStyle='#f3ead0'; c.textAlign='center'; c.fillText('！',300,200);
    } else {
      wolf(c,505,312,1.1,1,true);                                                                        // 脇道へ走り去っていく
      figure(c,IMG.hoodR,200,318,190,{filter:'brightness(0.92)'});
      boy(c,340,300,1.7,{face:1});
    }
  },
  // 分かれ道：天井のいばらの近道と、水車小屋へつづく明るい道
  crossroads(c,f){
    bg(c,IMG.day,0.7,0.6,1.1); wash(c,'rgba(244,236,214,0.12)');
    const sun=c.createRadialGradient(520,280,20,520,280,320); sun.addColorStop(0,'rgba(255,226,150,0.45)'); sun.addColorStop(1,'rgba(255,226,150,0)');
    c.fillStyle=sun; c.fillRect(0,0,AW,AH);
    c.fillStyle='rgba(120,140,100,0.35)'; c.beginPath(); c.moveTo(250,AH); c.quadraticCurveTo(420,200,AW,230); c.lineTo(AW,AH); c.closePath(); c.fill();   // 丘
    mill(c,520,262,2.0);
    c.fillStyle='rgba(176,136,86,0.75)'; c.beginPath(); c.moveTo(0,AH); c.lineTo(0,306); c.bezierCurveTo(260,300,420,280,500,262); c.lineTo(512,266); c.bezierCurveTo(440,300,330,320,AW,AH); c.closePath(); c.fill();   // いつもの道（丘をのぼる）
    const dk=c.createRadialGradient(380,0,10,380,0,260); dk.addColorStop(0,'rgba(22,24,20,0.55)'); dk.addColorStop(1,'rgba(22,24,20,0)'); c.fillStyle=dk; c.fillRect(120,0,480,200);
    thornCeil(c,240,AW,70);                                                                               // 天井のいばら（近道）
    if(f.route==='shortcut'){
      figure(c,IMG.hoodWalkR,250,318,160);                                                                // 赤ずきんは、いつもの道へ
      c.save(); c.translate(0,2*96); c.scale(1,-1); boy(c,360,96,1.25,{face:1}); c.restore();            // 少年は、本を裏返して天井のいばらへ
    } else {
      figure(c,IMG.hoodWalkR,250,318,160);
      boy(c,170,318,1.45,{face:1});                                                                       // 二人で、いつもの道へ
    }
    flowers(c,[[420,316,0],[456,320,2],[560,312,1]]);
  },
  // おばあさんの家への道：近道（いばらのトンネルを、ひとりで）／遠回り（崖の上のお花を摘んで、花束に）
  road(c,f){
    if(f.route==='shortcut'){
      bg(c,IMG.day,0.3,0.5,1.15); wash(c,'rgba(30,34,26,0.32)');
      thornCeil(c,-20,AW+20,120);
      c.fillStyle='rgba(60,52,40,0.85)'; c.beginPath(); c.moveTo(380,AH); c.lineTo(392,190); c.quadraticCurveTo(420,170,452,186); c.lineTo(470,AH); c.closePath(); c.fill();   // 床からのびる岩
      wolf(c,520,320,0.75,-1);                                                                            // 敵
      boy(c,200,316,1.4,{face:1});
      for(let i=0;i<5;i++){ const x=90+i*40; ell(c,x,322,5,2,'rgba(40,30,22,0.55)'); }                     // 少年の足あと
    } else {
      bg(c,IMG.day,0.5,0.7,1.1); wash(c,'rgba(244,236,214,0.14)');
      c.fillStyle='rgba(120,140,100,0.3)'; c.beginPath(); c.moveTo(0,AH); c.quadraticCurveTo(300,250,AW,280); c.lineTo(AW,AH); c.closePath(); c.fill();
      mill(c,110,262,1.7);                                                                                // 遠くの水車小屋
      cliffRock(c,330,130,130,AH+6,21);                                                                   // 高い崖
      flowers(c,[[350,128,1],[440,127,3]]);
      boy(c,396,130,1.15,{face:-1});                                                                      // 崖の上で、お花を摘む少年
      figure(c,IMG.hoodR,230,318,170);                                                                    // 花束をかかえて見上げる赤ずきん
      flowers(c,[[200,268,0],[214,264,2],[226,270,1],[240,266,3]]);                                       // 花束
      const fl=[]; for(let x=20;x<AW;x+=28) fl.push([x+((x*7)%9),322+((x*3)%6),(x/28|0)%4]); flowers(c,fl);   // お花畑
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
// あとから分けたページは、もとのページと同じ挿絵を使う（森の小道② → 森の小道、家の近くまで → おばあさんの家への道）
SCENES.komichi2=SCENES.komichi; SCENES.road2=SCENES.road;

/* 敵（ゲームと同じ姿：黒っぽい丸い体・とがった耳・赤い目・白いふち）。(x, 足もと y)、s=大きさ、face=1 で右向き */
const foe=shadowed(function(c,x,y,s,face){
  c.save(); c.translate(x,y-13*s); c.scale((face||1)*s,s);
  const shape=()=>{ c.beginPath(); rr(c,-15,-13,30,26,7); c.moveTo(9,-12); c.lineTo(13,-21); c.lineTo(17,-12); c.closePath(); };
  shape(); c.strokeStyle='rgba(255,255,255,0.95)'; c.lineWidth=4; c.lineJoin='round'; c.stroke();
  c.beginPath(); rr(c,-15,-13,30,26,7); c.fillStyle='#3a2f2a'; c.fill();
  c.beginPath(); c.moveTo(9,-13); c.lineTo(13,-21); c.lineTo(17,-13); c.closePath(); c.fill();
  ell(c,7,-2,2.4,2.4,'#c9503f');
  c.restore();
});
/* 本（閉じかけて、くるくる落ちていく）。(x,y) 中心・r 回転 */
function fallingBook(c,x,y,r){
  c.save(); c.translate(x,y); c.rotate(r);
  rr(c,-22,-14,44,28,3); inked(c,'#6a4a33',2);
  c.beginPath(); c.moveTo(0,-14); c.lineTo(0,14); c.strokeStyle='#d6b26e'; c.lineWidth=1.4; c.stroke();
  rr(c,-19,-11,17,22,2); c.fillStyle='#f3ead3'; c.fill(); rr(c,2,-11,17,22,2); c.fill();
  c.restore();
}
// 空から落ちて：空からさしこむ光の筋の中を、少年がくるりと回りながら暗い森へ落ちてくる。本とページも舞う
SCENES.wake=function(c){
  gothBg(c,0.55,0.35);
  c.save(); c.globalCompositeOperation='lighter';                                                   // 空からさしこむ光の筋（少年が落ちてきたところ）
  const tr=c.createLinearGradient(0,0,0,AH); tr.addColorStop(0,'rgba(255,244,220,0.32)'); tr.addColorStop(1,'rgba(255,244,220,0)');
  c.fillStyle=tr; c.beginPath(); c.moveTo(250,0); c.lineTo(350,0); c.lineTo(400,AH); c.lineTo(250,AH); c.closePath(); c.fill(); c.restore();
  moon(c,[[150,40],[470,36]]);
  darkTree(c,24,40,AH-10,46,[[48,48,76,56],[10,92,44,34],[100,86,46,34]],11);                       // 左右の暗い木（ページのふちを囲む）
  darkTree(c,520,20,AH-10,52,[[548,36,80,60],[486,80,48,36],[598,74,44,34]],13);
  for(let i=0;i<14;i++){ const a=i*2.3, d=26+(i*17)%40; ell(c,322+Math.cos(a)*d,150+Math.sin(a)*d*0.8,1.6,1.6,'rgba(255,240,200,0.8)'); }   // 少年のまわりの光の粒
  c.save(); c.translate(318,128); c.rotate(-0.65); boy(c,0,66,1.25,{}); c.restore();              // くるりと回りながら落ちてくる少年
  fallingBook(c,420,92,0.5);
  pages(c,[[200,110,0.7],[452,170,-0.5],[380,40,0.25],[262,214,1.1],[150,250,-0.3]]);
  mist(c);
};
// 森の出口：暗い森の木々のあいだが明るく開け、その向こうに絵本の世界（昼の森）。出口でマリが待ち、少年が本を手に向かう
SCENES.forest_exit=function(c){
  gothBg(c,0.5,0.55);
  const L=document.createElement('canvas'); L.width=AW; L.height=AH; const g=L.getContext('2d');   // 出口の向こうの明るい森（まわりはやわらかく消える）
  bg(g,IMG.day,0.6,0.55,1.05); g.fillStyle='rgba(255,240,205,0.22)'; g.fillRect(0,0,AW,AH);
  g.globalCompositeOperation='destination-in';
  const m=g.createRadialGradient(410,190,40,410,190,175); m.addColorStop(0,'rgba(0,0,0,1)'); m.addColorStop(0.65,'rgba(0,0,0,0.9)'); m.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=m; g.fillRect(0,0,AW,AH); c.drawImage(L,0,0);
  c.save(); c.globalCompositeOperation='lighter';                                                   // 出口からこぼれる光
  const gl=c.createRadialGradient(410,200,60,410,200,300); gl.addColorStop(0,'rgba(255,230,170,0.28)'); gl.addColorStop(1,'rgba(255,230,170,0)'); c.fillStyle=gl; c.fillRect(0,0,AW,AH);
  c.fillStyle='rgba(255,236,190,0.10)'; for(const [a,b] of [[300,230],[350,300],[420,380]]){ c.beginPath(); c.moveTo(a,120); c.lineTo(b,120); c.lineTo(b-150,AH); c.lineTo(a-260,AH); c.closePath(); c.fill(); }
  c.restore();
  c.fillStyle='rgba(200,170,120,0.28)'; c.beginPath(); c.moveTo(60,AH); c.bezierCurveTo(220,300,330,282,392,270); c.lineTo(430,272); c.bezierCurveTo(400,290,340,312,330,AH); c.closePath(); c.fill();   // 出口へつづく小道
  darkTree(c,10,0,AH-10,54,[[36,18,92,62],[0,70,50,38],[96,64,48,36]],21);                         // 出口を囲む、暗い森の木
  darkTree(c,548,0,AH-10,56,[[574,20,90,64],[514,66,50,38],[620,64,44,34]],23);
  darkTree(c,182,40,AH-26,30,[[198,48,60,44],[160,80,36,26],[236,78,34,26]],25);
  if(ok(IMG.mari)) figure(c,IMG.mari,452,292,138); else mari(c,452,288,1.4);                       // 出口で待つマリ
  boy(c,262,310,1.35,{face:1,book:true});                                                            // 本を手に、出口へ向かう少年
  mist(c);
};
// 森の道：本を裏返して、梢の下をさかさまに歩く少年。床では敵がうろついている（ゲームの森の道①）
SCENES.forest_path=function(c){
  bg(c,IMG.day,0.3,0.6,1.12); wash(c,'rgba(244,236,214,0.14)');
  rays(c,[[150,46],[420,40]],'rgba(255,236,170,0.16)');
  c.fillStyle='rgba(150,120,80,0.32)'; c.beginPath(); c.moveTo(0,AH); c.lineTo(0,300); c.quadraticCurveTo(300,288,AW,300); c.lineTo(AW,AH); c.closePath(); c.fill();   // 森の道
  tree(c,40,-90,40,26,[[54,40,96,46],[0,58,56,30],[120,56,56,30]],31);                              // 梢（ページの上にならぶ葉の茂み。少年はこの下を歩く）
  tree(c,262,-90,36,26,[[276,36,104,48],[210,54,58,30],[344,52,58,30]],33);
  tree(c,486,-90,40,26,[[500,40,100,46],[442,56,56,30],[566,56,56,30]],35);
  c.save(); c.translate(0,2*80); c.scale(1,-1); boy(c,300,80,1.2,{face:1}); c.restore();             // 梢の下を、さかさまに歩く少年
  foe(c,170,312,1.5,1); foe(c,452,314,1.5,-1);                                                       // 床をうろつく敵
  flowers(c,[[40,322,0],[90,326,2],[300,320,1],[560,324,3]]);
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
