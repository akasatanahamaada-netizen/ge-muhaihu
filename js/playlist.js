/* ============================================================================
   Gravity Tale ── 第一章のマニフェスト (playlist.js)
   ----------------------------------------------------------------------------
   ★ ステージの並び順・本のページ・最初の状態は、このファイルだけで決まります。
     ステージを増やす / 並べ替える / 統合するときは、ここを直してください。

   【並べ替える】   GT.playlist の中の id の順番を入れ替えるだけ。
   【ステージを足す】 stages/ に新しいファイルを作って id を登録 →
                     index.html に <script> を1行足す →
                     この GT.playlist の好きな位置に id を1つ足す。
   【別の話を合体】   相手のステージ各ファイルと、相手の id を playlist に並べる。
                     id がかぶらないようにだけ注意（例：wolf_talk → ep2_wolf_talk）。
   ========================================================================== */

// 本の章。ページの chapter と合わせる（本を読みかえす画面で、章ごとに とびら が入る）
GT.chapters = [
  {name:'序章',   sub:'森での目覚め'},     // マリと出会う・チュートリアル（森の小道 ①②）
  {name:'第一章', sub:'赤い頭巾'},         // 赤ずきんの家から
];

// 本（読み返し）に並ぶページ。stages 側の GT.fillPage(key,...) の key と合わせる。
// extraPieces … かけら以外で手に入るピース（会話など）。GT.addPagePiece(key,id) で手に入る。
//                reveal に書いた文は、そのピースが埋まるまで、かならず読めない
// base … 本に最初から書いてある文章（ステージで GT.fillPage が書き込む文章と同じ）。虫食いで、ところどころ読めない。
//        そのページの「お話のかけら」を集めるほど読めるようになる。
//        分岐のあるページは、たどり着く前はこの文章で、たどり着くと、選んだ道の文章（GT.fillPage）になる。
GT.definePages([
  {key:'prologue', chapter:'序章',   title:'森での目覚め',
   base:'――少年は、ところどころ欠けた本とともに森で目を覚ました。そして、木の陰にいた少女と出会った。少女は、マリと名乗った。',
   // かけら（オープニングの3つ）のほかに、マリとの会話で手に入るピース。これが埋まるまで、reveal の文は読めない
   extraPieces:[{id:'opening:mari', reveal:'そして、木の陰にいた少女と出会った。少女は、マリと名乗った。'}]},
  {key:'komichi',  chapter:'序章',   title:'森の小道',
   base:'――少年は、マリと別れて、森の小道を進んだ。本を裏返すと、そのページの重さの向きが変わる。少年は天井を歩いて大木を越え、木箱を押して道をひらいた。',
   extraPieces:[{id:'komichi:foe', reveal:'木箱を押して道をひらいた。'}]},   // 森の小道②の、狼の手下を倒すと手に入る
  {key:'window',   chapter:'第一章', title:'窓の向こう',
   base:'――窓の向こうで、母親が赤ずきんにお使いを頼んでいた。カスタードとバターの小瓶を、おばあさんのもとへ。',
   extraPieces:[{id:'window:story', reveal:'カスタードとバターの小瓶を、おばあさんのもとへ。'}]},   // 窓をのぞいたあと、マリと話すと
  {key:'meet',     chapter:'第一章', title:'赤い頭巾の少女',
   base:'――赤い頭巾の少女と出会い、道連れになった。少年が本を裏返すと、少女も一緒に、水たまりの上を越えた。',
   extraPieces:[{id:'meet:story', reveal:'赤い頭巾の少女と出会い、道連れになった。'}]},   // 赤ずきんと話したあと
  {key:'wolf',     chapter:'第一章', title:'森で出会った狼',
   base:'――狼は、脇道へ消えていった。',
   extraPieces:[{id:'wolf:story'},{id:'wolf:road'}]},   // 狼と話したあと／近道で狼の手下を全部倒す・遠回りでお花を全部摘む（どちらでも同じかけら）
  {key:'front',    chapter:'第一章', title:'おばあさんの家の前',
   base:'――赤ずきんは掛け金を引き、おばあさんの家へ入っていった。',
   extraPieces:[{id:'front:story'}]},   // 家の前で、決めたあと
  {key:'granny',   chapter:'第一章', title:'おばあさんの家',
   base:'――家に着いたとき、おばあさんの姿は、もうどこにもなかった。',
   extraPieces:[{id:'granny:story'}]},   // 戦いのあと（結末）
  {key:'result',   chapter:'第一章', title:'第一章の結末',
   base:'――少年は、間に合わなかった。'},
]);

