with open("src/app/checkout/page.tsx", encoding="utf-8") as f:
    content = f.read()

# Fix collection description - remove encoding issue and add COC
content = content.replace(
    '{ id: "collection",   label: "Local Collection",         price: 0,   desc: "Birchleigh North, Kempton Park \u00e2\u0080\u0093 Mon-Fri 18:30-21:00 | Sat 10:00-18:00 | Sun 10:00-15:00. Give us 24hrs notice!" }',
    '{ id: "collection",   label: "Cash on Collection (COC)", price: 0,   desc: "Collect from Birchleigh North, Kempton Park. Pay cash on collection. Mon-Fri 18:30-21:00 | Sat 10:00-18:00 | Sun 10:00-15:00. Give us 24hrs notice!" }'
)

# Also try with the garbled encoding
content = content.replace(
    'Birchleigh North, Kempton Park \u00e2\u0080\u0093 Mon-Fri',
    'Birchleigh North, Kempton Park - Mon-Fri'
)

# Add EFT option after postnet
content = content.replace(
    '  { id: "postnet",      label: "Postnet-to-Postnet",       price: 85,  desc: "2-5 business days. Collect from your nearest PostNet." },',
    '  { id: "postnet",      label: "Postnet-to-Postnet",       price: 85,  desc: "2-5 business days. Collect from your nearest PostNet." },\n  { id: "eft",          label: "EFT / Bank Transfer",       price: 0,   desc: "Pay via EFT and send proof of payment to enquiries@pokebulk.co.za. Order processed once payment reflects." },'
)

with open("src/app/checkout/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
