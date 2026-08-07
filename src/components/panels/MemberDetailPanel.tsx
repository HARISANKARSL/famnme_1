import { useEffect, useState } from 'react'
import { useResponsive } from '@/hooks/useResponsive'
import { useTreeStore } from '@/store/treeStore'
import type { FamilyMember } from '@/types'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Edit, UserPlus, Tag, MessageSquare, Trash2, MoreVertical, UserCheck, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  ResponsiveAlertDialogContent as AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'

interface MemberDetailPanelProps {
  onOpenRelationshipSelector: () => void
  onOpenEditPanel: () => void
}

export function MemberDetailPanel({ onOpenRelationshipSelector, onOpenEditPanel }: MemberDetailPanelProps) {
  const { isMobile } = useResponsive()
  const { selectedMemberId, members, setSelectedMemberId, deleteMember } = useTreeStore()
  const [member, setMember] = useState<FamilyMember | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (selectedMemberId) {
      const found = members?.find((m) => m.id === selectedMemberId)
      setMember((found as FamilyMember | undefined) || null)
    } else {
      setMember(null)
    }
  }, [selectedMemberId, members])

  if (!member) return null

  const displayName = member.display_name || `${member.first_name} ${member.last_name || ''}`.trim()
  const initials = `${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}`.toUpperCase()

  const birthYear = member.date_of_birth ? new Date(member.date_of_birth).getFullYear() : null
  const deathYear = member.date_of_death ? new Date(member.date_of_death).getFullYear() : null

  const handleDelete = async () => {
    try {
      await deleteMember?.(member.id)
      toast({
        title: 'Success',
        description: 'Family member deleted successfully',
      })
      setShowDeleteDialog(false)
      setSelectedMemberId(null)
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete member',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={() => setSelectedMemberId(null)}
      />

      {/* Right Sidebar */}
      <div className={`fixed ${isMobile ? 'inset-0' : 'right-0 top-0 h-full w-96'} bg-white shadow-2xl z-50 flex flex-col overflow-y-auto`}>
        {/* Header with Profile Photo and Info */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedMemberId(null)}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-start space-x-3">
            <Avatar className="h-14 w-14">
              {member.profile_photo_url && <AvatarImage src={member.profile_photo_url} />}
              <AvatarFallback className="bg-blue-400 text-white text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-sm text-gray-700 space-y-0.5">
                {birthYear && (
                  <div>
                    <span className="font-semibold">B:</span> {birthYear}
                  </div>
                )}
                <div>
                  <span className="font-semibold">D:</span>{' '}
                  {deathYear || <span className="text-green-600">Living</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="px-6 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-900">Profile</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-5 w-5 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#E8EDFF] border-[#2F3E8F]/30">
              <DropdownMenuItem onClick={onOpenEditPanel}>
                <Edit className="h-4 w-4 mr-2" />
                Quick edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenRelationshipSelector}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add relative
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserCheck className="h-4 w-4 mr-2" />
                Invite to tree
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Tag className="h-4 w-4 mr-2" />
                Add tag
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MessageSquare className="h-4 w-4 mr-2" />
                View comments
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete this person
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Profile Content */}
        <div className={`flex-1 p-6 space-y-6 overflow-y-auto ${isMobile ? 'pb-16' : ''}`}>
          <div className="space-y-4">
              {/* Basic Information */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-900">Basic Information</h3>
                <div className="space-y-2 text-sm">
                  {member.gender && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gender</span>
                      <span className="text-gray-900 font-medium">{member.gender}</span>
                    </div>
                  )}
                  {member.date_of_birth && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date of Birth</span>
                      <span className="text-gray-900 font-medium">
                        {(() => {
                          try {
                            const d = new Date(member.date_of_birth);
                            if (isNaN(d.getTime())) return member.date_of_birth;
                            const dd = String(d.getDate()).padStart(2, '0');
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const yy = String(d.getFullYear()).slice(-2);
                            return `${dd}-${mm}-${yy}`;
                          } catch {
                            return member.date_of_birth;
                          }
                        })()}
                      </span>
                    </div>
                  )}
                  {member.place_of_birth && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Place of Birth</span>
                      <span className="text-gray-900 font-medium">{member.place_of_birth}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Information */}
              {(member.occupation || member.marital_status || member.nationality) && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-900">Personal Details</h3>
                  <div className="space-y-2 text-sm">
                    {member.occupation && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Occupation</span>
                        <span className="text-gray-900 font-medium">{member.occupation}</span>
                      </div>
                    )}
                    {member.marital_status && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Marital Status</span>
                        <span className="text-gray-900 font-medium">{member.marital_status}</span>
                      </div>
                    )}
                    {member.nationality && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nationality</span>
                        <span className="text-gray-900 font-medium">{member.nationality}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Biography */}
              {member.biography && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-900">Biography</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words break-all">{member.biography}</p>
                </div>
              )}

              {/* Death Information */}
              {member.is_deceased && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-gray-900">Memorial Information</h3>
                  <div className="space-y-2 text-sm">
                    {member.date_of_death && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date of Death</span>
                        <span className="text-gray-900 font-medium">
                          {(() => {
                            try {
                              const d = new Date(member.date_of_death);
                              if (isNaN(d.getTime())) return member.date_of_death;
                              const dd = String(d.getDate()).padStart(2, '0');
                              const mm = String(d.getMonth() + 1).padStart(2, '0');
                              const yy = String(d.getFullYear()).slice(-2);
                              return `${dd}-${mm}-${yy}`;
                            } catch {
                              return member.date_of_death;
                            }
                          })()}
                        </span>
                      </div>
                    )}
                    {member.place_of_death && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Place of Death</span>
                        <span className="text-gray-900 font-medium">{member.place_of_death}</span>
                      </div>
                    )}
                    {member.burial_location && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Burial Location</span>
                        <span className="text-gray-900 font-medium">{member.burial_location}</span>
                      </div>
                    )}
                    {member.memorial_note && (
                      <div className="pt-2">
                        <span className="text-gray-600">Memorial Note</span>
                        <p className="text-gray-900 italic mt-1">{member.memorial_note}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {displayName} from your family tree. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
