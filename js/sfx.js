/* ==========================================================================
   効果音（assets/koukaonn/ フォルダの mp3）
   GT.sfx('名前') で鳴らす。同じ音を重ねて鳴らせる（すぐに連続したときだけは間引く）。
   どこで鳴らすか：
     flip    … 本を裏返して重力が反転したとき（engine.js）
     page    … ページをめくるとき（ステージの移りかわり・本を読みかえす画面）
     close   … 本を読みかえす画面を閉じるとき
     write   … （いまは鳴らしていない）本のページに文字が書きこまれたとき用
     land    … ジャンプや落下のあと、着地したとき（このファイル）
     swamp   … 沼の中にいるあいだ、ループで鳴りつづける（このファイル）
     plop    … 少年が水たまりに落ちたとき（05 森の道）
     splash  … 赤ずきんが水たまりに落ちたとき（05 森の道）
     bush    … 狼のひそむ茂みがガサガサ揺れたとき（06 狼）
     door    … 戸が閉まったとき（03 赤ずきんの家・11 おばあさんの家の前）
     dizzy   … 狼が目を回したとき（12 おばあさんの家）
     hit     … 打撃：箱で敵をつぶしたとき・狼に家具が当たったとき・少年がやられたとき
     gore    … グロテスクな音：赤ずきんが目の前で食べられたとき（12 QTE 失敗）・少年が狼にやられたとき（12b ゲームオーバー）
               鳴っているあいだ（約6秒）は BGM を消す（GT.musicHush）
     足音    … 地面を走っているあいだ、ループで鳴る（地面の種類は playlist.js の GT.sceneFootsteps）
   ========================================================================== */
/* 音量の設定（メニューの「せってい」で変える）。GT.volume.bgm / GT.volume.se … 0〜1（1＝ふつうの大きさ）。
   ブラウザに覚えておく。sfx.js がいちばん先に読まれるので、ここで用意する（music.js・menu.js も使う） */