// 分岐フラグの初期値（各ステージの choices が書き換える）
GT.flags = { playerName:null, mariNamed:false, bookmarkTip:false, warnedHood:false, route:null, stoppedAtDoor:false, saved:null, grannyAlive:null,
             wolfClues:0, houseClues:0, ending:null };

// シーンの並び順（= ゲームの進行順）。id は各ステージファイルで登録したもの。
GT.playlist = [
  'wake',         // 序章 ── 暗い森で、ひとりで目覚める（play。空から落ちてくる・本を拾う・右へ）
  'opening',      // 序章 ── 森（マリと出会う / story）
  'komichi1',     // 森の小道①（play）
  'komichi2',     // 森の小道②（play）
  'mari_gate',    // チュートリアルのおわり：森の出口でマリと話す（この先は絵本の世界）
  'chapter1',     // 章のとびら：本がひらいて「第一章「赤い頭巾」」（ここから明るい絵本の雰囲気へ）
  'house_peek',   // 赤ずきんの家・窓のぞき（story）
  'path1',        // 森の道①（play）
  'meet_hood',    // 赤ずきんと道連れに（story）
  'cliff',        // 森の崖（play・木箱を天井と床へ運ぶ謎解き）
  'wolf_talk',    // 狼（story・分岐：危険を告げるか）
  'crossroads',   // 分かれ道（story・分岐：近道か遠回りか）
  'path2',        // 近道①（play・近道のときだけ。狼の手下を全部倒すと進める）
  'path2b',       // 近道②（play・近道のときだけ。いばらのトンネル）
  'flowers',      // お花畑（play・遠回りのときだけ。お花を6本摘む）
  'path3',        // 遠回りの道①（play・遠回りのときだけ）
  'path4',        // 遠回りの道②（play・遠回りのときだけ）
  'house_front',  // おばあさんの家の前（story・分岐：赤ずきんを止めるか）
  'arrive',       // おばあさんの家に到着（分岐→ボス戦 or QTE）
  'ending',       // 結末（戦いのあと・部屋の中）
  'epilogue',     // 外に出て、赤ずきんたちと話す（夕暮れ／夜明け。マリはいない）
  'afterword',    // はじめの暗い森にもどって、マリと話す → エンディングの画面
];

