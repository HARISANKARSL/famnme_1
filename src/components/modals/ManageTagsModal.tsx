import { useState, useEffect } from "react";

import {
  Dialog,
  ResponsiveDialogContent as DialogContent,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { Loader2, RefreshCw, Star } from "lucide-react";

import { useToast } from "@/components/ui/use-toast";

import { updateInstitutionTag } from "@/services/institutionService";

import type { InstitutionTag } from "@/types";

const TAGS: InstitutionTag[] = [
  "Regular",
  "Ancestral",
  "Pilgrimage",
  "Community",
];

interface Props {
  isOpen: boolean;
  onClose: () => void;

  institutionId: string;

  currentTag?: InstitutionTag;
  currentFamilyMain?: boolean;

  onUpdated: (tag: InstitutionTag, familyMain: boolean) => void;

  onRefreshDetails?: () => Promise<void>;
}

export function EditInstitutionModal({
  isOpen,
  onClose,

  institutionId,

  currentTag,
  currentFamilyMain = false,

  onUpdated,
  onRefreshDetails,
}: Props) {
  const { toast } = useToast();

  const [selected, setSelected] = useState<InstitutionTag>("Regular");

  const [familyMain, setFamilyMain] = useState(false);

  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [initialTag, setInitialTag] = useState<InstitutionTag>("Regular");

  const [initialFamilyMain, setInitialFamilyMain] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const tag = currentTag ?? "Regular";

      setSelected(tag);
      setInitialTag(tag);

      setFamilyMain(currentFamilyMain);

      setInitialFamilyMain(currentFamilyMain);

      setNotes("");
    }
  }, [isOpen, currentTag, currentFamilyMain]);

  const hasChanges =
    selected !== initialTag ||
    familyMain !== initialFamilyMain ||
    notes.trim().length > 0;

  // ─────────────────────────────────────────────
  // Save
  // ─────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);

    try {
      await updateInstitutionTag(institutionId, {
        tag: selected,
        family_main: familyMain,
      });

      onUpdated(selected, familyMain);

      toast({
        title: "Tag updated",
      });

      onClose();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ?? err?.message ?? "Failed to update";

      toast({
        title: "Failed to update",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────
  // Refresh
  // ─────────────────────────────────────────────

  const handleRefresh = async () => {
    if (!onRefreshDetails) {
      return;
    }

    setRefreshing(true);

    try {
      await onRefreshDetails();

      toast({
        title: "Details refreshed successfully",
      });

      onClose();
    } catch {
      toast({
        title: "Failed to refresh details",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="
          flex max-h-[85vh] max-w-lg flex-col
          overflow-hidden rounded-2xl
          border border-[hsl(var(--border))]
          bg-[hsl(var(--card))]
          p-0
          text-[hsl(var(--foreground))]
          shadow-2xl
        "
      >
        {/* HEADER */}
        <div
          className="
            flex shrink-0 items-start
            justify-between
            border-b border-[hsl(var(--border))]
            p-5
          "
        >
          <div>
            <h3
              className="
                text-[18px]
                font-semibold
                text-[hsl(var(--foreground))]
              "
            >
              Edit this place
            </h3>

            <p
              className="
                mt-1 text-[13px]
                text-[hsl(var(--muted-foreground))]
              "
            >
              Update how this place sits in your family's story.
            </p>
          </div>
        </div>

        {/* BODY */}
        <div className="p-5 space-y-6 overflow-y-auto migration-person-list">
          {/* CATEGORY */}
          <div>
            <h4
              className="
                mb-1 text-[13px]
                font-semibold
                text-[hsl(var(--foreground))]
              "
            >
              Category
            </h4>

            <p
              className="
                mb-3 text-[12px]
                text-[hsl(var(--muted-foreground))]
              "
            >
              The selected tag decides how this place is grouped.
            </p>

            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelected(tag)}
                  className={[
                    `
                      rounded-full border
                      px-3 py-1.5
                      text-[12px]
                      transition-all duration-200
                    `,
                    selected === tag
                      ? `
                        border-[hsl(var(--primary))]
                        bg-[hsl(var(--primary))]
                        text-[hsl(var(--primary-foreground))]
                        shadow-sm
                      `
                      : `
                        border-[hsl(var(--border))]
                        bg-[hsl(var(--background))]
                        text-[hsl(var(--muted-foreground))]
                        hover:bg-[hsl(var(--muted))]
                      `,
                  ].join(" ")}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* FAMILY MAIN */}
          <div>
            <h4
              className="
                mb-1 text-[13px]
                font-semibold
                text-[hsl(var(--foreground))]
              "
            >
              Family main
            </h4>

            <p
              className="
                mb-3 text-[12px]
                text-[hsl(var(--muted-foreground))]
              "
            >
              Mark this as your family's primary place of worship.
            </p>

            <button
              onClick={() => setFamilyMain((v) => !v)}
              className={[
                `
                  flex w-full items-center
                  justify-between
                  rounded-xl border
                  px-4 py-3
                  transition-all duration-200
                `,
                familyMain
                  ? `
                    border-[hsl(var(--primary))]/40
                    bg-[hsl(var(--primary))]/10
                    text-[hsl(var(--foreground))]
                  `
                  : `
                    border-[hsl(var(--border))]
                    bg-[hsl(var(--background))]
                    text-[hsl(var(--muted-foreground))]
                    hover:bg-[hsl(var(--muted))]
                  `,
              ].join(" ")}
            >
              <span
                className="
                  flex items-center gap-2
                  text-[13px]
                  font-medium
                "
              >
                <Star
                  className={[
                    `
                      h-4 w-4
                      transition-colors
                    `,
                    familyMain
                      ? `
                        fill-[hsl(var(--primary))]
                        text-[hsl(var(--primary))]
                      `
                      : `
                        text-[hsl(var(--primary))]
                      `,
                  ].join(" ")}
                />
                Set as family main place
              </span>

              {/* Toggle */}
              <span
                className={[
                  `
                    relative inline-flex
                    h-5 w-9
                    items-center
                    rounded-full
                    transition-colors
                  `,
                  familyMain
                    ? `
                      bg-[hsl(var(--primary))]
                    `
                    : `
                      bg-[hsl(var(--border))]
                    `,
                ].join(" ")}
              >
                <span
                  className={[
                    `
                      inline-block
                      h-4 w-4 rounded-full
                      bg-white
                      shadow transition-transform
                    `,
                    familyMain ? "translate-x-4" : "translate-x-0.5",
                  ].join(" ")}
                />
              </span>
            </button>
          </div>

          {/* REFRESH */}
          <div>
            <h4
              className="
                mb-1 text-[13px]
                font-semibold
                text-[hsl(var(--foreground))]
              "
            >
              Refresh details
            </h4>

            <p
              className="
                mb-2 text-[12px]
                text-[hsl(var(--muted-foreground))]
              "
            >
              Pull the latest photo, timings, and AI-curated story.
            </p>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="
                inline-flex items-center gap-2
                rounded-full
                bg-[hsl(var(--primary))]
                px-4 py-2
                text-[12px]
                text-[hsl(var(--primary-foreground))]
                transition-all duration-200
                hover:opacity-90
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}

              {refreshing
                ? "Refreshing…"
                : "Refresh details from latest sources"}
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div
          className="
            flex shrink-0 gap-3
            border-t border-[hsl(var(--border))]
            p-5
          "
        >
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="
              flex-1
              border-[hsl(var(--border))]
              bg-[hsl(var(--background))]
              text-[hsl(var(--foreground))]
              hover:bg-[hsl(var(--muted))]
            "
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="
              flex-1
              bg-[hsl(var(--primary))]
              text-[hsl(var(--primary-foreground))]
              hover:opacity-90
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// import { useState, useEffect } from "react";
// import {
//   Dialog,
//   ResponsiveDialogContent as DialogContent,
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Loader2, RefreshCw, Star } from "lucide-react";
// import { useToast } from "@/components/ui/use-toast";
// import { updateInstitutionTag } from "@/services/institutionService";
// import type { InstitutionTag } from "@/types";

// const TAGS: InstitutionTag[] = [
//   "Regular",
//   "Ancestral",
//   "Pilgrimage",
//   "Community",
// ];

// interface Props {
//   isOpen: boolean;
//   onClose: () => void;
//   institutionId: string;
//   currentTag?: InstitutionTag;
//   currentFamilyMain?: boolean;
//   onUpdated: (tag: InstitutionTag, familyMain: boolean) => void;
//   onRefreshDetails?: () => Promise<void>; // ← added
// }

// export function EditInstitutionModal({
//   isOpen,
//   onClose,
//   institutionId,
//   currentTag,
//   currentFamilyMain = false,
//   onUpdated,
//   onRefreshDetails, // ← added
// }: Props) {
//   const { toast } = useToast();
//   const [selected, setSelected] = useState<InstitutionTag>("Regular");
//   const [familyMain, setFamilyMain] = useState(false);
//   const [notes, setNotes] = useState("");
//   const [saving, setSaving] = useState(false);
//   const [refreshing, setRefreshing] = useState(false); // ← added

//   const [initialTag, setInitialTag] = useState<InstitutionTag>("Regular");
//   const [initialFamilyMain, setInitialFamilyMain] = useState(false);

//   useEffect(() => {
//     if (isOpen) {
//       const tag = currentTag ?? "Regular";
//       setSelected(tag);
//       setInitialTag(tag);
//       setFamilyMain(currentFamilyMain);
//       setInitialFamilyMain(currentFamilyMain);
//       setNotes("");
//     }
//   }, [isOpen, currentTag, currentFamilyMain]);

//   const hasChanges =
//     selected !== initialTag ||
//     familyMain !== initialFamilyMain ||
//     notes.trim().length > 0;

//   const handleSave = async () => {
//     setSaving(true);
//     try {
//       await updateInstitutionTag(institutionId, {
//         tag: selected,
//         family_main: familyMain,
//       });
//       onUpdated(selected, familyMain);
//       toast({ title: "Tag updated" });
//       onClose();
//     } catch (err: any) {
//       const message =
//         err?.response?.data?.message ?? err?.message ?? "Failed to update";
//       toast({
//         title: "Failed to update",
//         description: message,
//         variant: "destructive",
//       });
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ← added
//   const handleRefresh = async () => {
//     if (!onRefreshDetails) return;
//     setRefreshing(true);
//     try {
//       await onRefreshDetails();
//       toast({ title: "Details refreshed successfully" });
//       onClose(); // ← added
//     } catch {
//       toast({ title: "Failed to refresh details", variant: "destructive" });
//     } finally {
//       setRefreshing(false);
//     }
//   };

//   return (
//     <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
//       <DialogContent className="max-w-lg max-h-[85vh] bg-[#F5F1EA] border border-[#E6DED2] text-[#3E2F25] rounded-2xl p-0 overflow-hidden flex flex-col shadow-xl">
//         {/* HEADER */}
//         <div className="flex-shrink-0 flex justify-between items-start p-5 border-b border-[#E6DED2]">
//           <div>
//             <h3 className="text-[18px] font-semibold text-[#3E2F25]">
//               Edit this place
//             </h3>
//             <p className="text-[13px] text-[#8A7B6A] mt-1">
//               Update how this place sits in your family's story.
//             </p>
//           </div>
//         </div>

//         {/* BODY */}
//         <div className="p-5 space-y-6 overflow-y-auto migration-person-list">
//           {/* CATEGORY */}
//           <div>
//             <h4 className="text-[13px] font-semibold mb-1">Category</h4>
//             <p className="text-[12px] text-[#8A7B6A] mb-3">
//               The selected tag decides how this place is grouped.
//             </p>
//             <div className="flex flex-wrap gap-2">
//               {TAGS.map((tag) => (
//                 <button
//                   key={tag}
//                   onClick={() => setSelected(tag)}
//                   className={[
//                     "px-3 py-1.5 rounded-full text-[12px] border transition",
//                     selected === tag
//                       ? "bg-[#3E4A8A] text-white border-[#3E4A8A]"
//                       : "border-[#D6CBBE] text-[#6F5C4D] bg-white hover:bg-[#F0EAE2]",
//                   ].join(" ")}
//                 >
//                   {tag}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* FAMILY MAIN TOGGLE */}
//           <div>
//             <h4 className="text-[13px] font-semibold mb-1">Family main</h4>
//             <p className="text-[12px] text-[#8A7B6A] mb-3">
//               Mark this as your family's primary place of worship.
//             </p>
//             <button
//               onClick={() => setFamilyMain((v) => !v)}
//               className={[
//                 "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition",
//                 familyMain
//                   ? "bg-[#FDF6E3] border-[#C2A46D] text-[#7A5C1E]"
//                   : "bg-white border-[#D6CBBE] text-[#6F5C4D] hover:bg-[#F0EAE2]",
//               ].join(" ")}
//             >
//               <span className="flex items-center gap-2 text-[13px] font-medium">
//                 <Star
//                   className={[
//                     "w-4 h-4 transition",
//                     familyMain
//                       ? "fill-[#C2A46D] text-[#C2A46D]"
//                       : "text-[#C2A46D]",
//                   ].join(" ")}
//                 />
//                 Set as family main place
//               </span>
//               {/* pill toggle */}
//               <span
//                 className={[
//                   "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
//                   familyMain ? "bg-[#C2A46D]" : "bg-[#D6CBBE]",
//                 ].join(" ")}
//               >
//                 <span
//                   className={[
//                     "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
//                     familyMain ? "translate-x-4" : "translate-x-0.5",
//                   ].join(" ")}
//                 />
//               </span>
//             </button>
//           </div>

//           {/* NOTES */}
//           {/* <div>
//             <h4 className="text-[13px] font-semibold mb-1">Personal notes</h4>
//             <p className="text-[12px] text-[#8A7B6A] mb-2">
//               Something only your family would know.
//             </p>
//             <textarea
//               value={notes}
//               onChange={(e) => setNotes(e.target.value)}
//               placeholder="Add a note..."
//               className="w-full h-28 rounded-xl bg-white border border-[#D6CBBE] px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#3E4A8A]"
//             />
//           </div> */}

//           {/* REFRESH */}
//           <div>
//             <h4 className="text-[13px] font-semibold mb-1">Refresh details</h4>
//             <p className="text-[12px] text-[#8A7B6A] mb-2">
//               Pull the latest photo, timings, and AI-curated story.
//             </p>
//             {/* ← updated button */}
//             <button
//               onClick={handleRefresh}
//               disabled={refreshing}
//               className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#4B3725] text-white hover:bg-[#5A4330] text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               {refreshing ? (
//                 <Loader2 className="w-4 h-4 animate-spin" />
//               ) : (
//                 <RefreshCw className="w-4 h-4" />
//               )}
//               {refreshing
//                 ? "Refreshing…"
//                 : "Refresh details from latest sources"}
//             </button>
//           </div>
//         </div>

//         {/* FOOTER */}
//         <div className="flex-shrink-0 flex gap-3 p-5 border-t border-[#E6DED2]">
//           <Button
//             variant="outline"
//             onClick={onClose}
//             disabled={saving}
//             className="flex-1 border-[#D6CBBE] text-[#3E2F25] bg-white hover:bg-[#F0EAE2]"
//           >
//             Cancel
//           </Button>
//           <Button
//             onClick={handleSave}
//             disabled={saving || !hasChanges}
//             className="flex-1 bg-[#4B3725] hover:bg-[#5A4330] text-white disabled:opacity-40 disabled:cursor-not-allowed"
//           >
//             {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
//             Save
//           </Button>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }
