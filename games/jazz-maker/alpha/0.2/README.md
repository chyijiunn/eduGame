# 節奏音樂生成器 0.2

## 主要變更
- 改為真實樂器 beta 取樣音源播放。
- UI 簡化。
- 移除 JSON 預覽欄位。
- 生成後自動播放。
- 移除時間、節奏點、seed 的額外顯示欄位。
- 保留 WAV 下載與 JSON 下載。

## 樂器
- 鋼琴：acoustic_grand_piano
- Bass：acoustic_bass
- 吉他：electric_guitar_jazz
- 銅管：brass_section / trumpet
- 鼓組 beta：使用取樣打擊樂與少量合成低頻補強

## 使用方式
直接開啟 rhythm_music_generator_v0_2.html。

若部署到 GitHub Pages，直接上傳 HTML 即可。真實樂器 beta 需要網路載入外部 SoundFont 音源。

## 注意
0.2 的音源來自瀏覽器端載入的 General MIDI SoundFont。正式公開或商用前，請確認音源授權標示與使用範圍。
