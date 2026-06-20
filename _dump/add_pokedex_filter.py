with open('src/app/cards/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add pokedex filter to API call
old = '      ...(params.legality && { legality: params.legality }),\n      min_price: "0.01",'
new = '      ...(params.legality && { legality: params.legality }),\n      ...(params.pokedex && { search: params.pokedex }),\n      min_price: "0.01",'

if old in content:
    content = content.replace(old, new)
    print("API filter added")
else:
    print("NOT FOUND - API filter")

# Add pokedex hidden input to form
old2 = '        {params.legality && <input type="hidden" name="legality" value={params.legality} />}'
new2 = '        {params.legality && <input type="hidden" name="legality" value={params.legality} />}\n        {params.pokedex && <input type="hidden" name="pokedex" value={params.pokedex} />}'

if old2 in content:
    content = content.replace(old2, new2)
    print("Hidden input added")
else:
    print("NOT FOUND - hidden input")

# Add pokedex search input next to main search
old3 = '        <input name="search" defaultValue={params.search} placeholder="Search name, set..." style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:"6px", padding:"8px 14px", color:"#fff", fontSize:"13px", flex:1, minWidth:"180px" }} />'
new3 = '        <input name="search" defaultValue={params.search} placeholder="Search name, set, artist..." style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:"6px", padding:"8px 14px", color:"#fff", fontSize:"13px", flex:1, minWidth:"180px" }} />\n        <input name="pokedex" defaultValue={params.pokedex} placeholder="Dex # e.g. 25" style={{ background:"#1a1a24", border:"1px solid #2a2a3a", borderRadius:"6px", padding:"8px 12px", color:"#fff", fontSize:"13px", width:"120px" }} />'

if old3 in content:
    content = content.replace(old3, new3)
    print("Pokedex input added")
else:
    print("NOT FOUND - search input")

# Add pokedex to clear all condition
old4 = '{(params.search || params.rarity || params.era || params.energy_type || params.supertype || params.card_set || params.subtype) && ('
new4 = '{(params.search || params.rarity || params.era || params.energy_type || params.supertype || params.card_set || params.subtype || params.pokedex) && ('

if old4 in content:
    content = content.replace(old4, new4)
    print("Clear all updated")
else:
    print("NOT FOUND - clear all")

with open('src/app/cards/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
