// Single source of truth for the EFT banking details shown on the frontend
// (checkout page + order tracking page). Mirrors pokemart-api's
// orders/banking.py, which is the source of truth for the backend-rendered
// invoice documents -- kept as a separate copy here since this is a
// different app/deploy that can't import Python.
//
// Michael, 2026-08-18: "I need to change my banking details for pokebulk,
// on all invoicing" -- previously duplicated separately in checkout/page.tsx
// and orders/[id]/page.tsx, easy to update one and miss the other. Update
// ONLY here going forward (and remember orders/banking.py on the backend
// still needs updating by hand alongside it).
export const EFT_DETAILS = {
  name: "Poke Bulk SA (Pty) Ltd",
  bank: "Capitec Business",
  type: "Current Account",
  acc: "1055771166",
  branch: "450105",
};
