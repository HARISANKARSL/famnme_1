/**
 * CreateAlbumModal - Simple form for creating a new album
 */

import { useState } from 'react';
import { Loader2, FolderPlus } from 'lucide-react';
import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { createAlbum } from '@/services/albumApiService';
import { validateTextField, validateDescriptionField, VALIDATION_LIMITS } from '@/utils/validation';

interface CreateAlbumModalProps {
  open: boolean;
  onClose: () => void;
  treeId: string;
  onCreated: () => void;
}

export function CreateAlbumModal({ open, onClose, treeId, onCreated }: CreateAlbumModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameVal = validateTextField(name);
  const descVal = validateDescriptionField(description);
  const isFormInvalid = !nameVal.isValid || !descVal.isValid;

  const handleSave = async () => {
    if (!name.trim() || isFormInvalid) return;
    setSaving(true);
    setError(null);
    try {
      await createAlbum(treeId, { name: name.trim(), description: description.trim() || undefined });
      toast({
        title: 'Success',
        description: 'Album created successfully',
      });
      setName('');
      setDescription('');
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create album');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-[#2F3E8F]" />
            Create Album
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-1">
          <div>
            <Label className="text-sm text-gray-700 dark:text-gray-300">Album Name <span className="text-white">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (name.trim() && !isFormInvalid) {
                    handleSave();
                  }
                }
              }}
              placeholder="e.g., Family Reunion 2024"
              autoFocus
              error={name.length > 0 ? nameVal.error : undefined}
              showCharCount
              charLimit={VALIDATION_LIMITS.text}
            />
          </div>
          {/* <div>
            <Label className="text-sm text-gray-700 dark:text-gray-300">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="min-h-[60px]"
              error={description.length > 0 ? descVal.error : undefined}
              showCharCount
              charLimit={VALIDATION_LIMITS.description}
            />
          </div> */}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !name.trim() || isFormInvalid}>
            {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Creating...</> : 'Create Album'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

