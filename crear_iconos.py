"""Genera los íconos de la PWA (lente azul de la Pokédex sobre fondo rojo)."""
from PIL import Image, ImageDraw, ImageFilter

def lente(tam, seguro=1.0, redondo=True):
    S = 4  # supermuestreo para bordes suaves
    N = tam * S
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Fondo rojo con degradado
    fondo = Image.new("RGBA", (N, N))
    px = fondo.load()
    for y in range(N):
        t = y / N
        c = (int(238 - 40 * t), int(74 - 40 * t), int(80 - 44 * t), 255)
        for x in range(N):
            px[x, y] = c
    mascara = Image.new("L", (N, N), 0)
    ImageDraw.Draw(mascara).rounded_rectangle([0, 0, N, N], radius=int(N * 0.22) if redondo else 0, fill=255)
    img.paste(fondo, (0, 0), mascara)
    d = ImageDraw.Draw(img)

    # Franja oscura inferior (como el corte de la carcasa)
    d.rectangle([0, int(N * 0.80), N, N], fill=(77, 7, 11, 255)) if not redondo else None

    cx, cy = N / 2, N * 0.52
    R = N * 0.30 * seguro
    # Anillo negro + blanco
    d.ellipse([cx - R * 1.18, cy - R * 1.18, cx + R * 1.18, cy + R * 1.18], fill=(23, 24, 29, 255))
    d.ellipse([cx - R * 1.06, cy - R * 1.06, cx + R * 1.06, cy + R * 1.06], fill=(244, 244, 244, 255))
    # Cristal azul con degradado radial
    for i in range(40, 0, -1):
        t = i / 40
        r = R * 0.92 * t
        col = (int(8 + 112 * (1 - t)), int(47 + 150 * (1 - t)), int(120 + 135 * (1 - t)), 255)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    # Brillo
    d.ellipse([cx - R * 0.62, cy - R * 0.66, cx - R * 0.1, cy - R * 0.28], fill=(255, 255, 255, 215))
    d.ellipse([cx + R * 0.34, cy + R * 0.34, cx + R * 0.52, cy + R * 0.52], fill=(255, 255, 255, 140))

    # LEDs
    ly = N * 0.17 if seguro == 1.0 else N * 0.23
    rl = N * 0.035 * seguro
    for i, col in enumerate([(255, 90, 95), (255, 210, 63), (67, 224, 138)]):
        x = N * (0.30 if seguro == 1.0 else 0.36) + i * N * (0.10 if seguro == 1.0 else 0.085)
        d.ellipse([x - rl * 1.2, ly - rl * 1.2, x + rl * 1.2, ly + rl * 1.2], fill=(23, 24, 29, 255))
        d.ellipse([x - rl, ly - rl, x + rl, ly + rl], fill=col + (255,))
    return img.resize((tam, tam), Image.LANCZOS)

lente(512).save("icons/icon-512.png")
lente(192).save("icons/icon-192.png")
lente(180, redondo=False).save("icons/apple-touch-icon.png")
lente(32).save("icons/favicon-32.png")
# Maskable: el contenido va dentro de la zona segura (80 %) y el fondo llena todo
lente(512, seguro=0.78, redondo=False).save("icons/icon-maskable-512.png")
print("íconos listos")
