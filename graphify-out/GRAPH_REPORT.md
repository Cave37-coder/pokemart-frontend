# Graph Report - pokemart-frontend  (2026-08-17)

## Corpus Check
- 98 files · ~421,179 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 514 nodes · 705 edges · 67 communities (54 shown, 13 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.85)
- Token cost: 607,596 input · 0 output

## Community Hubs (Navigation)
- Community/Social Profile Features
- Card Detail & Auth Pages
- Messaging & Wishlist Features
- Decklist Editor UI
- TypeScript Compiler Config
- Checklist Tracking Pages
- Card Browse & Search
- NPM Runtime Dependencies
- Staff Order Admin
- Decklist Editor Actions
- App Layout & Nav
- NPM Dev Dependencies
- Staff Checklist Admin
- Wishlist Heart Button
- Pokemon Franchise Collage Art
- Decklist Legality Checking
- User Profile Page
- Sitemap Generation
- Backend API Debug Capture
- Decklist Card Line Parsing
- Order Tracking Page
- Sell/Trade-In Page
- Firebase Client Setup
- PokeBulk Promo Card Asset
- Accessories Shop Page
- Project Docs & Agent Rules
- PokeBulk Trainer Card Asset
- PokeBulk Pikachu Logo Assets
- About Page
- Bundles Shop Page
- ESLint Config
- Next.js Config
- Next.js Boilerplate Icon
- PostCSS Config
- Decklist ID Helpers
- PokeBulk Decklist Logo Asset
- Next.js Boilerplate File Icon
- Next.js Boilerplate Globe Icon
- Next.js Boilerplate Vercel Icon
- Next.js Boilerplate Window Icon

