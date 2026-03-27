# Lumiloop v0.12 聲音調整說明

這份說明對應 `Lumiloop_v0.12.html`。
目標是讓你之後自己改「頻率、音量、音色」時，有固定的位置可以找。

---

## 1. 改整體音高 / 頻率

### 位置
搜尋：`const safeScale =`

```js
const safeScale = [43, 45, 48, 50, 52, 55, 57, 60];
```

### 作用
這串是基礎音高（MIDI 數字）。
- 數字越小 = 越低頻
- 數字越大 = 越高頻

### 常用改法
整體更低沉：

```js
const safeScale = [36, 38, 40, 41, 43, 45, 47, 48];
```

整體再更低：

```js
const safeScale = [33, 35, 36, 38, 40, 41, 43, 45];
```

---

## 2. 指定每個圈各自的音高

### 位置
搜尋：`const midi = safeScale[i % safeScale.length];`

```js
const midi = safeScale[i % safeScale.length];
```

### 作用
目前每個圈是從 `safeScale` 依序拿音高。
如果你要某個顏色固定更低或更高，可以改成：

```js
const ringMidis = [38, 40, 36, 35, 43];
const midi = ringMidis[i % ringMidis.length];
```

這樣就是第 1 圈到第 5 圈各自指定。

---

## 3. 改順時針 / 逆時針的和聲

### 位置
搜尋：`const cwVoices =` 和 `const ccwVoices =`

```js
const cwVoices = [0, 5, 9];
const ccwVoices = [0, 3, 7];
```

### 作用
這些是「在基礎音上再加幾個半音」。
例如：
- `0` = 基音
- `5` = 上方 5 個半音
- `9` = 上方 9 個半音

### 常用改法
更穩、更柔和：

```js
const cwVoices = [0, 5, 7];
const ccwVoices = [0, 3, 5];
```

更簡單、更少高音：

```js
const cwVoices = [0, 5];
const ccwVoices = [0, 3];
```

---

## 4. 改整體音量

### 位置
搜尋：`dryGain.gain.value`、`wetGain.gain.value`、`masterGain.gain.value`

```js
dryGain.gain.value = 0.76;
wetGain.gain.value = 0.28;
masterGain.gain.value = muted ? 0 : 1.0;
```

### 作用
- `dryGain`：直接聲
- `wetGain`：殘響量
- `masterGain`：總輸出

### 建議
- 要更大聲：先微調 `masterGain`，建議不要超過 `1.0`
- 要比較乾、比較近：降低 `wetGain`
- 要比較空靈：提高 `wetGain`，但不要太多

---

## 5. 改單個圈轉動時的音量

### 位置
搜尋：`const targetGain =`

```js
const targetGain = muted ? 0 : Math.pow(energy, 1.2) * 0.22;
```

### 作用
這是單一圈在不同轉速時，最後送出去的音量上限。

### 常用改法
更大聲：

```js
const targetGain = muted ? 0 : Math.pow(energy, 1.2) * 0.26;
```

更小聲：

```js
const targetGain = muted ? 0 : Math.pow(energy, 1.2) * 0.16;
```

---

## 6. 改聲部比例（是否刺耳很關鍵）

### 位置
搜尋：`const baseRatios =` 和 `const baseGains =`

```js
const baseRatios = [1, 2, 3.01];
const baseGains = [0.52, 0.18, 0.08];
```

### 作用
- `baseRatios`：每個聲部的頻率倍數
  - `1` = 基音
  - `2` = 高八度
  - `3.01` = 更高的泛音
- `baseGains`：各聲部音量

### 調整原則
- 覺得刺耳：先把第 2、3 個 `baseGains` 降低
- 想更厚：提高第 1 個 `baseGains`
- 不要一開始就狂拉 `masterGain`，容易糊掉

### 例子
更柔和：

```js
const baseGains = [0.60, 0.10, 0.03];
```

更安神、偏低頻：

```js
const baseRatios = [1, 2];
const baseGains = [0.75, 0.08];
```

---

## 7. 改 10 段速度音色

### 位置
搜尋：`const TIMBRE_LEVELS = [`

這裡有 10 組設定，每一組代表一個速度等級。

### 最常改的欄位
- `filterHz`：越高越亮
- `gains`：後兩個值越高，越容易有高頻感
- `detune`：越大越飄、越晃

### 想更柔和
- 把全部 `filterHz` 往下調 20%~35%
- 把 `gains` 的第 2、3 格壓低

---

## 8. 最穩的修改順序

如果你之後想自己改，建議順序是：

1. 先改 `safeScale`（決定音區）
2. 再改 `cwVoices` / `ccwVoices`（決定和聲）
3. 再改 `baseGains`（決定刺不刺）
4. 最後才改 `masterGain` / `targetGain`（決定大小聲）

---

## 9. 我建議你現在記住的四個關鍵搜尋字

之後打開 HTML，先搜尋這四個就夠用了：

- `safeScale`
- `cwVoices`
- `baseGains`
- `targetGain`

---

## 10. v0.12 目前狀態

- 保留 v0.1 的可轉動手感
- 保留偏中低頻、較不刺耳的 10 段音色
- 音量已恢復到接近 v0.1 的最大輸出手感
- HTML 內已加入中文註解，方便直接搜尋與修改
