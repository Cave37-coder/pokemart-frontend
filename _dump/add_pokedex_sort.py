with open(r'src/app/cards/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = '''const SORT_OPTIONS = [
  { value: "card_number", label: "Card # (low to high)" },
  { value: "-card_number", label: "Card # (high to low)" },
  { value: "price", label: "Price (low to high)" },
  { value: "-price", label: "Price (high to low)" },
  { value: "name", label: "Name A to Z" },
];'''

new = '''const SORT_OPTIONS = [
  { value: "card_number", label: "Card # (low to high)" },
  { value: "-card_number", label: "Card # (high to low)" },
  { value: "pokedex_number", label: "Pokedex # (low to high)" },
  { value: "-pokedex_number", label: "Pokedex # (high to low)" },
  { value: "price", label: "Price (low to high)" },
  { value: "-price", label: "Price (high to low)" },
  { value: "name", label: "Name A to Z" },
];'''

if old in content:
    content = content.replace(old, new)
    print("Sort options updated")
else:
    print("NOT FOUND")

with open(r'src/app/cards/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