// ステージの背景画像（キーは地形の id）。
// 分かれ道までは昼。近道を行くと、おばあさんの家に着いてもまだ昼。遠回りをすると、着くころには夕方。
// （flags を受けとる関数にすると、分岐で背景を変えられる）
// どのステージも、見開き全体に敷く（page:'spread'）。
// 片方のページだけに置きたいときは {src, page:'left'} / {src, page:'right'}（大きさは w, h, y で変えられる）。
// 書いていないステージ（家の中など）は、背景画像なし。
// （水彩の森と遠い城の絵 'assets/background/水彩で描く静かな森と遠い城.webp' も使える）
const BG_DAY='assets/background/ohiru no mori.webp', BG_EVENING='assets/background/yuugata no mori.webp';
const BG_DARK='assets/background/霧深き森のゴシック童話.webp';   // 霧の深い、暗い森（近道①：狼を追って、森の奥へ）
const BG_ROSE='assets/background/薔薇咲く霧深きゴシックの森.webp';   // 霧の深い、薔薇の咲く森（近道②：いばらのトンネル）
const S=src=>({src,page:'spread'});
// ゴシック：明るい森の絵は、暗く・色を抜き・赤紫をかぶせて使う（タイトル画面の霧の薔薇の森に合わせる）
// m … 不気味さ（0〜1）。大きいほど、絵を暗く・色を抜く（お話が進むほど大きくする）
const G=(src,m=0.5)=>({src,page:'spread',filter:`brightness(${(0.95-0.45*m).toFixed(2)}) saturate(${(0.8-0.45*m).toFixed(2)}) contrast(1.05) blur(0.8px)`,tint:'rgb(178,172,164)',wash:'rgba(244,240,230,0.06)'});
const BG_TITLE='assets/background/タイトル背景_森.webp';   // 紫をぬいた版（もとは タイトル背景.webp）   // タイトル画面の背景（道のある、霧の薔薇の森）
const DARK={src:BG_DARK,page:'spread',wash:'rgba(244,240,230,0.08)',filter:'brightness(1.45) saturate(0.8) blur(0.8px)'};   // 暗い森の絵は、明るめにして見やすく   // 暗い森は、紙の色を薄くかぶせる（ふつうの 0.28 だと白っぽくなって、暗さが消える）
const ROSE={src:BG_ROSE,page:'spread',wash:'rgba(244,240,230,0.08)'};
GT.stageBackgrounds = {
  wake:DARK,          // 序章（ひとりで目覚める）：暗い森
  opening:DARK,        // 序章（マリと出会う）：暗い森
  afterword:DARK,
  mari_gate:DARK,                                    // チュートリアルのおわり：森の出口      // 第一章のあと：はじめの暗い森にもどる
  komichi1:DARK, komichi2:DARK,   // チュートリアルも、序章のゴシックの森
  path1:S(BG_DAY), meet_hood:S(BG_DAY), cliff:S(BG_DAY),   // 狼が出てくるまで：前と同じ明るい森
  house_peek:S(BG_DAY),   // 前は暗い森（DARK）   // 赤ずきんの家：暗い森（窓の明かりが目立つように）
  wolf_talk:S(BG_DAY),                           // 狼：昼の森
  crossroads:S(BG_DAY),   // 分かれ道（道のある、霧の薔薇の森）
  path2:{src:BG_DAY,page:'spread',dim:0.45}, path2b:{src:BG_DAY,page:'spread',dim:0.55},   // 近道：昼の森のまま、暗くするだけ（dim。①より②のほうが暗い）。人物は暗くしない
  flowers:S(BG_DAY),                                      // お花畑（遠回りの はじめ。薔薇の森）
  path3:S(BG_DAY), path4:S(BG_EVENING),              // 遠回り：歩くうちに日が傾く
  house_front:f=>S(f.route==='shortcut'?BG_DAY:BG_EVENING),
};

/* 不気味さ（0〜1）：お話が進むほど、暗く・色が抜け・冷たい色になり、霧が出る（js/engine.js の drawGothicWorld）。
   書いていないシーンは 0.5。'@boss' のように、種類でも決められる */
const GOOD_END=f=>f.route==='shortcut' && f.saved!==false;
GT.sceneMood = {
  // ゴシック（暗い森）は、序章（目覚め〜チュートリアル）と、赤ずきんのお話のあと（afterword）だけ
  wake:0.3, opening:0.3, komichi1:0.3, komichi2:0.3,   // 暗すぎて見にくくならないように、ひかえめに
  afterword:0.3, mari_gate:0.3,
  // 第一章（赤ずきんのお話）は 0：ゴシックにする前と同じ、明るい絵本の雰囲気（色合いをかけない）
  house_peek:0, path1:0, meet_hood:0, cliff:0, wolf_talk:0, crossroads:0, path2:0, path2b:0, flowers:0, path3:0, path4:0,
  house_front:0, arrive:0, '@boss':0, '@qte':0, ending:0, epilogue:0,
};

