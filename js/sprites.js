/* ============================================================================
   Gravity Tale ── キャラクターの絵  (js/sprites.js)
   ----------------------------------------------------------------------------
   assets/character/ の絵を読みこんで、白い縁取りをつけ、小さく縮めてとっておく。
     GT.drawHoodSprite / GT.drawMariSprite / GT.drawCharSprite … キャラを描く
     GT.sprite('boyStand') … 読みこみ済みの絵（まだなら undefined）   GT.drawSprite(絵,x,y,w,h) … 縁取りぶんを合わせて置く
     GT.hasSprite / GT.wolfRunPose
   どの絵のどこを切り出すかは、下の HOOD_SPRITE（box:[左,上,右,下] ＝ 画像の中のピクセル位置）。
   読み込む順番：js/engine.js のあと（GT.PLAYER_H を使う）。
   ========================================================================== */
(function(){
"use strict";
const ctx=GT.ctx;

/* 赤ずきんの絵（assets/character/ の PNG。右向き・左向き・正面の3枚）
   GT.drawHoodSprite(中心x, 足もとy, 高さ, 向き(1=右 / -1=左 / 0=正面), 重力(1=床 / -1=天井), 不透明度, 歩いているか)
   歩いているときは、立ち絵と「歩く絵」（足を踏み出した絵）を交互に出して、歩いて見せる。
   天井に立つときは、足もとを軸に上下さかさまに描く。絵がまだ読みこめていなければ false を返す。 */
// 二頭身の新しい絵（マリミニ (1)〜(5)）。flip:true は左右反転して使う（元の絵はどれも少し左向き）
const HOOD_SPRITE={
  right:{src:'assets/character/マリミニ (5).webp', box:[11,4,277,391], flip:true},   // 赤ずきん（立ち姿）
  left: {src:'assets/character/マリミニ (5).webp', box:[11,4,277,391]},
  front:{src:'assets/character/マリミニ (5).webp', box:[11,4,277,391]},              // 正面向きの代わりにも立ち姿を使う
  walkRight:{src:'assets/character/マリミニ (4).webp', box:[25,1,295,387], flip:true}, // 赤ずきん（歩く姿）
  walkLeft: {src:'assets/character/マリミニ (4).webp', box:[25,1,295,387]},
  // マリ（正面の絵。左右とも同じ）
  mariRight:{src:'assets/character/マリミニ (1).webp', box:[6,39,244,361]},
  mariLeft: {src:'assets/character/マリミニ (1).webp', box:[6,39,244,361]},
  // お母さん・おばあさん（少し左向き。右を向くときは反転）
  motherLeft: {src:'assets/character/マリミニ (3).webp', box:[18,13,290,387]},
  motherRight:{src:'assets/character/マリミニ (3).webp', box:[18,13,290,387], flip:true},
  grannyLeft: {src:'assets/character/マリミニ (2).webp', box:[43,24,282,378]},
  grannyRight:{src:'assets/character/マリミニ (2).webp', box:[43,24,282,378], flip:true},
  grannyScaredLeft: {src:'assets/character/怯えるおばあちゃんミニ.webp', box:[21,23,269,385]},              // 怯えるおばあさん（狼におそわれている）
  grannyScaredRight:{src:'assets/character/怯えるおばあちゃんミニ.webp', box:[21,23,269,385], flip:true},
  // 狼（ミニ。左向き。右を向くときは反転）。立ち姿と、走る姿
  wolfLeft:    {src:'assets/character/狼ミニ.webp',   box:[11,1,266,392]},
  wolfRight:   {src:'assets/character/狼ミニ.webp',   box:[11,1,266,392], flip:true},
  wolfRunLeft: {src:'assets/character/狼ミニ走る.webp', box:[0,6,280,392]},
  wolfRunRight:{src:'assets/character/狼ミニ走る.webp', box:[0,6,280,392], flip:true},
  // 主人公（ちびキャラ。左向き・右向き）
  boyStand: {src:'assets/character/syuzinkou1.webp', box:[3,15,282,402]},    // 立ち姿（正面）
  boyWalk:  {src:'assets/character/syuzinkou2.webp', box:[21,12,320,400]},   // 歩く姿（左向き。右へ歩くときは左右反転）
};
/* 白い縁取り：背景（水彩）の上でもキャラが見分けやすいように、絵のまわりにクリーム色のふちをつける。
   読みこんだときに一度だけ作る。ふちの分だけ絵の外側に余白（_pad）が増えるので、描くときは drawSpr で合わせる。 */
const SPRITE_OUTLINE=0.035;           // ふちの太さ（絵の高さに対する割合。0 でふちなし）
const SPRITE_OUTLINE_COLOR='#fffaf0';
function outlineSprite(src){
  const R=Math.max(0,Math.round(src.height*SPRITE_OUTLINE));
  const cv=document.createElement('canvas'); cv.width=src.width+R*2; cv.height=src.height+R*2;
  cv._pad=R; cv._cw=src.width; cv._ch=src.height;
  if(!R){ cv.getContext('2d').drawImage(src,0,0); return cv; }
  const sil=document.createElement('canvas'); sil.width=cv.width; sil.height=cv.height;   // 絵の形を少しずつずらして重ね、太らせた影絵
  const s=sil.getContext('2d');
  const N=24; for(let i=0;i<N;i++){ const a=i/N*Math.PI*2; s.drawImage(src,R+Math.cos(a)*R,R+Math.sin(a)*R); }
  s.globalCompositeOperation='source-in'; s.fillStyle=SPRITE_OUTLINE_COLOR; s.fillRect(0,0,sil.width,sil.height);
  const c=cv.getContext('2d'); c.drawImage(sil,0,0); c.drawImage(src,R,R);
  return cv;
}
// 縁取りつきの絵を、もとの絵の大きさ（x,y,w,h）で置く
function drawSpr(img,x,y,w,h){
  const p=img._pad||0, sx=w/(img._cw||img.width), sy=h/(img._ch||img.height);
  ctx.drawImage(img, x-p*sx, y-p*sy, img.width*sx, img.height*sy);
}
const HOOD_STEP=0.17;     // 歩くとき、絵を入れかえる間隔（秒）
const hoodSprite={};      // 読みこんだ絵を、小さく縮めておいたもの（毎フレーム大きな絵を縮めると重く、ぼやけるため）
const plainSprite={};     // 同じ絵の、白い縁取りなし（窓の中など、背景の上ではない場面で使う）
for(const k in HOOD_SPRITE){
  const d=HOOD_SPRITE[k], im=new Image();
  im.onload=()=>{
    const [x0,y0,x1,y1]=d.box; let w=x1-x0, h=y1-y0;
    let cv=document.createElement('canvas'); cv.width=w; cv.height=h;
    const c0=cv.getContext('2d'); if(d.flip){ c0.translate(w,0); c0.scale(-1,1); }
    c0.drawImage(im,x0,y0,w,h,0,0,w,h);
    while(h>360){                     // 半分ずつ縮めると、線がきれいに残る
      const nw=Math.round(w/2), nh=Math.round(h/2), n=document.createElement('canvas'); n.width=nw; n.height=nh;
      const c=n.getContext('2d'); c.imageSmoothingQuality='high'; c.drawImage(cv,0,0,nw,nh); cv=n; w=nw; h=nh; }
    hoodSprite[k]=outlineSprite(cv);
    cv._pad=0; cv._cw=cv.width; cv._ch=cv.height; plainSprite[k]=cv;
  };
  im.src=encodeURI(d.src);
}
// plain … true で白い縁取りなし
GT.drawHoodSprite=function(cx,footY,height,dir,g,alpha,walking,plain){
  let key=dir>0?'right':dir<0?'left':'front';
  if(walking && dir){                                   // 歩く絵と立ち絵を交互に
    const step=Math.floor(performance.now()/1000/HOOD_STEP)%2;
    const wk=dir>0?'walkRight':'walkLeft';
    if(step===0 && hoodSprite[wk]) key=wk;
  }
  const img=(plain?plainSprite:hoodSprite)[key]; if(!img) return false;
  const h=height, w=h*img._cw/img._ch;
  ctx.save(); if(alpha!=null) ctx.globalAlpha*=alpha;
  ctx.translate(cx,footY); if((g||1)<0) ctx.scale(1,-1);
  ctx.imageSmoothingQuality='high'; drawSpr(img,-w/2,-h,w,h);
  ctx.restore(); return true;
};
/* マリの絵。GT.drawMariSprite(中心x, 足もとy, 高さ, 向き(1=右 / -1=左), 重力, 不透明度)。正面の絵はないので、向きは左右のどちらか */
GT.drawMariSprite=function(cx,footY,height,dir,g,alpha){
  const img=hoodSprite[dir>0?'mariRight':'mariLeft']; if(!img) return false;
  const h=height, w=h*img._cw/img._ch;
  ctx.save(); if(alpha!=null) ctx.globalAlpha*=alpha;
  ctx.translate(cx,footY); if((g||1)<0) ctx.scale(1,-1);
  ctx.imageSmoothingQuality='high'; drawSpr(img,-w/2,-h,w,h);
  ctx.restore(); return true;
};
/* お母さん・おばあさんの絵。GT.drawCharSprite('mother'|'granny', 中心x, 足もとy, 高さ, 向き(1=右 / -1=左), 重力, 不透明度, 縁取りなし) */
GT.drawCharSprite=function(who,cx,footY,height,dir,g,alpha,plain){
  const img=(plain?plainSprite:hoodSprite)[who+(dir>0?'Right':'Left')]; if(!img) return false;
  const h=height, w=h*img._cw/img._ch;
  ctx.save(); if(alpha!=null) ctx.globalAlpha*=alpha;
  ctx.translate(cx,footY); if((g||1)<0) ctx.scale(1,-1);
  ctx.imageSmoothingQuality='high'; drawSpr(img,-w/2,-h,w,h);
  ctx.restore(); return true;
};
GT.GRANNY_H=GT.PLAYER_H;          // ステージ上のおばあさんの絵の高さ
GT.MARI_H=GT.PLAYER_H;            // ステージ上のマリの絵の高さ
GT.HOOD_H=GT.PLAYER_H;            // ステージ上の赤ずきんの絵の高さ（当たり判定の箱より少し大きく、上にはみ出す）
GT.WOLF_H=Math.round(GT.PLAYER_H*1.15);   // ステージ上の狼（ミニ）の絵の高さ。少年より少し大きい
GT.hasSprite=k=>!!hoodSprite[k];          // その絵が読みこみ済みか（'wolfLeft' など）
/* 狼が走るときの動き（主人公の歩きと同じしくみ）。足もとを原点にした ctx に、沈み・伸び上がり・前のめりをかける。
   走る絵を出す一歩なら true を返す（走る絵 → 立ち絵 → 走る絵 … と入れかえる）。dir=進む向き、g=重力 */
const WOLF_STEP=0.13;                     // 一歩ぶんの時間（秒）。主人公より少し速い
GT.wolfRunPose=function(running,dir,g){
  if(!running || !hoodSprite.wolfRunLeft) return false;
  const step=Math.floor(performance.now()/1000/WOLF_STEP)%2===0;
  ctx.translate(0, step ? 0 : -4*(g||1));          // 走る絵で沈み、立ち絵で跳ねるように伸び上がる
  ctx.rotate(0.07*(dir||1)*(g||1));                // 進む向きへ前のめり
  return step;
};
GT.sprite=k=>hoodSprite[k];
GT.drawSprite=drawSpr;
})();
