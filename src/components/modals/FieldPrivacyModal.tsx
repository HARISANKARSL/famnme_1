import { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { Dialog, ResponsiveDialogContent as DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import * as neo4jAPI from '@/services/neo4jDataService';

type PrivacyLevel = 'public' | 'family-only' | 'private';

interface FieldConfig {
  key: string;
  label: string;
  group: string;
}

const PRIVACY_FIELDS: FieldConfig[] = [
  { key: 'birthDate', label: 'Birth Date', group: 'Dates' },
  { key: 'birthPlace', label: 'Birth Place', group: 'Dates' },
  { key: 'deathDate', label: 'Death Date', group: 'Dates' },
  { key: 'deathPlace', label: 'Death Place', group: 'Dates' },
  { key: 'occupation', label: 'Occupation', group: 'Personal' },
  { key: 'education', label: 'Education', group: 'Personal' },
  { key: 'biography', label: 'Biography', group: 'Personal' },
  { key: 'gotra', label: 'Gotra', group: 'Cultural' },
  { key: 'caste', label: 'Caste', group: 'Cultural' },
  { key: 'religion', label: 'Religion', group: 'Cultural' },
  { key: 'nativePlace', label: 'Native Place', group: 'Cultural' },
  { key: 'profilePhotoUrl', label: 'Profile Photo', group: 'Media' },
];

export interface FieldPrivacyModalProps {
  open: boolean;
  onClose: () => void;
  personId: string;
  treeId: string;
  currentPrivacy?: Record<string, PrivacyLevel> | null;
  onSaved?: () => void;
}

export function FieldPrivacyModal({
  open,
  onClose,
  personId,
  treeId,
  currentPrivacy,
  onSaved,
}: FieldPrivacyModalProps) {
  const { toast } = useToast();
  const [privacy, setPrivacy] = useState<Record<string, PrivacyLevel>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPrivacy(currentPrivacy ?? {});
    }
  }, [open, currentPrivacy]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Only save fields that differ from default (public)
      const nonDefaultPrivacy: Record<string, PrivacyLevel> = {};
      for (const [key, value] of Object.entries(privacy)) {
        if (value !== 'public') {
          nonDefaultPrivacy[key] = value;
        }
      }

      await neo4jAPI.updateFieldPrivacy(personId, nonDefaultPrivacy, treeId);
      toast({ title: 'Saved', description: 'Privacy settings updated' });
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to save field privacy:', err);
      toast({ title: 'Error', description: 'Failed to save privacy settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const groups = [...new Set(PRIVACY_FIELDS.map(f => f.group))];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-gray-500" />
            Field Privacy Settings
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-gray-500 px-1">
          Control which fields are visible to others. Fields default to "Public".
        </p>
        <div className="grid grid-cols-3 gap-2 px-1 pt-1">
          <div className="flex items-center gap-1 text-[11px] text-stone-500">
            <span aria-hidden>🌍</span> Anyone
          </div>
          <div className="flex items-center gap-1 text-[11px] text-stone-500">
            <span aria-hidden>👥</span> Invited only
          </div>
          <div className="flex items-center gap-1 text-[11px] text-stone-500">
            <span aria-hidden>🔒</span> Owner only
          </div>
        </div>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto">
          {groups.map(group => (
            <div key={group}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{group}</p>
              <div className="space-y-2">
                {PRIVACY_FIELDS.filter(f => f.group === group).map(field => (
                  <div key={field.key} className="flex items-center justify-between gap-2">
                    <Label className="text-sm text-gray-700 flex-1">{field.label}</Label>
                    <Select
                      value={privacy[field.key] ?? 'public'}
                      onValueChange={(val) => setPrivacy(prev => ({ ...prev, [field.key]: val as PrivacyLevel }))}
                    >
                      <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">🌍 Public</SelectItem>
                        <SelectItem value="family-only">👥 Family only</SelectItem>
                        <SelectItem value="private">🔒 Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Privacy'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
