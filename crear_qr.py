"""Genera los códigos QR de la Pokédex (contenido: pokemon:{id}).
Uso:  pip install "qrcode[pil]"  &&  python crear_qr.py
Salida: qr/ (los 151 PNG) y qr/hoja-151.pdf para imprimir."""
import os, qrcode
from qrcode.constants import ERROR_CORRECT_Q
from PIL import Image, ImageDraw, ImageFont

NOMBRES = """bulbasaur ivysaur venusaur charmander charmeleon charizard squirtle wartortle blastoise caterpie metapod butterfree weedle kakuna beedrill pidgey pidgeotto pidgeot rattata raticate spearow fearow ekans arbok pikachu raichu sandshrew sandslash nidoran-f nidorina nidoqueen nidoran-m nidorino nidoking clefairy clefable vulpix ninetales jigglypuff wigglytuff zubat golbat oddish gloom vileplume paras parasect venonat venomoth diglett dugtrio meowth persian psyduck golduck mankey primeape growlithe arcanine poliwag poliwhirl poliwrath abra kadabra alakazam machop machoke machamp bellsprout weepinbell victreebel tentacool tentacruel geodude graveler golem ponyta rapidash slowpoke slowbro magnemite magneton farfetchd doduo dodrio seel dewgong grimer muk shellder cloyster gastly haunter gengar onix drowzee hypno krabby kingler voltorb electrode exeggcute exeggutor cubone marowak hitmonlee hitmonchan lickitung koffing weezing rhyhorn rhydon chansey tangela kangaskhan horsea seadra goldeen seaking staryu starmie mr-mime scyther jynx electabuzz magmar pinsir tauros magikarp gyarados lapras ditto eevee vaporeon jolteon flareon porygon omanyte omastar kabuto kabutops aerodactyl snorlax articuno zapdos moltres dratini dragonair dragonite mewtwo mew""".split()
assert len(NOMBRES) == 151
for i, n in {1:'bulbasaur',4:'charmander',7:'squirtle',25:'pikachu',39:'jigglypuff',52:'meowth',94:'gengar',133:'eevee',150:'mewtwo',151:'mew'}.items():
    assert NOMBRES[i-1] == n, (i, n)
OBLIGATORIOS = [1, 4, 7, 25, 39, 52, 94, 133, 150, 151]

def bonito(n):
    esp = {'nidoran-f': 'Nidoran ♀', 'nidoran-m': 'Nidoran ♂', 'mr-mime': 'Mr. Mime', 'farfetchd': "Farfetch'd"}
    return esp.get(n, n.replace('-', ' ').title())

RUTA = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'
def fuente(t): return ImageFont.truetype(RUTA, t)

def tarjeta_qr(i):
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_Q, box_size=12, border=3)
    qr.add_data(f'pokemon:{i}'); qr.make(fit=True)
    img = qr.make_image(fill_color='#111111', back_color='white').convert('RGB')
    W = img.width + 40
    lienzo = Image.new('RGB', (W, img.height + 120), 'white')
    lienzo.paste(img, (20, 14))
    d = ImageDraw.Draw(lienzo)
    y = img.height + 18
    for texto, tam in ((f'#{i:03d}  {bonito(NOMBRES[i-1])}', 26), (f'pokemon:{i}', 22)):
        f = fuente(tam); w = d.textlength(texto, font=f)
        d.text(((W - w) / 2, y), texto, fill='#111111', font=f); y += tam + 12
    return lienzo

def hoja_pdf(ids, ruta, cols, filas, titulo):
    A4 = (1240, 1754)  # 150 dpi
    por = cols * filas; paginas = []
    for ini in range(0, len(ids), por):
        pag = Image.new('RGB', A4, 'white'); d = ImageDraw.Draw(pag)
        d.text((60, 36), titulo, fill='#b3202a', font=fuente(34))
        celda_w = (A4[0] - 120) // cols; celda_h = (A4[1] - 160) // filas
        for k, i in enumerate(ids[ini:ini + por]):
            t = tarjeta_qr(i); esc = min((celda_w - 20) / t.width, (celda_h - 20) / t.height)
            t = t.resize((int(t.width * esc), int(t.height * esc)), Image.LANCZOS)
            cx = 60 + (k % cols) * celda_w + (celda_w - t.width) // 2
            cy = 110 + (k // cols) * celda_h + (celda_h - t.height) // 2
            pag.paste(t, (cx, cy))
        paginas.append(pag)
    paginas[0].save(ruta, save_all=True, append_images=paginas[1:], resolution=150)

os.makedirs('qr', exist_ok=True)
for i in range(1, 152):
    t = tarjeta_qr(i); nombre = f'{i:03d}-{NOMBRES[i-1]}.png'
    t.save(f'qr/{nombre}')
hoja_pdf(list(range(1, 152)), 'qr/hoja-151.pdf', 4, 5, 'Pokédex QR · Los 151 Pokémon de Kanto')
print('listo')
