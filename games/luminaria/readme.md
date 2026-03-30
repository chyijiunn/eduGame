## 使用說明
luminaria 原為任天堂公司旗下 NDS 主機《電子浮游生物》作品內的一道關卡，點選角落不同顏色的藻類來啟動，分別代表不同的節拍速率。當碰觸到箭頭會發出聲調，點選箭頭可以改變方向，這會決定藻類們接下來往哪裡移動。你甚至可以滑動螢幕或拖曳滑鼠來規劃路線；若藻類們很常卡在一起，你可長按箭頭，使箭頭進入旋轉模式。在音色 / 速度更多的按鈕下可以更動不同的音色和節拍。

## 參數修改
這份說明整理本頁面 `TIMBRES` 內常見參數的意義，以及調整時通常會造成什麼聽感變化。v0.2 起，原本的音色參數保留，並新增一組更接近真實樂器模擬的進階參數。

### 音色物件基本格式（原始簡版）
```js
piano:{name:'鋼琴 Piano',partials:[[1,'triangle',1.00],[2,'sine',0.42]],attack:.002,decay:1.45,sustain:.045,filterType:'lowpass',filterFreq:4200,q:.85,wet:.30,noise:.14,noiseType:'bandpass',noiseFreq:3200,noiseQ:2.1,noiseDecay:.038,spread:.024}
```

### 音色物件基本格式
```js
piano:{
  name:'鋼琴 Piano',
  partials:[[1,'triangle',1.00],[2,'sine',0.46],[3,'sine',0.19]],
  attack:.0016,
  decay:1.95,
  sustain:.032,
  release:.82,
  velocitySensitivity:.96,
  pitchEnv:{amount:.005,attack:.000,decay:.010},
  detune:.0018,
  filterType:'lowpass',
  filterFreq:3500,
  q:.72,
  wet:.24,
  noise:.09,
  noiseType:'bandpass',
  noiseFreq:2850,
  noiseQ:1.8,
  noiseDecay:.020,
  bodyResonance:{amount:.46,freq:182,q:.96,decay:.92},
  hammerNoise:{amount:.13,type:'bandpass',freq:2750,q:2.2,decay:.009},
  keyOffNoise:{amount:.11,type:'bandpass',freq:1850,q:1.0,decay:.024},
  sympatheticResonance:{amount:.36,freq:2480,q:.78,decay:1.45},
  spread:.016
}
```

### 參數意義

1. `name`
音色在下拉選單顯示的名稱。

2. `customType`
表示這個音色不是單純走一般合成器邏輯，而是有專用函式。
例如：
- `bowl`：誦缽
- `mountain`：山鳴
- `birds`：鳥轉
- `raindrops`：雨滴
- `humanVoice`：男低音
- `leaves`：落葉

3. `partials`
決定主體泛音結構。格式為：
```js
[倍頻, 波形, 音量]
```
例：`[2,'sine',0.42]` 代表第二倍頻使用正弦波，音量 0.42。

調整方向：
- 泛音越多，聲音越複雜、越亮
- `sine` 最乾淨
- `triangle` 較柔
- `square` 較簧片感
- `sawtooth` 較亮、較刺激

4. `attack`
起音時間。越小越像敲擊、撥弦；越大越像氣流、墊底音。

5. `decay`
從最大音量衰減到尾音的時間。越大，聲音拖得越久。

6. `sustain`
衰減後留下來的尾音比例。越高，聲音越能撐住。

7. `release`
v0.3新增。放開後尾音繼續消失的時間。
- 高：收尾更慢、更自然、更像真樂器或空間殘響
- 低：收得更乾脆、更短促

常見用途：
- 鋼琴、玻璃、水晶、誦缽：通常較高
- 木琴、竹音、落葉：通常較低

8. `velocitySensitivity`
v0.3新增。力度敏感度。數值越高，輕彈與重彈的差異越明顯。
- 高：音量、亮度、存在感差異更大
- 低：不管輕重都比較平均

常見用途：
- 鋼琴、鐵琴、雨滴、鳥叫：通常偏高
- Pad、Organ：通常偏低

9. `pitchEnv`
v0.3新增。起音瞬間的音高包絡，用來模擬真實樂器剛發聲時不會完全固定的音高感。
```js
pitchEnv:{ amount:0.005, attack:0.000, decay:0.012 }
```
- `amount`：起音時偏移幅度
- `attack`：偏移到最高點的時間
- `decay`：回到正常音高的時間

調整方向：
- 小幅度：自然、細微
- 太大：容易變成電子 pitch bend 感

