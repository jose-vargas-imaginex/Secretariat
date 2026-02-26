from PIL import Image, ImageDraw, ImageFont
import math

size = 1024
img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Draw rounded rectangle background
def rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    r = radius
    # Main rectangles
    draw.rectangle([x0 + r, y0, x1 - r, y1], fill=fill)
    draw.rectangle([x0, y0 + r, x1, y1 - r], fill=fill)
    # Corners
    draw.pieslice([x0, y0, x0 + 2*r, y0 + 2*r], 180, 270, fill=fill)
    draw.pieslice([x1 - 2*r, y0, x1, y0 + 2*r], 270, 360, fill=fill)
    draw.pieslice([x0, y1 - 2*r, x0 + 2*r, y1], 90, 180, fill=fill)
    draw.pieslice([x1 - 2*r, y1 - 2*r, x1, y1], 0, 90, fill=fill)

# Gradient background - approximate with horizontal bands
for y in range(size):
    t = y / size
    # Diagonal gradient: top-left #4f46e5, bottom-right #7c3aed
    r = int(79 + (124 - 79) * (t * 0.5 + 0.25))
    g = int(70 + (58 - 70) * (t * 0.5 + 0.25))
    b = int(229 + (237 - 229) * (t * 0.5 + 0.25))
    draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

# Apply rounded rectangle mask
mask = Image.new('L', (size, size), 0)
mask_draw = ImageDraw.Draw(mask)
rounded_rect(mask_draw, (0, 0, size, size), 228, 255)
img.putalpha(mask)

# Draw chess knight character
# Try to find a good font that renders the chess piece well
knight_char = '\u265E'  # Black chess knight

font_paths = [
    '/System/Library/Fonts/Apple Color Emoji.ttc',
    '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
    '/System/Library/Fonts/Helvetica.ttc',
    '/Library/Fonts/Arial Unicode.ttf',
    '/System/Library/Fonts/SFPro.ttf',
]

font = None
font_size = 520

for fp in font_paths:
    try:
        font = ImageFont.truetype(fp, font_size)
        # Test if it can render the knight
        bbox = font.getbbox(knight_char)
        if bbox and (bbox[2] - bbox[0]) > 50:
            print(f"Using font: {fp}")
            break
        font = None
    except Exception as e:
        continue

if font is None:
    # Fallback
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Unicode.ttf', font_size)
    print("Using fallback font")

# Get text bounding box for centering
bbox = font.getbbox(knight_char)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]

x = (size - tw) // 2 - bbox[0]
y = (size - th) // 2 - bbox[1] - 10

# Draw the knight with slight shadow
draw.text((x + 4, y + 4), knight_char, font=font, fill=(0, 0, 0, 40))
draw.text((x, y), knight_char, font=font, fill=(255, 255, 255, 240))

# Draw small sparkle accent in bottom right
def draw_sparkle(draw, cx, cy, size_s, fill):
    """Draw a 4-point star sparkle"""
    points = []
    for i in range(4):
        angle = i * math.pi / 2
        ox = cx + math.cos(angle) * size_s
        oy = cy + math.sin(angle) * size_s
        points.append((ox, oy))
        # Inner point
        inner_angle = angle + math.pi / 4
        ix = cx + math.cos(inner_angle) * (size_s * 0.15)
        iy = cy + math.sin(inner_angle) * (size_s * 0.15)
        points.append((ix, iy))
    draw.polygon(points, fill=fill)

draw_sparkle(draw, 780, 800, 28, (251, 191, 36, 220))
draw_sparkle(draw, 820, 770, 14, (251, 191, 36, 160))

img.save('/Users/josevargas/Source/personal/vibes/Secretariat/build/icon-1024.png')
print("Icon saved!")
