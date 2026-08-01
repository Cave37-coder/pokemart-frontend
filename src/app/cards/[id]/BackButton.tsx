// Superseded 2026-08-01 by the shared back-navigation button used across
// the whole site (Cards, Orders, Checkout, auth). Kept as a re-export
// rather than deleted, since files in this workspace can't be removed
// once written -- see src/components/BackButton.tsx for the real
// implementation and the reasoning behind it.
export { default } from "@/components/BackButton";