10. `detune`
v0.3新增。微小失諧。用來降低「太電子、太乾淨」的感覺。
- 低：更穩、更乾淨
- 高：更寬、更飄，但太高會假

常見用途：
- 鋼琴：很小
- 玻璃 / 水晶 / 金屬音：可略高
- Pad：中低程度

11. `filterType`
濾波器種類，常見有：
- `lowpass`：保留低頻，削高頻
- `highpass`：保留高頻，削低頻
- `bandpass`：只保留一段頻率

12. `filterFreq`
濾波器中心或截止頻率。
- 提高：更亮、更清楚
- 降低：更悶、更厚

13. `q`
濾波器共振強度。
- 高：某個頻段更突出、更有性格
- 低：較自然、較平順

14. `wet`
送進殘響 / 空間效果的比例。
- 低：乾、近、直接
- 高：濕、遠、空靈

15. `noise`
額外噪音量。常用來模擬：
- 觸鍵感
- 敲擊感
- 摩擦感
- 風聲、水聲、葉片聲

16. `noiseType`
噪音濾波方式，常見用 `bandpass` 聚焦在特定頻段。

17. `noiseFreq`
噪音集中在哪個頻段。
- 高一點：更亮、更脆
- 低一點：更厚、更悶

18. `noiseQ`
噪音濾波的集中程度。越高越像集中在某種材質表面。

19. `noiseDecay`
噪音成分消失速度。短一點像瞬間敲擊，長一點像沙沙聲或水流。

20. `bodyResonance`
v0.3新增。模擬樂器本體、共鳴箱、木腔、鼓腔、金屬容器或空間反射的共鳴。
```js
bodyResonance:{ amount:0.24, freq:220, q:1.1, decay:0.42 }
```
- `amount`：共鳴強度
- `freq`：主要共鳴頻帶
- `q`：共鳴尖銳程度
- `decay`：共鳴消退時間

調整方向：
- 低頻共鳴：更厚、更有箱體感
- 中高頻共鳴：更像金屬、玻璃或空間回聲

21. `hammerNoise`
v0.3新增。起音時的接觸雜訊。
```js
hammerNoise:{ amount:0.13, type:'bandpass', freq:2750, q:2.2, decay:.009 }
```
常見用途：
- 鋼琴：琴槌敲弦
- 吉他：撥片或手指觸弦
- 木琴 / 竹音：敲擊頭接觸感
- 雨滴 / 落葉：瞬間撞擊感
- 人聲 / 口琴：可當作起音氣流雜訊

22. `keyOffNoise`
v0.3新增。尾端放開時的釋放雜訊。
```js
keyOffNoise:{ amount:0.11, type:'bandpass', freq:1850, q:1.0, decay:.024 }
```
常見用途：
- 鋼琴：放鍵與止音器接觸
- 吹奏音色：收尾氣音
- 自然音：尾端擦過、餘波、碎裂細節

23. `sympatheticResonance`
v0.3新增。連帶共鳴、共振弦、餘振頻帶。
```js
sympatheticResonance:{ amount:0.36, freq:2480, q:.78, decay:1.45 }
```
用途：讓主音之外，還有周圍頻率一起被帶動。
- 鋼琴：共鳴弦很重要
- 誦缽 / 水晶 / 玻璃：長尾泛音很重要
- 山鳴 / Pad：可拿來做空間餘韻

24. `spread`
左右或多聲部之間的微小展開量。
- 高：更寬、更有空間
- 低：更集中、更單點

25. `vibratoRate`
顫音速度。單位可理解為每秒幾次起伏。

26. `vibratoDepth`
顫音深度。越大，音高晃動越明顯。

### 常見調整方向

1. 更像真鋼琴
- `attack` 維持很短
- `detune` 保持很小
- `hammerNoise` 增加一點，模擬琴槌
- `bodyResonance` 加進琴箱感
- `keyOffNoise` 補放鍵細節
- `sympatheticResonance` 補共鳴弦尾韻
- `wet` 不宜過高，不然會太像空間特效

2. 更像刷弦吉他
- 主體不只靠 `partials`
- 還要在播放邏輯加入數個音的時間差（strum）
- `hammerNoise` 可模擬撥弦接觸感
- `bodyResonance` 補木箱味
- `filterFreq` 不宜太低

3. 更像誦缽
- `decay` 與 `release` 拉長
- `wet` 提高
- `sympatheticResonance` 提高
- 低頻與中高頻共鳴都要保留
- 泛音比例不要太刺

