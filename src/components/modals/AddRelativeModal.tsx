import { useState, useEffect } from 'react'
import { useTreeStore } from '@/store/treeStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, X } from 'lucide-react'
import { RelationshipBreadcrumb, buildRelationshipChain } from '@/components/ui/RelationshipBreadcrumb'

interface AddRelativeModalProps {
  open: boolean
  onClose: () => void
  memberName: string
  memberId: string
  relationship: 'father' | 'mother' | 'brother' | 'sister' | 'spouse' | 'son' | 'daughter'
  placeholderPosition?: { x: number; y: number }
}

// Layout constants - should match treeLayout.ts
const VERTICAL_SPACING = 300
const HORIZONTAL_SPACING = 300

export function AddRelativeModal({ open, onClose, memberName, memberId, relationship }: AddRelativeModalProps) {
  const { createMember, createRelationship, tree, members, relationships } = useTreeStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isNewPerson, setIsNewPerson] = useState(true)
  const [selectedParentOption, setSelectedParentOption] = useState<'both' | 'unknown-mother' | 'unknown-father'>('both')

  const [formData, setFormData] = useState({
    firstMiddleName: '',
    lastName: '',
    suffix: '',
    gender: '',
    status: 'living',
    birthdate: '',
    birthplace: '',
  })

  // Auto-set gender based on relationship type
  useEffect(() => {
    if (relationship === 'father' || relationship === 'son' || relationship === 'brother') {
      setFormData(prev => ({ ...prev, gender: 'Male' }))
    } else if (relationship === 'mother' || relationship === 'daughter' || relationship === 'sister') {
      setFormData(prev => ({ ...prev, gender: 'Female' }))
    }
  }, [relationship])

  // Get reference member's parents
  const getReferenceParents = () => {
    const parentRelationships = (relationships ?? []).filter(
      rel => rel.to_member_id === memberId && rel.relationship_type === 'family'
    )

    const father = parentRelationships
      .map(rel => (members ?? []).find(m => m.id === rel.from_member_id && m.gender === 'Male'))
      .find(p => p !== undefined)

    const mother = parentRelationships
      .map(rel => (members ?? []).find(m => m.id === rel.from_member_id && m.gender === 'Female'))
      .find(p => p !== undefined)

    return { father, mother }
  }

  const getRelationshipTitle = () => {
    switch (relationship) {
      case 'father':
      case 'mother':
        return `Add a parent for ${memberName}`
      case 'son':
      case 'daughter':
        return `Add a child for ${memberName}`
      case 'brother':
      case 'sister':
        return `Add a sibling for ${memberName}`
      case 'spouse':
        return `Add a spouse for ${memberName}`
      default:
        return `Add a relative for ${memberName}`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Check if tree exists
      if (!tree) {
        toast({
          title: 'No Tree Found',
          description: 'Please reload the page. The family tree is not loaded yet.',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }
      // Split first and middle name
      const names = formData.firstMiddleName.trim().split(' ')
      const firstName = names[0] || ''
      const middleName = names.slice(1).join(' ') || null

      // Automatically determine gender based on relationship
      let gender = formData.gender || null
      if (relationship === 'father') gender = 'Male'
      else if (relationship === 'mother') gender = 'Female'
      else if (relationship === 'son') gender = 'Male'
      else if (relationship === 'daughter') gender = 'Female'
      else if (relationship === 'brother') gender = 'Male'
      else if (relationship === 'sister') gender = 'Female'

      // Calculate position based on relationship and current member position
      // For parents added through placeholders, use temporary position (0,0)
      // and let calculateTreeLayout handle the actual positioning
      const currentMember = (members ?? []).find(m => m.id === memberId)
      let position_x = 0
      let position_y = 0

      // For parents (father/mother), always use (0,0) and let layout calculation handle it
      // This ensures proper hierarchical positioning
      if (relationship === 'father' || relationship === 'mother') {
        position_x = 0
        position_y = 0
      } else if (currentMember) {
        const baseX = currentMember.position_x
        const baseY = currentMember.position_y

        // Calculate position based on relationship type for non-parents
        if (relationship === 'son' || relationship === 'daughter') {
          // Children go below the parent
          // Count existing children to offset horizontally
          const existingChildren = (members ?? []).filter(m => {
            // Find members that have this member as a parent
            return (relationships ?? []).some(rel =>
              rel.from_member_id === memberId && rel.to_member_id === m.id
            )
          })
          position_x = baseX + (existingChildren.length * HORIZONTAL_SPACING) - (existingChildren.length * HORIZONTAL_SPACING / 2)
          position_y = baseY + VERTICAL_SPACING
        } else if (relationship === 'brother' || relationship === 'sister') {
          // Siblings go at the same level, offset horizontally
          position_x = baseX + HORIZONTAL_SPACING
          position_y = baseY
        } else if (relationship === 'spouse') {
          // Spouse goes at the same level, offset horizontally
          position_x = baseX + HORIZONTAL_SPACING
          position_y = baseY
        }
      }

      const memberResult = await createMember?.({
        first_name: firstName,
        middle_name: middleName,
        last_name: formData.lastName || null,
        gender,
        date_of_birth: formData.birthdate || null,
        place_of_birth: formData.birthplace || null,
        is_deceased: formData.status === 'deceased',
        relationship_to_primary: relationship.charAt(0).toUpperCase() + relationship.slice(1),
        is_primary_user: false,
        position_x,
        position_y,
      }) as { id: string } | undefined
      if (!memberResult) throw new Error('Failed to create member')
      const member = memberResult

      // Create relationship if context is provided
      if (tree) {
        // Determine the correct direction for the relationship
        // For parents (father, mother): parent -> child
        // For children (son, daughter): parent -> child
        // For siblings: connect to the same parents as the reference sibling
        // For spouse: create spouse relationship
        const isParentRelationship = relationship === 'father' || relationship === 'mother'
        const isSibling = relationship === 'brother' || relationship === 'sister'

        if (isSibling) {
          // Find the parents of the reference member
          const { father, mother } = getReferenceParents()

          // Create relationships based on selected parent option
          if (selectedParentOption === 'both') {
            // Both parents
            if (father) {
              await createRelationship?.({
                tree_id: tree.id,
                from_member_id: father.id,
                to_member_id: member.id,
                relationship_type: 'family',
              })
            }
            if (mother) {
              await createRelationship?.({
                tree_id: tree.id,
                from_member_id: mother.id,
                to_member_id: member.id,
                relationship_type: 'family',
              })
            }
          } else if (selectedParentOption === 'unknown-mother') {
            // Only father
            if (father) {
              await createRelationship?.({
                tree_id: tree.id,
                from_member_id: father.id,
                to_member_id: member.id,
                relationship_type: 'family',
              })
            }
          } else if (selectedParentOption === 'unknown-father') {
            // Only mother
            if (mother) {
              await createRelationship?.({
                tree_id: tree.id,
                from_member_id: mother.id,
                to_member_id: member.id,
                relationship_type: 'family',
              })
            }
          }

          // If no parents found, show a warning
          if (!father && !mother) {
            toast({
              title: 'Note',
              description: 'No parents found for the reference member. You may need to add parent relationships manually.',
              variant: 'default',
            })
          }
        } else {
          // Standard relationship creation for non-siblings
          await createRelationship?.({
            tree_id: tree.id,
            from_member_id: isParentRelationship ? member.id : memberId,
            to_member_id: isParentRelationship ? memberId : member.id,
            relationship_type: relationship === 'spouse' ? 'spouse' : 'family',
          })

          // If adding a parent (father or mother), also create spouse relationship with other parent if exists
          if (isParentRelationship) {
            const { father, mother } = getReferenceParents()

            // If adding father and mother exists, create spouse relationship
            if (relationship === 'father' && mother) {
              await createRelationship?.({
                tree_id: tree.id,
                from_member_id: member.id,
                to_member_id: mother.id,
                relationship_type: 'spouse',
              })
            }

            // If adding mother and father exists, create spouse relationship
            if (relationship === 'mother' && father) {
              await createRelationship?.({
                tree_id: tree.id,
                from_member_id: father.id,
                to_member_id: member.id,
                relationship_type: 'spouse',
              })
            }
          }
        }
      }

      toast({
        title: 'Success',
        description: 'Family member added successfully!',
      })

      // Reset form
      setFormData({
        firstMiddleName: '',
        lastName: '',
        suffix: '',
        gender: '',
        status: 'living',
        birthdate: '',
        birthplace: '',
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

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Right Sidebar Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">
              {getRelationshipTitle()}
            </h2>
            {/* Breadcrumb Trail */}
            <div className="mt-3">
              <RelationshipBreadcrumb
                steps={buildRelationshipChain(
                  relationship,
                  memberName,
                  (members ?? []).find(m => m.is_primary_user)
                    ? {
                        name: `${(members ?? []).find(m => m.is_primary_user)!.first_name} ${(members ?? []).find(m => m.is_primary_user)!.last_name || ''}`.trim()
                      }
                    : undefined
                )}
              />
            </div>
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* New person / From your tree */}
          <div className="flex items-center space-x-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                checked={isNewPerson}
                onChange={() => setIsNewPerson(true)}
                className="h-5 w-5 text-[#2F3E8F]"
              />
              <span className="text-base font-medium">New person</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                checked={!isNewPerson}
                onChange={() => setIsNewPerson(false)}
                className="h-5 w-5 text-[#2F3E8F]"
              />
              <span className="text-base font-medium">From your tree</span>
            </label>
          </div>

          {/* Parent Selection for Siblings */}
          {isNewPerson && (relationship === 'brother' || relationship === 'sister') && (() => {
            const { father, mother } = getReferenceParents()
            const fatherName = father ? `${father.first_name} ${father.last_name || ''}`.trim() : 'Unknown father'
            const motherName = mother ? `${mother.first_name} ${mother.last_name || ''}`.trim() : 'Unknown mother'

            return (
              <div className="space-y-2">
                <Label className="text-base font-semibold">Parents</Label>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="parentOption"
                      checked={selectedParentOption === 'both'}
                      onChange={() => setSelectedParentOption('both')}
                      className="h-5 w-5 text-[#2F3E8F]"
                    />
                    <span className="text-base">{fatherName} and {motherName}</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="parentOption"
                      checked={selectedParentOption === 'unknown-mother'}
                      onChange={() => setSelectedParentOption('unknown-mother')}
                      className="h-5 w-5 text-[#2F3E8F]"
                    />
                    <span className="text-base">Unknown mother and {fatherName}</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="parentOption"
                      checked={selectedParentOption === 'unknown-father'}
                      onChange={() => setSelectedParentOption('unknown-father')}
                      className="h-5 w-5 text-[#2F3E8F]"
                    />
                    <span className="text-base">Unknown father and {motherName}</span>
                  </label>
                </div>
              </div>
            )
          })()}

          {isNewPerson && (
            <>
              {/* First and middle name */}
              <div className="space-y-2">
                <Label htmlFor="firstMiddleName" className="text-base font-semibold">
                  First and middle name
                </Label>
                <Input
                  id="firstMiddleName"
                  value={formData.firstMiddleName}
                  onChange={(e) => setFormData({ ...formData, firstMiddleName: e.target.value })}
                  required
                  className="text-base"
                  maxLength={50}
                />
              </div>

              {/* Last name and Suffix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-base font-semibold">
                    Last name
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="text-base"
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suffix" className="text-base font-semibold">
                    Suffix
                  </Label>
                  <Input
                    id="suffix"
                    value={formData.suffix}
                    onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                    className="text-base"
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Gender</Label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="Male"
                      checked={formData.gender === 'Male'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      disabled={relationship === 'father' || relationship === 'mother' || relationship === 'son' || relationship === 'daughter' || relationship === 'brother' || relationship === 'sister'}
                      className="h-5 w-5 text-[#2F3E8F] disabled:opacity-50"
                    />
                    <span className={relationship === 'father' || relationship === 'mother' || relationship === 'son' || relationship === 'daughter' || relationship === 'brother' || relationship === 'sister' ? 'opacity-50' : ''}>Male</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="Female"
                      checked={formData.gender === 'Female'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      disabled={relationship === 'father' || relationship === 'mother' || relationship === 'son' || relationship === 'daughter' || relationship === 'brother' || relationship === 'sister'}
                      className="h-5 w-5 text-[#2F3E8F] disabled:opacity-50"
                    />
                    <span className={relationship === 'father' || relationship === 'mother' || relationship === 'son' || relationship === 'daughter' || relationship === 'brother' || relationship === 'sister' ? 'opacity-50' : ''}>Female</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="Unknown"
                      checked={formData.gender === 'Unknown'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      disabled={relationship === 'father' || relationship === 'mother' || relationship === 'son' || relationship === 'daughter' || relationship === 'brother' || relationship === 'sister'}
                      className="h-5 w-5 text-[#2F3E8F] disabled:opacity-50"
                    />
                    <span className={relationship === 'father' || relationship === 'mother' || relationship === 'son' || relationship === 'daughter' || relationship === 'brother' || relationship === 'sister' ? 'opacity-50' : ''}>Unknown</span>
                  </label>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Status</Label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="deceased"
                      checked={formData.status === 'deceased'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="h-5 w-5 text-[#2F3E8F]"
                    />
                    <span>Deceased</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="living"
                      checked={formData.status === 'living'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="h-5 w-5 text-[#2F3E8F]"
                    />
                    <span>Living</span>
                  </label>
                </div>
              </div>

              {/* Birthdate */}
              <div className="space-y-2">
                <Label htmlFor="birthdate" className="text-base font-semibold">
                  Birthdate
                </Label>
                <Input
                  id="birthdate"
                  type="date"
                  value={formData.birthdate}
                  onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                  className="text-base"
                />
              </div>

              {/* Birthplace */}
              <div className="space-y-2">
                <Label htmlFor="birthplace" className="text-base font-semibold">
                  Birthplace
                </Label>
                <Input
                  id="birthplace"
                  value={formData.birthplace}
                  onChange={(e) => setFormData({ ...formData, birthplace: e.target.value })}
                  placeholder="City, County, State, Country"
                  className="text-base"
                />
              </div>
            </>
          )}
        </form>

        {/* Footer Buttons */}
        <div className="p-6 border-t flex items-center justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-[#2F3E8F] hover:bg-[#3B4DA6]">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </>
  )
}
