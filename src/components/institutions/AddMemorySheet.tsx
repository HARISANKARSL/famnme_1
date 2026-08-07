/**
 * AddMemorySheet
 *
 * Fully theme-token based version with proper dark/light mode support.
 * Replaces "Who can see this?" visibility dropdown with a searchable
 * person-tagging checkbox list sourced from the window API response.
 */

import { useState, useRef, useCallback, useEffect } from "react";

import {
  X,
  Image as ImageIcon,
  Calendar,
  Tag,
  Loader2,
  Search,
  User,
  ChevronDown,
} from "lucide-react";

import {
  useGenerateInstitutionMemoryUploadUrls,
  useAddInstitutionMemory,
} from "@/hooks/useInstitution";

import type { CreateMemoryPayload } from "@/services/institutionService";

import { useToast } from "@/components/ui/use-toast";
import { generateVideoThumbnail, compressImage } from "@/services/memoriesApiService";

// ── Person type from window API ──────────────────────────────────────────────

export interface WindowPerson {
  personId: string;
  firstName: string;
  lastName: string;
  gender?: string;
  isLiving?: boolean;
  isHomePerson?: boolean;
  photoThumbUrl?: string | null;
}

interface AddMemorySheetProps {
  institutionId: string;
  institutionName: string;
  /** Persons array from the window API response (data.persons) */
  persons?: WindowPerson[];
  onClose: () => void;
  onSaved: () => void;
}

const FESTIVAL_MAX_LENGTH = 50;
const TITLE_MAX_LENGTH = 50;
const DESCRIPTION_MAX_LENGTH = 300;
const RITUAL_MAX_LENGTH = 50;