// 音楽（BGM）：シーンの id ごとに流す曲（assets/music/ フォルダの mp3）。ループ再生する。
// 書いていないシーンは無音（前の曲はフェードアウトする）。
// 曲を入れかえたいときは、下の M.xxx の割り当てを書きかえる（曲の名前で選んでいる。聞いて合わなければ、ここで差しかえる）
const M=n=>'assets/music/'+n+'.mp3';
const BGM_ADVENTURE=M('小さな勇者の探検');   // 冒険（アクションのステージ）
const BGM_THORN=M('荊の庭');                 // 近道（いばらの道）
const BGM_SAD=M('堕ちる');                    // 悲しい曲（おばあさんを助けられなかった結末）
GT.sceneMusic = {
  // wake（ひとりで目覚める）と chapter1（章のとびら）は、曲なし（静けさ）
  // opening（マリと出会う）も、曲なし
  // afterword（最後にマリと話す森の出口）も、曲なし
  // チュートリアル（森の小道①②）は、曲なし
  path1: BGM_ADVENTURE, cliff: BGM_ADVENTURE,   // アクションのステージ（続けて流れる）
  house_peek: M('魔法使いの箱庭'),             // 赤ずきんの家（窓のぞき）
  meet_hood:  M('魔法使いの箱庭'),             // 赤ずきんと出会う・水たまりを越える
  wolf_talk:M('お騒がせなオバケたち'),         // 狼の初登場
  crossroads:M('かくれんぼの庭。'),            // 分かれ道（近道か遠回りかを選ぶ）
  path2: BGM_THORN, path2b: BGM_THORN,          // 近道（いばらの道）。前は『悪魔の悪戯』
  flowers:  M('魔法使いの箱庭'),               // お花畑（のんびりした曲）
  path3: M('悪魔の悪戯'), path4: M('悪魔の悪戯'),   // 遠回りの道（続けて流れる）
  house_front:M('時を刻む森'), arrive:M('時を刻む森'),   // おばあさんの家の前・家に到着
  // 戦いのあと（部屋の中）：おばあさんも助かった結末は『抒情歌「二つの草」』、助けられなかった結末は悲しい『堕ちる』
  //   （結末の決まり方は 12_grannys_house.js の 'result'：おばあさんが助かるのは、近道で、赤ずきんも助けたときだけ）
  ending: f=> (f.route==='shortcut' && f.saved!==false) ? M('抒情歌「二つの草」') : BGM_SAD,
  epilogue: M('世界の最果てで、自由を謳う'),   // 外に出た場面（夕暮れ／夜明け）〜エンディングの画面
};
// 最終戦闘（おばあさんの家で差しこまれるボス戦・QTE。id が無いので、シーンの種類で決める）
GT.sceneTypeMusic = { boss:M('Foehn_Wind'), qte:M('Foehn_Wind') };
GT.titleMusic = M('魔法の扉は夜開く (1)');    // タイトル（メニュー）画面。前は『世界の最果てで、自由を謳う』
GT.bookMusic  = null;   // 本を読み返す画面（Reread）では、本だけの曲にせず、いまのステージの曲をそのまま流す（前は『時計図書館 (1)』）

// 走るときの足音（シーンの id ごとの地面）。'grass'=芝生 / 'leaves'=落ち葉 / 'dirt'=土。書いていないシーン（家の中など）は足音なし。
GT.sceneFootsteps = {
  wake:'leaves', mari_gate:'leaves', afterword:'leaves',   // 序章の暗い森（目覚め・森の出口・最後の森の出口）は落ち葉
  opening:'grass', komichi1:'grass', komichi2:'grass', house_peek:'grass', path1:'grass', meet_hood:'grass', cliff:'grass',
  wolf_talk:'leaves', path3:'leaves', path4:'leaves',          // 森の奥・遠回りの道（落ち葉）
  crossroads:'dirt', path2:'dirt', path2b:'dirt', house_front:'dirt', flowers:'grass',         // 分かれ道・近道・家の前（土の道）
};

// 会話の立ち絵（キーはセリフの c）。しゃべっているあいだ、会話の枠の右に出る。
// 主人公（少年）：ふだん『物憂げな琥珀眼の少年』／嫌そうな顔（f:'disgust'）『主人公嫌そうな顔』
const BOY_PORTRAIT=l=> l.f==='disgust' ? 'assets/character/主人公嫌そうな顔.webp' : 'assets/character/物憂げな琥珀眼の少年.webp';
/* 会話の立ち絵は、だれでも左向き（会話の枠の右はしに出るので、枠の文字のほうを向く）。
   右向きに描かれた絵は GT.portraitMirror に入れておくと、左右反転して左向きにする。
   表情：セリフに f:'smile'（笑顔）/ f:'disgust'（嫌そう）/ f:'surprise'（驚き）/ f:'scared'（怯え）/ f:'granny'（おばあさんに化けた狼）と書くと、その表情の絵になる */
const P='assets/character/';
GT.portraitMirror = [];   // いまの絵は、どれも もとから左向き（反転するものはない）
// 会話の立ち絵のファイル（ゲームの起動時に先に読みこんでおき、会話で切りかえるとき、前の人の絵が一瞬見えないようにする）
GT.portraitFiles = [ '物憂げな琥珀眼の少年.webp', '主人公嫌そうな顔.webp', '水彩タッチの赤ずきん少女.webp', '赤ずきん笑顔.webp', '赤ずきん驚き顔.webp',
  '水彩風の優しいお母さん.webp', '優しい笑顔の祖母キャラクター.webp', '杖を握る不安げなおばあさん.webp',
  'mari honnmono (hidari).webp', 'マリ口開いている.webp', '狡猾な人狼の立ち姿.webp', 'おばあちゃん狼の不敵な微笑み.webp', '黒い狼獣のシルエット.webp' ].map(f=>'assets/character/'+f);
if(GT.preloadPortraits) GT.preloadPortraits(GT.portraitFiles);
/* 表情の差分（嫌そうな少年・笑顔・驚き・怯え・口を開いたマリ・化けた狼）の webp は、元の PNG から作るときに
   ふだんの絵にぴったり重なる位置・大きさに合わせてある。表情を変えても、人物がずれない */
GT.portraits = {
  boy:   BOY_PORTRAIT,                                           // 少年のセリフ（c:'boy'）
  // 狼：左向き『狡猾な人狼の立ち姿』。おばあさんに化けているセリフ（f:'granny'）は『おばあちゃん狼の不敵な微笑み』
  //     正体をかくしているあいだ（f:'disguise'）は、黒い狼のシルエット『黒い狼獣のシルエット』
  wolf:  l=> l.f==='disguise' ? P+'黒い狼獣のシルエット.webp' : l.f==='granny' ? P+'おばあちゃん狼の不敵な微笑み.webp' : P+'狡猾な人狼の立ち姿.webp',
  // 赤ずきん：ふだん『水彩タッチの赤ずきん少女』／笑顔（f:'smile'）『赤ずきん笑顔』／驚き（f:'surprise'）『赤ずきん驚き顔』
  hood:  l=> l.f==='smile' ? P+'赤ずきん笑顔.webp' : l.f==='surprise' ? P+'赤ずきん驚き顔.webp' : P+'水彩タッチの赤ずきん少女.webp',
  mother:P+'水彩風の優しいお母さん.webp',                         // お母さん
  // おばあさん：ふだん『優しい笑顔の祖母キャラクター』／怯え（f:'scared'）『杖を握る不安げなおばあさん』
  granny:l=> l.f==='scared' ? P+'杖を握る不安げなおばあさん.webp' : P+'優しい笑顔の祖母キャラクター.webp',
  // マリ：左向き『mari honnmono (hidari)』。たずねる・声をあげるセリフ（？ か ！ がある）は『マリ口開いている』
  mari:  l=> /[？！?!]/.test(String(l.t||'')) ? P+'マリ口開いている.webp' : P+'mari honnmono (hidari).webp',
};
