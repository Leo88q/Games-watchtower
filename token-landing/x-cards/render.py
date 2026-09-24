#!/usr/bin/env python3
"""Карточки 1600x900 для постов X из цифр лендинга.

Запуск: python3 token-landing/x-cards/render.py   (нужен Pillow)
Цифры ALLOC/FUNDS/HW парсятся из index.html / en.html, чтобы картинки не расходились со страницей.
"""
import math, re, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
FONT_DIRS = ['/usr/share/fonts/truetype/dejavu/', '/Library/Fonts/', '/System/Library/Fonts/Supplemental/']
W, H = 1600, 900
BG, PANEL, LINE = '#090c12', '#111722', '#223047'
TEXT, MUTED, GREEN, PURPLE, ORANGE = '#e8eef8', '#8b98ad', '#37e5a0', '#a78bfa', '#ffb85c'


def font(size, bold=False, mono=False):
    name = ('DejaVuSansMono' if mono else 'DejaVuSans') + ('-Bold' if bold else '') + '.ttf'
    for d in FONT_DIRS:
        p = Path(d) / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.truetype('Arial.ttf', size)


def parse(html, name):
    block = re.search(r'const %s = \[(.*?)\n\]' % name, html, re.S).group(1)
    rows = []
    for line in block.strip().splitlines():
        parts = re.findall(r"'((?:[^'\\]|\\.)*)'|([\d.]+)", line)
        rows.append([s if s else float(n) for s, n in parts])
    return rows


def base(title, sub, lang):
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((60, 52, 104, 96), 10, fill=GREEN)
    d.text((82, 74), 'W', font=font(26, True), fill='#06120d', anchor='mm')
    d.text((120, 74), 'Watchtower Coin · $WTWR', font=font(26, True), fill=TEXT, anchor='lm')
    d.text((60, 150), title, font=font(54, True), fill=TEXT)
    d.text((60, 224), sub, font=font(26), fill=MUTED)
    foot = ('План, не обещание. Не инвестсовет. Можно потерять всё.' if lang == 'ru'
            else 'A plan, not a promise. Not financial advice. You can lose everything.')
    d.line((60, H - 70, W - 60, H - 70), fill=LINE, width=2)
    d.text((60, H - 44), foot, font=font(20), fill=MUTED, anchor='lm')
    return im, d


def fmt(n, lang):
    s = f'{int(round(n)):,}'
    return s.replace(',', ' ') if lang == 'ru' else s


def pct(p, lang):
    s = ('%g' % p)
    return s.replace('.', ',') if lang == 'ru' else s


def card_alloc(html, lang):
    rows = parse(html, 'ALLOC')
    assert abs(sum(r[1] for r in rows) - 100) < 1e-9
    im, d = base('Токеномика: 1 000 000 000 $WTWR' if lang == 'ru' else 'Tokenomics: 1,000,000,000 $WTWR',
                 'Фиксированная эмиссия, право выпуска отзывается' if lang == 'ru' else 'Fixed supply, mint authority revoked', lang)
    cx, cy, r = 360, 560, 230
    a = -90.0
    for name, p, color, _ in rows:
        sweep = p * 3.6
        d.pieslice((cx - r, cy - r, cx + r, cy + r), a, a + sweep, fill=color)
        a += sweep
    d.ellipse((cx - 130, cy - 130, cx + 130, cy + 130), fill=BG)
    d.text((cx, cy - 16), '1B', font=font(56, True), fill=TEXT, anchor='mm')
    d.text((cx, cy + 34), '$WTWR', font=font(24, mono=True), fill=MUTED, anchor='mm')
    y = 300
    for name, p, color, _ in rows:
        d.rounded_rectangle((690, y + 6, 712, y + 28), 5, fill=color)
        d.text((730, y), name, font=font(26), fill=TEXT)
        d.text((W - 80, y), pct(p, lang) + '%', font=font(26, True, True), fill=TEXT, anchor='ra')
        y += 46
    return im


def card_rounds(lang):
    ru = lang == 'ru'
    im, d = base('Сбор $250 000 — три раунда' if ru else 'Raising $250,000 — three rounds',
                 'NFT-доля прибыли + два раунда токена' if ru else 'A profit-share NFT + two token rounds', lang)
    cards = [
        (PURPLE, 'Раунд 0 · Ecosystem Share' if ru else 'Round 0 · Ecosystem Share', 100000,
         ['100 NFT × $1 000' if ru else '100 NFTs × $1,000', '25% чистой прибыли' if ru else '25% of net profit',
          'USDC раз в квартал' if ru else 'USDC every quarter']),
        (GREEN, 'Раунд 1 · Founders' if ru else 'Round 1 · Founders', 100000,
         ['40 млн $WTWR' if ru else '40M $WTWR', '$0,0025' if ru else '$0.0025', '10% сразу, 10 мес.' if ru else '10% at TGE, 10 mo']),
        ('#7af0c2', 'Раунд 2 · Builders' if ru else 'Round 2 · Builders', 50000,
         ['12,5 млн $WTWR' if ru else '12.5M $WTWR', '$0,004' if ru else '$0.004', '15% сразу, 6 мес.' if ru else '15% at TGE, 6 mo']),
    ]
    assert sum(c[2] for c in cards) == 250000
    x = 60
    cw = (W - 120 - 2 * 30) // 3
    for color, title, usd, lines in cards:
        d.rounded_rectangle((x, 300, x + cw, 740), 22, fill=PANEL, outline=color, width=3)
        d.text((x + 30, 330), title, font=font(26, True), fill=color)
        d.text((x + 30, 390), '$' + fmt(usd, lang), font=font(64, True, True), fill=TEXT)
        for i, l in enumerate(lines):
            d.text((x + 30, 510 + i * 52), l, font=font(28), fill=TEXT if i == 0 else MUTED)
        x += cw + 30
    d.text((60, 772), ('NFT-доля прибыли — ценная бумага: продажа только после юриста и Terms.' if ru
                       else 'Profit-share NFT is a security: sale only after legal sign-off and Terms.'), font=font(22), fill=ORANGE)
    return im


