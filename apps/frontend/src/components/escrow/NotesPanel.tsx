"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

// Lightweight notes panel shown in the escrow detail sidebar. Notes are
// persisted locally per escrow so they survive view transitions and reloads
// until a server-backed notes API is wired.

const styles = {
  panel: {
    border: "1px solid #fed7aa",
    borderRadius: "1rem",
    backgroundColor: "#ffffff",
    padding: "1.25rem",
  } satisfies CSSProperties,
  label: {
    margin: 0,
    marginBottom: "0.5rem",
    fontWeight: 700,
    fontSize: "1rem",
  } satisfies CSSProperties,
  input: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: "0.75rem",
    padding: "0.75rem",
    font: "inherit",
    resize: "vertical",
    minHeight: "6rem",
  } satisfies CSSProperties,
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    marginTop: "0.75rem",
  } satisfies CSSProperties,
  saveButton: {
    border: "1px solid #f97316",
    backgroundColor: "#f97316",
    color: "#ffffff",
    borderRadius: "0.75rem",
    padding: "0.5rem 1rem",
    fontWeight: 600,
    cursor: "pointer",
  } satisfies CSSProperties,
  savedHint: {
    margin: 0,
    color: "#16a34a",
    fontSize: "0.8rem",
  } satisfies CSSProperties,
} as const;

export function NotesPanel({ escrowId }: { escrowId: string }) {
  const storageKey = `escrow-notes:${escrowId}`;
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setNotes(window.localStorage.getItem(storageKey) ?? "");
    } catch (error) {
      // localStorage can throw in private mode or when disabled by policy.
      console.error("Failed to load notes from localStorage:", error);
    }
  }, [storageKey]);

  const handleSave = () => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, notes);
      setSaved(true);
    } catch (error) {
      // Storage may be full or unavailable; keep the typed notes in state.
      console.error("Failed to save notes to localStorage:", error);
    }
  };

  return (
    <div style={styles.panel}>
      <label htmlFor="escrow-notes" style={styles.label}>
        Notes
      </label>
      <textarea
        id="escrow-notes"
        style={styles.input}
        placeholder="Add notes…"
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
          setSaved(false);
        }}
      />
      <div style={styles.footer}>
        {saved ? <p style={styles.savedHint}>Saved</p> : <span />}
        <button type="button" style={styles.saveButton} onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  );
}
