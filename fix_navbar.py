with open('src/components/NavBar.tsx', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<span style={{ fontSize:"24px" }}>⚡</span>\n        <span style={{ fontWeight:700, fontSize:"18px", color:"#fff" }}>PokeBulk</span>\n        <span style={{ color:"#ff6b35", fontWeight:700, fontSize:"18px" }}>SA</span>',
    '<img src="/pokebulk-logo.png" alt="PokeBulk SA" style={{ height:"48px", width:"48px", objectFit:"contain" }} />\n        <span style={{ fontWeight:700, fontSize:"18px", color:"#fff" }}>PokeBulk</span>\n        <span style={{ color:"#ff6b35", fontWeight:700, fontSize:"18px" }}>SA</span>'
)

with open('src/components/NavBar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
