import { useState, useEffect } from 'react'
import { useResponsive } from '@/hooks/useResponsive'
import { useTreeStore } from '@/store/treeStore'
import type { FamilyMember } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, X } from 'lucide-react'

interface EditMemberPanelProps {
  memberId: string
  onClose: () => void
}

export function EditMemberPanel({ memberId, onClose }: EditMemberPanelProps) {
  const { isMobile } = useResponsive()
  const { members, updateMember } = useTreeStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [member, setMember] = useState<FamilyMember | null>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    placeOfBirth: '',
    isDeceased: false,
    dateOfDeath: '',
    placeOfDeath: '',
    burialLocation: '',
    occupation: '',
    nationality: '',
    biography: '',
  })

  useEffect(() => {
    const found = members?.find(m => m.id === memberId) as FamilyMember | undefined
    if (found) {
      setMember(found)
      setFormData({
        firstName: found.first_name || '',
        middleName: found.middle_name || '',
        lastName: found.last_name || '',
        gender: found.gender || '',
        dateOfBirth: found.date_of_birth || '',
        placeOfBirth: found.place_of_birth || '',
        isDeceased: found.is_deceased || false,
        dateOfDeath: found.date_of_death || '',
        placeOfDeath: found.place_of_death || '',
        burialLocation: found.burial_location || '',
        occupation: found.occupation || '',
        nationality: found.nationality || '',
        biography: found.biography || '',
      })
    }
  }, [memberId, members])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await updateMember?.(memberId, {
        first_name: formData.firstName,
        middle_name: formData.middleName || null,
        last_name: formData.lastName || null,
        gender: formData.gender || null,
        date_of_birth: formData.dateOfBirth || null,
        place_of_birth: formData.placeOfBirth || null,
        is_deceased: formData.isDeceased,
        date_of_death: formData.dateOfDeath || null,
        place_of_death: formData.placeOfDeath || null,
        burial_location: formData.burialLocation || null,
        occupation: formData.occupation || null,
        nationality: formData.nationality || null,
        biography: formData.biography || null,
      })

      toast({
        title: 'Success',
        description: 'Member details updated successfully!',
      })

      onClose()
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update member',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!member) return null

  const displayName = member.display_name || `${member.first_name} ${member.last_name || ''}`.trim()

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Right Sidebar Panel */}
      <div className={`fixed ${isMobile ? 'inset-0' : 'right-0 top-0 h-full w-96'} bg-white shadow-2xl z-50 flex flex-col`}>
        {/* Header */}
        <div className="p-6 border-b flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Edit {displayName}
            </h2>
            <p className="text-sm text-gray-600 mt-1">Update member information</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={`flex-1 overflow-y-auto p-6 space-y-6 ${isMobile ? 'pb-16' : ''}`}>
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-900">Basic Information</h3>

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
              <Label>Gender</Label>
              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="Male"
                    checked={formData.gender === 'Male'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="h-4 w-4 text-[#2F3E8F]"
                  />
                  <span className="text-sm">Male</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="Female"
                    checked={formData.gender === 'Female'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="h-4 w-4 text-[#2F3E8F]"
                  />
                  <span className="text-sm">Female</span>
                </label>
              </div>
            </div>
          </div>

          {/* Life Events */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-900">Life Events</h3>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="placeOfBirth">Place of Birth</Label>
              <Input
                id="placeOfBirth"
                value={formData.placeOfBirth}
                onChange={(e) => setFormData({ ...formData, placeOfBirth: e.target.value })}
                placeholder="City, State, Country"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isDeceased"
                checked={formData.isDeceased}
                onChange={(e) => setFormData({ ...formData, isDeceased: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isDeceased" className="cursor-pointer">Deceased</Label>
            </div>

            {formData.isDeceased && (
              <div className="space-y-4 pl-6 border-l-2 border-gray-200">
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
                  <Input
                    id="placeOfDeath"
                    value={formData.placeOfDeath}
                    onChange={(e) => setFormData({ ...formData, placeOfDeath: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="burialLocation">Burial Location</Label>
                  <Input
                    id="burialLocation"
                    value={formData.burialLocation}
                    onChange={(e) => setFormData({ ...formData, burialLocation: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-900">Additional Details</h3>

            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
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
          </div>

          {/* Biography */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-900">Biography</h3>

            <div className="space-y-2">
              <Label htmlFor="biography">Personal Notes</Label>
              <Textarea
                id="biography"
                value={formData.biography}
                onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
                rows={4}
                placeholder="Add stories, achievements, memories..."
                maxLength={300}
              />
            </div>
          </div>
        </form>

        {/* Footer Buttons */}
        <div className="p-6 border-t flex items-center justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#2F3E8F] hover:bg-[#3B4DA6]">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </>
  )
}
