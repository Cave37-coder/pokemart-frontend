with open("src/app/checkout/page.tsx", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "          shipping_cost:       shippingCost,",
    "          shipping_cost:       shippingCost,\n          payment_method:      isCollection ? 'coc' : payment,"
)

with open("src/app/checkout/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
