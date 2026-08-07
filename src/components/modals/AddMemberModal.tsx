import { useState, useEffect } from 'react'
import { useTreeStore } from '@/store/treeStore'
import {
  Dialog,
  ResponsiveDialogContent as DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlaceAutocomplete } from '@/components/ui/PlaceAutocomplete'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { RELATIONSHIP_TYPES, MARITAL_STATUS } from '@/types'
import { Loader2 } from 'lucide-react'

interface RelationshipContext {
  memberId: string
  relationshipType: 'parent' | 'child' | 'spouse' | 'sibling'
}

interface AddMemberModalProps {
  open: boolean
  onClose: () => void
  relationshipContext?: RelationshipContext | null
}

export function AddMemberModal({ open, onClose, relationshipContext }: AddMemberModalProps) {
  const { createMember, createRelationship, tree } = useTreeStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Relationship
    relationship: '',

    // Basic Information
    firstName: '',
    middleName: '',
    lastName: '',
    maidenName: '',
    gender: '',

    // Life Events
    dateOfBirth: '',
    placeOfBirth: '',
    isDeceased: false,
    dateOfDeath: '',
    placeOfDeath: '',
    burialLocation: '',
    memorialNote: '',

    // Additional Details
    maritalStatus: '',
    occupation: '',
    nationality: '',
    ethnicity: '',

    // Biography
    biography: '',
  })

  const allRelationships = [
    ...Object.values(RELATIONSHIP_TYPES.IMMEDIATE),
    ...Object.values(RELATIONSHIP_TYPES.EXTENDED),
    ...Object.values(RELATIONSHIP_TYPES.OTHER),
  ]

  // Map relationship type to a default relationship string
  const getDefaultRelationship = (type: string) => {
    switch (type) {
      case 'parent':
        return RELATIONSHIP_TYPES.IMMEDIATE.FATHER // Can be changed by user
      case 'child':
        return RELATIONSHIP_TYPES.IMMEDIATE.SON
      case 'spouse':
        return RELATIONSHIP_TYPES.IMMEDIATE.SPOUSE
      case 'sibling':
        return RELATIONSHIP_TYPES.IMMEDIATE.BROTHER
      default:
        return ''
    }
  }

  // Pre-fill relationship when context is provided
  useEffect(() => {
    if (relationshipContext) {
      setFormData(prev => ({
        ...prev,
        relationship: getDefaultRelationship(relationshipContext.relationshipType)
      }))
    }
  }, [relationshipContext])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const member = await createMember?.({
        first_name: formData.firstName,
        middle_name: formData.middleName || null,
        last_name: formData.lastName || null,
        maiden_name: formData.maidenName || null,
        gender: formData.gender || null,
        date_of_birth: formData.dateOfBirth || null,
        place_of_birth: formData.placeOfBirth || null,
        is_deceased: formData.isDeceased,
        date_of_death: formData.dateOfDeath || null,
        place_of_death: formData.placeOfDeath || null,
        burial_location: formData.burialLocation || null,
        memorial_note: formData.memorialNote || null,
        marital_status: formData.maritalStatus || null,
        occupation: formData.occupation || null,
        nationality: formData.nationality || null,
        ethnicity: formData.ethnicity || null,
        biography: formData.biography || null,
        relationship_to_primary: formData.relationship,
        is_primary_user: false,
        position_x: Math.random() * 400 - 200,
        position_y: Math.random() * 400 - 200,
      })

      // Create relationship if context is provided
      if (relationshipContext && tree) {
        await createRelationship?.({
          tree_id: tree.id,
          from_member_id: relationshipContext.memberId,
          to_member_id: (member as { id: string }).id,
          relationship_type: formData.relationship.toLowerCase().includes('spouse') ? 'spouse' : 'family',
        })
      }

      toast({
        title: 'Success',
        description: 'Family member added successfully!',
      })

      // Reset form
      setFormData({
        relationship: '',
        firstName: '',
        middleName: '',
        lastName: '',
        maidenName: '',
        gender: '',
        dateOfBirth: '',
        placeOfBirth: '',
        isDeceased: false,
        dateOfDeath: '',
        placeOfDeath: '',
        burialLocation: '',
        memorialNote: '',
        maritalStatus: '',
        occupation: '',
        nationality: '',
        ethnicity: '',
        biography: '',
      })

      onClose()
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add family member',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Family Member</DialogTitle>
          <DialogDescription>
            Add a new member to your family tree
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Relationship */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold text-sm">Relationship</h3>
            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship to Primary User *</Label>
              <Select
                value={formData.relationship}
                onValueChange={(value) => setFormData({ ...formData, relationship: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {allRelationships.map((rel) => (
                    <SelectItem key={rel} value={rel}>
                      {rel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 2: Basic Information */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold text-sm">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maidenName">Maiden Name</Label>
                <Input
                  id="maidenName"
                  value={formData.maidenName}
                  onChange={(e) => setFormData({ ...formData, maidenName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section 3: Life Events */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold text-sm">Life Events</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placeOfBirth">Place of Birth</Label>
                <PlaceAutocomplete
                  value={formData.placeOfBirth}
                  onChange={(val) => setFormData({ ...formData, placeOfBirth: val })}
                  placeholder="Search for a place..."
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDeceased"
                checked={formData.isDeceased}
                onChange={(e) => setFormData({ ...formData, isDeceased: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isDeceased">Deceased</Label>
            </div>

            {formData.isDeceased && (
              <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfDeath">Date of Death</Label>
                    <Input
                      id="dateOfDeath"
                      type="date"
                      value={formData.dateOfDeath}
                      onChange={(e) => setFormData({ ...formData, dateOfDeath: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="placeOfDeath">Place of Death</Label>
                    <PlaceAutocomplete
                      value={formData.placeOfDeath}
                      onChange={(val) => setFormData({ ...formData, placeOfDeath: val })}
                      placeholder="Search for a place..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="burialLocation">Burial Location</Label>
                  <Input
                    id="burialLocation"
                    value={formData.burialLocation}
                    onChange={(e) => setFormData({ ...formData, burialLocation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memorialNote">Memorial Note</Label>
                  <Textarea
                    id="memorialNote"
                    value={formData.memorialNote}
                    onChange={(e) => setFormData({ ...formData, memorialNote: e.target.value })}
                    rows={2}
                    maxLength={200}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Additional Details */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold text-sm">Additional Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maritalStatus">Marital Status</Label>
                <Select
                  value={formData.maritalStatus}
                  onValueChange={(value) => setFormData({ ...formData, maritalStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARITAL_STATUS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ethnicity">Ethnicity</Label>
                <Input
                  id="ethnicity"
                  value={formData.ethnicity}
                  onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 5: Biography */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Biography & Notes</h3>
            <div className="space-y-2">
              <Label htmlFor="biography">Personal Notes</Label>
              <Textarea
                id="biography"
                value={formData.biography}
                onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
                rows={4}
                maxLength={300}
                placeholder="Add stories, achievements, memories, or any important information about this person..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Family Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
