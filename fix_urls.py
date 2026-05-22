import os
import re

files = [
    r'src\app\checkout\page.tsx',
    r'src\app\orders\[id]\page.tsx',
    r'src\app\pile\page.tsx',
    r'src\components\AddToPileButton.tsx',
    r'src\components\NavBar.tsx',
    r'src\lib\api.ts',
]

for f in files:
    with open(f, encoding='utf-8') as fh:
        content = fh.read()
    new = re.sub(
        r'process\.env\.(NEXT_PUBLIC_API_URL|API_URL)\s*\|\|\s*["\']http://127\.0\.0\.1:8000["\']',
        'process.env.NEXT_PUBLIC_API_URL || "https://pokemart-api-production.up.railway.app"',
        content
    )
    with open(f, 'w', encoding='utf-8') as fh:
        fh.write(new)
    print(f'Fixed: {f}')