def card_profit(lang):
    ru = lang == 'ru'
    im, d = base('Куда идёт каждый доллар прибыли' if ru else 'Where each dollar of profit goes',
                 'Нет прибыли — нет выплат и выкупа' if ru else 'No profit — no payouts, no buyback', lang)
    parts = [(25, PURPLE, 'держателям Ecosystem Share (USDC)' if ru else 'Ecosystem Share holders (USDC)'),
             (30, GREEN, 'выкуп $WTWR: ½ сжигание, ½ стейкерам' if ru else '$WTWR buyback: ½ burn, ½ stakers'),
             (15, '#7aa7ff', 'пул разработчиков' if ru else 'developer pool'),
             (30, ORANGE, 'казна и операционные расходы' if ru else 'treasury and operations')]
    assert sum(p for p, *_ in parts) == 100
    x0, x1, y = 60, W - 60, 320
    x = x0
    for p, c, _ in parts:
        w = (x1 - x0) * p / 100
        d.rectangle((x, y, x + w - 4, y + 110), fill=c)
        d.text((x + w / 2, y + 55), f'{p}%', font=font(44, True), fill='#06120d', anchor='mm')
        x += w
    yy = 500
    for p, c, label in parts:
        d.rounded_rectangle((60, yy + 6, 88, yy + 34), 6, fill=c)
        d.text((110, yy), f'{p}%  {label}', font=font(32), fill=TEXT)
        yy += 60
    return im


def card_tree(lang):
    ru = lang == 'ru'
    im, d = base('Одна монета — вся экосистема' if ru else 'One coin — the whole ecosystem',
                 '4 игры на Solana и платформа Watchtower OS' if ru else '4 Solana games and the Watchtower OS platform', lang)
    root = (W // 2, 320)
    d.rounded_rectangle((root[0] - 220, 290, root[0] + 220, 360), 16, fill=GREEN)
    d.text(root[0:1] + (325,), '$WTWR · Watchtower OS', font=font(28, True), fill='#06120d', anchor='mm')
    games = [('ARES-1', '$POTATO', 'бета' if ru else 'beta', GREEN),
             ('GutterCaps', '$CG · CapsStake', 'альфа' if ru else 'alpha', ORANGE),
             ('Age of Farming', 'токен урожая' if ru else 'harvest token', 'прототип' if ru else 'prototype', MUTED),
             ('Neon Relay', 'токен сезона' if ru else 'season token', 'прототип' if ru else 'prototype', MUTED)]
    cw = 330
    gap = (W - 120 - 4 * cw) // 3
    for i, (g, tk, st, c) in enumerate(games):
        x = 60 + i * (cw + gap)
        d.line((root[0], 360, x + cw / 2, 470), fill=LINE, width=3)
        d.rounded_rectangle((x, 470, x + cw, 640), 18, fill=PANEL, outline=c, width=3)
        d.text((x + 24, 492), g, font=font(32, True), fill=TEXT)
        d.text((x + 24, 546), tk, font=font(24, mono=True), fill=MUTED)
        d.text((x + 24, 592), st, font=font(24, True), fill=c)
    tools = ('Аналитика · TalkChart · Launchpad · Compute Grid → VR 2028' if ru
             else 'Analytics · TalkChart · Launchpad · Compute Grid → VR 2028')
    d.text((W // 2, 720), tools, font=font(30), fill=PURPLE, anchor='mm')
    return im


def card_hw(html, lang):
    rows = parse(html, 'HW')
    total = sum(r[1] for r in rows)
    assert total == 50000
    ru = lang == 'ru'
    im, d = base('Compute Grid: $' + fmt(total, lang) + (' на своё железо' if ru else ' for our own hardware'),
                 'Собрано $0 · каждая покупка с чеком и транзакцией' if ru else 'Raised $0 · every purchase with receipt and tx', lang)
    y = 300
    for name, usd, _ in rows:
        d.text((60, y), re.sub(r'[^\w\s·—,./+-]', '', name).strip(), font=font(28), fill=TEXT)
        d.text((W - 60, y), '$' + fmt(usd, lang), font=font(28, True, True), fill=TEXT, anchor='ra')
        d.rounded_rectangle((60, y + 42, W - 60, y + 54), 6, fill=PANEL, outline=LINE)
        y += 78
    return im


def main():
    out = HERE
    for lang, page in (('ru', 'index.html'), ('en', 'en.html')):
        html = (ROOT / page).read_text(encoding='utf-8')
        cards = {'1-tree': card_tree(lang), '2-alloc': card_alloc(html, lang), '3-rounds': card_rounds(lang),
                 '4-profit': card_profit(lang), '5-hardware': card_hw(html, lang)}
        for k, im in cards.items():
            p = out / f'{k}-{lang}.png'
            im.save(p, optimize=True)
            print(p.relative_to(ROOT.parent), f'{p.stat().st_size // 1024} KB')


if __name__ == '__main__':
    sys.exit(main())
