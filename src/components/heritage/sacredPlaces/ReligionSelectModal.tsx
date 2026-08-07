// src/components/heritage/sacredPlaces/ReligionSelectModal.tsx
import { useState } from "react";
import { X, Map } from "lucide-react";
import { LENS_TYPES } from "@/types";

const RELIGION_OPTIONS = LENS_TYPES.filter((r) => r !== "All");

interface ReligionSelectModalProps {
  open: boolean;
  loading?: boolean;
  onConfirm: (religion: string) => void;
  onClose: () => void;
}

export function ReligionSelectModal({
  open,
  loading = false,
  onConfirm,
  onClose,
}: ReligionSelectModalProps) {
  const [selected, setSelected] = useState<string>("");
  const [custom, setCustom] = useState("");

  if (!open) return null;

  const isOther = selected === "Other";
  const finalReligion = isOther ? custom.trim() : selected;
  const canSubmit = !loading && finalReligion.length > 0;

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm(finalReligion);
  };

  return (
    // ── Backdrop — no onClick so clicking outside does nothing ──────────────
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0 bg-black/60 dark:bg-black/70">
      {/* Modal panel */}
      <div
        className="
          w-full max-w-sm rounded-[24px] p-6
          bg-[hsl(var(--card))]
          border border-[hsl(var(--border))]
          ring-1 ring-[hsl(var(--border))]
        "
        // stop bubbling just in case parent ever re-adds a backdrop handler
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-serif-display text-[18px] font-semibold
                           text-[hsl(var(--foreground))]">
              Choose your tradition
            </h2>
            <p className="mt-1 text-[12.5px] text-[hsl(var(--muted-foreground))]">
              We'll shape your pilgrimage around it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5
                       text-[hsl(var(--muted-foreground))]
                       hover:bg-[hsl(var(--muted))]
                       transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Religion pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[...RELIGION_OPTIONS, "Other"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setSelected(r);
                if (r !== "Other") setCustom("");
              }}
              className={`
                px-3.5 py-1.5 rounded-full text-[13px] font-medium
                border transition-all duration-150
                ${
                  selected === r
                    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]"
                    : "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]"
                }
              `}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Custom input — shown when "Other" is selected */}
        {isOther && (
          <input
            autoFocus
            type="text"
            placeholder="e.g. Zoroastrian, Shaivite…"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            className="
              w-full mb-4 px-4 py-2.5 rounded-xl text-[13.5px]
              border border-[hsl(var(--border))]
              bg-[hsl(var(--muted))]
              text-[hsl(var(--foreground))]
              placeholder:text-[hsl(var(--muted-foreground))]
              focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/40
            "
          />
        )}

        {/* CTA */}
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleConfirm}
          className="
            w-full inline-flex items-center justify-center gap-2
            rounded-full py-2.5 text-[13.5px] font-medium
            bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]
            transition-all duration-200
            hover:opacity-90
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {loading ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full
                             border-2 border-current border-t-transparent" />
          ) : (
            <Map className="h-3.5 w-3.5" />
          )}
          {loading ? "Creating your journey…" : "Weave my journey"}
        </button>
      </div>
    </div>
  );
}