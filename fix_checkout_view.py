with open("orders/views.py", encoding="utf-8") as f:
    content = f.read()

old = """        order = Order.objects.create(
            user=request.user,
            total_price=total,
            delivery_method=request.data.get('delivery_method', 'courier'),
            delivery_address_line1=request.data.get('address_line1', ''),
            delivery_address_line2=request.data.get('address_line2', ''),
            delivery_city=request.data.get('city', ''),
            delivery_province=request.data.get('province', ''),
            delivery_postal_code=request.data.get('postal_code', ''),
            customer_note=request.data.get('customer_note', ''),
        )"""

new = """        payment_method = request.data.get('payment_method', 'payfast')
        shipping_method = request.data.get('shipping_method', 'pudo_locker')
        is_eft = payment_method == 'eft'
        is_coc = shipping_method == 'collection'

        order = Order.objects.create(
            user=request.user,
            total_price=total,
            status='pending_eft' if is_eft else 'pending',
            payment_method='coc' if is_coc else payment_method,
            shipping_method=shipping_method,
            shipping_cost=request.data.get('shipping_cost', 0),
            delivery_method='collection' if is_coc else 'courier',
            delivery_address_line1=request.data.get('address_line1', ''),
            delivery_address_line2=request.data.get('address_line2', ''),
            delivery_city=request.data.get('city', ''),
            delivery_province=request.data.get('province', ''),
            delivery_postal_code=request.data.get('postal_code', ''),
            pudo_locker_name=request.data.get('pudo_locker_name', ''),
            pudo_locker_address=request.data.get('pudo_locker_address', ''),
            customer_note=request.data.get('customer_note', ''),
        )"""

content = content.replace(old, new)

with open("orders/views.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Done" if old in open("orders/views.py", encoding="utf-8").read() == False else "Replaced")