4. 更像男低音
- 基本頻率要大幅降低
- `filterFreq` 與 formant 頻段都要往下
- `attack` 不宜太短
- `vibratoDepth` 不要太大，不然會抖得太誇張
- `keyOffNoise` 可少量模擬尾端氣音

5. 更像自然環境音
- 需要 `customType` 專用邏輯
- 單靠 `partials` 通常不夠
- 常要結合噪音、掃頻、延遲、不同層次的 envelope
- 可用 `pitchEnv`、`bodyResonance`、`sympatheticResonance` 去補材質感

### 直接調整時順序
1. 先決定主體材質：`partials`
2. 再決定起音與尾音：`attack` / `decay` / `sustain` / `release`
3. 再調明亮度：`filterType` / `filterFreq` / `q`
4. 再補材質細節：`noise` 系列、`hammerNoise`、`keyOffNoise`
5. 再補真實感：`detune`、`pitchEnv`、`bodyResonance`、`sympatheticResonance`
6. 最後補空間感：`wet` / `spread`

### 音色分類
- 樂器類
	- 鋼琴 Piano
	- 吉他 Guitar Strum
	- 藍調口琴 Blues Harp
	- 鐵琴 Glockenspiel
	- 管風琴 Organ
	- 木琴 Marimba

- 氛圍 / 自然 / 人聲類
	- 誦缽 Singing Bowl
	- 竹音 Bamboo
	- 玻璃 Glass
	- 水晶 Crystal
	- 落葉 Fallen Leaves
	- 山鳴 Mountain Echo
	- 鳥轉 Bird Calls
	- 雨滴 Raindrops
	- 男低音 Basso Profondo
	- 暖霧 Pad

### 備註
1. v0.3 的目標不是把每種音色都做成取樣器，而是在保留輕量 Web Audio 架構下，把音色從「可聽」往「更像真實物體或樂器」推進一級。
2. 合成型音色會最完整吃到新參數；自訂型音色則是以各自函式去對應同樣的概念。
3. 有些音色（例如吉他、鳥轉、山鳴、落葉）如果想再更像真實聲響，通常不只要改參數，也要一起改對應的播放函式。單改 `TIMBRES` 參數，只能改到一定程度。

## 版本
- 0.3 增加音色參數，讓鋼琴更像真實鋼琴。，新增 `release`、`velocitySensitivity`、`pitchEnv`、`detune`、`bodyResonance`、`hammerNoise`、`keyOffNoise`、`sympatheticResonance` 八個核心參數，並重新整理參數說明
- 0.28 讓雨滴好一點，落葉要輕輕的東西掉落，把男低音改成低音
- 0.27 出問題，落葉雨滴都會使藻類停住不動。修正男低音再高一個八度
- 0.26 男低音太低，請高一個八度。落葉不太行，你可否直接讓它接觸到箭頭時，就發出不同的落葉聲音來代替就好，就是把每個音階改成不同的落葉，或者吹動落葉會有嘻嘻蘇蘇的聲音。雨滴很像彈簧聲，應該模擬成水滴入水的聲音，你再試試看
- 0.25 刪除水流和浪潮，並新增落葉（模擬葉子掉落的聲音，再不同音接上就是不同材質地面的聲響），並將音色中的樂器類別都往上移動，其他音色往下，人聲的部分再修正，改為原本再降兩個到四個八度，改名就稱為男低音。根據使用者是否有瀏覽器暫存，若沒有暫存資料，第一次點入時呈現浮動視窗，說明介面，點選關閉後以後不會再出現
- 0.23 浪潮聲音太短，延續時間要更久。人聲單獨拉高音高，直接上升兩個八度。新增水流、雨滴兩音色。新增瀏覽器暫存功能，除非按下重置，否則紀錄藻類運動位置與狀態、箭頭路線、旋轉狀態、各種音色和速度紀錄
- 0.22 浪潮不像，只是雜音一堆。鳥轉不管哪個音階按鈕都一樣，都像小雞叫，請參雜不同鳥鳴。山鳴整個沒聲音，那些藻類會停下來。鐵琴還行，幫我刪除鐘琴改成誦缽（要能有顯著殘響，盡力低頻）
- 0.21 新增鐵琴、浪潮（盡可能模擬）、山鳴（模擬山中縹緲音調）、鳥轉（各種鳥鳴聲），修改人聲讓它更像人聲
- 0.20 增加口琴
- 0.18 改進吉他和弦效果
- 0.17 改進鋼琴
