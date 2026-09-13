"use client";
import { useState } from "react";

// Michael, 2026-09-13: "Can you fix the password override" -- a customer
// (Michael's own CaVe37 test account) had staff reset their password to a
// known temp value, confirmed correct server-side (direct API test
// succeeded), yet the LOGIN FORM kept rejecting it as "Invalid credentials"
// -- because the browser's own saved-password autofill was silently
// overwriting the password field with an old, stale remembered credential,
// invisible behind the dots. Root cause confirmed live: typing/pasting the
// real password into a fresh Incognito window worked immediately.
//
// Deliberately NOT disabling autofill (autoComplete="new-password" on a
// LOGIN field, or an autoComplete="off" trick) -- that would break the
// convenience for the vast majority of customers whose saved password IS
// correct, trading one rare support issue for a much more common one.
// Instead: a plain, safe show/hide toggle so ANYONE can visually confirm
// exactly what's about to be submitted, typed or autofilled, before they
// hit the button. This is the single fix that helps every future version
// of this exact incident, without changing normal login behaviour at all.
export default function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  autoFocus,
  style,
  id,
  name,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  autoFocus?: boolean;
  style?: React.CSSProperties;
  id?: string;
  name?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        name={name}
        style={{ ...style, paddingRight: 40 }}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        title={show ? "Hide password" : "Show password"}
        style={{
          position: "absolute",
          right: 6,
          top: "50%",
          transform: "translateY(-50%)",
          background: "transparent",
          border: "none",
          color: "#888",
          cursor: "pointer",
          fontSize: 15,
          padding: 6,
          lineHeight: 1,
        }}
      >
        {show ? "🙈" : "👁"}
      </button>
    </div>
  );
}
