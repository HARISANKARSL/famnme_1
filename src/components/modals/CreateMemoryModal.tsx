/**
 * CreateMemoryModal - Multi-step modal for creating new memories
 *
 * Upload flow:
 *   Step 0 → Step 2 (upload files, mixed types, auto-detected)
 *          → Step 3 (story details: title, description, etc.)
 *          → Step 4 (per-file titles, pre-filled from story title)
 *          → Step 5 (tag people + submit)
 *
 * Text / prompt flow:
 *   Step 0 → Step 2 (write text)
 *          → Step 3 (story details)
 *          → Step 5 (tag people + submit)   [step 4 skipped]
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Camera, Video, Music, FileText, BookOpen, Upload, X, ChevronLeft, Loader2,
  Search, Lightbulb, ArrowRight, Gem, ScanLine, ChevronDown
} from 'lucide-react';
import * as exifr from 'exifr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { validateField, validateTextField, validateDescriptionField, VALIDATION_LIMITS } from '@/utils/validation';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generateAIDescription, enhanceAIDescription, getBulkPresignedUrls, uploadToS3, generateVideoThumbnail, compressImage, confirmMemories, uploadAICaption, uploadAIDescription, uploadAICeremony } from '@/services/memoriesApiService';
import { autocompletePlaces } from '@/services/placeApiService';
import { MEMORY_CATEGORY_GROUPS } from '@/constants/memoryCategories';
import { MEMORY_PROMPTS, PROMPT_CATEGORY_COLORS, getPromptCategories } from '@/data/memoryPrompts';
import type { MemoryPromptCategory } from '@/data/memoryPrompts';
import { resolveBackendUrl } from '@/config/api';
import type { MemoryType } from '@/types';
import type { Temple } from '@/data/temples/types';
import { useResponsive } from '@/hooks/useResponsive';
import { DateInput } from '@/components/ui/DateInput';
import { FamilyUploadLoader } from '../ui/FamilyUploadLoader';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: string;
  file: File;
  detectedType: MemoryType | 'document';
  title: string;       // per-file title; editable in step 4
  preview: string | null;
  exifDate: string | null; // YYYY-MM-DD extracted from photo EXIF, null if not found
  remoteUrl?: string;
  remoteThumbnailUrl?: string;
  remoteKey?: string;
  remoteThumbnailKey?: string;
  fileId?: string;
  isUploaded?: boolean;
}

interface CreateMemoryModalProps {
  open: boolean;
  onClose: () => void;
  treeId: string;
  persons: Array<{
    personId: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl?: string | null;
  }>;
  preSelectedPersonId?: string | null;
  onCreated: (albumId?: string) => void;
  initialTitle?: string;
  initialTextContent?: string;
  initialCategory?: string;
  initialDateTaken?: string;
  albumId?: string;
  titleMaxLength?: number;
  titleMinLength?: number;
  descriptionMaxLength?: number;
  descriptionMinLength?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_META: Record<MemoryType | 'document', { label: string; icon: typeof Camera; color: string; bg: string }> = {
  photo: { label: 'Photo', icon: Camera, color: 'text-[#2F3E8F]', bg: 'bg-[#E8EDFF] border-[#E8D5C4]' },
  video: { label: 'Video', icon: Video, color: 'text-purple-500', bg: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800' },
  audio: { label: 'Audio', icon: Music, color: 'text-blue-500', bg: 'bg-[#E8EDFF] border-[#2F3E8F]/30 dark:bg-blue-900/20 dark:border-blue-800' },
  text: { label: 'Text', icon: BookOpen, color: 'text-[#2F3E8F]', bg: 'bg-[#E8EDFF] border-[#E8D5C4]' },
  document: { label: 'Document', icon: FileText, color: 'text-[#C2A46D]', bg: 'bg-[#C2A46D]/10 border-[#C2A46D]/20 dark:bg-amber-950/20 dark:border-amber-900' },
};

function detectMemoryType(file: File): MemoryType | 'document' {
  const cleanName = file.name.toLowerCase();
  if (file.type.startsWith('video/') || cleanName.endsWith('.mp4')) return 'video';
  if (file.type.startsWith('audio/') || cleanName.endsWith('.mp3')) return 'audio';
  if (file.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|gif|webp)$/i.test(file.name)) return 'photo';

  const mime = file.type || '';
  if (
    mime.startsWith('application/pdf') ||
    mime.includes('word') ||
    mime.includes('excel') ||
    mime.includes('spreadsheet') ||
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    mime.startsWith('text/') ||
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt|rtf)$/i.test(cleanName)
  ) {
    return 'document';
  }

  return 'photo'; // fallback
}

function makeUploadedFile(file: File): UploadedFile {
  const detectedType = detectMemoryType(file);
  const isImage = file.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|gif|webp)$/i.test(file.name);
  return {
    id: Math.random().toString(36).slice(2),
    file,
    detectedType,
    title: '',
    preview: detectedType === 'photo' && isImage ? URL.createObjectURL(file) : null,
    exifDate: null,
  };
}

/**
 * Extracts the date the photo was taken from EXIF metadata.
 * Returns YYYY-MM-DD string, or null if not available.
 */
