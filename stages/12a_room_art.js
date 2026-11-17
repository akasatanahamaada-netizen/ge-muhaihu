/* ============================================================================
   おばあさんの家：部屋の絵  (stages/12a_room_art.js)
   ----------------------------------------------------------------------------
   12_grannys_house.js（お話）と 12b_wolf_boss.js（ボス戦）が使う「絵」だけをまとめたもの。
   当たり判定・お話の進み方には関係しない。ここを書きかえても、遊び方は変わらない。

   GT.grannyRoom.draw(t, noon, dim)       … 部屋の背景（壁・家具・暖炉の火・振り子時計など）
       noon … 近道で着いた昼（false なら夕方）  dim … 暗い部屋（バッドエンドなど）
   GT.grannyRoom.drawFurniture(kind, box) … 落とせる家具（'chest' タンス / 'pot' つぼ / 'books' 本の山）。白い縁取りつき
   ========================================================================== */
(function(){
const ctx=GT.ctx, W=GT.W, H=GT.H, EDGE=GT.EDGE, SPINE=GT.SPINE;

/* ---- 部屋の絵 ----------------------------------------------------------------
   絵本の挿絵のような、茶色いインクの線＋水彩の色。
   動かない部分（壁・床・家具）は、昼/夕・明るい/暗い の組み合わせごとに一度だけ
   別のキャンバスに描いておき、毎フレームそれを貼る（重くならないように）。
   動く部分（暖炉の火・ろうそく・振り子時計・ゆり椅子・窓の光とほこり・ティーポットの湯気）は毎フレーム描く。
   左ページ：ベッド・おじいさんの肖像・窓とカーテン・お茶のテーブル・柱時計
   右ページ：飾り皿・肩掛けとかご・ゆり椅子と編みかご・暖炉（鍋・マントルの小物・薪）
   ※ 当たり判定には関係しない（足場・家具＝箱は wolf_boss の定義のまま） */
const INK='#3a2a1a', BEAM=36, RAIL=330, BASE=436, FLOORY=442;
const rnd=s=>{ const v=Math.sin(s*127.1+311.7)*43758.5453; return v-Math.floor(v); };
function E(c,x,y,rx,ry,col,rot){ c.beginPath(); c.ellipse(x,y,rx,ry,rot||0,0,Math.PI*2); c.fillStyle=col; c.fill(); }
function inkE(c,x,y,rx,ry,col,lw,rot){ E(c,x,y,rx,ry,col,rot); c.strokeStyle=INK; c.lineWidth=lw||1.1; c.stroke(); }
function rp(c,x,y,w,h,r){ r=Math.max(0,Math.min(r,w/2,h/2)); c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function bx(c,x,y,w,h,col,r,lw){ rp(c,x,y,w,h,r||0); c.fillStyle=col; c.fill(); if(lw!==0){ c.strokeStyle=INK; c.lineWidth=lw||1.2; c.stroke(); } }
function ink(c,lw,a){ c.strokeStyle=a==null?INK:`rgba(58,42,26,${a})`; c.lineWidth=lw||1.1; c.stroke(); }
function line(c,x1,y1,x2,y2,col,lw){ c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.strokeStyle=col; c.lineWidth=lw||1; c.stroke(); }
// 水彩のむら（枠の中に、うすい色のしみを散らす）
function wash(c,x,y,w,h,seed,n,tones){
  c.save(); c.beginPath(); c.rect(x,y,w,h); c.clip();
  for(let i=0;i<n;i++){ const r=6+rnd(seed+i*7)*26; E(c,x+rnd(seed+i)*w,y+rnd(seed+i*3+1)*h,r,r*0.6,tones[i%tones.length],rnd(seed+i*5)*3); }
  c.restore();
}
// 壁紙の小花
function sprig(c,x,y,s){
  c.beginPath(); c.moveTo(x,y+7); c.quadraticCurveTo(x-2,y+3,x,y-2); ink(c,0.8,0.3);
  E(c,x-3,y+4,2.8,1.2,'rgba(110,128,88,0.32)',-0.6); E(c,x+3,y+5,2.8,1.2,'rgba(110,128,88,0.32)',0.6);
  const col=['rgba(176,96,96,0.36)','rgba(196,150,90,0.36)','rgba(140,120,160,0.34)'][s%3];
  for(let k=0;k<5;k++){ const a=k*1.2566+s; E(c,x+Math.cos(a)*2.2,y-3+Math.sin(a)*2.2,1.8,1.8,col); }
  E(c,x,y-3,1,1,'rgba(250,232,170,0.8)');
}
// 棚の下の飾り受け
function corbel(c,x,y,s){
  s=s||1; c.beginPath(); c.moveTo(x-7*s,y); c.lineTo(x+7*s,y); c.quadraticCurveTo(x+7*s,y+9*s,x+2*s,y+13*s);
  c.quadraticCurveTo(x,y+21*s,x-2*s,y+13*s); c.quadraticCurveTo(x-7*s,y+9*s,x-7*s,y); c.closePath();
  c.fillStyle='#6b4f36'; c.fill(); ink(c,1.1);
  E(c,x,y+6*s,1.6*s,1.6*s,'#d9b877');
}
// 梁から吊るした干し草・ラベンダー・にんにく
function hangingHerbs(c,x,kind){
  line(c,x,BEAM,x,BEAM+7,'#8a6a48',1);
  if(kind==='garlic'){
    for(let k=0;k<5;k++){ const yy=BEAM+12+k*7, xx=x+(k%2?3:-3); inkE(c,xx,yy,4.6,4,'#efe6d2',0.9);
      line(c,xx,yy-4,xx,yy-1,'rgba(58,42,26,0.4)',0.7); }
    line(c,x,BEAM+46,x-2,BEAM+52,'#c9a46a',1.2); line(c,x,BEAM+46,x+2,BEAM+53,'#c9a46a',1.2);
  } else {
    const lav=kind==='lavender';
    for(let i=0;i<9;i++){ const a=Math.PI/2+(i-4)*0.11, len=22+rnd(x+i)*9;
      const ex=x+Math.cos(a)*len, ey=BEAM+10+Math.sin(a)*len;
      line(c,x,BEAM+10,ex,ey,lav?'#7f8a6a':'#5f6f4a',1);
      if(lav){ for(let k=0;k<4;k++) E(c,x+(ex-x)*(0.7+k*0.1),BEAM+10+(ey-BEAM-10)*(0.7+k*0.1),1.6,2.2,'#8a74a8',a); }
      else{ for(let k=1;k<4;k++){ const px=x+(ex-x)*k/4, py=BEAM+10+(ey-BEAM-10)*k/4;
        E(c,px-2,py,3.2,1.3,'#7c8f5e',a+0.8); E(c,px+2,py,3.2,1.3,'#8fa070',a-0.8); } }
    }
  }
  bx(c,x-3.5,BEAM+6,7,5,kind==='lavender'?'#8a7fa0':'#b8423f',1.5,0.8);
}
// ゆり椅子（a=かたむき。ゆれるので毎フレーム描く）
function rockingChair(c,x,y,a){
  c.save(); c.translate(x,y); c.rotate(a); c.lineCap='round';
  const wood='#6b4628';
  const stick=(x1,y1,x2,y2,w)=>{ line(c,x1,y1,x2,y2,INK,w+2.2); line(c,x1,y1,x2,y2,wood,w); };
  c.beginPath(); c.moveTo(-32,-9); c.quadraticCurveTo(0,6,32,-9); c.strokeStyle=INK; c.lineWidth=5.4; c.stroke(); c.strokeStyle=wood; c.lineWidth=3.2; c.stroke();
  stick(-17,-3,-16,-34,2.6); stick(16,-3,15,-34,2.6);
  stick(-19,-35,-29,-96,3); stick(-11,-35,-20,-93,1.6); stick(-3,-36,-12,-90,1.6);
  c.beginPath(); c.moveTo(-31,-96); c.quadraticCurveTo(-24,-104,-17,-94); c.strokeStyle=INK; c.lineWidth=5; c.stroke(); c.strokeStyle=wood; c.lineWidth=3; c.stroke();
  stick(15,-34,17,-56,2.2); stick(-24,-62,19,-57,2.6);
  bx(c,-22,-39,42,6,wood,2,1.2);
  bx(c,-20,-45,36,7,'#b8423f',3.5,1);                                   // 座布団
  c.beginPath(); c.moveTo(-31,-90); c.quadraticCurveTo(-36,-66,-30,-46); c.lineTo(-18,-46); c.quadraticCurveTo(-20,-70,-16,-88); c.closePath();   // 背にかけた膝かけ
  c.fillStyle='#c9a46a'; c.fill(); ink(c,1);
  c.save(); c.clip(); for(let k=0;k<6;k++){ line(c,-40,-88+k*8,-10,-84+k*8,k%2?'rgba(139,94,99,0.6)':'rgba(87,100,74,0.5)',2.4); } c.restore();
  c.restore();
}

function paintRoom(c,noon,dim){
  const FLOOR=H-EDGE;
  /* --- 壁紙（クリーム地に小花）と天井の梁 --- */
  let g=c.createLinearGradient(0,0,0,RAIL); g.addColorStop(0,'#d8c6a2'); g.addColorStop(1,'#e8dcc0');
  c.fillStyle=g; c.fillRect(0,0,W,RAIL);
  c.fillStyle='rgba(176,140,100,0.10)'; for(let x=8;x<W;x+=32) c.fillRect(x,BEAM,9,RAIL-BEAM);
  for(let row=0,y=64;y<RAIL-16;y+=44,row++) for(let x=(row%2?24:0)+12;x<W;x+=48) sprig(c,x+(rnd(x*7+y)-0.5)*5,y,row*7+x);
  wash(c,0,BEAM,W,RAIL-BEAM,11,46,['rgba(150,110,70,0.05)','rgba(255,248,230,0.09)']);
  g=c.createLinearGradient(0,BEAM,0,BEAM+22); g.addColorStop(0,'rgba(40,28,16,0.22)'); g.addColorStop(1,'rgba(40,28,16,0)');
  c.fillStyle=g; c.fillRect(0,BEAM,W,22);
  c.fillStyle='#6b4f36'; c.fillRect(0,0,W,BEAM);
  for(let i=0;i<5;i++){ c.beginPath(); const y0=6+i*6;
    for(let x=0;x<=W;x+=30) c.lineTo(x,y0+Math.sin(x*0.02+i)*1.5); ink(c,0.8,0.28); }
  for(let x=150;x<W;x+=300){ line(c,x,0,x,BEAM,'rgba(40,28,16,0.45)',1.2); E(c,x-6,BEAM/2,2,2,'#3a2f2a'); E(c,x+6,BEAM/2,2,2,'#3a2f2a'); }
  line(c,0,BEAM,W,BEAM,INK,1.4);
  /* --- 腰板・床 --- */
  c.fillStyle='#9a7650'; c.fillRect(0,RAIL,W,BASE-RAIL);
  for(let x=0,i=0;x<W;x+=26,i++){ c.fillStyle=i%2?'rgba(255,240,215,0.06)':'rgba(40,28,16,0.07)'; c.fillRect(x,RAIL,26,BASE-RAIL);
    c.fillStyle='rgba(58,40,24,0.35)'; c.fillRect(x,RAIL,1,BASE-RAIL); }
  for(let i=0;i<16;i++) E(c,rnd(i*5+3)*W,RAIL+14+rnd(i*9+1)*(BASE-RAIL-28),3,1.5,'rgba(58,40,24,0.25)');
  bx(c,-2,RAIL-6,W+4,9,'#7a5a3a',0,1.2); c.fillStyle='rgba(255,240,215,0.25)'; c.fillRect(0,RAIL-5,W,2);
  c.fillStyle='#7f5c3c'; c.fillRect(0,BASE,W,H-BASE);
  wash(c,0,FLOORY,W,H-FLOORY,77,30,['rgba(40,28,16,0.10)','rgba(255,236,200,0.08)']);
  line(c,0,453,W,453,'rgba(40,28,16,0.35)',1);
  for(let r=0;r<2;r++){ let x=rnd(r*13)*60; while(x<W){ line(c,x,FLOORY+r*11+1,x,FLOORY+r*11+10,'rgba(40,28,16,0.4)',1); x+=60+rnd(x+r)*70; } }
  bx(c,-2,BASE-2,W+4,8,'#5f4630',0,1.2);
  // 編んだ丸いラグ
  ['#8b5e63','#d9b877','#57644a','#c98a7a'].forEach((col,k)=>{ E(c,252,457,96-k*16,7.5-k*1.5,col);
    c.setLineDash([3,3]); c.beginPath(); c.ellipse(252,457,96-k*16,7.5-k*1.5,0,0,Math.PI*2); ink(c,0.7,0.35); c.setLineDash([]); });
  c.beginPath(); c.ellipse(252,457,96,7.5,0,0,Math.PI*2); ink(c,1);

  /* --- 梁（天井の足場）を吊る金具・棚の飾り受け --- */
  for(const p of GT.STAGE_DEFS['wolf_boss'].platforms){
    if(p.kind==='ceilingLedge'){ for(const hx of [p.x+16,p.x+p.w-16]){ bx(c,hx-2,BEAM,4,p.y-BEAM+4,'#4a3f36',1,0.9); inkE(c,hx,BEAM+4,3,3,'#6b5f52',0.8); } }
    if(p.kind==='ledge'){ corbel(c,p.x+14,p.y+p.h-1); corbel(c,p.x+p.w-14,p.y+p.h-1); }
  }
  [[56,'herb'],[196,'lavender'],[478,'garlic'],[742,'herb'],[618,'lavender']].forEach(([x,k])=>hangingHerbs(c,x,k));

  /* ================= 左ページ ================= */
  // おじいさんの肖像（ベッドの上）
  line(c,72,258,58,276,'#8a6a48',0.9); line(c,72,258,86,276,'#8a6a48',0.9); E(c,72,258,1.6,1.6,'#3a2f2a');
  inkE(c,72,300,22,28,'#b08d57',1.3); inkE(c,72,300,16,22,'#e2d4b0',1);
  c.save(); c.beginPath(); c.ellipse(72,300,16,22,0,0,Math.PI*2); c.clip();
  E(c,72,319,14,10,'#57644a'); c.beginPath(); c.moveTo(67,310); c.lineTo(72,318); c.lineTo(77,310); c.closePath(); c.fillStyle='#f6eed8'; c.fill();
  E(c,72,296,6.5,7.5,'#ecd0a8'); E(c,65.5,294,2.4,4,'#f3ead0'); E(c,78.5,294,2.4,4,'#f3ead0');
  E(c,70,295,0.9,0.9,INK); E(c,74,295,0.9,0.9,INK); E(c,72,299.5,3.6,1.3,'#f3ead0'); c.restore();
  // ベッド
  E(c,90,462,74,4,'rgba(40,28,16,0.25)');
  bx(c,34,446,6,16,'#5a3f2e',1,1); bx(c,136,446,6,16,'#5a3f2e',1,1);
  bx(c,28,436,118,12,'#6b4f36',2,1.2);
  bx(c,30,420,116,20,'#f1e7d0',4,1.1);
  { const qx=54,qy=413,qw=92,cols=['#8b5e63','#c9a46a','#6f7f5a','#b9786a','#7c6e8e','#d0b48a'];
    c.save(); rp(c,qx,qy,qw,40,3); c.clip();
    for(let i=0;i<6;i++) for(let j=0;j<3;j++){ c.fillStyle=cols[(i+j*2)%cols.length]; c.fillRect(qx+i*qw/6,qy+j*14,qw/6+0.5,14.5); }
    c.setLineDash([2,2]); for(let i=1;i<6;i++) line(c,qx+i*qw/6,qy,qx+i*qw/6,qy+40,'rgba(255,245,225,0.6)',0.8);
    for(let j=1;j<3;j++) line(c,qx,qy+j*14,qx+qw,qy+j*14,'rgba(255,245,225,0.6)',0.8); c.setLineDash([]);
    c.restore(); rp(c,qx,qy,qw,40,3); ink(c,1.2);
    for(let x=qx+4;x<qx+qw;x+=8) inkE(c,x,qy+40,4,2.4,'#f6eed8',0.6); }                  // レースのふち
  inkE(c,44,416,15,8,'#f8f0dc',1.1); line(c,36,414,50,418,'rgba(58,42,26,0.3)',0.8);
  rp(c,16,374,22,90,7); c.fillStyle='#7a5434'; c.fill(); ink(c,1.3);                     // 頭板
  rp(c,20,384,14,52,4); ink(c,0.8,0.5);
  c.beginPath(); c.moveTo(27,400); c.bezierCurveTo(21,393,20,403,27,408); c.bezierCurveTo(34,403,33,393,27,400); c.fillStyle='#b8423f'; c.fill(); ink(c,0.7);
  inkE(c,27,371,5,5,'#8a6440',1.1);
  rp(c,144,404,14,60,5); c.fillStyle='#7a5434'; c.fill(); ink(c,1.3); inkE(c,151,401,4,4,'#8a6440',1);
  // 窓（近道で着いたら昼の空、遠回りなら夕焼け。暗い部屋は夜）
  const X=262,Y=148,WW=84,HH=84;
  bx(c,X-5,Y-5,WW+10,HH+10,'#5a4330',2,1.4);
  g=c.createLinearGradient(0,Y,0,Y+HH);
  if(dim){ g.addColorStop(0,'#1e2440'); g.addColorStop(1,'#46506e'); }
  else if(noon){ g.addColorStop(0,'#9cc4dc'); g.addColorStop(1,'#e2ecdf'); }
  else{ g.addColorStop(0,'#c8785a'); g.addColorStop(1,'#f0c48a'); }
  c.fillStyle=g; c.fillRect(X,Y,WW,HH);
  c.save(); c.beginPath(); c.rect(X,Y,WW,HH); c.clip();
  if(dim){ E(c,322,170,8,8,'#efe6c8'); E(c,326,167,7,7,'#2c3250'); for(let i=0;i<7;i++) E(c,X+rnd(i+40)*WW,Y+rnd(i+50)*44,0.9,0.9,'#efe6c8'); }
  else E(c,noon?318:322,noon?172:206,noon?9:11,noon?9:11,noon?'rgba(255,250,225,0.95)':'rgba(255,214,140,0.95)');
  const hill=dim?'#2a3048':noon?'#8fae88':'#9a6a5a', trees=dim?'#1c2034':noon?'#5f7f5a':'#6e4a44';
  c.fillStyle=hill; c.beginPath(); c.moveTo(X,Y+HH); c.lineTo(X,Y+HH-18); c.quadraticCurveTo(X+30,Y+HH-30,X+56,Y+HH-20); c.quadraticCurveTo(X+72,Y+HH-14,X+WW,Y+HH-22); c.lineTo(X+WW,Y+HH); c.fill();
  for(let i=0;i<9;i++){ const tx=X+4+i*10, th=12+rnd(i+3)*12; c.fillStyle=trees; c.beginPath(); c.moveTo(tx-5,Y+HH-6); c.lineTo(tx,Y+HH-6-th); c.lineTo(tx+5,Y+HH-6); c.fill(); }
  c.fillStyle='rgba(255,255,255,0.16)'; c.beginPath(); c.moveTo(X+8,Y+HH); c.lineTo(X+40,Y); c.lineTo(X+52,Y); c.lineTo(X+20,Y+HH); c.fill();
  c.restore();
  c.fillStyle='#4a3a28'; c.fillRect(X+WW/2-2,Y,4,HH); c.fillRect(X,Y+HH/2-2,WW,4);
  c.strokeStyle=INK; c.lineWidth=1.2; c.strokeRect(X,Y,WW,HH);
  bx(c,X-14,Y+HH+3,WW+28,8,'#7a5a3a',2,1.2);
  // 窓辺の鉢植え（ゼラニウムと小さなラベンダー）
  c.beginPath(); c.moveTo(X+6,Y+HH-11); c.lineTo(X+26,Y+HH-11); c.lineTo(X+23,Y+HH+3); c.lineTo(X+9,Y+HH+3); c.closePath(); c.fillStyle='#b0704a'; c.fill(); ink(c,1);
  for(let i=0;i<6;i++) E(c,X+8+i*3.2,Y+HH-14-rnd(i)*4,4,2.4,'#6f8a58',(i-3)*0.4);
  [[X+10,Y+HH-22],[X+17,Y+HH-26],[X+23,Y+HH-20]].forEach(([fx,fy])=>{ for(let k=0;k<5;k++){ const a=k*1.2566; E(c,fx+Math.cos(a)*2.3,fy+Math.sin(a)*2.3,2,2,'#c9503f'); } E(c,fx,fy,1,1,'#f0d080'); });
  bx(c,X+WW-22,Y+HH-8,14,11,'#c9a46a',1,1);
  for(let i=0;i<5;i++){ const lx=X+WW-21+i*3; line(c,X+WW-15,Y+HH-8,lx,Y+HH-22,'#7f8a6a',0.9); E(c,lx,Y+HH-23,1.4,2.6,'#8a74a8'); }
  // カーテン（赤いギンガム）とバランス
  line(c,X-26,Y-14,X+WW+26,Y-14,'#5a3f2e',2.4); inkE(c,X-27,Y-14,3,3,'#b08d57',0.9); inkE(c,X+WW+27,Y-14,3,3,'#b08d57',0.9);
  for(const side of [-1,1]){
    const ox=side<0?X:X+WW, s=side;
    c.beginPath(); c.moveTo(ox-24*s,Y-14); c.lineTo(ox+9*s,Y-14); c.quadraticCurveTo(ox+2*s,Y+36,ox-8*s,Y+54);
    c.quadraticCurveTo(ox,Y+84,ox+5*s,Y+HH+18); c.lineTo(ox-24*s,Y+HH+18); c.closePath();
    c.fillStyle='#d7a596'; c.fill();
    c.save(); c.clip();
    for(let k=-40;k<130;k+=7){ c.fillStyle='rgba(184,66,63,0.22)'; c.fillRect(X-40,Y+k,WW+80,3.5); }
    for(let k=-40;k<WW+80;k+=7){ c.fillStyle='rgba(184,66,63,0.22)'; c.fillRect(X-40+k,Y-20,3.5,HH+60); }
    for(let k=0;k<3;k++){ c.beginPath(); c.moveTo(ox-(18-k*6)*s,Y-12); c.quadraticCurveTo(ox-(14-k*7)*s,Y+50,ox-(16-k*6)*s,Y+HH+18); ink(c,0.8,0.3); }
    c.restore();
    ink(c,1.1);
    inkE(c,ox-10*s,Y+54,6,3.2,'#b8423f',0.9,0.4*s);
  }
  c.beginPath(); c.moveTo(X-30,Y-18); c.lineTo(X+WW+30,Y-18); c.lineTo(X+WW+30,Y-2);
  for(let x=X+WW+30;x>X-30;x-=12) c.quadraticCurveTo(x-6,Y+8,x-12,Y-2);
  c.closePath(); c.fillStyle='#b8726a'; c.fill(); ink(c,1.1);
  for(let x=X-24;x<X+WW+30;x+=12) inkE(c,x,Y+4,1.6,1.6,'#f6eed8',0.5);
  // お茶のテーブル（レースのクロス・ティーポット・カップ）
  c.beginPath(); c.moveTo(250,454); c.quadraticCurveTo(257,446,264,454); c.lineTo(266,462); c.lineTo(248,462); c.closePath(); c.fillStyle='#6b4628'; c.fill(); ink(c,1);
  bx(c,253,420,8,36,'#7a5434',1,1);
  bx(c,224,410,66,6,'#7a5434',2,1.1);
  c.beginPath(); c.moveTo(222,408); c.lineTo(292,408); c.lineTo(294,424);
  for(let x=294;x>222;x-=9) c.quadraticCurveTo(x-4.5,430,x-9,424);
  c.closePath(); c.fillStyle='#f3ead6'; c.fill(); ink(c,1);
  for(let x=228;x<292;x+=9) E(c,x,422,1.3,1.3,'rgba(176,150,110,0.6)');
  inkE(c,244,399,11,9,'#e8eef0',1.1);                                                        // ティーポット
  c.beginPath(); c.moveTo(254,398); c.quadraticCurveTo(262,396,264,388); c.lineTo(262,387); c.quadraticCurveTo(258,394,253,395); c.fillStyle='#e8eef0'; c.fill(); ink(c,0.9);
  c.beginPath(); c.arc(233,399,5,Math.PI*0.5,Math.PI*1.5); ink(c,1.4);
  line(c,234,400,254,400,'rgba(74,78,109,0.7)',2); inkE(c,244,390,5,2,'#d8e2e6',0.8); inkE(c,244,387,1.8,1.8,'#4a4e6d',0.6);
  inkE(c,274,409,9,2,'#e8eef0',0.8); bx(c,268,400,12,9,'#e8eef0',2,0.9); line(c,268,404,280,404,'rgba(74,78,109,0.7)',1.6);
  c.beginPath(); c.arc(281,404,3,-Math.PI/2,Math.PI/2); ink(c,1);
  // 柱時計（文字盤・振り子は動くので、あとで描く）
  E(c,393,462,28,3,'rgba(40,28,16,0.25)');
  bx(c,370,398,46,64,'#6b4628',3,1.3); rp(c,377,408,32,44,3); ink(c,0.8,0.5);
  bx(c,375,300,36,100,'#7a5434',2,1.3);
  bx(c,381,310,24,80,'#2e2219',10,1);
  c.beginPath(); c.moveTo(368,296); c.lineTo(368,252); c.quadraticCurveTo(368,232,393,227); c.quadraticCurveTo(418,232,418,252); c.lineTo(418,296); c.closePath(); c.fillStyle='#6b4628'; c.fill(); ink(c,1.3);
  inkE(c,393,224,4,4,'#b08d57',0.9);
  bx(c,365,294,56,7,'#5a3f2e',1.5,1.1); bx(c,367,394,52,6,'#5a3f2e',1.5,1.1);
  inkE(c,393,262,17,17,'#b08d57',1.1); inkE(c,393,262,14,14,'#f3ead0',0.8);
  for(let k=0;k<12;k++){ const a=k*Math.PI/6; line(c,393+Math.cos(a)*10.5,262+Math.sin(a)*10.5,393+Math.cos(a)*13,262+Math.sin(a)*13,INK,k%3?0.7:1.4); }

  /* ================= 右ページ ================= */
  // 飾り皿
  [[500,196,15],[540,186,18],[580,196,15]].forEach(([px,py,r],i)=>{
    line(c,px-r*0.6,py-r*0.7,px,py-r-5,'#8a6a48',0.8); line(c,px+r*0.6,py-r*0.7,px,py-r-5,'#8a6a48',0.8);
    inkE(c,px,py,r,r,'#f3ead0',1.1); c.beginPath(); c.arc(px,py,r*0.62,0,Math.PI*2); ink(c,1.2,0.35);
    for(let k=0;k<12;k++){ const a=k*Math.PI/6; E(c,px+Math.cos(a)*r*0.82,py+Math.sin(a)*r*0.82,1.5,1.5,'rgba(74,78,109,0.7)'); }
    if(i===1){ for(let k=0;k<5;k++){ const a=k*1.2566; E(c,px+Math.cos(a)*3.5,py+Math.sin(a)*3.5,3,3,'rgba(74,78,109,0.55)'); } }
    else E(c,px,py,3,3,'rgba(184,66,63,0.5)'); });
  // 肩掛けとかご（壁の掛け釘）
  bx(c,612,226,46,7,'#6b4f36',2,1.1); inkE(c,622,234,3,3,'#5a3f2e',0.8); inkE(c,648,234,3,3,'#5a3f2e',0.8);
  c.beginPath(); c.moveTo(618,234); c.quadraticCurveTo(604,252,606,286); c.lineTo(628,276); c.lineTo(640,288); c.quadraticCurveTo(634,256,626,234); c.closePath();
  c.fillStyle='#8a7fa0'; c.fill(); ink(c,1.1);
  for(let k=0;k<4;k++){ c.beginPath(); c.moveTo(612+k*6,248); c.quadraticCurveTo(614+k*6,264,612+k*7,282); ink(c,0.7,0.3); }
  for(let k=0;k<8;k++) line(c,607+k*4,284-(k>4?(k-4)*2:0),606+k*4,292-(k>4?(k-4)*2:0),'#8a7fa0',1);
  c.beginPath(); c.arc(648,252,10,Math.PI*1.05,Math.PI*1.95); c.strokeStyle='#8a6440'; c.lineWidth=2.4; c.stroke();
  c.beginPath(); c.moveTo(636,252); c.lineTo(660,252); c.lineTo(656,270); c.lineTo(640,270); c.closePath(); c.fillStyle='#c9a46a'; c.fill();
  c.save(); c.clip(); for(let k=0;k<5;k++) line(c,630,254+k*4,664,254+k*4,'rgba(90,64,40,0.5)',0.8); for(let k=0;k<7;k++) line(c,638+k*4,250,638+k*4,272,'rgba(90,64,40,0.3)',0.8); c.restore();
  c.beginPath(); c.moveTo(636,252); c.lineTo(660,252); c.lineTo(656,270); c.lineTo(640,270); c.closePath(); ink(c,1);
  bx(c,641,247,14,6,'#e8dcc0',2,0.7);
  // 編みかご（毛糸玉と編み棒）
  c.beginPath(); c.moveTo(538,446); c.lineTo(568,446); c.lineTo(564,462); c.lineTo(542,462); c.closePath(); c.fillStyle='#b08d57'; c.fill();
  c.save(); c.clip(); for(let k=0;k<4;k++) line(c,530,449+k*4,574,449+k*4,'rgba(90,64,40,0.5)',0.8); c.restore();
  c.beginPath(); c.moveTo(538,446); c.lineTo(568,446); c.lineTo(564,462); c.lineTo(542,462); c.closePath(); ink(c,1);
  line(c,546,446,556,426,'#d9b877',1.4); line(c,560,446,548,428,'#d9b877',1.4);
  inkE(c,547,443,7,6,'#8b5e63',0.9); inkE(c,559,442,6,6,'#57644a',0.9); inkE(c,553,439,5,5,'#c9a46a',0.9);
  c.beginPath(); c.arc(547,443,4,0.3,2.4); ink(c,0.6,0.4); c.beginPath(); c.arc(559,442,3.5,3.4,5.4); ink(c,0.6,0.4);
  c.beginPath(); c.moveTo(553,444); c.quadraticCurveTo(570,452,580,461); c.strokeStyle='#8b5e63'; c.lineWidth=0.9; c.stroke();
  // 薪の山
  [[727,455],[739,455],[751,455],[733,444],[745,444],[739,433]].forEach(([lx,ly])=>{ inkE(c,lx,ly,6,6,'#6b4628',1); E(c,lx,ly,4.2,4.2,'#c9a46a'); c.beginPath(); c.arc(lx,ly,2.4,0,Math.PI*2); ink(c,0.6,0.5); });
  // 暖炉：煙突の壁（しっくい）
  const FX=768,FW=100;
  c.fillStyle='#cdbd9f'; c.fillRect(FX+6,BEAM,FW-12,316-BEAM);
  wash(c,FX+6,BEAM,FW-12,316-BEAM,301,14,['rgba(120,100,80,0.08)','rgba(255,248,230,0.1)']);
  line(c,FX+6,BEAM,FX+6,316,INK,1.1); line(c,FX+FW-6,BEAM,FX+FW-6,316,INK,1.1);
  // マントルの上の絵（森の小さな家）
  bx(c,792,206,52,42,'#b08d57',2,1.3);
  c.fillStyle='#d6e2d2'; c.fillRect(797,211,42,32);
  c.fillStyle='#8fae88'; c.beginPath(); c.moveTo(797,243); c.quadraticCurveTo(812,228,839,236); c.lineTo(839,243); c.fill();
  for(let i=0;i<4;i++){ c.fillStyle='#5f7f5a'; c.beginPath(); c.moveTo(800+i*5,240); c.lineTo(802.5+i*5,226-rnd(i)*4); c.lineTo(805+i*5,240); c.fill(); }
  c.fillStyle='#f3ead0'; c.fillRect(822,231,10,8); c.fillStyle='#b8423f'; c.beginPath(); c.moveTo(820,232); c.lineTo(827,225); c.lineTo(834,232); c.fill();
  c.strokeStyle=INK; c.lineWidth=0.8; c.strokeRect(797,211,42,32);
  // かまど（石積み）
  c.fillStyle='#8e8070'; c.fillRect(FX,324,FW,FLOOR-324);
  for(let r=0,y=324;y<FLOOR-6;y+=14,r++){ for(let x=FX-(r%2?14:0);x<FX+FW;x+=28){
      const x0=Math.max(FX,x+1), x1=Math.min(FX+FW,x+27); if(x1-x0<4) continue;
      bx(c,x0,y+1,x1-x0,12,['#9a8c7a','#857767','#a39582','#918371'][(r*3+Math.floor(x/28))&3],3,0); rp(c,x0,y+1,x1-x0,12,3); ink(c,0.7,0.45); } }
  c.strokeStyle=INK; c.lineWidth=1.3; c.strokeRect(FX,324,FW,FLOOR-324);
  g=c.createLinearGradient(0,354,0,FLOOR); g.addColorStop(0,'#120d09'); g.addColorStop(1,'#2a1f17');
  c.beginPath(); c.moveTo(788,FLOOR); c.lineTo(788,384); c.arc(818,384,30,Math.PI,0); c.lineTo(848,FLOOR); c.closePath(); c.fillStyle=g; c.fill();
  c.beginPath(); c.arc(818,384,35,Math.PI,0); c.strokeStyle='#a39582'; c.lineWidth=9; c.stroke();
  c.beginPath(); c.arc(818,384,39.5,Math.PI,0); ink(c,1.1); c.beginPath(); c.arc(818,384,30.5,Math.PI,0); ink(c,1.1);
  for(let k=0;k<=6;k++){ const a=Math.PI+k*Math.PI/6; line(c,818+Math.cos(a)*31,384+Math.sin(a)*31,818+Math.cos(a)*39,384+Math.sin(a)*39,INK,0.8); }
  line(c,783,384,783,FLOOR,INK,1.1); line(c,853,384,853,FLOOR,INK,1.1);
  g=c.createRadialGradient(818,330,2,818,330,40); g.addColorStop(0,'rgba(30,22,16,0.35)'); g.addColorStop(1,'rgba(30,22,16,0)'); c.fillStyle=g; c.fillRect(770,290,96,80);
  // 薪と、吊るした鍋
  inkE(c,808,453,15,4.5,'#5a3f2e',1,0.18); inkE(c,829,453,15,4.5,'#4a3424',1,-0.18);
  line(c,818,356,818,398,'#4a4038',1.6); for(let k=0;k<6;k++) inkE(c,818,360+k*6.5,1.6,2.8,'rgba(0,0,0,0)',0.6);
  c.beginPath(); c.arc(818,402,13,Math.PI,0); ink(c,1.2);
  E(c,818,412,16,12,'#2c2622'); c.beginPath(); c.ellipse(818,412,16,12,0,0,Math.PI*2); ink(c,1.1);
  bx(c,801,399,34,5,'#3a322c',2,1);
  bx(c,752,456,132,8,'#7a6e62',1,1.2);
  // マントル（ろうそく・花びん・写真立て）
  bx(c,754,312,128,11,'#6b4628',2,1.3); c.fillStyle='rgba(255,240,215,0.22)'; c.fillRect(756,313,124,2);
  corbel(c,766,323,0.9); corbel(c,870,323,0.9);
  for(const cx of [774,862]){ bx(c,cx-5,308,10,4,'#b08d57',1,0.9); bx(c,cx-3,292,6,16,dim?'#d8d0bc':'#f6eed8',1,0.9); line(c,cx,292,cx,289,INK,0.9); }
  inkE(c,800,304,7,8,'#4a4e6d',1); bx(c,797,293,6,5,'#4a4e6d',1,0.9);
  for(let k=0;k<5;k++){ const a=-Math.PI/2+(k-2)*0.35; line(c,800,293,800+Math.cos(a)*14,293+Math.sin(a)*14,'#7f8a6a',0.8); E(c,800+Math.cos(a)*15,293+Math.sin(a)*15,2.2,2.2,['#d9b877','#c98a7a','#8a74a8'][k%3]); }
  bx(c,828,296,18,16,'#b08d57',1.5,1); c.fillStyle='#e2d4b0'; c.fillRect(831,299,12,10);
  E(c,837,303,2.4,2.6,'#7a6a5a'); E(c,837,309,4.5,3,'#7a6a5a');
}

let roomCache=null, roomKey='';
function roomLayer(noon,dim){
  const key=(noon?'noon':'eve')+(dim?'-dim':'');
  if(roomCache && roomKey===key) return roomCache;
  const cv=roomCache||document.createElement('canvas'); cv.width=W; cv.height=H;
  const c=cv.getContext('2d'); c.clearRect(0,0,W,H); paintRoom(c,noon,dim);
  roomCache=cv; roomKey=key; return cv;
}
// 毎フレーム描く、動くもの
function drawRoomLive(t,noon,dim){
  const c=ctx;
  // 窓から差しこむ光と、その中を舞うほこり
  if(!dim){
    const dx=noon?110:190, col=noon?'255,248,222':'255,190,120';
    const g=c.createLinearGradient(0,232,0,462); g.addColorStop(0,`rgba(${col},${0.20+0.02*Math.sin(t*0.7)})`); g.addColorStop(1,`rgba(${col},0)`);
    c.save(); c.beginPath(); c.moveTo(264,232); c.lineTo(344,232); c.lineTo(344+dx,462); c.lineTo(264+dx,462); c.closePath(); c.fillStyle=g; c.fill(); c.clip();
    for(let i=0;i<14;i++){ const u=rnd(i+90), v=(rnd(i+120)+t*0.025*(0.5+rnd(i)))%1;
      const x=264+u*80+v*dx+Math.sin(t*0.8+i)*4, y=232+v*230;
      E(c,x,y,1.1,1.1,`rgba(255,250,230,${0.55*Math.sin(v*Math.PI)})`); }
    c.restore();
  }
  // 柱時計：いまの時刻を指す針と、ゆれる振り子
  { const d=new Date(), hr=(d.getHours()%12+d.getMinutes()/60)*Math.PI/6-Math.PI/2, mn=(d.getMinutes()+d.getSeconds()/60)*Math.PI/30-Math.PI/2;
    c.lineCap='round'; line(c,393,262,393+Math.cos(hr)*7,262+Math.sin(hr)*7,INK,1.8); line(c,393,262,393+Math.cos(mn)*11,262+Math.sin(mn)*11,INK,1.1); E(c,393,262,1.6,1.6,'#b08d57');
    const a=Math.sin(t*Math.PI)*0.2, px=393+Math.sin(a)*62, py=314+Math.cos(a)*62;
    c.save(); rp(c,381,310,24,80,10); c.clip(); line(c,393,314,px,py,'#b08d57',1.4); inkE(c,px,py,6,6,'#d9b877',1); E(c,px-2,py-2,1.6,1.6,'rgba(255,250,225,0.8)'); c.restore();
    c.save(); rp(c,381,310,24,80,10); c.clip(); c.fillStyle='rgba(255,255,255,0.08)'; c.fillRect(384,310,5,80); c.restore(); }
  // ゆり椅子（だれも座っていないのに、すこしだけゆれている）
  rockingChair(c,506,460,Math.sin(t*1.3)*0.045);
  // ティーポットの湯気
  if(!dim){ c.save(); c.lineCap='round';
    for(let k=0;k<2;k++){ const ph=(t*0.45+k*0.5)%1; c.globalAlpha=0.45*Math.sin(ph*Math.PI);
      c.beginPath(); for(let s=0;s<=8;s++){ const yy=385-ph*14-s*2.6; c.lineTo(264+Math.sin(s*0.8+t*2+k)*2.4+s*0.4,yy); }
      c.strokeStyle='#fffaf0'; c.lineWidth=2; c.stroke(); }
    c.restore(); }
  // 暖炉の火
  const bxF=818, byF=452;
  if(!dim){
    const fl=1+0.08*Math.sin(t*9)+0.05*Math.sin(t*23);
    let g=c.createRadialGradient(bxF,byF-14,4,bxF,byF-14,190*fl); g.addColorStop(0,'rgba(255,160,60,0.30)'); g.addColorStop(1,'rgba(255,160,60,0)');
    c.fillStyle=g; c.fillRect(600,240,W-600,H-240);
    c.save(); c.beginPath(); c.moveTo(788,FLOORY+22); c.lineTo(788,384); c.arc(818,384,30,Math.PI,0); c.lineTo(848,FLOORY+22); c.closePath(); c.clip();
    for(const [col,sc] of [['rgba(232,110,50,0.9)',1],['rgba(255,190,80,0.95)',0.68],['rgba(255,245,200,0.95)',0.36]]){
      for(let i=0;i<5;i++){ const xo=(i-2)*7*sc, h=(24+9*Math.sin(t*8+i*1.7)+5*Math.sin(t*17+i*2.3))*sc*(i===2?1.25:1), w=6.5*sc+1;
        const tip=bxF+xo+Math.sin(t*6+i*1.3)*3;
        c.beginPath(); c.moveTo(bxF+xo-w,byF); c.quadraticCurveTo(bxF+xo-w*1.2,byF-h*0.55,tip,byF-h); c.quadraticCurveTo(bxF+xo+w*1.2,byF-h*0.55,bxF+xo+w,byF); c.closePath();
        c.fillStyle=col; c.fill(); } }
    for(let k=0;k<7;k++){ const ph=(t*0.55+k*0.143)%1; E(c,bxF+Math.sin(k*12.3+t*2)*12*(0.4+ph),byF-12-ph*70,1.3,1.3,`rgba(255,190,90,${1-ph})`); }
    c.restore();
    c.save(); c.beginPath(); c.ellipse(818,412,16,12,0,0,Math.PI*2); c.clip();             // 鍋の底に火がうつる
    g=c.createLinearGradient(0,404,0,424); g.addColorStop(0,'rgba(255,170,80,0)'); g.addColorStop(1,`rgba(255,170,80,${0.45*fl})`); c.fillStyle=g; c.fillRect(800,400,36,26); c.restore();
    // ろうそくの火
    for(const cx of [774,862]){ const f=1+0.12*Math.sin(t*13+cx);
      const gg=c.createRadialGradient(cx,284,1,cx,284,22); gg.addColorStop(0,'rgba(255,200,110,0.35)'); gg.addColorStop(1,'rgba(255,200,110,0)'); c.fillStyle=gg; c.fillRect(cx-22,262,44,44);
      c.beginPath(); c.moveTo(cx,289); c.quadraticCurveTo(cx-3.2*f,285,cx+Math.sin(t*9+cx)*0.8,279-2*f); c.quadraticCurveTo(cx+3.2*f,285,cx,289); c.fillStyle='#ffb347'; c.fill();
      E(c,cx,286,1.2,2,'#fff3c0'); }
    if(!noon){ c.fillStyle='rgba(230,140,70,0.07)'; c.fillRect(0,0,W,H); }                // 夕方は部屋ぜんたいが赤く
  } else {
    for(let k=0;k<4;k++) E(c,808+k*7,451,2,1.2,`rgba(200,80,40,${0.35+0.25*Math.sin(t*2+k)})`);     // 消えかけの燠
    c.save(); c.lineCap='round'; for(let k=0;k<2;k++){ const ph=(t*0.2+k*0.5)%1; c.globalAlpha=0.3*Math.sin(ph*Math.PI);
      c.beginPath(); for(let s=0;s<=10;s++) c.lineTo(818+Math.sin(s*0.7+t+k)*4,446-ph*30-s*4); c.strokeStyle='#b8b0a8'; c.lineWidth=2.4; c.stroke(); } c.restore();
  }
}

/* ---- 落とせる家具（タンス・つぼ・本の山） --------------------------------------
   背景の絵よりくっきり（濃いインクの輪郭）＋白い縁取り＝ページを裏返すと動くもの、のしるし */
function drawFurniturePiece(kind,b){
  const sx=b.squash, sy=2-b.squash;
  const w=b.w*sx, h=b.h*sy, X0=b.x+b.w/2-w/2, Y0=b.y+b.h/2-h/2;
  // 落とせる家具は、背景の絵よりくっきり（濃いインクの輪郭）。重力の向きに関係なく、上下はそのまま
  // いったん小さなキャンバスに描いてから、白い縁取り（ページを裏返すと動くもの、のしるし）をつけて貼る
  const PAD=FURN_OUTLINE+3, cw=Math.ceil(w+PAD*2), ch=Math.ceil(h+PAD*2);
  if(furnCv.width<cw||furnCv.height<ch){ furnCv.width=Math.max(furnCv.width,cw); furnCv.height=Math.max(furnCv.height,ch); }
  const c=furnCv.getContext('2d'); c.clearRect(0,0,furnCv.width,furnCv.height);
  const x=PAD, y=PAD; c.save();
  if(kind==='chest'){                                   // 小さなタンス（3段の引き出し）
    bx(c,x+3,y+h-4,4,4,'#4a3424',1,0.9); bx(c,x+w-7,y+h-4,4,4,'#4a3424',1,0.9);
    bx(c,x+1,y+4,w-2,h-8,'#7a5434',3,1.5);
    bx(c,x-1,y,w+2,5,'#5a3f2e',2,1.3);
    for(let k=0;k<3;k++){ const dy=y+7+k*(h-13)/3; bx(c,x+4,dy,w-8,(h-13)/3-2,'#8a6440',2,0.9); inkE(c,x+w/2,dy+((h-13)/3-2)/2,2.2,2.2,'#d9b877',0.7); }
  } else if(kind==='pot'){                              // ふたつきの、つぼ
    const potPath=()=>{ c.beginPath(); c.moveTo(x+w*0.3,y+h*0.16); c.bezierCurveTo(x-w*0.08,y+h*0.32,x-w*0.02,y+h*0.98,x+w*0.3,y+h);
      c.lineTo(x+w*0.7,y+h); c.bezierCurveTo(x+w*1.02,y+h*0.98,x+w*1.08,y+h*0.32,x+w*0.7,y+h*0.16); c.closePath(); };
    potPath(); c.fillStyle='#b0704a'; c.fill();
    c.save(); c.clip(); c.fillStyle='#e8dcc0'; c.fillRect(x,y+h*0.46,w,h*0.14);
    for(let k=0;k<5;k++) E(c,x+w*(0.14+k*0.18),y+h*0.53,2,2,'#4a4e6d');
    c.fillStyle='rgba(255,240,210,0.3)'; c.fillRect(x+w*0.18,y+h*0.2,3,h*0.6); c.restore();
    potPath(); ink(c,1.5);
    bx(c,x+w*0.24,y+h*0.06,w*0.52,h*0.12,'#8b5236',2,1.3); inkE(c,x+w/2,y+h*0.04,3,2.4,'#8b5236',1.1);
  } else {                                              // 本の山
    ['#57644a','#8b5e63','#b08d57','#4a4e6d'].forEach((col,k)=>{ const bh=h/4, ox=[0,3,1,2][k];
      bx(c,x+ox,y+k*bh,w-3,bh-0.5,col,1.5,1.3);
      line(c,x+ox+3,y+k*bh+bh/2,x+ox+w-6,y+k*bh+bh/2,'rgba(232,220,192,0.6)',1.4);
      c.fillStyle='#efe6d2'; c.fillRect(x+ox+w-6,y+k*bh+1.5,2.5,bh-3.5); });
  }
  c.restore();
  stampWithOutline(furnCv, X0-PAD, Y0-PAD);
}
/* 白い縁取り：絵を白く塗りつぶした型を、まわり16方向に少しずつずらして押し、その上に元の絵を貼る */
const FURN_OUTLINE=3;
const furnCv=document.createElement('canvas'), furnWhite=document.createElement('canvas');
function stampWithOutline(src,dx,dy){
  if(furnWhite.width!==src.width||furnWhite.height!==src.height){ furnWhite.width=src.width; furnWhite.height=src.height; }
  const wc=furnWhite.getContext('2d'); wc.clearRect(0,0,src.width,src.height);
  wc.globalCompositeOperation='source-over'; wc.drawImage(src,0,0);
  wc.globalCompositeOperation='source-in'; wc.fillStyle='#fffaf0'; wc.fillRect(0,0,src.width,src.height);
  wc.globalCompositeOperation='source-over';
  ctx.save();
  ctx.shadowColor='rgba(58,42,26,0.35)'; ctx.shadowBlur=3;                 // 縁取りの外がわに、うすい影
  for(let i=0;i<16;i++){ const a=i*Math.PI/8; ctx.drawImage(furnWhite,dx+Math.cos(a)*FURN_OUTLINE,dy+Math.sin(a)*FURN_OUTLINE); if(i===0) ctx.shadowColor='rgba(0,0,0,0)'; }
  ctx.restore();
  ctx.drawImage(src,dx,dy);
}

/* ---- 狼との戦いの夜（ゴシック）：灯りを消した部屋 ----------------------------------
   部屋ぜんたいを暗くし、明るいのは 暖炉の火・ろうそく・窓の月あかり・少年のまわりだけ。
   窓の外は夜空と赤みがかった月。rage（0〜1）… 狼が追いつめられて怒ると、部屋がうす赤く脈うつ */
let darkCv=null;
function drawNightFight(t,rage){
  const c=ctx, X=262,Y=148,WW=84,HH=84;
  // 窓の外：夜空・赤い月・木のかげ
  c.save(); c.beginPath(); c.rect(X,Y,WW,HH); c.clip();
  let g=c.createLinearGradient(0,Y,0,Y+HH); g.addColorStop(0,'#120a1e'); g.addColorStop(1,'#3a1830'); c.fillStyle=g; c.fillRect(X,Y,WW,HH);
  c.shadowColor='rgba(230,120,135,0.8)'; c.shadowBlur=16; E(c,320,176,11,11,'#ecccc6'); c.shadowBlur=0;
  E(c,316,173,3,2.4,'rgba(170,110,115,0.45)'); E(c,324,180,2.2,1.8,'rgba(170,110,115,0.4)');
  c.fillStyle='#0c0610'; c.beginPath(); c.moveTo(X,Y+HH); c.lineTo(X,Y+HH-20); c.quadraticCurveTo(X+30,Y+HH-32,X+56,Y+HH-22); c.quadraticCurveTo(X+72,Y+HH-16,X+WW,Y+HH-24); c.lineTo(X+WW,Y+HH); c.fill();
  for(let i=0;i<9;i++){ const tx=X+4+i*10, th=14+rnd(i+3)*14; c.beginPath(); c.moveTo(tx-5,Y+HH-8); c.lineTo(tx,Y+HH-8-th); c.lineTo(tx+5,Y+HH-8); c.fill(); }
  c.restore();
  c.fillStyle='#2a1a14'; c.fillRect(X+WW/2-2,Y,4,HH); c.fillRect(X,Y+HH/2-2,WW,4);
  // 暗やみ（灯りのところだけ、くりぬく）
  if(!darkCv){ darkCv=document.createElement('canvas'); darkCv.width=W; darkCv.height=H; }
  const d=darkCv.getContext('2d'), fl=1+0.07*Math.sin(t*9)+0.04*Math.sin(t*23);
  d.globalCompositeOperation='source-over'; d.clearRect(0,0,W,H); d.fillStyle='rgba(12,3,9,0.78)'; d.fillRect(0,0,W,H);
  d.globalCompositeOperation='destination-out';
  const hole=(x,y,r,a)=>{ const h=d.createRadialGradient(x,y,0,x,y,r); h.addColorStop(0,`rgba(0,0,0,${a})`); h.addColorStop(1,'rgba(0,0,0,0)'); d.fillStyle=h; d.fillRect(x-r,y-r,r*2,r*2); };
  hole(818,420,250*fl,0.92);                                   // 暖炉
  for(const cx of [774,862]) hole(cx,284,70*fl,0.7);           // ろうそく
  hole(304,190,95,0.6);                                        // 窓
  const p=GT.player; if(p) hole(p.x+p.w/2,p.y+p.h/2,120,0.55); // 少年のまわり
  d.save(); d.beginPath(); d.moveTo(266,236); d.lineTo(342,236); d.lineTo(470,462); d.lineTo(380,462); d.closePath(); d.clip();   // 月あかりの筋
  g=d.createLinearGradient(0,236,0,462); g.addColorStop(0,'rgba(0,0,0,0.5)'); g.addColorStop(1,'rgba(0,0,0,0.1)'); d.fillStyle=g; d.fillRect(260,230,220,240); d.restore();
  c.drawImage(darkCv,0,0);
  // 灯りの色：暖炉は赤いだいだい、月あかりは青白い
  c.save(); c.globalCompositeOperation='screen';
  g=c.createRadialGradient(818,430,6,818,430,210*fl); g.addColorStop(0,'rgba(255,120,60,0.30)'); g.addColorStop(1,'rgba(255,120,60,0)'); c.fillStyle=g; c.fillRect(560,200,W-560,H-200);
  c.beginPath(); c.moveTo(266,236); c.lineTo(342,236); c.lineTo(470,462); c.lineTo(380,462); c.closePath();
  g=c.createLinearGradient(0,236,0,462); g.addColorStop(0,'rgba(170,160,220,0.16)'); g.addColorStop(1,'rgba(170,160,220,0)'); c.fillStyle=g; c.fill();
  c.restore();
  // 狼が怒ると、部屋がうす赤く脈うつ
  if(rage>0){ c.fillStyle=`rgba(150,12,32,${rage*(0.10+0.07*Math.sin(t*5))})`; c.fillRect(0,0,W,H); }
}

GT.grannyRoom={
  drawNightFight,
  draw(t,noon,dim){
    ctx.save();
    ctx.globalAlpha=0.93; ctx.drawImage(roomLayer(noon,dim),0,0); ctx.globalAlpha=1;    // 紙の目がすこし透けるように
    drawRoomLive(t,noon,dim);
    if(dim){ ctx.fillStyle='rgba(26,24,40,0.42)'; ctx.fillRect(0,0,W,H); }
    ctx.restore();
  },
  drawFurniture:drawFurniturePiece,
};
})();
