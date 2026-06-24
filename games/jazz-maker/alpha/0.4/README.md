# 節奏音樂生成器 0.4

## 主要變更
- 修正偶發空白停頓：加入「保底伴奏床」，Jazz 類型至少有鋼琴背景，弦樂三重奏至少有弦樂鋪底。
- 加入 MIDI 下載。
- 加入更多曲風：Swing Jazz、Funk Jazz、Lo-fi Jazz、Latin Jazz、Noir Jazz、Playful Jazz、Big Band 感。
- 把原本下方的樂器標籤改成「樂器組合」選單：
  - Jazz Trio：鋼琴、Bass、鼓
  - Jazz Quartet：鋼琴、Bass、鼓、銅管
  - Guitar Quartet：吉他、鋼琴、Bass、鼓
  - 弦樂三重奏：小提琴、中提琴、大提琴
  - Brass Combo：鋼琴、Bass、鼓、銅管群
- 保留簡潔 UI：生成後自動播放，無 JSON 預覽，不額外顯示時間、節奏點、seed。

## 注意
- 真實樂器 beta 仍使用瀏覽器端載入 SoundFont。若網路或 CORS 失敗，會自動改用快速合成備援。
- MIDI 檔用固定 120 BPM 時基保留實際播放時間，因此 MIDI 編輯軟體中顯示的 BPM 不一定等於網頁內的段落 BPM；但音符相對時間會接近原曲。
- 若要商用品質音色，下一步應改成自備授權 sample pack 或輸出 MIDI 到 DAW 換高品質音源。