async function extractExifDate(file: File): Promise<string | null> {
  try {
    const tags = await exifr.parse(file, { pick: ['DateTimeOriginal', 'DateTime', 'CreateDate'] });
    if (!tags) return null;
    const raw: unknown = tags.DateTimeOriginal ?? tags.CreateDate ?? tags.DateTime;
    if (!raw) return null;
    // exifr returns a JS Date object for date fields
    const d = raw instanceof Date ? raw : new Date(raw as string);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return null;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function getTodayDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function TypeBadge({ type }: { type: MemoryType }) {
  const { label, icon: Icon, color, bg } = TYPE_META[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${bg} ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CreateMemoryModal({
  open,
  onClose,
  treeId,
  persons,
  preSelectedPersonId,
  onCreated,
  initialTitle,
  initialTextContent,
  initialCategory,
  initialDateTaken,
  albumId,
  titleMaxLength,
  titleMinLength,
  descriptionMaxLength,
  descriptionMinLength,
}: CreateMemoryModalProps) {
  const { isMobile } = useResponsive();
  const { toast } = useToast();

  const hasInitialPrompt = !!(initialTitle || initialTextContent);

  // step: 0=choose, 2=upload/text, 3=details, 4=per-file titles, 5=tag+submit
  const [step, setStep] = useState(hasInitialPrompt ? 2 : 0);
  const [isTextFlow, setIsTextFlow] = useState(hasInitialPrompt);

  // Upload flow state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const [dragOver, setDragOver] = useState(false);

  const [activePrompt, setActivePrompt] = useState<string | null>(() => {
    if (initialTextContent && initialTextContent.startsWith('## ')) {
      const firstLine = initialTextContent.split('\n')[0];
      return firstLine.substring(3).trim();
    }
    return null;
  });

  // Text flow state
  const [textContent, setTextContent] = useState(() => {
    if (initialTextContent && initialTextContent.startsWith('## ')) {
      const lines = initialTextContent.split('\n');
      return lines.slice(1).join('\n').trim();
    }
    return initialTextContent || '';
  });

  // Shared story metadata
  const [title, setTitle] = useState(initialTitle || '');
  const [description, setDescription] = useState('');
  const [dateTaken, setDateTaken] = useState(initialDateTaken || getTodayDateString());
  const [placeTaken, setPlaceTaken] = useState('');
  const [category, setCategory] = useState(initialCategory || '');
  const [selectedTemple, setSelectedTemple] = useState<Temple | null>(null);

  // Tag people
  const [taggedPersonIds, setTaggedPersonIds] = useState<string[]>(
    preSelectedPersonId ? [preSelectedPersonId] : []
  );
  const [personSearch, setPersonSearch] = useState('');

  // EXIF date detection
  const [isDateFromExif, setIsDateFromExif] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // AI description
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [aiCeremonyData, setAiCeremonyData] = useState<any>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryContainerRef = useRef<HTMLDivElement>(null);

  const formFileds = validateField(title, {
    name: 'Title',
    maxLength: titleMaxLength ?? 100,
    minLength: titleMinLength,
    required: true,
    noWhitespaceOnly: true,
  });
  const descVal = validateField(description, {
    name: 'Description',
    maxLength: descriptionMaxLength ?? VALIDATION_LIMITS.description,
    minLength: descriptionMinLength,
    noWhitespaceOnly: true,
  });

  // Also check per-file titles if any of them exceed the limit
  const hasInvalidFileTitle = uploadedFiles.some(f => !validateField(f.title, { maxLength: titleMaxLength ?? 100 }).isValid);

  const isFormInvalid = !formFileds.isValid || !descVal.isValid || hasInvalidFileTitle;

  // Place Autocomplete
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState<string[]>([]);
  const [showPlaceDropdown, setShowPlaceDropdown] = useState(false);
  const [isPlaceLoading, setIsPlaceLoading] = useState(false);
  const placeContainerRef = useRef<HTMLDivElement>(null);
  const placeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePlaceSearchChange = (val: string, immediate = false) => {
    setPlaceSearchQuery(val);

    if (placeTimeoutRef.current) {
      clearTimeout(placeTimeoutRef.current);
    }

    const triggerSearch = async () => {
      setIsPlaceLoading(true);
      try {
        const suggestions = await autocompletePlaces(val);
        // Sort results alphabetically (case-insensitive)
        const sorted = [...suggestions].sort((a, b) => a.localeCompare(b));
        setPlaceSuggestions(sorted);
      } catch (err) {
        console.error('Failed to search places:', err);
      } finally {
        setIsPlaceLoading(false);
      }
    };

    if (immediate) {
      void triggerSearch();
    } else {
      placeTimeoutRef.current = setTimeout(triggerSearch, 300);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryContainerRef.current && !categoryContainerRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (placeContainerRef.current && !placeContainerRef.current.contains(event.target as Node)) {
        setShowPlaceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Prompt browser
  const [promptFilter, setPromptFilter] = useState<MemoryPromptCategory | 'all'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Reset ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setStep(0);
    setIsTextFlow(false);
    setUploadedFiles([]);
    setDragOver(false);
    setTextContent('');
    setActivePrompt(null);
    setTitle('');
    setDescription('');
    setDateTaken(initialDateTaken || getTodayDateString());
    setPlaceTaken('');
    setPlaceSearchQuery('');
    setCategory('');
    setTaggedPersonIds(preSelectedPersonId ? [preSelectedPersonId] : []);
    setPersonSearch('');
    setIsDateFromExif(false);
    setSubmitting(false);
    setSubmitProgress('');
    setError(null);
    setSelectedTemple(null);
    setPromptFilter('all');
    setAiTags([]);
    setAiCeremonyData(null);
    setPlaceSuggestions([]);
    setShowPlaceDropdown(false);
    setIsPlaceLoading(false);
  }, [preSelectedPersonId, initialDateTaken]);

  const handleClose = () => { reset(); onClose(); };

  // Tag people
  useEffect(() => {
    if (!open || !treeId) return;
  }, [open, treeId]);

  // ── File handling ────────────────────────────────────────────────────────

  const addFiles = useCallback(async (fileList: File[]) => {
    setFileError(null);

    // Validate file types: support only JPG, PNG, WEBP, MP3, MP4, and PDF
    const isValidType = (file: File) => {
      const name = file.name.toLowerCase();
      const type = file.type.toLowerCase();
      const isMp3 = name.endsWith('.mp3') || type === 'audio/mpeg' || type === 'audio/mp3';
      const isMp4 = name.endsWith('.mp4') || type === 'video/mp4';
      const isPdf = name.endsWith('.pdf') || type === 'application/pdf';
      const isImage = (
        name.endsWith('.jpg') || name.endsWith('.jpeg') || type === 'image/jpeg' ||
        name.endsWith('.png') || type === 'image/png' ||
        name.endsWith('.webp') || type === 'image/webp'
      );
      return isMp3 || isMp4 || isPdf || isImage;
    };

    const hasInvalid = fileList.some(file => !isValidType(file));
    if (hasInvalid) {
      toast({
        title: 'Unsupported File Format',
        description: 'Only JPG, PNG, WEBP, MP3, MP4, and PDF files are supported.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file count: total files cannot exceed 5
    const remainingSlots = 5 - uploadedFiles.length;
    if (remainingSlots <= 0) {
      toast({
        title: 'File Limit Reached',
        description: 'You can upload a maximum of 5 files.',
        variant: 'destructive',
      });
      return;
    }

    let filesToAdd = fileList;
    let limitExceeded = false;
    if (fileList.length > remainingSlots) {
      filesToAdd = fileList.slice(0, remainingSlots);
      limitExceeded = true;
    }

    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    const oversized = filesToAdd.filter(file => file.size > MAX_FILE_SIZE);

    if (oversized.length > 0) {
      const oversizedDetails = oversized.map(f => `${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} MB)`).join(', ');
      toast({
        title: 'File Too Large',
        description: `Only files of 100 MB or below are accepted. Oversized: ${oversizedDetails}`,
        variant: 'destructive',
      });
      return;
    }

    if (limitExceeded) {
      toast({
        title: 'File Limit Exceeded',
        description: `Only the first ${remainingSlots} file(s) were added. You can upload a maximum of 5 files.`,
      });
    }

    // Clear old AI-generated/typed details if starting a new upload session
    if (uploadedFiles.length === 0) {
      setTitle('');
      setDescription('');
      setCategory('');
      setAiTags([]);
      setAiCeremonyData(null);
      setIsDateFromExif(false);
      setDateTaken(getTodayDateString());
    }

    const newEntries = filesToAdd.map(makeUploadedFile);
    setUploadedFiles(prev => [...prev, ...newEntries]);

    // Extract EXIF dates from photo files in the background
    const photoEntries = newEntries.filter(e => e.detectedType === 'photo');
    if (photoEntries.length === 0) {
      setDateTaken(prev => prev || getTodayDateString());
      setIsDateFromExif(false);
      return;
    }

    const exifResults = await Promise.all(
      photoEntries.map(async (entry) => ({
        id: entry.id,
        exifDate: await extractExifDate(entry.file),
      }))
    );

    // Update entries with their EXIF dates
    setUploadedFiles(prev =>
      prev.map(f => {
        const result = exifResults.find(r => r.id === f.id);
        return result ? { ...f, exifDate: result.exifDate } : f;
      })
    );

    // Auto-populate dateTaken from the earliest EXIF date found (if not yet set by user)
    const datesFound = exifResults
      .map(r => r.exifDate)
      .filter((d): d is string => d !== null)
      .sort();
    if (datesFound.length > 0) {
      const earliest = datesFound[0];
      const today = getTodayDateString();
      if (earliest && earliest > today) {
        setDateTaken(today);
      } else {
        setDateTaken(earliest);
      }
      setIsDateFromExif(true);
    } else {
      setDateTaken(prev => prev || getTodayDateString());
      setIsDateFromExif(false);
    }
  }, [uploadedFiles, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) void addFiles(dropped);
  }, [addFiles]);

  const removeFile = (id: string) => {
    setUploadedFiles(prev => {
      const entry = prev.find(f => f.id === id);
      if (entry?.preview) URL.revokeObjectURL(entry.preview);
      const remaining = prev.filter(f => f.id !== id);
      if (remaining.length === 0) {
        setTitle('');
        setDescription('');
        setCategory('');
        setAiTags([]);
        setAiCeremonyData(null);
        setIsDateFromExif(false);
        setDateTaken('');
      }
      return remaining;
    });
  };

  // ── Batch Upload Flow ───────────────────────────────────────────────────

  const handleBatchUpload = async () => {
    const filesToUpload = uploadedFiles.filter(uf => !uf.isUploaded);
    if (filesToUpload.length === 0) return;

    setSubmitting(true);
    setSubmitProgress('Preparing files...');
    setError(null);

    try {
      // 0. Pre-process files (Compress/Convert to WebP)
      setSubmitProgress('Optimizing media...');
      const processedFiles = await Promise.all(filesToUpload.map(async (uf) => {
        if (uf.detectedType === 'photo') {
          try {
            const compressed = await compressImage(uf.file, 2_000_000); // Main image max 2MB
            return { ...uf, file: compressed };
          } catch (e) {
            console.error('Compression failed for', uf.file.name, e);
            return uf;
          }
        }
        return uf;
      }));

      // Update state with processed files so we use them for upload
      setUploadedFiles(prev => prev.map(f => {
        const pf = processedFiles.find(p => p.id === f.id);
        return pf ? pf : f;
      }));

      // 1. Get presigned URLs
      const presignPayload = processedFiles.map(uf => ({
        fileName: uf.file.name,
        fileType: uf.file.type || (uf.detectedType === 'photo' ? 'image/webp' : uf.detectedType === 'document' ? 'application/pdf' : 'video/mp4')
      }));

      const presignData = await getBulkPresignedUrls(presignPayload);

      // 2. Sequential Upload
      for (let i = 0; i < processedFiles.length; i++) {
        const uf = processedFiles[i];
        const ps = presignData[i];

        setSubmitProgress(`Vaulting memory ${i + 1} of ${processedFiles.length}...`);

        // Upload main file
        const contentType = uf.file.type || (uf.detectedType === 'photo' ? 'image/webp' : uf.detectedType === 'document' ? 'application/pdf' : 'video/mp4');
        await uploadToS3(ps.uploadUrl, uf.file, contentType);

        // Handle thumbnail
        let thumbFileForAi: File | null = null;
        if (ps.thumbnailUploadUrl) {
          setSubmitProgress(`Optimizing thumbnail ${i + 1}...`);
          let thumbBlob: Blob | null = null;

          if (uf.detectedType === 'video') {
            const thumbFile = await generateVideoThumbnail(uf.file);
            thumbBlob = thumbFile;
            thumbFileForAi = thumbFile;
          } else if (uf.detectedType === 'photo') {
            const thumbFile = await compressImage(uf.file, 150_000); // Smaller for thumb
            thumbBlob = thumbFile;
          }

          if (thumbBlob) {
            await uploadToS3(ps.thumbnailUploadUrl, thumbBlob, 'image/webp');
          }
        }

        // Update state to mark as uploaded
        setUploadedFiles(prev => prev.map(f => f.id === uf.id ? {
          ...f,
          isUploaded: true,
          fileId: ps.fileId,
          remoteUrl: ps.uploadUrl.split('?')[0],
          remoteThumbnailUrl: ps.thumbnailUploadUrl ? ps.thumbnailUploadUrl.split('?')[0] : undefined,
          remoteKey: ps.key,
          remoteThumbnailKey: ps.thumbnailKey
        } : f));

        // Call AI APIs on the first photo or video
        if (i === 0 && (uf.detectedType === 'photo' || (uf.detectedType === 'video' && thumbFileForAi))) {
          try {
            setSubmitProgress('Analyzing media with AI...');
            const aiFile = uf.detectedType === 'video' ? thumbFileForAi! : uf.file;
            const [captionRes, ceremonyRes, descRes] = await Promise.all([
              uploadAICaption(aiFile).catch(e => { console.warn('Caption API failed', e); return null; }),
              uploadAICeremony(aiFile).catch(e => { console.warn('Ceremony API failed', e); return null; }),
              uploadAIDescription(aiFile).catch(e => { console.warn('Description API failed', e); return null; })
            ]);

            if (captionRes) {
              if (captionRes.caption) setTitle(captionRes.caption);
              if (captionRes.tags) setAiTags(captionRes.tags);
            }
            if (descRes) {
              if (descRes.description) setDescription(descRes.description);
            }
            if (ceremonyRes) {
              setAiCeremonyData(ceremonyRes);
              const rawKeywords = ceremonyRes.detectedKeywords || ceremonyRes.structured?.detectedKeywords || [];
              let ceremonyName = '';
              if (rawKeywords && rawKeywords.length > 0) {
                ceremonyName = rawKeywords[0];
              } else if (ceremonyRes.structured?.ceremony) {
                ceremonyName = ceremonyRes.structured.ceremony;
              } else if (ceremonyRes.ceremonyInfo?.title) {
                ceremonyName = ceremonyRes.ceremonyInfo.title;
              }

              if (ceremonyName) {
                const formattedKeyword = ceremonyName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                setCategory(formattedKeyword);
              }
            }
          } catch (e) {
            console.error('AI Analysis failed:', e);
          }
        }
      }
    } catch (err) {
      console.error('Batch upload error:', err);
      const errMsg = err instanceof Error ? err.message : 'Upload failed';
      setError(errMsg);
      toast({
        title: 'Upload Failed',
        description: errMsg,
        variant: 'destructive',
      });
      throw err; // Re-throw to stop navigation
    } finally {
      setSubmitting(false);
      setSubmitProgress('');
    }
  };

  // ── Navigation ───────────────────────────────────────────────────────────

  const goBack = () => {
    if (step === 2) { reset(); return; } // back to step 0
    // D5 — uniform 3-step wizard (always step 3 -> step 5 directly)
    if (step === 5) { setStep(3); return; }
    setStep(s => s - 1);
  };

  const goNext = async () => {
    if (step === 2 && !isTextFlow) {
      try {
        await handleBatchUpload();
      } catch {
        return; // Stay on step 2 if upload fails
      }
    }

    if (step === 3) {
      // D5 — auto-fill per-file titles from story title and skip step 4 entirely
      if (!isTextFlow) {
        setUploadedFiles(prev => prev.map(uf => ({
          ...uf,
          title: uf.title || title.trim(),
        })));
      }
      setStep(5);
      return;
    }
    setStep(s => s + 1);
  };

  // ── Prompt selection ─────────────────────────────────────────────────────

  const handleSelectPrompt = (prompt: typeof MEMORY_PROMPTS[0]) => {
    setIsTextFlow(true);
    setTitle(prompt.suggestedTitle);
    setActivePrompt(prompt.prompt);
    setTextContent('');
    if (prompt.suggestedCategory) setCategory(prompt.suggestedCategory);
    setStep(2);
  };

  // ── AI Description ──────────────────────────────────────────────────────

  const handleAIDescription = async () => {
    setAiDescLoading(true);
    try {
      if (description.trim()) {
        // "Enhance with AI" flow: Description already exists, skip image description API
        const textToEnhance = title.trim() || description.trim();
        const result = await enhanceAIDescription({
          description: textToEnhance,
        });
        const newDesc = result.text || result.description || result.enhanced;
        if (newDesc) {
          setDescription(newDesc);
        }
      } else {
        // "Suggest with AI" flow: Description is empty, call image description API first
        let imageDesc = "";
        const mediaFile = uploadedFiles.find(f => f.detectedType === 'photo' || f.detectedType === 'video');

        if (mediaFile) {
          let aiFile = mediaFile.file;
          if (mediaFile.detectedType === 'video') {
            const thumb = await generateVideoThumbnail(mediaFile.file);
            if (thumb) {
              aiFile = thumb;
            }
          }
          const imgResult = await uploadAIDescription(aiFile);
          if (imgResult.description) {
            imageDesc = imgResult.description;
          }
        }

        // Enhance using title if present, otherwise the image description
        const textToEnhance = title.trim() || imageDesc;
        if (textToEnhance) {
          const result = await enhanceAIDescription({
            description: textToEnhance,
          });
          const newDesc = result.text || result.description || result.enhanced;
          if (newDesc) {
            setDescription(newDesc);
          }
        } else if (imageDesc) {
          setDescription(imageDesc);
        }
      }
    } catch (err) {
      console.error('AI description failed:', err);
    } finally {
      setAiDescLoading(false);
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (asDraft = false) => {
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    const status = asDraft ? 'draft' : 'publish';

    // Prepare tagged people as name/id objects
    const taggedPeople = taggedPersonIds.map(id => {
      const p = persons.find(per => per.personId === id);
      return {
        id,
        name: p ? `${p.firstName} ${p.lastName}` : 'Unknown',
        profilePhotoUrl: p?.profilePhotoUrl || null,
        profileImageUrl: p?.profilePhotoUrl || null
      };
    });

    try {
      setSubmitProgress(asDraft ? 'Saving draft...' : 'Publishing...');

      if (isTextFlow) {
        // Text flow now uses unified confirmMemories API
        await confirmMemories(treeId, {
          title: title.trim(),
          description: description.trim() || undefined,
          memoryType: 'text',
          textContent: textContent.trim(),
          textdata: true,
          category: category || 'Event',
          dateTaken: dateTaken || undefined,
          place: placeTaken.trim() || undefined,
          templeId: selectedTemple?.templeId || undefined,
          type: albumId ? 'album' : 'post',
          status: status,
          taggedPeople,
          files: [],
          albumId: albumId
        });
      } else {
        // NEW Batch Confirmation API
        const files = uploadedFiles.map(uf => ({
          fileName: uf.file.name,
          fileType: uf.file.type || (uf.detectedType === 'photo' ? 'image/jpeg' : uf.detectedType === 'document' ? 'application/pdf' : 'video/mp4'),
          key: uf.remoteKey || '',
          fileSize: uf.file.size,
          thumbnailKey: uf.remoteThumbnailKey,
          fileId: uf.fileId
        }));

        await confirmMemories(treeId, {
          title: title.trim(),
          description: description.trim(),
          category: category || 'Event',
          dateTaken: dateTaken || undefined,
          place: placeTaken.trim() || undefined,
          templeId: selectedTemple?.templeId || undefined,
          type: albumId ? 'album' : 'post',
          status: status,
          taggedPeople,
          files,
          textdata: "",
          albumId: albumId
        });
      }

      onCreated(albumId);
      handleClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to create memory';
      setError(errMsg);
      toast({
        title: 'Error Publishing Memory',
        description: errMsg,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setSubmitProgress('');
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const togglePerson = (id: string) =>
    setTaggedPersonIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const filteredPersons = persons.filter(p => {
    if (!personSearch.trim()) return true;
    const q = personSearch.toLowerCase();
    return p.firstName.toLowerCase().includes(q) || p.lastName.toLowerCase().includes(q);
  });

  const filteredPrompts = promptFilter === 'all'
    ? MEMORY_PROMPTS
    : MEMORY_PROMPTS.filter(p => p.category === promptFilter);

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return true;
      case 2: return isTextFlow ? (textContent.trim().length > 0 && textContent.length <= 300) : uploadedFiles.length > 0;
      case 3: return title.trim().length > 0 && !isFormInvalid;
      case 4: return !isFormInvalid; // per-file titles must be valid
      case 5: return !isFormInvalid;
      default: return false;
    }
  };

  // D5 — unified 3-step wizard for both flows
  const totalSteps = 3;
  const stepNum = [2, 3, 5].indexOf(step) + 1;
  const stepLabel = step === 0 ? 'Choose how to start' : `Step ${stepNum} of ${totalSteps}`;

  if (!open) return null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={`fixed inset-0 z-50 ${isMobile ? 'flex items-end' : 'flex items-center justify-center'}`}>
      <FamilyUploadLoader open={submitting} progressText={submitProgress} />
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={handleClose} />

      <div className={`relative w-full bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-md border border-[#E2E8F0]/60 dark:border-[#2a2a2a] shadow-[0_20px_60px_rgba(0,0,0,0.12)] flex flex-col ${isMobile ? 'rounded-t-2xl rounded-b-none max-h-[90dvh] overflow-hidden' : 'max-w-lg mx-2 sm:mx-4 rounded-2xl max-h-[95vh] sm:max-h-[90vh]'}`}
        style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={goBack} className="p-1 rounded hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-base font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">
              Add Memory
              <span className="text-xs font-normal text-[#8B7355] dark:text-[#999] ml-2">{stepLabel}</span>
            </h2>
          </div>
          <button onClick={handleClose} className="p-1 rounded hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 sm:px-5 py-4">

          {/* ── Step 0: Choose flow ─────────────────────────────────────── */}
          {step === 0 && (
            <div>
              <p className="text-sm text-[#8B7355] dark:text-[#999] mb-4">How would you like to start?</p>
              <div className="grid grid-cols-1 gap-3 mb-6">
                <button
                  onClick={() => { setIsTextFlow(false); setStep(2); }}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 dark:border-[#2a2a2a] hover:border-[#E8D5C4] dark:hover:border-[#2F3E8F]/30 bg-white dark:bg-[#1a1a1a] transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#E8EDFF] dark:bg-[#2F3E8F]/10 group-hover:scale-105 transition-transform">
                    <Upload className="w-5 h-5 text-[#2F3E8F]" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Upload media</p>
                    <p className="text-xs text-[#8B7355] dark:text-[#999] mt-0.5">Add Photos, Videos, Audio and Documents to your memory</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#B8A090] dark:text-[#666] group-hover:text-[#2F3E8F] transition-colors" />
                </button>
                <div
                  onClick={() => {/* prompts shown below */ }}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-[#E8D5C4] dark:border-[#2F3E8F]/30 bg-[#E8EDFF]/50 dark:bg-[#2F3E8F]/5 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                    <Lightbulb className="w-5 h-5 text-[#2F3E8F] dark:text-blue-400" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#3D2E1F] dark:text-[#f5f5f5]">Start from a prompt</p>
                    <p className="text-xs text-[#8B7355] dark:text-[#999] mt-0.5">Answer a question to capture a memory</p>
                  </div>
                </div>
              </div>

              {/* Prompt categories */}
              <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 pb-1">
                <button
                  onClick={(e) => {
                    setPromptFilter('all');
                    e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${promptFilter === 'all'
                    ? 'bg-[#3D2E1F] text-white border-[#3D2E1F] dark:bg-white dark:text-black dark:border-white'
                    : 'bg-transparent text-[#8B7355] dark:text-[#999] border-[#E2E8F0]/60 dark:border-[#2a2a2a] hover:border-[#2F3E8F]/40'
                    }`}
                >All</button>
                {getPromptCategories().map(cat => {
                  const colors = PROMPT_CATEGORY_COLORS[cat];
                  return (
                    <button
                      key={cat}
                      onClick={(e) => {
                        setPromptFilter(cat);
                        e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                      }}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${promptFilter === cat
                        ? `${colors.bg} ${colors.text} ${colors.border}`
                        : 'bg-transparent text-[#8B7355] dark:text-[#999] border-[#E2E8F0]/60 dark:border-[#2a2a2a] hover:border-[#2F3E8F]/40'
                        }`}
                    >{cat}</button>
                  );
                })}
              </div>

              <div className="space-y-2 max-h-[35vh] overflow-y-auto">
                {filteredPrompts.map(prompt => {
                  const colors = PROMPT_CATEGORY_COLORS[prompt.category];
                  return (
                    <button
                      key={prompt.id}
                      onClick={() => handleSelectPrompt(prompt)}
                      className={`w-full text-left p-3 rounded-xl border ${colors.border} ${colors.bg} hover:shadow-sm transition-all group`}
                    >
                      <p className="text-[13px] text-[#3D2E1F] dark:text-[#e0e0e0] leading-relaxed">{prompt.prompt}</p>
                      <p className={`text-[11px] font-medium mt-1.5 ${colors.text} opacity-70 group-hover:opacity-100`}>{prompt.category}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 2a: Upload files (mixed types) ────────────────────── */}
          {step === 2 && !isTextFlow && (
            <div>
              {/* Dropzone */}
              <div
                onDrop={(e) => {
                  if (uploadedFiles.length >= 5) {
                    e.preventDefault();
                    return;
                  }
                  handleDrop(e);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (uploadedFiles.length < 5) {
                    setDragOver(true);
                  }
                }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => {
                  if (uploadedFiles.length < 5) {
                    fileInputRef.current?.click();
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  uploadedFiles.length >= 5
                    ? 'border-gray-200 dark:border-[#2a2a2a] bg-gray-50/50 dark:bg-white/[0.01] cursor-not-allowed opacity-60'
                    : dragOver
                      ? 'border-[#2F3E8F] bg-[#E8EDFF] dark:bg-[#2F3E8F]/10 cursor-pointer'
                      : 'border-gray-200 dark:border-[#2a2a2a] hover:border-[#2F3E8F]/40 hover:bg-[#E8EDFF]/30 dark:hover:bg-[#2F3E8F]/5 cursor-pointer'
                }`}
              >
                <div className="flex justify-center gap-3 mb-3">
                  <Camera className="w-5 h-5 text-emerald-500/50" />
                  <Music className="w-5 h-5 text-blue-400/50" />
                  <Video className="w-5 h-5 text-purple-400/50" />
                  <FileText className="w-5 h-5 text-amber-500/50" />
                </div>
                {uploadedFiles.length >= 5 ? (
                  <p className="text-sm font-semibold text-[#8B7355] dark:text-[#999]">
                    Maximum of 5 files selected
                  </p>
                ) : (
                  <p className="text-sm text-[#8B7355] dark:text-[#999]">
                    <span className="hidden sm:inline">Drop files here, or </span>
                    <span className="text-[#2F3E8F] font-medium">browse</span>
                  </p>
                )}
                <p className="text-xs text-[#8B7355]/60 dark:text-[#999]/60 mt-1">
                  Image (JPG, JPEG, PNG, WEBP), Video (MP4), Audio (MP3) and Documents (PDF).<br />
                  Upload up to 5 files • Max 100 MB per file
                </p>

                {fileError && (
                  <p className="text-xs text-red-500 font-medium mt-3 bg-red-50 dark:bg-red-500/10 py-1.5 px-3 rounded-lg border border-red-100 dark:border-red-500/20 animate-in fade-in slide-in-from-top-1">
                    {fileError}
                  </p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,image/jpeg,.png,image/png,.webp,image/webp,.mp3,audio/mpeg,audio/mp3,.mp4,video/mp4,.pdf,application/pdf"
                  style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}
                  onChange={(e) => {
                    const fl = Array.from(e.target.files || []);
                    if (fl.length) void addFiles(fl);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* File list */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-[#8B7355] dark:text-[#999] mb-2">
                    {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} selected
                  </p>
                  {uploadedFiles.map(uf => {
                    const { icon: Icon, color } = TYPE_META[uf.detectedType];
                    return (
                      <div
                        key={uf.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-[#E2E8F0]/40 dark:border-[#2a2a2a]"
                      >
                        {/* Thumbnail or icon */}
                        <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center">
                          {uf.preview
                            ? <img src={uf.preview} alt="" className="w-full h-full object-cover" />
                            : <Icon className={`w-5 h-5 ${color}`} />
                          }
                        </div>

                        {/* Name + type badge */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] truncate">{uf.file.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <TypeBadge type={uf.detectedType} />
                            <span className="text-[10px] text-[#8B7355]/70 dark:text-[#999]/70">
                              {(uf.file.size / (1024 * 1024)).toFixed(1)} MB
                            </span>
                            {uf.exifDate && (
                              <span className="flex items-center gap-0.5 text-[10px] text-[#25327A] dark:text-[#2F3E8F]">
                                <ScanLine className="w-2.5 h-2.5" />
                                {new Date(uf.exifDate + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => removeFile(uf.id)}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <X className="w-3.5 h-3.5 text-[#8B7355] hover:text-red-400" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Add more */}
                  {uploadedFiles.length < 5 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full mt-1 py-2 rounded-lg border border-dashed border-[#2F3E8F]/30 text-[12px] text-[#2F3E8F] hover:bg-[#E8EDFF]/50 dark:hover:bg-[#2F3E8F]/5 transition-colors"
                    >
                      + Add more files
                    </button>
                  )}
                </div>
              )}

              {/* Loader overlay inside modal */}
              {(submitting || submitProgress) && step === 2 && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm rounded-xl">
                  <Loader2 className="w-8 h-8 text-[#2F3E8F] animate-spin mb-3" />
                  <p className="text-sm font-medium text-[#3D2E1F] dark:text-[#f5f5f5]">{submitProgress || 'Uploading...'}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2b: Write text (text flow) ────────────────────────── */}
          {step === 2 && isTextFlow && (
            <div className="space-y-3.5">
              {activePrompt && (
                <div className="p-3.5 rounded-xl bg-[#E8EDFF]/60 dark:bg-[#2F3E8F]/10 border border-[#E8D5C4]/60 dark:border-[#2F3E8F]/20 animate-in fade-in slide-in-from-top-1">
                  <p className="text-[10px] font-bold text-[#2F3E8F] dark:text-blue-400 uppercase tracking-wider mb-1">Selected Prompt</p>
                  <p className="text-xs sm:text-sm font-semibold text-[#3D2E1F] dark:text-[#f5f5f5] leading-relaxed">{activePrompt}</p>
                </div>
              )}
              <div>
                <Label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Write your story or memory</Label>
                <Textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value.slice(0, 300))}
                  maxLength={300}
                  placeholder="Share your memory, story, or thoughts..."
                  className="min-h-[200px]"
                  autoFocus
                  showCharCount
                  charLimit={300}
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Story details ───────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-gray-700 dark:text-gray-300">Title <span className="">*</span></Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give this memory a title"
                  autoFocus
                  error={title.length > 0 ? formFileds.error : undefined}
                  showCharCount
                  charLimit={titleMaxLength ?? 100}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-sm text-gray-700 dark:text-gray-300">Description</Label>
                  {(uploadedFiles.some(f => f.detectedType === 'photo' || f.detectedType === 'video') || description.trim() || title.trim()) && (
                    <button
                      type="button"
                      onClick={handleAIDescription}
                      disabled={aiDescLoading}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-[#25327A] dark:text-[#7B8FD4] hover:bg-[#E8EDFF] dark:hover:bg-[#2F3E8F]/20 border border-[#2F3E8F]/30 dark:border-[#7B8FD4]/30 transition-colors disabled:opacity-50"
                    >
                      {aiDescLoading ? (
                        <><Loader2 className="w-3 h-3 animate-spin" />Generating...</>
                      ) : description.trim() ? (
                        <><Gem className="w-3 h-3" />Enhance with AI</>
                      ) : (
                        <><Gem className="w-3 h-3" />Suggest with AI</>
                      )}
                    </button>
                  )}
                </div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description (optional)"
                  className={`transition-all duration-200 ${description.trim().length > 0 ? 'min-h-[160px]' : 'min-h-[80px]'}`}
                  error={description.length > 0 ? descVal.error : undefined}
                  showCharCount
                  charLimit={descriptionMaxLength ?? VALIDATION_LIMITS.description}
                />
              </div>

              {/* Show Tags if available */}
              {/* {aiTags.length > 0 && (
                <div>
                  <Label className="text-sm text-gray-700 dark:text-gray-300">AI Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {aiTags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-[#E8EDFF] dark:bg-[#2F3E8F]/10 text-[#25327A] dark:text-[#2F3E8F] text-xs rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )} */}



              <div className="relative" ref={categoryContainerRef}>
                <Label className="text-sm text-gray-700 dark:text-gray-300">Category</Label>
                <div className="relative mt-1">
                  <Input
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setShowCategoryDropdown(true);
                    }}
                    onFocus={() => setShowCategoryDropdown(true)}
                    placeholder="Select or type a category (optional)"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="absolute right-0 top-0 h-full px-3 flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                {showCategoryDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-[#E2E8F0]/80 dark:border-[#2a2a2a] rounded-lg shadow-lg max-h-60 overflow-y-auto p-1 space-y-2">
                    {(() => {
                      const rawSuggestions: string[] = aiCeremonyData?.detectedKeywords || aiCeremonyData?.structured?.detectedKeywords || aiCeremonyData?.structured?.reasons || [];
                      const suggestions = rawSuggestions.map(s => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '));
                      const lowerSuggestions = suggestions.map(s => s.toLowerCase());

                      const isExactMatch = MEMORY_CATEGORY_GROUPS.some(g => g.categories.some(c => c.toLowerCase() === category.toLowerCase())) || lowerSuggestions.includes(category.toLowerCase());
                      const searchVal = isExactMatch ? "" : category;

                      const filteredSuggestions = suggestions.filter(s => s.toLowerCase().includes(searchVal.toLowerCase()));

                      const filteredGroups = MEMORY_CATEGORY_GROUPS.map(g => {
                        const filteredCategories = g.categories.filter(c =>
                          !lowerSuggestions.includes(c.toLowerCase()) &&
                          c.toLowerCase().includes(searchVal.toLowerCase())
                        );
                        return { ...g, categories: filteredCategories };
                      }).filter(g => g.categories.length > 0);

                      // if (filteredSuggestions.length === 0 && filteredGroups.length === 0) {
                      //   return (
                      //     <div className="text-xs text-stone-500 dark:text-stone-400 p-2 text-center">
                      //       No matching categories. Type to add custom category.
                      //     </div>
                      //   );
                      // }

                      return (
                        <>
                          {/* AI Suggestions */}
                          {filteredSuggestions.length > 0 && (
                            <div className="space-y-0.5">
                              <div className="px-2 py-1 text-xs font-semibold text-[#2F3E8F] dark:text-blue-400 flex items-center gap-1">✨  Suggestions</div>
                              {filteredSuggestions.map((reason: string) => (
                                <button
                                  key={`ai-${reason}`}
                                  type="button"
                                  onClick={() => {
                                    setCategory(reason);
                                    setShowCategoryDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-[#F4F6F9] dark:hover:bg-[#252525] text-stone-700 dark:text-stone-300 transition-colors"
                                >
                                  ✨ {reason}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Standard Categories */}
                          {filteredGroups.map(g => (
                            <div key={g.label} className="space-y-0.5">
                              <div className="px-2 py-1 text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">{g.label}</div>
                              {g.categories.map(c => (
                                <button
                                  key={`cat-${c}`}
                                  type="button"
                                  onClick={() => {
                                    setCategory(c);
                                    setShowCategoryDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-[#F4F6F9] dark:hover:bg-[#252525] text-stone-700 dark:text-stone-300 transition-colors"
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-sm text-gray-700 dark:text-gray-300">Date Taken</Label>
                    {isDateFromExif && dateTaken && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-[#25327A] bg-[#E8EDFF] dark:bg-[#2F3E8F]/10 px-1.5 py-0.5 rounded-full border border-[#2F3E8F]/20">
                        <ScanLine className="w-2.5 h-2.5" />
                        From photo
                      </span>
                    )}
                  </div>
                  <DateInput
                    value={dateTaken}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      const todayStr = getTodayDateString();
                      if (selectedVal && selectedVal > todayStr) {
                        setDateTaken(todayStr);
                      } else {
                        setDateTaken(selectedVal);
                      }
                      setIsDateFromExif(false); // user overrode the EXIF date
                    }}
                    max={getTodayDateString()}
                  />
                </div>
                <div className="relative" ref={placeContainerRef}>
                  <Label className="text-sm text-gray-700 dark:text-gray-300">Place</Label>
                  <div className="relative mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlaceDropdown(!showPlaceDropdown);
                        if (!showPlaceDropdown) {
                          const initialQuery = placeTaken || '';
                          handlePlaceSearchChange(initialQuery, true);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-[#2a2a2a] rounded-lg text-sm bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-gray-300 flex items-center justify-between text-left focus:outline-none focus:border-[#2F3E8F]"
                    >
                      <span className={placeTaken ? "text-gray-900 dark:text-gray-100 truncate pr-4" : "text-stone-400 dark:text-stone-500 truncate"}>
                        {placeTaken || "Select place"}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {placeTaken && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlaceTaken('');
                              setPlaceSearchQuery('');
                              setPlaceSuggestions([]);
                            }}
                            className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                          >
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <ChevronDown className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                      </div>
                    </button>

                    {showPlaceDropdown && (
                      <div className="absolute z-50 bottom-full left-0 right-0 mb-1 bg-white dark:bg-[#1a1a1a] border border-[#E2E8F0]/80 dark:border-[#2a2a2a] rounded-lg shadow-lg p-2 space-y-2 max-h-64 overflow-y-auto animate-in fade-in-50 duration-200">
                        {/* Search Input field */}
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-stone-400 dark:text-stone-500" />
                          <Input
                            value={placeSearchQuery}
                            onChange={(e) => handlePlaceSearchChange(e.target.value)}
                            placeholder="Search places..."
                            className="pl-8 text-xs h-9"
                            autoFocus
                          />
                        </div>

                        {/* Places List */}
                        <div className="space-y-1">
                          {isPlaceLoading ? (
                            <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#2F3E8F] dark:text-blue-400">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Searching places...
                            </div>
                          ) : placeSuggestions.length > 0 ? (
                            placeSuggestions.map((placeName) => (
                              <button
                                key={placeName}
                                type="button"
                                onClick={() => {
                                  setPlaceTaken(placeName);
                                  setShowPlaceDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 text-xs rounded hover:bg-[#F4F6F9] dark:hover:bg-[#252525] text-stone-700 dark:text-stone-300 transition-colors"
                              >
                                {placeName}
                              </button>
                            ))
                          ) : (
                            <div className="text-xs text-stone-400 dark:text-stone-500 px-3 py-4 text-center">
                              {placeSearchQuery.trim().length >= 2 ? "No places found" : "Type to search places"}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Temple link */}
              {/* <div className="relative">
                <Label className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5 text-[#2F3E8F]" />
                  Link to Temple 111111
                  <span className="text-[11px] text-[#8B7355] dark:text-[#999] font-normal">(optional)</span>
                </Label>
                {selectedTemple ? (
                  <div className="space-y-2 mt-1">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2F3E8F]/30 bg-[#E8EDFF] dark:bg-[#2F3E8F]/10">
                      <Landmark className="w-4 h-4 text-[#2F3E8F] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#3D2E1F] dark:text-[#f5f5f5] truncate">{selectedTemple.name}</p>
                        <p className="text-[11px] text-[#8B7355] dark:text-[#999]">{selectedTemple.location}, {selectedTemple.state}</p>
                      </div>
                      <button type="button" onClick={() => { setSelectedTemple(null); setTempleSearch(''); setFestivalOnTemple(''); setRitualOnTemple(''); }} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10">
                        <X className="w-3.5 h-3.5 text-[#8B7355]" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={festivalOnTemple}
                        onChange={(e) => setFestivalOnTemple(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-[#2a2a2a] rounded-lg text-[12px] bg-white dark:bg-[#1a1a1a] dark:text-[#e0e0e0] focus:border-[#2F3E8F] focus:outline-none"
                      >
                        <option value="">Festival/Occasion</option>
                        {['Karthigai Deepam', 'Brahmotsavam', 'Ekadashi', 'Utsavam', 'Thai Poosam', 'Panguni Uthiram', 'Pooyam Thirunaal', 'Vishu', 'Makara Vilakku', 'Shivaratri', 'Other'].map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                      <select
                        value={ritualOnTemple}
                        onChange={(e) => setRitualOnTemple(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-[#2a2a2a] rounded-lg text-[12px] bg-white dark:bg-[#1a1a1a] dark:text-[#e0e0e0] focus:border-[#2F3E8F] focus:outline-none"
                      >
                        <option value="">Ritual Performed</option>
                        {['Archana', 'Abhishekam', 'Procession/Utsavam', 'Neyvilakku', 'Deeparadhana', 'Pushpanjali', 'Other'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 space-y-2">

                    {category === 'Temple/Place of Worship' && myTemples.length > 0 && (
                      <div>
                        <p className="text-[11px] text-[#8B7355] dark:text-[#999] mb-1.5">Your temples — tap to link:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {myTemples.map(t => (
                            <button
                              key={t.templeId}
                              type="button"
                              onClick={() => setSelectedTemple(t)}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-[#2F3E8F]/30 bg-[#E8EDFF] dark:bg-[#2F3E8F]/10 text-[12px] text-[#25327A] dark:text-[#2F3E8F] hover:bg-[#2F3E8F]/10 dark:hover:bg-[#2F3E8F]/20 transition-colors"
                            >
                              <Landmark className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[160px]">{t.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="relative">
                      <Input
                        value={templeSearch}
                        onChange={(e) => {
                          const q = e.target.value;
                          setTempleSearch(q);
                          if (q.length >= 2) { setTempleResults(searchTemples(q, 6)); setShowTempleResults(true); }
                          else { setTempleResults([]); setShowTempleResults(false); }
                        }}
                        onFocus={() => { if (templeResults.length > 0) setShowTempleResults(true); }}
                        onBlur={() => setTimeout(() => setShowTempleResults(false), 200)}
                        placeholder="Search temples..."
                      />
                      {showTempleResults && templeResults.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-[#1a1a1a] border border-[#E2E8F0]/80 dark:border-[#2a2a2a] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {templeResults.map(t => (
                            <button
                              key={t.templeId}
                              type="button"
                              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#F4F6F9] dark:hover:bg-[#252525] transition-colors"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setSelectedTemple(t); setTempleSearch(''); setShowTempleResults(false); }}
                            >
                              <Landmark className="w-3.5 h-3.5 text-[#2F3E8F] shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[13px] text-[#3D2E1F] dark:text-[#f5f5f5] truncate">{t.name}</p>
                                <p className="text-[11px] text-[#8B7355] dark:text-[#999]">{t.deity} &middot; {t.state}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div> */}
            </div>
          )}

          {/* ── Step 4: Per-file titles (upload flow only) ──────────────── */}
          {step === 4 && (
            <div>
              <p className="text-sm text-[#8B7355] dark:text-[#999] mb-1">
                Name each file individually — or skip and they'll use the story title.
              </p>
              <p className="text-[11px] text-[#8B7355]/70 dark:text-[#999]/70 mb-4">
                Story title: <span className="font-medium text-[#3D2E1F] dark:text-[#f5f5f5]">{title}</span>
              </p>
              <div className="space-y-3">
                {uploadedFiles.map((uf, idx) => {
                  const { icon: Icon, color } = TYPE_META[uf.detectedType];
                  return (
                    <div key={uf.id} className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded-md overflow-hidden shrink-0 bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center mt-0.5">
                        {uf.preview
                          ? <img src={uf.preview} alt="" className="w-full h-full object-cover" />
                          : <Icon className={`w-5 h-5 ${color}`} />
                        }
                      </div>

                      {/* Title input */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <TypeBadge type={uf.detectedType} />
                          <span className="text-[10px] text-[#8B7355]/60 dark:text-[#999]/60 truncate">{uf.file.name}</span>
                        </div>
                        <div className="relative">
                          <Input
                            value={uf.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setUploadedFiles(prev => prev.map(f => f.id === uf.id ? { ...f, title: val } : f));
                            }}
                            placeholder={title || `File ${idx + 1}`}
                            className="pr-16"
                            error={uf.title.length > 0 ? validateField(uf.title, { maxLength: titleMaxLength ?? 100 }).error : undefined}
                            showCharCount
                            charLimit={titleMaxLength ?? 100}
                          />
                          {uf.title && (
                            <button
                              onClick={() => setUploadedFiles(prev => prev.map(f => f.id === uf.id ? { ...f, title: '' } : f))}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#8B7355] hover:text-[#2F3E8F] transition-colors"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 5: Tag people ──────────────────────────────────────── */}
          {step === 5 && (
            <div>
              <p className="text-sm text-[#8B7355] dark:text-[#999] mb-3">
                Tag people in this memory ({taggedPersonIds.length} selected)
              </p>
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-[#8B7355] dark:text-[#999]" />
                <Input value={personSearch} onChange={(e) => setPersonSearch(e.target.value)} placeholder="Search people..." className="pl-8" />
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {filteredPersons.length > 0 && (
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#2F3E8F] dark:text-blue-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={filteredPersons.every(p => taggedPersonIds.includes(p.personId))}
                      onChange={() => {
                        const allSelected = filteredPersons.every(p => taggedPersonIds.includes(p.personId));
                        if (allSelected) {
                          const filteredIds = filteredPersons.map(p => p.personId);
                          setTaggedPersonIds(prev => prev.filter(id => !filteredIds.includes(id)));
                        } else {
                          const filteredIds = filteredPersons.map(p => p.personId);
                          setTaggedPersonIds(prev => Array.from(new Set([...prev, ...filteredIds])));
                        }
                      }}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-[#2F3E8F] focus:ring-[#2F3E8F]"
                    />
                    <span>Select All</span>
                  </label>
                )}
                {filteredPersons.map((p) => {
                  const checked = taggedPersonIds.includes(p.personId);
                  return (
                    <label key={p.personId} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-[#E8EDFF] dark:bg-[#2F3E8F]/10' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'}`}>
                      <input type="checkbox" checked={checked} onChange={() => togglePerson(p.personId)} className="w-4 h-4 rounded border-gray-300 text-[#2F3E8F] focus:ring-[#2F3E8F]" />
                      <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-[#2a2a2a] overflow-hidden flex-shrink-0">
                        {p.profilePhotoUrl
                          ? <img src={resolveBackendUrl(p.profilePhotoUrl)} alt={p.firstName} className="w-full h-full object-cover" />
                          : <span className="w-full h-full flex items-center justify-center text-xs text-gray-500 font-medium">{p.firstName[0]}</span>
                        }
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{p.firstName} {p.lastName}</span>
                    </label>
                  );
                })}
                {filteredPersons.length === 0 && (
                  <p className="text-sm text-[#8B7355] dark:text-[#999] text-center py-4">No people found</p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        {step > 0 && (
          <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-t border-[#E2E8F0]/60 dark:border-[#2a2a2a]">
            {/* Progress dots */}
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i < stepNum ? 'bg-[#2F3E8F]' : 'bg-gray-200 dark:bg-[#333]'}`} />
              ))}
            </div>

            <div className="flex gap-2 items-center">
              {step === 4 && (
                <button onClick={goNext} className="text-[12px] text-[#8B7355] hover:text-[#2F3E8F] transition-colors mr-1">
                  Skip all
                </button>
              )}
              {step > 1 && (
                <Button onClick={goBack} variant="outline" size="sm" disabled={submitting}>
                  Back
                </Button>
              )}
              {step < 5 ? (
                <Button onClick={goNext} disabled={!canProceed()} size="sm">
                  Next
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button onClick={() => handleSubmit(true)} disabled={submitting || !title.trim() || isFormInvalid} size="sm" variant="outline">
                    {submitting ? 'Saving...' : 'Save as Draft'}
                  </Button>
                  <Button onClick={() => handleSubmit(false)} disabled={submitting || !title.trim() || isFormInvalid} size="sm">
                    {submitting ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{submitProgress || 'Saving...'}</>
                    ) : (
                      !isTextFlow && uploadedFiles.length > 1
                        ? `Publish ${uploadedFiles.length} Memories`
                        : 'Publish Memory'
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
