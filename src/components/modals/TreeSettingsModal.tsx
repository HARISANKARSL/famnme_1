import { useState, useEffect } from 'react';
import type { ValidationConfig } from '@/types';
import {
  Dialog,
  ResponsiveDialogContent as DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';
import { getAuthToken } from '@/lib/auth';

export interface TreeSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (config: ValidationConfig) => Promise<void>;
  currentConfig: ValidationConfig | null;
  treeId: string;
}

export function TreeSettingsModal({
  open,
  onClose,
  onSave,
  currentConfig,
  treeId,
}: TreeSettingsModalProps) {
  const [config, setConfig] = useState<ValidationConfig>({
    consanguinityLevel: 'strict',
    allowPolyandry: false,
    allowPolygyny: false,
    allowUncleNieceMarriage: false,
    allowAuntNephewMarriage: false,
    culturalTradition: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [privacy, setPrivacy] = useState<'public' | 'private'>('private');
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [privacySaved, setPrivacySaved] = useState(false);


  useEffect(() => {
    if (currentConfig && open) {
      setConfig(currentConfig);
    }
  }, [currentConfig, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      await onSave(config);
      onClose();
    } catch (error) {
      console.error('Failed to save tree settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Family Tree Validation Settings</DialogTitle>
          <DialogDescription>
            Configure which marriage patterns and validation rules are allowed in this tree.
            These settings affect relationship validation and help you accurately represent
            historical or cultural family structures.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Consanguinity Level */}
            <div className="space-y-2">
              <Label htmlFor="consanguinityLevel">Consanguinity Validation Rules</Label>
              <Select
                value={config.consanguinityLevel}
                onValueChange={(value: 'strict' | 'moderate' | 'permissive') =>
                  setConfig({ ...config, consanguinityLevel: value })
                }
              >
                <SelectTrigger id="consanguinityLevel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">
                    Strict (blocks uncle-niece marriages)
                  </SelectItem>
                  <SelectItem value="moderate">
                    Moderate (allows with cultural justification)
                  </SelectItem>
                  <SelectItem value="permissive">
                    Permissive (for historical records)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {config.consanguinityLevel === 'strict' &&
                  'Blocks marriages between close blood relatives including uncles/nieces'}
                {config.consanguinityLevel === 'moderate' &&
                  'Allows uncle-niece marriages with cultural context (e.g., South Indian traditions)'}
                {config.consanguinityLevel === 'permissive' &&
                  'Minimal restrictions for documenting historical family structures'}
              </p>
            </div>

            {/* Cultural Tradition */}
            <div className="space-y-2">
              <Label htmlFor="culturalTradition">Cultural Tradition (Optional)</Label>
              <Input
                id="culturalTradition"
                value={config.culturalTradition || ''}
                onChange={(e) => setConfig({ ...config, culturalTradition: e.target.value || undefined })}
                placeholder="e.g., South Indian Dravidian, Toda Tribal, European Royalty"
              />
              <p className="text-sm text-muted-foreground">
                Specify the cultural or regional tradition this tree represents
              </p>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="font-medium">Multiple Marriage Patterns</h3>

              {/* Polyandry */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="allowPolyandry"
                  checked={config.allowPolyandry}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, allowPolyandry: checked as boolean })
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="allowPolyandry" className="font-normal cursor-pointer">
                    Allow Polyandry (one woman, multiple husbands)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enables documenting polyandrous marriages (e.g., Himalayan, Toda tribal customs)
                  </p>
                </div>
              </div>

              {/* Polygyny */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="allowPolygyny"
                  checked={config.allowPolygyny}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, allowPolygyny: checked as boolean })
                  }
                />
                <div className="space-y-1">
                  <Label htmlFor="allowPolygyny" className="font-normal cursor-pointer">
                    Allow Polygyny (one man, multiple wives)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enables documenting polygynous marriages (historical or cultural records)
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="font-medium">Specific Consanguineous Marriage Types</h3>

              {/* Uncle-Niece */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="allowUncleNieceMarriage"
                  checked={config.allowUncleNieceMarriage}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, allowUncleNieceMarriage: checked as boolean })
                  }
                  disabled={config.consanguinityLevel === 'strict'}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="allowUncleNieceMarriage"
                    className={`font-normal ${config.consanguinityLevel === 'strict' ? 'text-muted-foreground' : 'cursor-pointer'}`}
                  >
                    Allow Uncle-Niece Marriage
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Maternal uncle to niece marriages (South Indian Dravidian tradition)
                    {config.consanguinityLevel === 'strict' && ' - Requires moderate or permissive mode'}
                  </p>
                </div>
              </div>

              {/* Aunt-Nephew */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="allowAuntNephewMarriage"
                  checked={config.allowAuntNephewMarriage}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, allowAuntNephewMarriage: checked as boolean })
                  }
                  disabled={config.consanguinityLevel === 'strict'}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="allowAuntNephewMarriage"
                    className={`font-normal ${config.consanguinityLevel === 'strict' ? 'text-muted-foreground' : 'cursor-pointer'}`}
                  >
                    Allow Aunt-Nephew Marriage
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Aunt to nephew marriages (some cultural traditions)
                    {config.consanguinityLevel === 'strict' && ' - Requires moderate or permissive mode'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-md">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> These settings only affect validation warnings when adding marriages.
                They do not prevent you from documenting any family structure. Marriage patterns that
                trigger warnings will require you to provide cultural context for historical accuracy.
              </p>
            </div>

            {/* Privacy Settings */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-medium">Privacy</h3>
              <p className="text-sm text-muted-foreground">
                Control who can view this family tree.
              </p>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="privacy"
                    value="public"
                    checked={privacy === 'public'}
                    onChange={() => setPrivacy('public')}
                    className="h-4 w-4 text-primary"
                  />
                  <div>
                    <span className="text-sm font-medium">Public</span>
                    <p className="text-xs text-muted-foreground">
                      Anyone with the link can view this tree.
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="privacy"
                    value="private"
                    checked={privacy === 'private'}
                    onChange={() => setPrivacy('private')}
                    className="h-4 w-4 text-primary"
                  />
                  <div>
                    <span className="text-sm font-medium">Private</span>
                    <p className="text-xs text-muted-foreground">
                      Only collaborators and tree members can view this tree.
                    </p>
                  </div>
                </label>
              </div>

              <Button
                type="button"
                size="sm"
                disabled={privacyLoading}
                onClick={async () => {
                  setPrivacyLoading(true);
                  setPrivacySaved(false);
                  try {
                    const token = getAuthToken();
                    const res = await fetch(`${API_BASE_URL}/tree/${treeId}/privacy`, {
                      method: 'PATCH',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({ privacy }),
                    });
                    if (!res.ok) throw new Error('Failed to update privacy');
                    setPrivacySaved(true);
                    setTimeout(() => setPrivacySaved(false), 3000);
                  } catch (err) {
                    console.error('Error saving privacy:', err);
                  } finally {
                    setPrivacyLoading(false);
                  }
                }}
              >
                {privacyLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {privacySaved ? 'Saved!' : 'Save Privacy'}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </DialogFooter>
        </form>

      </DialogContent>
    </Dialog>
  );
}
