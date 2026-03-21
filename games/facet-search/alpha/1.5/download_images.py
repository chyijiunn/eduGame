import requests, os
'''
由於環境限制，此版本提供「自動下載真實料理照片腳本」。
使用方式：

    申請免費 Pexels API Key：https://www.pexels.com/api/
    打開 download_images.py
    填入 API KEY
    執行腳本 → 自動下載50張料理照片到 /images
    再開啟 index.html 即可離線使用

這樣可以確保：✔真照片 ✔合法 ✔可離線 ✔不會壞
搭配 v1.4 的頁面使用
'''
API_KEY = "API_key"
headers = {"Authorization": API_KEY}

queries = [
"chicken mushroom pasta","fried rice chicken","chicken salad yogurt","roast chicken potatoes",
"chicken tomato stew","omelette spinach cheese","chicken cabbage stir fry","chicken wrap yogurt",
"chicken mushroom soup","chicken toast cheese",
"pork steak","pork fried rice","pork cabbage","pork mushroom pasta","pork potato skillet",
"pork tomato rice","pork sandwich","pork noodles onion","baked pork rice","pork cream soup",
"beef steak mushroom","beef sandwich","beef potato stew","beef tomato pasta","beef noodles pepper",
"beef toast cheese","beef fried rice","beef salad yogurt",
"salmon butter lemon","shrimp pasta tomato","shrimp fried rice","clam tomato soup","tuna pasta salad",
"fish potato plate","ham cheese sandwich","scrambled eggs onion","oatmeal apple","yogurt fruit",
"omelette spinach cheese","cucumber yogurt salad",
"potato soup","mushroom egg toast","baked pasta cheese","pepper tomato eggs","cabbage butter",
"mustard potato","garlic tomato bread","baked mushroom potato","cucumber tomato salad","mushroom bread"
]

os.makedirs("images", exist_ok=True)

for i,q in enumerate(queries):
    url = f"https://api.pexels.com/v1/search?query={q}&per_page=1"
    r = requests.get(url, headers=headers).json()
    img = r["photos"][0]["src"]["large"]
    data = requests.get(img).content
    with open(f"images/r{str(i+1).zfill(2)}.jpg","wb") as f:
        f.write(data)

print("下載完成！")
