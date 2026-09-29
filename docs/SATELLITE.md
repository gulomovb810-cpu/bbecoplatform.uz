# 🛰️ Sun’iy yo‘ldosh orqali proaktiv aniqlash

Bugungi tizim fuqaro xabar bergandagina ishlaydi. Bu qatlam **hech kim xabar bermagan** noqonuniy chiqindixonalarni
sun’iy yo‘ldosh tasvirlari va ML modeli yordamida topadi. Fransiya (Disaitek), Malayziya (MYSA), Italiya va Argentinada shu yondashuv qo‘llanadi.

```
Copernicus Sentinel-2 (10 m, har 5 kunda, bepul)
   │  yoki tijoriy: Planet (3 m), Pléiades (0.5 m)
   ▼
ML pipeline (Python, siz ishga tushirasiz)
   • tasvirlarni yuklash → plitkalarga bo'lish
   • segmentatsiya modeli (masalan U-Net) → chiqindixona niqobi
   • poligon → markaz (lat, lng), maydon, ishonch
   ▼
POST /functions/v1/ingest-detections   (x-ingest-secret)
   ▼
detections jadvali ──► Admin panel → 🛰️ Sun’iy yo‘ldosh
                          • sun’iy yo‘ldosh xaritasida ko‘rib chiqish
                          • ✅ Arizaga aylantirish (kanal: satellite) → odatiy ijro zanjiri
                          • ✖ Rad etish (rasmiy poligon, qurilish maydoni…)
```

## Platformada tayyor qismlar
| Qism | Holati |
|---|---|
| `detections` jadvali, RLS, realtime | ✅ `supabase/schema.sql` |
| Qabul qilish endpoint’i (dedublikatsiya ~150 m, hudud avtomatik) | ✅ `supabase/functions/ingest-detections` |
| Admin sahifasi: Esri va Sentinel-2 (EOX) sun’iy yo‘ldosh qatlamlari, ro‘yxat, tasdiqlash/rad etish, arizaga aylantirish | ✅ |
| GeoJSON / CSV import (qo‘lda yoki boshqa manbadan) | ✅ |
| **Klaster tahlili**: 60 kun ichida 1 km radiusda ≥3 murojaat bo‘lgan joylar nomzod sifatida | ✅ ML’siz ham ishlaydi |
| ECO MAP’da “🛰️ Aniqlashlar” qatlami | ✅ |
| ML modelining o‘zi (o‘qitish, inferens) | ⏳ MVP’dan keyingi bosqich — alohida server/GPU kerak |

## ML pipeline’ni ulash
1. **Ma’lumot**: [Copernicus Data Space](https://dataspace.copernicus.eu) dan Sentinel-2 L2A tasvirlarini oling (RGB + NIR yetarli).
2. **Model**: ochiq datasetlarda o‘qitilgan segmentatsiya modeli (masalan AerialWaste, “illegal landfill” datasetlari) yoki
   mahalliy belgilangan namunalar bilan fine-tune qilingan U-Net. Tasdiqlangan/rad etilgan aniqlashlar (admin paneldagi holatlar)
   keyingi o‘qitish uchun tayyor belgilangan ma’lumot bo‘ladi.
3. **Natijani yuborish** — har bir aniqlash uchun markaz, ishonch (0–1), maydon:

```python
import requests

detections = {
    "type": "FeatureCollection",
    "features": [{
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [69.354, 41.206]},   # [lng, lat]
        "properties": {"confidence": 0.93, "area_m2": 18400, "captured_at": "2026-09-20",
                       "source": "sentinel-2", "model": "unet-dumpsite-v1",
                       "image_url": "https://…/tile-preview.jpg"},
    }],
}
r = requests.post(
    "https://<PROJECT>.supabase.co/functions/v1/ingest-detections",
    headers={"x-ingest-secret": "<INGEST_SECRET>"},
    json=detections, timeout=30,
)
print(r.json())   # {"ok": true, "inserted": 1, "skipped": 0}
```

CSV formatida import (admin panel → ⬆ Import): `lat,lng,confidence,area_m2,captured_at,image_url`.

## Litsenziya eslatmasi
- Admin xaritasidagi **Sentinel-2 cloudless (EOX)** mozaikasi CC BY-NC-SA 4.0 — tijoriy bo‘lmagan foydalanish uchun.
- **Esri World Imagery** qatlami Esri foydalanish shartlariga bo‘ysunadi.
- Xom Copernicus Sentinel ma’lumotlari bepul va ochiq.
