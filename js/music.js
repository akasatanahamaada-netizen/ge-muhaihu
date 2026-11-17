/* ==========================================================================
   音楽（BGM）
   GT.sceneMusic … シーンの id ごとに流す曲（playlist.js で決める）。曲はループ再生。
   GT.titleMusic … タイトル（メニュー）画面の曲。
   GT.sceneTypeMusic … シーンの種類（boss / qte など）ごとの曲。id の無い差しこみシーン用（playlist.js で決める）。
   ・シーンが変わると、前の曲はフェードアウトし、新しい曲がフェードインする
   ・同じ曲のシーンが続く／「やり直す」では、曲は止めずに流しつづける
   ・メニュー画面を開いているあいだは、タイトルの曲に切りかわる。閉じると、もとの曲が続きから流れる
   ・本を読みかえす画面では、いまの曲を流したまま
   ・ブラウザは、最初にクリックやキー入力があるまで音を出せないので、そのときに鳴らしはじめる
   ========================================================================== */
(function(){
const VOLUME=0.5, FADE=1.2;            // 音量（0〜1）と、フェードにかける秒数
const players={};                      // src → {src, el, vol}（一度読みこんだ曲は取っておき、続きから流せるようにする）
let sceneWant=null;                    // いまのシーンで流したい曲の src
const menuOpen=()=>!!document.querySelector('.gtm.show');
let hushUntil=0;                       // この時刻（performance.now）までは、シーンの曲を消しておく（GT.musicHush）
const wantNow=()=> menuOpen() ? (GT.titleMusic||null) : (performance.now()<hushUntil ? null : sceneWant);
const bgmVol=()=>VOLUME*(GT.volume?GT.volume.bgm:1);   // メニューの「せってい」で決めた大きさをかける

function player(src){
  if(!players[src]){ const el=new Audio(encodeURI(src)); el.loop=true; el.volume=0; players[src]={src, el, vol:0}; }
  return players[src];
}
let unlocked=false;
function unlock(){ const w=wantNow(); if(!w) return; const p=player(w);
  if(!unlocked){ unlocked=true; p.vol=Math.max(p.vol,bgmVol()*0.7); p.el.volume=p.vol; }   // 最初の1回は、フェードを待たずにすぐ聞こえるように
  if(p.el.paused) p.el.play().catch(()=>{}); }
addEventListener('pointerdown',unlock); addEventListener('keydown',unlock);
GT.musicUnlock=unlock;
// GT.musicHush(秒) … しばらく BGM をフェードアウトして消す（グロテスクな音を聞かせる場面など）。時間がたつと、続きからフェードインする
GT.musicHush=sec=>{ hushUntil=Math.max(hushUntil, performance.now()+sec*1000); };
// 操作する前でも鳴らせるブラウザなら、すぐに鳴らす（たいていは、最初のクリックやキーまで待たされる）
setTimeout(()=>{ const w=wantNow(); if(w){ const p=player(w); p.el.play().then(()=>{ unlocked=true; }).catch(()=>{}); } },0);

GT.onSceneStart(scene=>{
  // id で決める（GT.sceneMusic）。id の無い差しこみシーン（ボス戦・QTE）は、種類で決める（GT.sceneTypeMusic）
  const next=(GT.sceneMusic||{})[scene && scene.id]||(GT.sceneTypeMusic||{})[scene && scene.type]||null;
  if(next!==sceneWant){                                        // 別の曲になったら、新しい曲は頭から（止まっていれば）
    if(sceneWant && players[sceneWant]) players[sceneWant].restart=true;
    if(next && players[next] && players[next].el.paused) players[next].restart=true; }
  sceneWant=next;
});

let last=performance.now();
function tick(now){
  const dt=Math.max(0,Math.min(0.1,(now-last)/1000)), step=dt/FADE*VOLUME; last=now;
  const w=document.hidden ? null : wantNow(); if(w) player(w);   // 画面が隠れているあいだは流さない
  for(const src in players){ const p=players[src], target= src===w ? bgmVol() : 0;
    p.vol = p.vol<target ? Math.min(target,p.vol+step) : Math.max(target,p.vol-step);
    p.el.volume=p.vol;
    if(target>0 && p.el.paused){ if(p.restart){ p.el.currentTime=0; p.restart=false; } p.el.play().catch(()=>{}); }
    if(target===0 && p.vol===0 && !p.el.paused) p.el.pause(); }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
// 画面を切りかえた・スマホの画面を消したら BGM を止める。もどってきたら、上の tick が続きから流しなおす
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) return;
  for(const src in players){ const p=players[src]; p.vol=0; p.el.volume=0; p.el.pause(); } });
GT.musicNow=()=>{ const w=wantNow(), p=w&&players[w]; return p?{src:p.src, playing:!p.el.paused, volume:+p.vol.toFixed(2), time:+p.el.currentTime.toFixed(1), loop:p.el.loop}:null; };   // いま流れている曲（確認用）
})();
