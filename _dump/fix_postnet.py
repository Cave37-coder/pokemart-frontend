with open("src/app/checkout/page.tsx", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    '{ id: "postnet",     label: "Postnet-to-Postnet",      price: 85, desc: "2-5 business days. Collect from your nearest PostNet." },',
    '{ id: "postnet",     label: "Postnet-to-Postnet",      price: 130, desc: "2-5 business days. Collect from your nearest PostNet." },'
)

with open("src/app/checkout/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