## God Nodes (most connected - your core abstractions)
1. `authFetch()` - 39 edges
2. `DecklistPage()` - 25 edges
3. `compilerOptions` - 16 edges
4. `usePokedexCollection()` - 9 edges
5. `doImport()` - 8 edges
6. `WishlistHeartButton()` - 8 edges
7. `Card` - 8 edges
8. `SessionExpiredError` - 8 edges
9. `BackButton()` - 7 edges
10. `sendEvent()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `PokeMart API Products Endpoint (Railway)` --conceptually_related_to--> `pokemart-api Backend Repo (sibling project)`  [INFERRED]
  .dbg_out/crz_page10_raw.txt → CLAUDE.md
- `Next.js Breaking-Changes Notice` --conceptually_related_to--> `PokeMart Frontend Next.js README`  [INFERRED]
  AGENTS.md → README.md
- `FriendButton()` --calls--> `authFetch()`  [EXTRACTED]
  src/app/community/[id]/page.tsx → src/lib/api.ts
- `OrderManageRow()` --calls--> `authFetch()`  [EXTRACTED]
  src/app/staff/orders/page.tsx → src/lib/api.ts
- `CLAUDE.md Project Rules (pokemart-frontend)` --references--> `Next.js Breaking-Changes Notice`  [EXTRACTED]
  CLAUDE.md → AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **PokeMart API Backend Integration Pattern** — dbg_out_crz_page10_raw_apiresponse, dbg_out_crz_page10_raw_pokemart_api_endpoint, claude_pokemart_api_backend_reference [INFERRED 0.75]

## Communities (67 total, 13 thin omitted)

### Community 0 - "Community/Social Profile Features"
Cohesion: 0.07
Nodes (39): ChecklistCompletion, FriendButton(), FriendshipStatus, ProductMini, PublicProfile, PublicProfilePage(), sectionStyle, TRAINER_BADGE (+31 more)

### Community 1 - "Card Detail & Auth Pages"
Cohesion: 0.07
Nodes (32): AddToPileButton(), CardPage(), TYPE_COLORS, ViewItemTracker(), Cart, CartItem, CheckoutPage(), COLLECTION_PAYMENT (+24 more)

### Community 2 - "Messaging & Wishlist Features"
Cohesion: 0.07
Nodes (32): CommunityPage(), FriendCard, FriendsTab(), MostWantedItem, PendingFriend, PublicCard, sectionStyle, TRAINER_BADGE (+24 more)

### Community 3 - "Decklist Editor UI"
Cohesion: 0.06
Nodes (25): ApiCardSet, ApiProduct, ApiSearchResponse, btnGhost, btnPrimary, CardSection, COLORS_THEME, Deck (+17 more)

### Community 4 - "TypeScript Compiler Config"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 5 - "Checklist Tracking Pages"
Cohesion: 0.13
Nodes (24): Checklist(), checklistCache, ChecklistsPageInner(), ensureChecklistData(), fmt(), getProgress(), loadChecks(), migrateLocalChecklistData() (+16 more)

### Community 6 - "Card Browse & Search"
Cohesion: 0.10
Nodes (21): ALWAYS_SPECIAL_CODES, buildHref(), CardsPage(), ENERGY_SUBTYPES, ENERGY_TYPES, ERA_ORDER, getSets(), LEGALITY_OPTIONS (+13 more)

### Community 7 - "NPM Runtime Dependencies"
Cohesion: 0.09
Nodes (21): axios, botid, firebase, next, dependencies, axios, botid, firebase (+13 more)

### Community 8 - "Staff Order Admin"
Cohesion: 0.11
Nodes (18): AdminOrder, btn, btnPrimary, card, dateFmt(), inp, INVOICE_STATUS_CHOICES, INVOICE_STATUS_COLOR (+10 more)

### Community 9 - "Decklist Editor Actions"
Cohesion: 0.19
Nodes (15): cntLines(), DecklistPage(), applyDeckToEditor(), buildPrintHTML(), confirmNewDeck(), copyLive(), delDeck(), doImport() (+7 more)

### Community 10 - "App Layout & Nav"
Cohesion: 0.13
Nodes (8): FOIL_STRIPE, metadata, GoogleAnalytics(), FOIL_STRIPE, NavBar(), CAMPAIGN_END, ProfileCompletionPopup(), ProfileData

### Community 11 - "NPM Dev Dependencies"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 12 - "Staff Checklist Admin"
Cohesion: 0.14
Nodes (15): ActiveOrder, btn, btnPrimary, card, ChecklistsBody(), CustomerDetail, CustomerResult, dateFmt() (+7 more)

### Community 13 - "Wishlist Heart Button"
Cohesion: 0.26
Nodes (11): EMPTY, WishlistHeartButton(), ensureLoaded(), getWishlistIds(), hasToken(), ids, Listener, listeners (+3 more)

### Community 14 - "Pokemon Franchise Collage Art"
Cohesion: 0.20
Nodes (9): Ash Ketchum, Bulbasaur, Charizard, Gengar, Pikachu, Pokemart Frontend Branding/Marketing Asset, Pokemon Franchise Multi-Generation Roster, Snorlax (+1 more)

### Community 15 - "Decklist Legality Checking"
Cohesion: 0.22
Nodes (10): checkLegalityHardcoded(), processSection(), checkLegalityLive(), recheckLegality(), extractCardName(), extractCardNumber(), extractSetCode(), getLegalMeta() (+2 more)

### Community 16 - "User Profile Page"
Cohesion: 0.22
Nodes (9): DIAL_CODES, inputStyle, labelStyle, lockedStyle, Profile, ProfilePage(), SA_PROVINCES, sectionStyle (+1 more)

### Community 17 - "Sitemap Generation"
Cohesion: 0.38
Nodes (6): dynamic, fetchPage(), getAllProductIds(), PaginatedResponse, ProductListItem, sitemap()

### Community 18 - "Backend API Debug Capture"
Cohesion: 0.33
Nodes (6): Git Index Lock Clearing Rule, pokemart-api Backend Repo (sibling project), R2-Only Image Hosting Rule, CRZ Page 10 Product API Response Capture, Crown Zenith (CRZ) Card Set, PokeMart API Products Endpoint (Railway)

### Community 19 - "Decklist Card Line Parsing"
Cohesion: 0.33
Nodes (6): appendOrIncrementLine(), buildCardLineFragment(), classifySection(), cleanCardName(), handleAddCard(), sectionLabel()

### Community 20 - "Order Tracking Page"
Cohesion: 0.40
Nodes (3): Order, OrderTracking, STATUS_COLOR

### Community 21 - "Sell/Trade-In Page"
Cohesion: 0.40
Nodes (3): rates, s, steps

### Community 22 - "Firebase Client Setup"
Cohesion: 0.40
Nodes (4): app, auth, db, firebaseConfig

### Community 23 - "PokeBulk Promo Card Asset"
Cohesion: 0.50
Nodes (4): Poke Bulk SA Promotional Trading Card, Michael V (Contact), pokebulk.co.za Website, Pokemon TCG Supporter Card Template

### Community 25 - "Project Docs & Agent Rules"
Cohesion: 0.67
Nodes (3): Next.js Breaking-Changes Notice, CLAUDE.md Project Rules (pokemart-frontend), PokeMart Frontend Next.js README

### Community 26 - "PokeBulk Trainer Card Asset"
Cohesion: 0.67
Nodes (3): aschefield (Artwork Credit), Poke Bulk SA Trainer Card, Poke Bulk Brand

### Community 27 - "PokeBulk Pikachu Logo Assets"
Cohesion: 0.67
Nodes (3): PokeBulk Logo (Pikachu Artwork, Background Removed), PokeBulk Pikachu Mascot Logo (JPEG), PokeBulk Logo

## Ambiguous Edges - Review These
- `Poke Bulk SA Trainer Card` → `aschefield (Artwork Credit)`  [AMBIGUOUS]
  public/001-099-poke-bulk-sa.png · relation: references

## Knowledge Gaps
- **219 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+214 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Poke Bulk SA Trainer Card` and `aschefield (Artwork Credit)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `authFetch()` connect `Messaging & Wishlist Features` to `Community/Social Profile Features`, `Card Detail & Auth Pages`, `Checklist Tracking Pages`, `Staff Order Admin`, `App Layout & Nav`, `Staff Checklist Admin`, `Wishlist Heart Button`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `BackButton()` connect `Card Detail & Auth Pages` to `Community/Social Profile Features`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `SessionExpiredError` connect `Messaging & Wishlist Features` to `Staff Order Admin`, `Card Detail & Auth Pages`, `Staff Checklist Admin`, `Checklist Tracking Pages`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _219 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community/Social Profile Features` be split into smaller, more focused modules?**
  _Cohesion score 0.06966618287373004 - nodes in this community are weakly interconnected._
- **Should `Card Detail & Auth Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.07293868921775898 - nodes in this community are weakly interconnected._