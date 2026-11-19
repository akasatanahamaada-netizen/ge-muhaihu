/* ============================================================================
   紙を切って重ねた森（飛び出す絵本・紙の劇場）  GT.paperBackdrop(kind)
   ----------------------------------------------------------------------------
   赤ずきんのお話（明るい場面）の背景。絵の画像は使わず、ここで描く。
     ・空（やわらかいパステル）と、紙を切った雲
     ・奥から手前へ、4枚の紙の層：丘のふちに、丸い木・とがった木のシルエット
       それぞれの紙に、紙のすじ（手ざわり）・色鉛筆の線・切り口の白いふち（紙の厚み）
       層と層のあいだに、やわらかい影
     ・画面の左右のはしに、背の高い紙の木（場面のふち取り）
   kind：'day'（昼）／'evening'（夕方）。一度描いたら、取っておく
   使いかた：js/playlist.js の背景に {paper:'day'} と書く（js/engine.js の drawStageBackground が描く）
   ========================================================================== */
(function(){
const W=GT.W, H=GT.H, FLOOR=GT.H-GT.EDGE;
const PAL={
  day:{ sky:['#f9e6cc','#f3ead6','#e6eed9'], cloud:'#fdf8ee',
        layers:['#d4e2c4','#b9d0a2','#9cc085','#7fab6c'], trunk:['#c9b496','#b39874','#9c7f5c','#86694a'],
        flowers:['#f2b8c6','#f6d98e','#ffffff','#e8a0a8'], frame:['#7fa572','#6e9563','#5e8556'], frameTrunk:'#7a5c40' },
  evening:{ sky:['#f3c9a6','#f6dcbc','#f2e2c8'], cloud:'#fbe9d6',
        layers:['#e3c3aa','#d0a88e','#b98f74','#9e765e'], trunk:['#c7a58a','#b08c70','#977358','#7f5f46'],
        flowers:['#f2a8a0','#f6c98e','#fff2e0','#e89088'], frame:['#9c8a66','#8a785a','#77684e'], frameTrunk:'#6a4e38' },
};
const cache={};
let seed=1; const R=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };

// 紙のすじ（小さなノイズの模様）
const grainCv=document.createElement('canvas'); grainCv.width=grainCv.height=160;
{ const g=grainCv.getContext('2d'), d=g.createImageData(160,160);
  for(let i=0;i<d.data.length;i+=4){ const v=200+Math.random()*55|0; d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255; }
  g.putImageData(d,0,0);
  g.globalAlpha=0.25; g.strokeStyle='#8a7a66';                       // 紙のせんい
  for(let i=0;i<40;i++){ const x=Math.random()*160, y=Math.random()*160, a=Math.random()*Math.PI; g.lineWidth=0.5;
    g.beginPath(); g.moveTo(x,y); g.lineTo(x+Math.cos(a)*8,y+Math.sin(a)*8); g.stroke(); } }

/* 一枚の紙：shape（パスを作る関数）を color でぬり、紙の手ざわり・色鉛筆の線・切り口のふちを足して、別のキャンバスに返す */
function paperPiece(shape,color,opt){
  opt=opt||{};
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const c=cv.getContext('2d');
  c.save(); c.translate(0.8,1.8); c.fillStyle='#fbf7ee'; shape(c); c.restore();   // 切り口の白い紙の厚み（少しずらして下に敷く）
  c.fillStyle=color; shape(c);
  c.save(); c.globalCompositeOperation='source-atop';
  c.globalAlpha=0.22; c.fillStyle=c.createPattern(grainCv,'repeat'); c.fillRect(0,0,W,H);
  c.globalCompositeOperation='source-atop'; c.globalAlpha=0.07; c.strokeStyle='#5a4a36'; c.lineWidth=0.8;   // 色鉛筆の線（ななめ）
  for(let x=-H;x<W;x+=5){ c.beginPath(); c.moveTo(x,H); c.lineTo(x+H*0.7,0); c.stroke(); }
  if(opt.shadeTop){ const g=c.createLinearGradient(0,opt.shadeTop,0,FLOOR); g.addColorStop(0,'rgba(255,255,255,0.18)'); g.addColorStop(1,'rgba(60,40,20,0.12)');
    c.globalAlpha=1; c.fillStyle=g; c.fillRect(0,0,W,H); }
  c.restore();
  return cv;
}
/* 丘のふちと、その上に立つ木のシルエット（丸い木・とがった木） */
function layerShape(c,base,amp,trees){
  const yAt=x=>base+Math.sin(x*0.011+base)*amp+Math.sin(x*0.031)*amp*0.35;
  c.beginPath(); c.moveTo(-10,H+10); c.lineTo(-10,yAt(-10));
  for(let x=-10;x<=W+10;x+=12) c.lineTo(x,yAt(x));
  c.lineTo(W+10,H+10); c.closePath(); c.fill();
  for(const t of trees){
    const yb=yAt(t.x)+4;
    c.beginPath(); c.rect(t.x-t.w*0.08,yb-t.h*0.45,t.w*0.16,t.h*0.45); c.fill();   // 幹
    if(t.pine){ for(let k=0;k<3;k++){ const y=yb-t.h*(0.25+k*0.25), w=t.w*(1-k*0.25);
        c.beginPath(); c.moveTo(t.x-w/2,y); c.lineTo(t.x,y-t.h*0.38); c.lineTo(t.x+w/2,y); c.closePath(); c.fill(); } }
    else { const cy=yb-t.h*0.62, r=t.w*0.5;
      for(const [dx,dy,rr] of [[0,0,1],[-0.45,0.25,0.7],[0.5,0.3,0.65]]){ c.beginPath(); c.arc(t.x+r*dx,cy+r*dy,r*rr,0,Math.PI*2); c.fill(); } }
  }
}
function trees(n,hMin,hMax,s){ seed=s; const a=[]; for(let i=0;i<n;i++){ const h=hMin+R()*(hMax-hMin); a.push({x:R()*W, h, w:h*(0.4+R()*0.2), pine:R()<0.45}); } return a; }

/* 画面のはしの、背の高い紙の木（葉を3つの色の紙で重ねる） */
function frameTree(c,P,x,flip){
  const tr=paperPiece(cc=>{ cc.beginPath(); cc.moveTo(x-14,FLOOR+20); cc.quadraticCurveTo(x-6,FLOOR-160,x-10,-20); cc.lineTo(x+12,-20); cc.quadraticCurveTo(x+8,FLOOR-160,x+18,FLOOR+20); cc.closePath(); cc.fill();
    cc.beginPath(); cc.moveTo(x,FLOOR-210); cc.quadraticCurveTo(x+flip*40,FLOOR-240,x+flip*80,FLOOR-262); cc.lineTo(x+flip*84,FLOOR-254); cc.quadraticCurveTo(x+flip*44,FLOOR-228,x+2,FLOOR-196); cc.closePath(); cc.fill(); }, P.frameTrunk);
  drawLayer(c,tr,5);
  P.frame.forEach((col,k)=>{ seed=31+k*7+(flip>0?3:0);
    const piece=paperPiece(cc=>{ cc.beginPath();
      for(let i=0;i<7;i++){ const cx=x+flip*(10+R()*90)-flip*20, cy=10+k*40+R()*150, r=34+R()*30; cc.moveTo(cx+r,cy); cc.arc(cx,cy,r,0,Math.PI*2); }  cc.fill(); }, col);
    drawLayer(c,piece,4+k); });
}
function drawLayer(c,cv,depth){
  c.save(); c.shadowColor='rgba(80,58,36,0.32)'; c.shadowBlur=6+depth; c.shadowOffsetX=1.5; c.shadowOffsetY=2+depth*0.6;
  c.drawImage(cv,0,0); c.restore();
}

GT.paperBackdrop=function(kind){
  kind=PAL[kind]?kind:'day';
  if(cache[kind]) return cache[kind];
  const P=PAL[kind], cv=document.createElement('canvas'); cv.width=W; cv.height=H; const c=cv.getContext('2d');
  // 空
  const g=c.createLinearGradient(0,0,0,H); g.addColorStop(0,P.sky[0]); g.addColorStop(0.55,P.sky[1]); g.addColorStop(1,P.sky[2]);
  c.fillStyle=g; c.fillRect(0,0,W,H);
  c.save(); c.globalAlpha=0.18; c.fillStyle=c.createPattern(grainCv,'repeat'); c.globalCompositeOperation='multiply'; c.fillRect(0,0,W,H); c.restore();
  // 紙の雲
  seed=7; for(let i=0;i<3;i++){ const cx=220+i*190+R()*50, cy=50+R()*50, s=0.8+R()*0.5;   // 雲は、はしの木にかくれないところに
    drawLayer(c,paperPiece(cc=>{ cc.beginPath(); for(const [dx,dy,r] of [[0,0,22],[24,-8,26],[50,2,20],[24,8,22]]){ cc.moveTo(cx+(dx+r)*s,cy+dy*s); cc.arc(cx+dx*s,cy+dy*s,r*s,0,Math.PI*2); }  cc.fill(); }, P.cloud),1); }
  // 4枚の紙の層（奥から手前へ）
  const L=[ {base:250,amp:14,tr:trees(14,90,150,11)}, {base:300,amp:12,tr:trees(11,90,140,23)}, {base:350,amp:10,tr:trees(9,80,130,37)}, {base:405,amp:8,tr:trees(7,70,110,53)} ];
  L.forEach((l,i)=>{ drawLayer(c, paperPiece(cc=>layerShape(cc,l.base,l.amp,l.tr), P.layers[i], {shadeTop:l.base-60}), i*1.5); });
  // いちばん手前の層の、小さな紙の花
  seed=91; for(let i=0;i<26;i++){ const x=R()*W, y=FLOOR-6-R()*40, col=P.flowers[i%P.flowers.length];
    drawLayer(c,paperPiece(cc=>{ cc.beginPath(); for(let k=0;k<5;k++){ const a=k/5*Math.PI*2; cc.moveTo(x+Math.cos(a)*3.4+2.4,y+Math.sin(a)*3.4); cc.arc(x+Math.cos(a)*3.4,y+Math.sin(a)*3.4,2.4,0,Math.PI*2); }  cc.fill(); }, col),1); }
  // 左右のはしの、背の高い紙の木
  frameTree(c,P,30,1); frameTree(c,P,W-30,-1);
  return (cache[kind]=cv);
};
})();
