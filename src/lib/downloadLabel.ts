import { authFetch } from "@/lib/api";

// Thermal label tags (2026-10-28): fetches the 40x30 mm PNG from the API (needs the staff login, so a
// plain link won't do) and saves it; drag the file into Labelnize > Image Printing on the PC.
// Returns "" on success, otherwise an error message to show.
export async function downloadLabelPng(path: string, filename: string): Promise<string> {
  try {
    const res = await authFetch(path);
    if (!res.ok) return "Could not create the label.";
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return "";
  } catch {
    return "Could not create the label — check your connection.";
  }
}