(function(){
const KEY='gravityTale.volume';
let v={bgm:1, se:1};
try{ const d=JSON.parse(localStorage.getItem(KEY)); if(d) for(const k in v) if(typeof d[k]==='number') v[k]=Math.max(0,Math.min(1,d[k])); }catch(e){}
GT.volume=v;
GT.setVolume=function(kind,val){ if(!(kind in v)) return; v[kind]=Math.max(0,Math.min(1,+val||0));
  try{ localStorage.setItem(KEY, JSON.stringify(v)); }catch(e){} };
})();
(function(){
const SFX_VOLUME=0.6;
const seVol=()=>(GT.volume?GT.volume.se:1);       // メニューで決めた効果音の大きさ
const SRC={
  flip:  'assets/koukaonn/重力反転.mp3',
  page:  'assets/koukaonn/ページをめくる1.mp3',
  close: 'assets/koukaonn/本を閉じる2.mp3',
  write: 'assets/koukaonn/シャーペンで字を書く.mp3',
  land:  'assets/koukaonn/ジャンプの着地.mp3',
  swamp: 'assets/koukaonn/沼.mp3',
  plop:  'assets/koukaonn/水面に落ちる.mp3',
  splash:'assets/koukaonn/水をバシャッとかける1.mp3',
  bush:  'assets/koukaonn/茂みガサガサ.mp3',
  door:  'assets/koukaonn/ドアを閉める1 (1).mp3',
  dizzy: 'assets/koukaonn/ヒヨコが頭の上を回るmp3.mp3',
  hit:   'assets/koukaonn/打撃1.mp3',
  gore:  'assets/koukaonn/グロテスクな音.mp3',
};
const VOL={ land:0.45, write:0.5, swamp:0.7, page:3, gore:2.4 };   // 音ごとの大きさ（書いていない音は 1）
const MAX_LEN={ write:1.6, dizzy:1.8 };          // 長い音は、この秒数で止める
const base={}, lastT={};
for(const k in SRC){ const a=new Audio(encodeURI(SRC[k])); a.preload='auto'; base[k]=a; }

/* ふつうの鳴らし方では音量 1 までしか上げられない。VOL で 1 を越える音（ページの音など）は
   Web Audio で音そのものを大きくして鳴らす。音の中身は js/sfx_data.js から読む（無いときは mp3 を読む。
   どちらも読めないときは、音量 1 で鳴らす） */
let ctx=null; const buf={};
const AC=window.AudioContext||window.webkitAudioContext;
for(const k in SRC){
  if(SFX_VOLUME*(VOL[k]||1)<=1 || !AC) continue;
  try{ ctx=ctx||new AC(); }catch(e){ break; }
  fetch((window.GT_SFX_DATA||{})[k] || encodeURI(SRC[k])).then(r=>r.arrayBuffer()).then(d=>new Promise((ok,ng)=>ctx.decodeAudioData(d,ok,ng))).then(b=>{ buf[k]=b; }).catch(()=>{});
}
function playBoosted(name){
  if(!ctx || !buf[name]) return false;
  if(ctx.state==='suspended') ctx.resume();
  const src=ctx.createBufferSource(), g=ctx.createGain();
  src.buffer=buf[name]; g.gain.value=SFX_VOLUME*(VOL[name]||1)*seVol();
  src.connect(g).connect(ctx.destination); src.start();
  if(MAX_LEN[name]) src.stop(ctx.currentTime+MAX_LEN[name]);
  return true;
}

GT.sfx=function(name){
  const a=base[name]; if(!a || seVol()<=0) return;
  const now=performance.now(); if(lastT[name] && now-lastT[name]<90) return; lastT[name]=now;   // 同じ音の連打は間引く
  if(playBoosted(name)) return;
  const s=a.cloneNode(); s.volume=Math.min(1,SFX_VOLUME*(VOL[name]||1)*seVol());
  s.play().catch(()=>{});
  if(MAX_LEN[name]) setTimeout(()=>{ s.pause(); }, MAX_LEN[name]*1000);
};

/* 着地は、プレイヤーの状態の変わりめで鳴らす */
let wasGround=true, airT=0;
GT.registerUpdate(dt=>{
  const pl=GT.player;
  if(!pl.onGround) airT+=dt;
  else { if(!wasGround && airT>0.18) GT.sfx('land'); airT=0; }
  wasGround=pl.onGround;
});
GT.registerSceneReset(()=>{ wasGround=true; airT=0; });

/* 沼：沼の中にいるあいだ、ループで鳴らしつづける。出たら、すっと小さくして止める。
   会話中・ページをめくっているあいだ・メニューや本を開いているあいだも止める */
/* iPhone・iPad の Safari では、音の大きさ（audio.volume）を変えられない（いつも最大のまま）。
   なので、大きさはこちらで覚えておき（swampVol / stepVol）、それが 0 になったら止める。
   （audio.volume を読んで判断すると、iPhone ではいつまでも 0 にならず、鳴りっぱなしになる）
   画面を切りかえた・スマホの画面を消したときも止める（そのあいだは描画が止まり、判断ができないため） */
const hidden=()=>document.hidden;
const talking=()=>{ const d=document.getElementById('dlg'); return !!(d && d.classList.contains('show')); };
const swampLoop=new Audio(encodeURI(SRC.swamp)); swampLoop.loop=true; swampLoop.volume=0;
let swampVol=0;
const SWAMP_VOL=SFX_VOLUME*(VOL.swamp||1);
let swampLast=performance.now();
function swampTick(now){
  const dt=Math.max(0,Math.min(0.1,(now-swampLast)/1000)); swampLast=now;
  const pl=GT.player;
  const inSwamp = GT.mode==='play' && !GT.paused && !talking() && !hidden() && (GT.swamps||[]).some(s=>GT.rectsOverlap(pl,s));
  const target = inSwamp ? SWAMP_VOL*seVol() : 0;
  let v=swampVol;
  v = v<target ? Math.min(target, v+dt*SWAMP_VOL*6) : Math.max(target, v-dt*SWAMP_VOL*4);   // 入ると すぐ、出ると 0.25秒ほどで消える
  swampVol=v; swampLoop.volume=v;
  if(inSwamp && swampLoop.paused) swampLoop.play().catch(()=>{});
  if(!inSwamp && v===0 && !swampLoop.paused) swampLoop.pause();
  requestAnimationFrame(swampTick);
}
requestAnimationFrame(swampTick);
GT.swampSoundNow=()=>({playing:!swampLoop.paused, volume:+swampVol.toFixed(2), loop:swampLoop.loop});   // 確認用

/* 足音：床（重力が逆なら天井）を走っているあいだ、地面に合った足音をループで鳴らす。
   止まる・跳ぶ・沼に入る・会話になると、すっと消える */
const STEP_SRC={ grass:'assets/koukaonn/芝生の上を走る.mp3', leaves:'assets/koukaonn/落ち葉の上を走る.mp3', dirt:'assets/koukaonn/土の上を走る.mp3' };
const STEP_VOL=SFX_VOLUME*0.55;
const steps={};
const stepVol={};
for(const k in STEP_SRC){ const a=new Audio(encodeURI(STEP_SRC[k])); a.loop=true; a.volume=0; steps[k]=a; stepVol[k]=0; }
let stepLast=performance.now();
function stepTick(now){
  const dt=Math.max(0,Math.min(0.1,(now-stepLast)/1000)); stepLast=now;
  const pl=GT.player, ground=GT.scene && (GT.sceneFootsteps||{})[GT.scene.id];
  const inSwamp=(GT.swamps||[]).some(s=>GT.rectsOverlap(pl,s));
  const running = GT.mode==='play' && !GT.paused && !talking() && !hidden() && pl.onGround && Math.abs(pl.vx)>40 && !inSwamp;
  for(const k in steps){ const a=steps[k], target=(running && k===ground)?STEP_VOL*seVol():0;
    let v=stepVol[k]; v = v<target ? Math.min(target,v+dt*STEP_VOL*10) : Math.max(target,v-dt*STEP_VOL*6);
    stepVol[k]=v; a.volume=v;
    if(target>0 && a.paused) a.play().catch(()=>{});
    if(target===0 && v===0 && !a.paused) a.pause(); }
  requestAnimationFrame(stepTick);
}
requestAnimationFrame(stepTick);
GT.footstepNow=()=>{ for(const k in steps) if(!steps[k].paused) return {ground:k, volume:+stepVol[k].toFixed(2)}; return null; };
// 画面を切りかえた・スマホの画面を消したら、すぐに止める（描画が止まると、上の判断も止まるため）
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) return;
  swampVol=0; swampLoop.pause(); for(const k in steps){ stepVol[k]=0; steps[k].pause(); } });   // 確認用
})();
