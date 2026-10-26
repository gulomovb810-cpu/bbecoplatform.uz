# Vaqtinchalik: investor videosi uchun ovoz (edge-tts). Natija "tts-audio" branchiga yoziladi.
import asyncio, json, os, sys, edge_tts
OUT = sys.argv[1]
VOICES = {'sardor': 'uz-UZ-SardorNeural', 'madina': 'uz-UZ-MadinaNeural'}
async def main():
    os.makedirs(OUT, exist_ok=True)
    lines = json.load(open(os.path.join(os.path.dirname(__file__), 'lines.json'), encoding='utf-8'))
    for key, v in VOICES.items():
        for lid, text in lines:
            for rate in ('-4%',):
                await edge_tts.Communicate(text, v, rate=rate).save(os.path.join(OUT, f'{key}_{lid}.mp3'))
    print(sorted(os.listdir(OUT)))
asyncio.run(main())
