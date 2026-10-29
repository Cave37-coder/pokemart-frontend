// Shared wrapper for every /staff page (2026-10-29): the staff screens are built from wide tables, which
// were squashed or cut off on a phone. The .staff-root rules in globals.css make every table here scroll
// sideways with readable, un-squashed columns, and keep inputs/buttons a comfortable size on touch screens.
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <div className="staff-root">{children}</div>;
}