export function AddMemorySheet({
  institutionId,
  institutionName,
  persons = [],
  onClose,
  onSaved,
}: AddMemorySheetProps) {
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<{ url: string; isVideo: boolean } | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [festival, setFestival] = useState("");
  const [ritual, setRitual] = useState("");
  const [dateTaken, setDateTaken] = useState("");
  const [personDropdownOpen, setPersonDropdownOpen] = useState(false);
  const [festivalError, setFestivalError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [ritualError, setRitualError] = useState("");

  // ── Person tagging state ─────────────────────────────────────────────────
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(
    new Set(),
  );
  const [personSearch, setPersonSearch] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (personDropdownOpen) {
      const timer = setTimeout(() => {
        dropdownPanelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [personDropdownOpen]);

  const { mutate: generateUploadUrls, loading: generatingUrls } =
    useGenerateInstitutionMemoryUploadUrls();

  const { mutate: addMemory, loading: addingMemory } =
    useAddInstitutionMemory();

  // ── Filtered person list ─────────────────────────────────────────────────

  const filteredPersons = persons.filter((p) => {
    const full = `${p.firstName} ${p.lastName}`.toLowerCase();
    return full.includes(personSearch.toLowerCase());
  });

  const allSelected =
    filteredPersons.length > 0 &&
    filteredPersons.every((p) => selectedPersonIds.has(p.personId));

  const someSelected = filteredPersons.some((p) =>
    selectedPersonIds.has(p.personId),
  );

  const togglePerson = useCallback((personId: string) => {
    setSelectedPersonIds((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.add(personId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedPersonIds((prev) => {
      const next = new Set(prev);

      if (allSelected) {
        filteredPersons.forEach((p) => next.delete(p.personId));
      } else {
        filteredPersons.forEach((p) => next.add(p.personId));
      }

      return next;
    });
  }, [allSelected, filteredPersons]);

  // ─────────────────────────────────────────────────────────────────────────
  // File change
  // ─────────────────────────────────────────────────────────────────────────

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
        "video/mp4"
      ];

      if (!allowedTypes.includes(f.type)) {
        toast({
          title: "Unsupported Format",
          description: "Please select a supported image (JPG, JPEG, PNG, WEBP) or video (MP4) file.",
          variant: "destructive",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      if (f.size > MAX_FILE_SIZE) {
        const fileSizeMB = (f.size / (1024 * 1024)).toFixed(1);
        toast({
          title: "File Too Large",
          description: `File size is ${fileSizeMB} MB. Only files of 100 MB or below are accepted.`,
          variant: "destructive",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      setFile(f);
      const url = URL.createObjectURL(f);
      setFilePreview({
        url,
        isVideo: f.type.startsWith("video/"),
      });
    },
    [toast],
  );

  const canSubmit =
    file !== null &&
    (title.trim().length > 0 || description.trim().length > 0) &&
    !festivalError &&
    !titleError &&
    !descriptionError &&
    !ritualError &&
    !saving;

  const validateFestival = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      return "";
    }

    if (trimmed.length > FESTIVAL_MAX_LENGTH) {
      return `Festival cannot exceed ${FESTIVAL_MAX_LENGTH} characters`;
    }

    if (!/^[a-zA-Z0-9\s&'()-]+$/.test(trimmed)) {
      return "Festival contains invalid characters";
    }

    return "";
  };

  const validateTextField = (
    value: string,
    maxLength: number,
    fieldName: string,
  ) => {
    const trimmed = value.trim();

    if (!trimmed) {
      return "";
    }

    if (trimmed.length > maxLength) {
      return `${fieldName} cannot exceed ${maxLength} characters`;
    }

    if (!/^[a-zA-Z0-9\s.,!?&'():-]+$/.test(trimmed)) {
      return `${fieldName} contains invalid characters`;
    }

    return "";
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    const festivalValidationError = validateFestival(festival);

    if (festivalValidationError) {
      setFestivalError(festivalValidationError);

      toast({
        title: "Invalid Festival",
        description: festivalValidationError,
        variant: "destructive",
      });

      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      let files: {
        key: string;
        fileName: string;
        fileType: string;
        fileSize: number;
        thumbnailKey?: string;
      }[] = [];

      // Generate upload URLs
      if (file) {
        const uploadRes = await generateUploadUrls({
          institutionId,
          files: [
            {
              fileName: file.name,
              fileType: file.type,
            },
          ],
        });

        if (!uploadRes?.data?.[0]) {
          throw new Error("Could not get upload URL");
        }

        const uploadItem = uploadRes.data[0];

        // Upload to S3
        const uploadRes2 = await fetch(uploadItem.uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadRes2.ok) {
          throw new Error("Could not upload file to storage");
        }

        let thumbnailKey: string | undefined = undefined;
        if (uploadItem.thumbnailUploadUrl) {
          let thumbBlob: Blob | null = null;
          if (file.type.startsWith("video/")) {
            thumbBlob = await generateVideoThumbnail(file);
          } else if (file.type.startsWith("image/")) {
            thumbBlob = await compressImage(file, 150_000);
          }

          if (thumbBlob) {
            const uploadThumbRes = await fetch(uploadItem.thumbnailUploadUrl, {
              method: "PUT",
              body: thumbBlob,
              headers: {
                "Content-Type": "image/webp",
              },
            });
            if (uploadThumbRes.ok) {
              thumbnailKey = uploadItem.thumbnailKey;
            }
          }
        }

        files = [
          {
            key: uploadItem.key,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            thumbnailKey,
          },
        ];
      }

      // Build taggedPeople from selected person IDs
      const taggedPeople = persons
        .filter((p) => selectedPersonIds.has(p.personId))
        .map((p) => ({
          id: p.personId,
          name: `${p.firstName} ${p.lastName}`.trim(),
        }));

      // Create memory
      const resolvedTitle = title.trim() || `Memory at ${institutionName}`;

      const payload: CreateMemoryPayload = {
        title: resolvedTitle,
        description: description.trim() || undefined,
        category: festival.trim() || undefined,
        dateTaken: dateTaken || undefined,
        place: ritual.trim() || undefined,
        files,
        taggedPeople,
      };

      const result = await addMemory({
        institutionId,
        payload,
      });

      if (result !== null) {
        toast({
          title: "Memory added",
          description: "Your memory has been successfully added.",
        });
        onSaved();
      } else {
        throw new Error("Could not save memory");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save memory";
      setErrorMsg(message);
      toast({
        title: "Failed to add memory",
        description: message,
        variant: "destructive",
      });
      setSaving(false);
    }
  }, [
    canSubmit,
    file,
    title,
    description,
    festival,
    ritual,
    dateTaken,
    selectedPersonIds,
    persons,
    institutionId,
    institutionName,
    generateUploadUrls,
    addMemory,
    onSaved,
    toast,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="
        fixed inset-0 z-[60]
        flex items-end justify-center
        bg-black/50
        p-0
        backdrop-blur-sm
        md:items-center md:p-4
      "
    >
      <div
        className="
          flex max-h-[92vh] w-full flex-col
          overflow-hidden
          rounded-t-3xl
          border border-[hsl(var(--border))]
          bg-[hsl(var(--card))]
          shadow-2xl
          md:max-h-[85vh]
          md:max-w-lg
          md:rounded-2xl
        "
      >
        {/* HEADER */}
        <div
          className="
            flex shrink-0 items-center
            justify-between
            border-b border-[hsl(var(--border))]
            px-5 py-4
          "
        >
          <div className="min-w-0">
            <h3
              className="
                text-[15px]
                font-semibold
                leading-tight
                text-[hsl(var(--foreground))]
              "
            >
              Add a memory
            </h3>

            <p
              className="
                truncate text-[11px]
                text-[hsl(var(--muted-foreground))]
              "
            >
              at {institutionName}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="
              flex min-h-[40px] min-w-[40px]
              items-center justify-center
              rounded-xl
              transition-colors
              hover:bg-[hsl(var(--muted))]
            "
          >
            <X className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-5 space-y-5">
            {/* Photo Upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,image/jpeg,.png,image/png,.webp,image/webp,.mp4,video/mp4"
                className="hidden"
                onChange={handleFileChange}
              />

              {filePreview ? (
                <div className="relative overflow-hidden bg-black aspect-video rounded-xl">
                  {filePreview.isVideo ? (
                    <video
                      src={filePreview.url}
                      controls
                      className="object-contain w-full h-full"
                    />
                  ) : (
                    <img
                      src={filePreview.url}
                      alt="Preview"
                      className="object-contain w-full h-full"
                    />
                  )}
                  <button
                    aria-label="Remove media"
                    onClick={() => {
                      setFile(null);
                      setFilePreview(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="absolute flex items-center justify-center w-8 h-8 text-white rounded-full right-2 top-2 bg-black/60 backdrop-blur-sm z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="
                    flex h-32 w-full flex-col
                    items-center justify-center
                    gap-2 rounded-xl
                    border-2 border-dashed
                    border-[hsl(var(--primary))]/30
                    text-[hsl(var(--primary))]
                    transition-colors
                    hover:border-[hsl(var(--primary))]
                    hover:bg-[hsl(var(--primary))]/5
                  "
                >
                  <ImageIcon className="w-6 h-6" strokeWidth={1.8} />
                  <span className="text-[13px] font-medium">
                    Add a photo or video
                  </span>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                    Image (JPG, JPEG, PNG, WEBP), Video (MP4) (Max 100MB)
                  </span>
                </button>
              )}
            </div>

            {/* Title */}
            <div>
              <InputField
                label="Title"
                value={title}
                onChange={(value) => {
                  setTitle(value);

                  const error = validateTextField(
                    value,
                    TITLE_MAX_LENGTH,
                    "Title",
                  );

                  setTitleError(error);
                }}
                placeholder={`e.g. Celebration at ${institutionName}`}
                maxLength={TITLE_MAX_LENGTH}
              />

              {titleError && (
                <p className="mt-1 text-xs text-red-500">{titleError}</p>
              )}

              <p className="mt-1 text-right text-[11px] text-[hsl(var(--muted-foreground))]">
                {title.length}/{TITLE_MAX_LENGTH}
              </p>
            </div>

            {/* Description */}
            <div>
              <label
                className="
                  mb-1.5 block
                  text-[11px]
                  font-semibold uppercase
                  tracking-wide
                  text-[hsl(var(--muted-foreground))]
                "
              >
                What happened?
              </label>

              <textarea
                rows={3}
                value={description}
                maxLength={DESCRIPTION_MAX_LENGTH}
                onChange={(e) => {
                  const value = e.target.value;

                  setDescription(value);

                  const error = validateTextField(
                    value,
                    DESCRIPTION_MAX_LENGTH,
                    "Description",
                  );

                  setDescriptionError(error);
                }}
                placeholder="A few lines about this visit or moment…"
                className="
                  w-full resize-none
                  rounded-xl
                  border border-[hsl(var(--border))]
                  bg-[hsl(var(--background))]
                  px-3 py-2.5
                  text-[13px]
                  text-[hsl(var(--foreground))]
                  outline-none
                  transition-colors
                  focus:ring-2
                  focus:ring-[hsl(var(--primary))]/30
                "
              />
              {descriptionError && (
                <p className="mt-1 text-xs text-red-500">{descriptionError}</p>
              )}

              <p className="mt-1 text-right text-[11px] text-[hsl(var(--muted-foreground))]">
                {description.length}/{DESCRIPTION_MAX_LENGTH}
              </p>
            </div>

            {/* Festival + Date */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* Festival */}
              <div>
                <label
                  className="
                    mb-1.5 flex items-center gap-1.5
                    text-[11px]
                    font-semibold uppercase
                    tracking-wide
                    text-[hsl(var(--muted-foreground))]
                  "
                >
                  <Tag className="w-3 h-3" />
                  Festival
                </label>

                <InputBox
                  maxLength={FESTIVAL_MAX_LENGTH}
                  value={festival}
                  onChange={(value) => {
                    const normalized = value.replace(/\s+/g, " ");

                    setFestival(normalized);

                    const error = validateFestival(normalized);
                    setFestivalError(error);
                  }}
                  placeholder="e.g. Diwali"
                />

                {festivalError && (
                  <p className="mt-1 text-xs text-red-500">{festivalError}</p>
                )}

                <p className="mt-1 text-right text-[11px] text-[hsl(var(--muted-foreground))]">
                  {festival.length}/{FESTIVAL_MAX_LENGTH}
                </p>
              </div>

              {/* Date */}
              <div>
                <label
                  className="
                    mb-1.5 flex items-center gap-1.5
                    text-[11px]
                    font-semibold uppercase
                    tracking-wide
                    text-[hsl(var(--muted-foreground))]
                  "
                >
                  <Calendar className="w-3 h-3" />
                  Date
                </label>

                <input
                  type="date"
                  value={dateTaken}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDateTaken(e.target.value)}
                  className="
                    h-11 w-full rounded-xl
                    border border-[hsl(var(--border))]
                    bg-[hsl(var(--background))]
                    px-3
                    text-[13px]
                    text-[hsl(var(--foreground))]
                    outline-none
                    transition-colors
                    focus:ring-2
                    focus:ring-[hsl(var(--primary))]/30
                  "
                />
              </div>
            </div>

            {/* Ritual */}
            <div>
              <label
                className="
                  mb-1.5 block
                  text-[11px]
                  font-semibold uppercase
                  tracking-wide
                  text-[hsl(var(--muted-foreground))]
                "
              >
                Ritual (optional)
              </label>

              <InputBox
                value={ritual}
                maxLength={RITUAL_MAX_LENGTH}
                onChange={(value) => {
                  setRitual(value);

                  const error = validateTextField(
                    value,
                    RITUAL_MAX_LENGTH,
                    "Ritual",
                  );

                  setRitualError(error);
                }}
                placeholder="e.g. Darshan, Abhisheka"
              />

              {ritualError && (
                <p className="mt-1 text-xs text-red-500">{ritualError}</p>
              )}

              <p className="mt-1 text-right text-[11px] text-[hsl(var(--muted-foreground))]">
                {ritual.length}/{RITUAL_MAX_LENGTH}
              </p>
            </div>

            {/* ── Tag people ───────────────────────────────────────────── */}
            {persons.length > 0 && (
              <div>
                <label
                  className="
        mb-1.5 block
        text-[11px]
        font-semibold uppercase
        tracking-wide
        text-[hsl(var(--muted-foreground))]
      "
                >
                  Tag people in this memory
                  {selectedPersonIds.size > 0 && (
                    <span className="ml-1.5 normal-case font-normal text-[hsl(var(--primary))]">
                      ({selectedPersonIds.size} selected)
                    </span>
                  )}
                </label>

                {/* Dropdown trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPersonDropdownOpen((v) => !v)}
                    className="
          h-11 w-full rounded-xl
          border border-[hsl(var(--border))]
          bg-[hsl(var(--background))]
          px-3
          flex items-center justify-between
          text-[13px]
          text-[hsl(var(--foreground))]
          transition-colors
          hover:bg-[hsl(var(--muted))]
        "
                  >
                    <span
                      className={
                        selectedPersonIds.size === 0
                          ? "text-[hsl(var(--muted-foreground))]"
                          : ""
                      }
                    >
                      {selectedPersonIds.size === 0
                        ? "Select people..."
                        : `${selectedPersonIds.size} people selected`}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-[hsl(var(--muted-foreground))] transition-transform ${personDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Dropdown panel */}
                  {personDropdownOpen && (
                    <div
                      ref={dropdownPanelRef}
                      className="
            absolute left-0 right-0 top-[calc(100%+4px)]
            z-10
            rounded-xl
            border border-[hsl(var(--border))]
            bg-[hsl(var(--background))]
            shadow-lg
            overflow-hidden
          "
                    >
                      {/* Search — only if list is long */}
                      {persons.length > 4 && (
                        <div className="relative border-b border-[hsl(var(--border))] p-2">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                          <input
                            type="text"
                            value={personSearch}
                            onChange={(e) => setPersonSearch(e.target.value)}
                            placeholder="Search people…"
                            className="
                  h-8 w-full rounded-lg
                  bg-[hsl(var(--muted))]
                  pl-8 pr-3
                  text-[13px]
                  text-[hsl(var(--foreground))]
                  outline-none
                  placeholder:text-[hsl(var(--muted-foreground))]
                "
                          />
                        </div>
                      )}

                      {filteredPersons.length > 0 && (
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="
      w-full
      flex items-center gap-3
      px-4 py-2.5
      border-b border-[hsl(var(--border))]
      hover:bg-[hsl(var(--muted))]
      transition-colors
    "
                        >
                          <div
                            className={`
        flex-shrink-0 w-5 h-5 rounded
        border-2 flex items-center justify-center
        ${allSelected
                                ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))]"
                                : "border-[hsl(var(--border))]"
                              }
      `}
                          >
                            {allSelected && (
                              <svg
                                viewBox="0 0 10 8"
                                fill="none"
                                className="w-3 h-3"
                              >
                                <path
                                  d="M1 4l2.5 2.5L9 1"
                                  stroke="white"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>

                          <span className="flex-1 text-left text-[13px] font-medium">
                            {allSelected ? "Unselect All" : "Select All"}
                          </span>
                        </button>
                      )}

                      {/* Scrollable list — max 3 rows visible */}
                      <div className="max-h-[168px] overflow-y-auto">
                        {filteredPersons.length === 0 ? (
                          <p className="px-4 py-3 text-[13px] text-[hsl(var(--muted-foreground))]">
                            No people found
                          </p>
                        ) : (
                          filteredPersons.map((person, idx) => {
                            const isChecked = selectedPersonIds.has(
                              person.personId,
                            );
                            const initials =
                              `${person.firstName?.[0] ?? ""}${person.lastName?.[0] ?? ""}`.toUpperCase();
                            const isLast = idx === filteredPersons.length - 1;

                            return (
                              <div
                                key={person.personId}
                                onClick={() => togglePerson(person.personId)}
                                className={`
    flex items-center gap-3
    px-4 py-2.5
    cursor-pointer
    transition-colors
    hover:bg-[hsl(var(--muted))]
    ${isChecked ? "bg-[hsl(var(--primary))]/5" : ""}
    ${!isLast ? "border-b border-[hsl(var(--border))]" : ""}
  `}
                              >
                                {/* Custom checkbox */}
                                <div
                                  className={`
                        flex-shrink-0 w-5 h-5 rounded
                        border-2 flex items-center justify-center
                        transition-colors
                        ${isChecked
                                      ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))]"
                                      : "border-[hsl(var(--border))] bg-transparent"
                                    }
                      `}
                                >
                                  {isChecked && (
                                    <svg
                                      viewBox="0 0 10 8"
                                      fill="none"
                                      className="w-3 h-3"
                                    >
                                      <path
                                        d="M1 4l2.5 2.5L9 1"
                                        stroke="white"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  )}
                                </div>

                                {/* Avatar */}
                                {person.photoThumbUrl ? (
                                  <img
                                    src={person.photoThumbUrl}
                                    alt={person.firstName}
                                    className="flex-shrink-0 object-cover w-8 h-8 rounded-full"
                                  />
                                ) : (
                                  <div
                                    className="
                          w-8 h-8 rounded-full flex-shrink-0
                          flex items-center justify-center
                          bg-[hsl(var(--primary))]/15
                          text-[hsl(var(--primary))]
                          text-[12px] font-semibold
                        "
                                  >
                                    {initials || <User className="w-4 h-4" />}
                                  </div>
                                )}

                                {/* Name */}
                                <span className="text-[13px] text-[hsl(var(--foreground))] flex-1 min-w-0 truncate">
                                  {person.firstName} {person.lastName}
                                </span>

                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  readOnly
                                  className="sr-only"
                                />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {errorMsg && (
              <div
                className="
                  rounded-lg
                  border border-red-500/20
                  bg-red-500/10
                  px-3 py-2
                  text-[12px]
                  text-red-500
                "
              >
                {errorMsg}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div
          className="
            flex shrink-0 items-center gap-3
            border-t border-[hsl(var(--border))]
            px-5 py-3
          "
        >
          <button
            onClick={onClose}
            disabled={saving || generatingUrls || addingMemory}
            className="
              h-11 flex-1 rounded-xl
              border border-[hsl(var(--border))]
              bg-[hsl(var(--background))]
              text-[13px]
              font-medium
              text-[hsl(var(--foreground))]
              transition-colors
              hover:bg-[hsl(var(--muted))]
              disabled:opacity-50
            "
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || generatingUrls || addingMemory}
            className="
              inline-flex h-11 flex-1
              items-center justify-center gap-1.5
              rounded-xl
              bg-[hsl(var(--primary))]
              text-[13px]
              font-semibold
              text-[hsl(var(--primary-foreground))]
              transition-all duration-200
              hover:opacity-90
              disabled:opacity-50
            "
          >
            {saving || generatingUrls || addingMemory ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}

            {saving || generatingUrls || addingMemory
              ? "Saving…"
              : "Share memory"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* Shared Components */
/* ───────────────────────────────────────────── */

function InputField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label
        className="
          mb-1.5 block
          text-[11px]
          font-semibold uppercase
          tracking-wide
          text-[hsl(var(--muted-foreground))]
        "
      >
        {label}
      </label>

      <InputBox
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </div>
  );
}

function InputBox({
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <input
      type="text"
      value={value}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="
        h-11 w-full rounded-xl
        border border-[hsl(var(--border))]
        bg-[hsl(var(--background))]
        px-3
        text-[13px]
        text-[hsl(var(--foreground))]
        outline-none
        transition-colors
        focus:ring-2
        focus:ring-[hsl(var(--primary))]/30
      "
    />
  );
}

// /**
//  * AddMemorySheet — bottom-sheet-style modal for adding a memory to a specific
//  * institution. Uploads optional photos directly to S3 via presigned URLs,
//  * collects metadata (title, description, festival, ritual), and creates the memory.
//  *
//  * Reuses:
//  *   - useGenerateInstitutionMemoryUploadUrls → get presigned S3 URLs
//  *   - useAddInstitutionMemory → create memory with vault confirm and mediaFiles
//  */

// import { useState, useRef, useCallback } from 'react'
// import { X, Image as ImageIcon, Calendar, Tag, Loader2 } from 'lucide-react'
// import { useGenerateInstitutionMemoryUploadUrls, useAddInstitutionMemory } from '@/hooks/useInstitution'
// import type { CreateMemoryPayload } from '@/services/institutionService'
// import { useToast } from '@/components/ui/use-toast'

// interface AddMemorySheetProps {
//   institutionId: string
//   institutionName: string
//   onClose: () => void
//   onSaved: () => void
// }

// export function AddMemorySheet({ institutionId, institutionName, onClose, onSaved }: AddMemorySheetProps) {  const { toast } = useToast();  const [file, setFile] = useState<File | null>(null)
//   const [filePreview, setFilePreview] = useState<string | null>(null)
//   const [title, setTitle] = useState('')
//   const [description, setDescription] = useState('')
//   const [festival, setFestival] = useState('')
//   const [ritual, setRitual] = useState('')
//   const [dateTaken, setDateTaken] = useState('')
//   const [visibility, setVisibility] = useState<'everyone_in_tree' | 'only_me' | 'close_family'>('everyone_in_tree')
//   const [saving, setSaving] = useState(false)
//   const [errorMsg, setErrorMsg] = useState<string | null>(null)

//   const fileInputRef = useRef<HTMLInputElement>(null)

//   const { mutate: generateUploadUrls, loading: generatingUrls } = useGenerateInstitutionMemoryUploadUrls()
//   const { mutate: addMemory, loading: addingMemory } = useAddInstitutionMemory()

//   const festivalSuggestions = ['Diwali', 'Holi', 'Navaratri', 'Pongal', 'Ugadi', 'Ganesh Chaturthi', 'Christmas', 'Easter', 'Eid al-Fitr']
//   const ritualSuggestions = ['Darshan', 'Abhisheka', 'Archana', 'Havan', 'Aarti', 'Prasad', 'Prayer', 'Namaz']

//   const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
//     const f = e.target.files?.[0]
//     if (!f) return
//     setFile(f)
//     if (f.type.startsWith('image/')) {
//       const url = URL.createObjectURL(f)
//       setFilePreview(url)
//     } else {
//       setFilePreview(null)
//     }
//   }, [])

//   const canSubmit = (title.trim().length > 0 || description.trim().length > 0) && !saving

//   const handleSubmit = useCallback(async () => {
//     if (!canSubmit) return
//     setSaving(true)
//     setErrorMsg(null)
//     try {
//       let files: { key: string; fileName: string; fileType: string; fileSize: number }[] = []

//       // Step 1: Generate upload URLs if there's a file
//       if (file) {
//         const uploadRes = await generateUploadUrls({
//           institutionId,
//           files: [
//             {
//               fileName: file.name,
//               fileType: file.type,
//             },
//           ],
//         })

//         if (!uploadRes?.data?.[0]) {
//           throw new Error('Could not get upload URL')
//         }

//         const uploadItem = uploadRes.data[0]

//         // Step 2: Upload file directly to S3 using presigned URL
//         const uploadRes2 = await fetch(uploadItem.uploadUrl, {
//           method: 'PUT',
//           body: file,
//           headers: {
//             'Content-Type': file.type,
//           },
//         })

//         if (!uploadRes2.ok) {
//           throw new Error('Could not upload file to storage')
//         }

//         files = [{ key: uploadItem.key, fileName: file.name, fileType: file.type, fileSize: file.size }]
//       }

//       // Step 3: Create memory with exact API payload
//       const resolvedTitle = title.trim() || `Memory at ${institutionName}`

//       const payload: CreateMemoryPayload = {
//         title: resolvedTitle,
//         description: description.trim() || undefined,
//         category: festival.trim() || undefined,
//         dateTaken: dateTaken || undefined,
//         place: ritual.trim() || undefined,
//         files,
//         taggedPeople: [],
//       }

//       const result = await addMemory({ institutionId, payload })

//       if (result !== null) {
//         toast({
//           title: "Memory added",
//           description: "Your memory has been successfully added.",
//         });
//         onSaved()
//       } else {
//         throw new Error('Could not save memory')
//       }
//     } catch (err) {
//       const message = err instanceof Error ? err.message : 'Could not save memory'
//       setErrorMsg(message)
//       toast({
//         title: "Failed to add memory",
//         description: message,
//         variant: "destructive",
//       });
//       setSaving(false)
//     }
//   }, [canSubmit, file, title, description, festival, ritual, dateTaken, visibility, institutionId, institutionName, generateUploadUrls, addMemory, onSaved, toast])

//   return (
//     <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4">
//       <div className="w-full md:max-w-lg max-h-[92vh] md:max-h-[85vh] bg-white dark:bg-[#1A1A1A] rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">

//         {/* Header */}
//         <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-[#E2DBCE]/60 dark:border-[#2A2A2A]">
//           <div className="min-w-0">
//             <h3 className="text-[15px] font-semibold text-[#3D2E1F] dark:text-[#F5F5F5] leading-tight">Add a memory</h3>
//             <p className="text-[11px] text-[#8B7355] dark:text-[#A19F9D] truncate">at {institutionName}</p>
//           </div>
//           <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 min-w-[40px] min-h-[40px] flex items-center justify-center" aria-label="Close">
//             <X className="w-4 h-4 text-[#8B7355]" />
//           </button>
//         </div>

//         {/* Body */}
//         <div className="flex-1 overflow-y-auto">
//           <div className="p-5 space-y-5">

//             {/* Photo upload */}
//             <div>
//               <input
//                 ref={fileInputRef}
//                 type="file"
//                 accept="image/*,video/*"
//                 className="hidden"
//                 onChange={handleFileChange}
//               />
//               {filePreview ? (
//                 <div className="relative overflow-hidden bg-black rounded-xl aspect-video">
//                   <img src={filePreview} alt="Preview" className="object-contain w-full h-full" />
//                   <button
//                     onClick={() => { setFile(null); setFilePreview(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
//                     className="absolute flex items-center justify-center w-8 h-8 text-white rounded-full top-2 right-2 bg-black/60 backdrop-blur-sm"
//                     aria-label="Remove photo"
//                   >
//                     <X className="w-4 h-4" />
//                   </button>
//                 </div>
//               ) : (
//                 <button
//                   onClick={() => fileInputRef.current?.click()}
//                   className="w-full h-32 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#2F3E8F]/30 hover:border-[#2F3E8F] hover:bg-[#2F3E8F]/[0.03] text-[#2F3E8F] transition-colors"
//                 >
//                   <ImageIcon className="w-6 h-6" strokeWidth={1.8} />
//                   <span className="text-[13px] font-medium">Add a photo or video</span>
//                   <span className="text-[11px] text-[#8B7355]">Optional</span>
//                 </button>
//               )}
//             </div>

//             {/* Title + description */}
//             <div>
//               <label className="block text-[11px] font-semibold text-[#8B7355] uppercase tracking-wide mb-1.5">Title</label>
//               <input
//                 type="text"
//                 value={title}
//                 onChange={e => setTitle(e.target.value)}
//                 placeholder={`e.g. Diwali at ${institutionName}`}
//                 className="w-full h-11 md:h-10 px-3 rounded-xl border border-[#E2DBCE] dark:border-[#2A2A2A] bg-white dark:bg-[#1E1E1E] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30"
//               />
//             </div>

//             <div>
//               <label className="block text-[11px] font-semibold text-[#8B7355] uppercase tracking-wide mb-1.5">What happened?</label>
//               <textarea
//                 value={description}
//                 onChange={e => setDescription(e.target.value)}
//                 placeholder="A few lines about this visit or moment…"
//                 rows={3}
//                 className="w-full px-3 py-2.5 rounded-xl border border-[#E2DBCE] dark:border-[#2A2A2A] bg-white dark:bg-[#1E1E1E] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F5F5F5] resize-none focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30"
//               />
//             </div>

//             {/* Festival + date */}
//             <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
//               <div>
//                 <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8B7355] uppercase tracking-wide mb-1.5">
//                   <Tag className="w-3 h-3" /> Festival
//                 </label>
//                 <input
//                   type="text"
//                   value={festival}
//                   onChange={e => setFestival(e.target.value)}
//                   placeholder="e.g. Diwali"
//                   className="w-full h-11 md:h-10 px-3 rounded-xl border border-[#E2DBCE] dark:border-[#2A2A2A] bg-white dark:bg-[#1E1E1E] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30"
//                 />
//                 {festivalSuggestions.length > 0 && !festival && (
//                   <div className="flex flex-wrap gap-1.5 mt-2">
//                     {festivalSuggestions.slice(0, 6).map(f => (
//                       <button
//                         key={f}
//                         type="button"
//                         onClick={() => setFestival(f)}
//                         className="px-2.5 py-1 rounded-full text-[11px] bg-[#F2F4FB] dark:bg-[#252A3D] text-[#2F3E8F] hover:bg-[#2F3E8F]/10"
//                       >
//                         {f}
//                       </button>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               <div>
//                 <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8B7355] uppercase tracking-wide mb-1.5">
//                   <Calendar className="w-3 h-3" /> Date
//                 </label>
//                 <input
//                   type="date"
//                   value={dateTaken}
//                   onChange={e => setDateTaken(e.target.value)}
//                   max={new Date().toISOString().slice(0, 10)}
//                   className="w-full h-11 md:h-10 px-3 rounded-xl border border-[#E2DBCE] dark:border-[#2A2A2A] bg-white dark:bg-[#1E1E1E] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30"
//                 />
//               </div>
//             </div>

//             {/* Ritual */}
//             <div>
//               <label className="block text-[11px] font-semibold text-[#8B7355] uppercase tracking-wide mb-1.5">Ritual (optional)</label>
//               <input
//                 type="text"
//                 value={ritual}
//                 onChange={e => setRitual(e.target.value)}
//                 placeholder="e.g. Darshan, Abhisheka"
//                 className="w-full h-11 md:h-10 px-3 rounded-xl border border-[#E2DBCE] dark:border-[#2A2A2A] bg-white dark:bg-[#1E1E1E] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30"
//               />
//               {ritualSuggestions.length > 0 && !ritual && (
//                 <div className="flex flex-wrap gap-1.5 mt-2">
//                   {ritualSuggestions.map(r => (
//                     <button
//                       key={r}
//                       type="button"
//                       onClick={() => setRitual(r)}
//                       className="px-2.5 py-1 rounded-full text-[11px] bg-[#F2F4FB] dark:bg-[#252A3D] text-[#2F3E8F] hover:bg-[#2F3E8F]/10"
//                     >
//                       {r}
//                     </button>
//                   ))}
//                 </div>
//               )}
//             </div>

//             {/* Visibility */}
//             <div>
//               <label className="block text-[11px] font-semibold text-[#8B7355] uppercase tracking-wide mb-1.5">Who can see this?</label>
//               <select
//                 value={visibility}
//                 onChange={e => setVisibility(e.target.value as 'everyone_in_tree' | 'only_me' | 'close_family')}
//                 className="w-full h-11 md:h-10 px-3 rounded-xl border border-[#E2DBCE] dark:border-[#2A2A2A] bg-white dark:bg-[#1E1E1E] text-base md:text-[13px] text-[#3D2E1F] dark:text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#2F3E8F]/30"
//               >
//                 <option value="only_me">Only me</option>
//                 <option value="close_family">Close family</option>
//                 <option value="everyone_in_tree">Everyone in this tree</option>
//               </select>
//             </div>

//             {errorMsg && (
//               <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-[12px]">
//                 {errorMsg}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Footer */}
//         <div className="shrink-0 px-5 py-3 border-t border-[#E2DBCE]/60 dark:border-[#2A2A2A] flex items-center gap-3">
//           <button
//             onClick={onClose}
//             disabled={saving || generatingUrls || addingMemory}
//             className="flex-1 h-11 md:h-10 rounded-xl border border-[#E2DBCE] dark:border-[#2A2A2A] text-[13px] font-medium text-[#3D2E1F] dark:text-[#F5F5F5] hover:bg-[#F6F2EA] dark:hover:bg-[#252525] disabled:opacity-50"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleSubmit}
//             disabled={!canSubmit || generatingUrls || addingMemory}
//             className="flex-1 h-11 md:h-10 rounded-xl bg-[#2F3E8F] hover:bg-[#25327A] disabled:opacity-50 text-white text-[13px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
//           >
//             {(saving || generatingUrls || addingMemory) ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
//             {saving || generatingUrls || addingMemory ? 'Saving…' : 'Share memory'}
//           </button>
//         </div>
//       </div>
//     </div>
//   )
// }
