@AGENTS.md

# Project rules

## Image hosting — always R2, never external hotlinks

Every image URL used anywhere on this site must be hosted on Cloudflare R2
(bucket `pokebulkcards`, CDN `https://images.pokebulk.co.za`), never an
external hotlink (TCGCSV, Google Images, Bulbapedia, etc.). Michael,
2026-08-08: "yes r2 always for images, set in rules!" This is a backend
concern (see pokemart-api/CLAUDE.md for the actual upload convention/admin
action pattern) but matters here too: don't build any frontend feature that
displays an image straight from an external URL passed through — always
expect the URL an API response gives you to already be an R2 URL, and flag
it back if a new backend field isn't.
