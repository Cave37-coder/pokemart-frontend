with open('src/app/cards/page.tsx', encoding='utf-8') as f:
    content = f.read()

content = content.replace('card.image_small_url', 'card.image_url')

with open('src/app/cards/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
