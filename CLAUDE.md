@AGENTS.md

# Project rules

## PowerShell git commands — always clear the stale index.lock first

Michael's Windows checkout keeps leaving behind a stale `.git\index.lock`
that blocks `git add`/`commit`/`push` — deleting it by hand hasn't stuck
(it comes back). Michael, 2026-08-17: "when powershell commands to run,
that you add the gitlock, that you delete... so if the delete can be added
automatically to all commands." (see pokemart-api/CLAUDE.md for the same
rule — applies to both repos.)

Whenever giving Michael a PowerShell git command sequence to run, always
prepend a line clearing the lock first — every time, not just after a lock
error has already shown up:

```powershell
Remove-Item -Force .git\index.lock -ErrorAction SilentlyContinue
git add <files>
git commit -m "..."
git push
```

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
