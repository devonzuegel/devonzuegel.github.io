import math

def boggle_svg(size, corner_r=None):
    if corner_r is None:
        corner_r = size * 0.18
    pad = size * 0.08
    inner = size - 2*pad
    tile = inner / 4
    gap = tile * 0.12
    ts = tile - gap
    tr = ts * 0.18
    letters = ['B','O','G','G','L','E','T','R','A','I','N','E','R','!','!','!']
    amber = '#E9A83A'
    bone = '#F2EDDF'
    ground = '#141F1A'
    surface2 = '#27392F'
    ink = '#17201B'
    
    lines = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">']
    lines.append(f'<rect width="{size}" height="{size}" rx="{corner_r}" fill="{ground}"/>') 
    lines.append(f'<rect x="{pad}" y="{pad}" width="{inner}" height="{inner}" rx="{inner*0.08}" fill="{surface2}"/>')
    
    fs = ts * 0.42
    for i in range(16):
        row = i // 4
        col = i % 4
        x = pad + col*tile + gap/2
        y = pad + row*tile + gap/2
        is_highlight = letters[i] in ('B','O','G','L','E')
        fill = amber if is_highlight else bone
        tc = ink
        lines.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{ts:.1f}" height="{ts:.1f}" rx="{tr:.1f}" fill="{fill}"/>')
        cx = x + ts/2
        cy = y + ts/2 + fs*0.35
        lines.append(f'<text x="{cx:.1f}" y="{cy:.1f}" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="{fs:.1f}" fill="{tc}">{letters[i]}</text>')
    
    lines.append('</svg>')
    return '\n'.join(lines)

for size in [180, 192, 512]:
    svg = boggle_svg(size)
    with open(f'icon-{size}.svg', 'w') as f:
        f.write(svg)
    print(f'wrote icon-{size}.svg')
