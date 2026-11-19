/* ============================================================================
   紙の劇場のふち取り（参考画像③のような、紙を切って重ねた飛び出す絵本の箱）
   ----------------------------------------------------------------------------
   赤ずきんのお話（明るい場面）で、今までの背景の絵のまわりに、紙の層を重ねる。
     ・画面のふち：角の丸い紙の枠を、何枚も重ねる（奥へ行くほど、少し小さく・少し暗く）
     ・上：雲のように丸くふくらんだ、紙を切った木の葉が、上のふちから垂れ下がる
     ・左右：うすい色の紙の木の幹が、ふちに立つ（枝が少し内がわへ）
     ・下：白っぽい紙を切った草・葉・花が、手前に並ぶ
   どの紙にも、紙のすじと、重なった紙の影。人物や地形をかくしすぎないよう、ふちだけ
   ========================================================================== */
(function(){
const W=GT.W, H=GT.H;
let cv=null;
let sd=1; const R=()=>{ sd=(sd*16807)%2147483647; return sd/2147483647; };

const grain=document.createElement('canvas'); grain.width=grain.height=128;
{ const g=grain.getContext('2d'), d=g.createImageData(128,128);
  for(let i=0;i<d.data.length;i+=4){ const v=180+Math.random()*75|0; d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255; } g.putImageData(d,0,0); }

/* 一枚の紙：draw(c) でぬった形に、紙のすじ・上のふちの明るさをのせ、影をつけて、ctx に重ねる */
function sheet(dst,draw,color,shadow){
  const p=document.createElement('canvas'); p.width=W; p.height=H; const c=p.getContext('2d');
  c.fillStyle=color; draw(c);
  c.globalCompositeOperation='source-atop'; c.globalAlpha=0.35; c.fillStyle=c.createPattern(grain,'repeat'); c.fillRect(0,0,W,H);   // 紙のすじ（形の中だけ）
  c.globalAlpha=1; const lg=c.createLinearGradient(0,0,0,H); lg.addColorStop(0,'rgba(255,255,255,0.12)'); lg.addColorStop(1,'rgba(60,40,30,0.06)'); c.fillStyle=lg; c.fillRect(0,0,W,H);
  dst.save(); dst.shadowColor=`rgba(70,48,36,${shadow||0.35})`; dst.shadowBlur=9; dst.shadowOffsetX=0; dst.shadowOffsetY=3;
  dst.drawImage(p,0,0); dst.restore();
}
const rr=(c,x,y,w,h,r)=>{ c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); };

/* 枠：外の四角から、角の丸い窓をくりぬいた紙 */
function frame(dst,inset,radius,color,shadow){
  sheet(dst,c=>{ c.beginPath(); c.rect(-20,-20,W+40,H+40); rr(c,inset,inset,W-inset*2,H-inset*2,radius); c.fill('evenodd'); },color,shadow);
}
/* 上から垂れ下がる、雲のような紙の葉 */
function canopy(dst,y,color,seed,depth){
  sd=seed; sheet(dst,c=>{ c.beginPath(); c.rect(-20,-20,W+40,y+20);
    for(let x=-30;x<W+40;){ const r=22+R()*26; c.moveTo(x+r,y); c.arc(x,y+R()*10,r,0,Math.PI*2); x+=r*1.25; }
    c.fill(); },color,0.3+depth*0.05);
}
/* ふちに立つ紙の木の幹（少し曲がる。枝を内がわへ） */
function trunk(dst,x,w,lean,color,seed){
  sd=seed; sheet(dst,c=>{ c.beginPath();
    c.moveTo(x-w/2,H+20); c.quadraticCurveTo(x-w*0.4+lean*0.4,H*0.5,x-w*0.35+lean,-20); c.lineTo(x+w*0.35+lean,-20); c.quadraticCurveTo(x+w*0.4+lean*0.4,H*0.5,x+w/2,H+20); c.closePath(); c.fill();
    for(let k=0;k<2;k++){ const by=60+k*70+R()*30, dir=lean>0?1:-1, bx=x+lean*(1-by/H);
      c.beginPath(); c.moveTo(bx,by+10); c.quadraticCurveTo(bx+dir*30,by-6,bx+dir*(60+R()*30),by-30-R()*20); c.lineTo(bx+dir*(62+R()*30),by-22); c.quadraticCurveTo(bx+dir*30,by+6,bx,by+22); c.closePath(); c.fill(); }
  },color,0.32);
}
/* 手前の、紙を切った草・葉・花（白っぽい紙） */
function meadow(dst,base,color,seed,tall){
  sd=seed; sheet(dst,c=>{
    c.beginPath(); c.rect(-20,base,W+40,H-base+20); c.fill();
    for(let x=-10;x<W+10;x+=7+R()*9){ const h=tall*(0.4+R()*0.8), lean=(R()-0.5)*14;   // 草の葉（細いとがった形）
      c.beginPath(); c.moveTo(x-3,base+2); c.quadraticCurveTo(x+lean*0.4,base-h*0.6,x+lean,base-h); c.quadraticCurveTo(x+lean*0.4+2,base-h*0.5,x+3,base+2); c.closePath(); c.fill(); }
    for(let i=0;i<9;i++){ const x=R()*W, y=base-tall*(0.6+R()*0.7), r=4+R()*3;          // 花（5まいの花びら）と茎
      c.beginPath(); c.moveTo(x-1,base); c.lineTo(x-1,y); c.lineTo(x+1,y); c.lineTo(x+1,base); c.fill();
      for(let k=0;k<5;k++){ const a=k/5*Math.PI*2; c.beginPath(); c.ellipse(x+Math.cos(a)*r,y+Math.sin(a)*r,r*0.75,r*0.5,a,0,Math.PI*2); c.fill(); } }
    for(let i=0;i<7;i++){ const x=R()*W, y=base-tall*0.3, s=10+R()*8;                 // シダのような葉
      for(let k=0;k<5;k++){ const yy=y-k*s*0.55; c.beginPath(); c.ellipse(x-s*0.35,yy,s*0.35,s*0.14,-0.6,0,Math.PI*2); c.ellipse(x+s*0.35,yy,s*0.35,s*0.14,0.6,0,Math.PI*2); c.fill(); } }
  },color,0.3);
}

function build(){
  cv=document.createElement('canvas'); cv.width=W; cv.height=H; const c=cv.getContext('2d');
  // 奥から手前へ（奥の紙ほど内がわ・色が濃い）
  trunk(c,40,34,14,'#cdb3a0',11); trunk(c,W-40,34,-14,'#cdb3a0',13);
  trunk(c,12,46,8,'#dcc6b4',17);  trunk(c,W-12,46,-8,'#dcc6b4',19);
  canopy(c,18,'#c9cfae',23,2); canopy(c,4,'#d8dcbd',29,1);
  meadow(c,H-14,'#e9e0d4',31,16); meadow(c,H-5,'#f4eee6',37,12);   // 人物の足をかくしすぎない高さ
  frame(c,14,26,'#d6c2b0',0.4); frame(c,8,20,'#e4d4c4',0.38); frame(c,2,14,'#efe5d8',0.34);
}
GT.paperTheater=function(){ if(!cv) build(); return cv; };

const bright=()=>GT.isBright && GT.isBright() && GT.scene && !['chapter1'].includes(GT.scene.id) && GT.scene.type!=='boss' && GT.scene.type!=='qte' && GT.scene.type!=='end' && GT.scene.dynamic!=='arriveHouse';
GT.drawPaperTheater=()=>{ if(bright()) GT.ctx.drawImage(GT.paperTheater(),0,0); };   // js/engine.js が、手前の飾りのあと（色合いの前）に呼ぶ
})();
