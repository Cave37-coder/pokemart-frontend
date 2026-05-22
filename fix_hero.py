with open('src/app/page.tsx', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<div style={{ fontSize:"48px", marginBottom:"16px" }}>⚡ 🃏 🔥</div>',
    '<img src="/pokebulk-logo.png" alt="PokeBulk SA" style={{ height:"120px", width:"120px", objectFit:"contain", marginBottom:"16px" }} />'
)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
