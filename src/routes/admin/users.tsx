import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Users, Shield, FlaskConical, Loader2, CheckCircle2, XCircle, RefreshCw, Search } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardSkeleton } from '@/components/ui/skeletons'
import { getSession } from '@/lib/auth'
import { listUsersWithRoles, updateUserRole, getMyRole } from '@/lib/user-role'
import { getPendingRequests, reviewTesterRequest, getAllRequests } from '@/lib/tester-request'
import { toast } from 'sonner'
import type { Role } from '@/lib/user-role'

export const Route = createFileRoute('/admin/users')({
  component: AdminUsersPage,
})

function AdminUsersPage() {
  return (
    <ProtectedRoute>
      <AdminUsersContent />
    </ProtectedRoute>
  )
}

interface UserRole {
  id: string
  supabaseUserId: string
  role: Role
  allowedEnvs: string[]
  createdAt: Date
  updatedAt: Date
}

interface TesterRequest {
  id: string
  supabaseUserId: string
  email: string
  reason: string | null
  status: string
  reviewedBy: string | null
  reviewedAt: Date | null
  createdAt: Date
}

const AVAILABLE_ENVS = ['dev', 'test', 'live']

function AdminUsersContent() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [users, setUsers] = useState<UserRole[]>([])
  const [pendingRequests, setPendingRequests] = useState<TesterRequest[]>([])
  const [allRequests, setAllRequests] = useState<TesterRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')

  // Bulk action state
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' ||
      user.supabaseUserId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const toggleRequestSelection = (id: string) => {
    setSelectedRequests(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAllRequests = () => {
    if (selectedRequests.size === pendingRequests.length) {
      setSelectedRequests(new Set())
    } else {
      setSelectedRequests(new Set(pendingRequests.map(r => r.id)))
    }
  }

  const loadData = async () => {
    const session = await getSession()
    if (!session?.access_token) {
      setIsAdmin(false)
      setLoading(false)
      return
    }

    // Check if current user is admin
    const roleResult = await getMyRole({ data: { accessToken: session.access_token } })
    if (!roleResult.success || roleResult.role !== 'admin') {
      setIsAdmin(false)
      setLoading(false)
      return
    }

    setIsAdmin(true)

    // Load users
    const usersResult = await listUsersWithRoles({ data: { adminAccessToken: session.access_token } })
    if (usersResult.success && usersResult.users) {
      setUsers(usersResult.users as UserRole[])
    }

    // Load pending requests
    const pendingResult = await getPendingRequests({ data: { adminAccessToken: session.access_token } })
    if (pendingResult.success && pendingResult.requests) {
      setPendingRequests(pendingResult.requests as TesterRequest[])
    }

    // Load all requests
    const allResult = await getAllRequests({ data: { adminAccessToken: session.access_token } })
    if (allResult.success && allResult.requests) {
      setAllRequests(allResult.requests as TesterRequest[])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setActionLoading(userId)
    const session = await getSession()
    if (!session?.access_token) {
      toast.error('Not authenticated')
      setActionLoading(null)
      return
    }

    const result = await updateUserRole({
      data: {
        adminAccessToken: session.access_token,
        targetUserId: userId,
        role: newRole,
        allowedEnvs: newRole === 'tester' ? ['dev'] : [],
      },
    })

    if (result.success) {
      toast.success('Role updated successfully')
      await loadData()
    } else {
      toast.error(result.error || 'Failed to update role')
    }
    setActionLoading(null)
  }

  const handleEnvsChange = async (userId: string, currentRole: Role, envs: string[]) => {
    setActionLoading(userId)
    const session = await getSession()
    if (!session?.access_token) {
      toast.error('Not authenticated')
      setActionLoading(null)
      return
    }

    const result = await updateUserRole({
      data: {
        adminAccessToken: session.access_token,
        targetUserId: userId,
        role: currentRole,
        allowedEnvs: envs,
      },
    })

    if (result.success) {
      toast.success('Environments updated successfully')
      await loadData()
    } else {
      toast.error(result.error || 'Failed to update environments')
    }
    setActionLoading(null)
  }

  const handleReviewRequest = async (requestId: string, approved: boolean, envs?: string[]) => {
    setActionLoading(requestId)
    const session = await getSession()
    if (!session?.access_token) {
      toast.error('Not authenticated')
      setActionLoading(null)
      return
    }

    const result = await reviewTesterRequest({
      data: {
        adminAccessToken: session.access_token,
        requestId,
        approved,
        allowedEnvs: envs,
      },
    })

    if (result.success) {
      toast.success(approved ? 'Request approved' : 'Request denied')
      await loadData()
    } else {
      toast.error(result.error || 'Failed to review request')
    }
    setActionLoading(null)
  }

  const handleBulkApprove = async (envs: string[]) => {
    if (selectedRequests.size === 0) return
    setBulkLoading(true)

    const session = await getSession()
    if (!session?.access_token) {
      toast.error('Not authenticated')
      setBulkLoading(false)
      return
    }

    let successCount = 0
    let failCount = 0

    for (const requestId of selectedRequests) {
      const result = await reviewTesterRequest({
        data: {
          adminAccessToken: session.access_token,
          requestId,
          approved: true,
          allowedEnvs: envs,
        },
      })
      if (result.success) {
        successCount++
      } else {
        failCount++
      }
    }

    if (successCount > 0) {
      toast.success(`Approved ${successCount} request(s)`)
    }
    if (failCount > 0) {
      toast.error(`Failed to approve ${failCount} request(s)`)
    }

    setSelectedRequests(new Set())
    await loadData()
    setBulkLoading(false)
  }

  const handleBulkDeny = async () => {
    if (selectedRequests.size === 0) return
    setBulkLoading(true)

    const session = await getSession()
    if (!session?.access_token) {
      toast.error('Not authenticated')
      setBulkLoading(false)
      return
    }

    let successCount = 0
    let failCount = 0

    for (const requestId of selectedRequests) {
      const result = await reviewTesterRequest({
        data: {
          adminAccessToken: session.access_token,
          requestId,
          approved: false,
        },
      })
      if (result.success) {
        successCount++
      } else {
        failCount++
      }
    }

    if (successCount > 0) {
      toast.success(`Denied ${successCount} request(s)`)
    }
    if (failCount > 0) {
      toast.error(`Failed to deny ${failCount} request(s)`)
    }

    setSelectedRequests(new Set())
    await loadData()
    setBulkLoading(false)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <DashboardSkeleton />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to access this page.</p>
            <Button asChild className="mt-4">
              <Link to="/account">Back to Account</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <Link
            to="/account"
            className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Shield className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage user roles and tester requests
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="requests" className="relative">
            <FlaskConical className="h-4 w-4 mr-2" />
            Tester Requests
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            All Users
          </TabsTrigger>
          <TabsTrigger value="history">
            Request History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Pending Tester Requests</CardTitle>
              <CardDescription>
                Review and approve users requesting tester access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No pending requests
                </p>
              ) : (
                <>
                  {/* Bulk Action Bar */}
                  {selectedRequests.size > 0 && (
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium">
                        {selectedRequests.size} request{selectedRequests.size > 1 ? 's' : ''} selected
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <BulkEnvSelector
                          onApprove={handleBulkApprove}
                          onDeny={handleBulkDeny}
                          isLoading={bulkLoading}
                          disabled={selectedRequests.size === 0}
                        />
                      </div>
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={selectedRequests.size === pendingRequests.length && pendingRequests.length > 0}
                            onCheckedChange={toggleAllRequests}
                            aria-label="Select all requests"
                          />
                        </TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Environments</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <RequestRow
                          key={request.id}
                          request={request}
                          onReview={handleReviewRequest}
                          isLoading={actionLoading === request.id}
                          isSelected={selectedRequests.has(request.id)}
                          onToggleSelect={() => toggleRequestSelection(request.id)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>User Roles</CardTitle>
                  <CardDescription>
                    View and manage user roles and environment access
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by user ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-full sm:w-48"
                    />
                  </div>
                  <Select
                    value={roleFilter}
                    onValueChange={(value) => setRoleFilter(value as Role | 'all')}
                  >
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Filter role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="tester">Tester</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {users.length === 0 ? 'No users found' : 'No users match your search'}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Allowed Environments</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-xs">
                          {user.supabaseUserId.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleRoleChange(user.supabaseUserId, value as Role)}
                            disabled={actionLoading === user.supabaseUserId}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="tester">Tester</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {user.role === 'admin' ? (
                            <Badge variant="secondary">All</Badge>
                          ) : user.role === 'tester' ? (
                            <EnvSelector
                              selectedEnvs={user.allowedEnvs}
                              onChange={(envs) => handleEnvsChange(user.supabaseUserId, user.role, envs)}
                              disabled={actionLoading === user.supabaseUserId}
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Request History</CardTitle>
              <CardDescription>
                All tester access requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No requests found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Reviewed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              request.status === 'approved'
                                ? 'default'
                                : request.status === 'denied'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {request.reviewedAt
                            ? new Date(request.reviewedAt).toLocaleDateString()
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RequestRow({
  request,
  onReview,
  isLoading,
  isSelected,
  onToggleSelect,
}: {
  request: TesterRequest
  onReview: (id: string, approved: boolean, envs?: string[]) => void
  isLoading: boolean
  isSelected: boolean
  onToggleSelect: () => void
}) {
  const [selectedEnvs, setSelectedEnvs] = useState<string[]>(['dev'])

  return (
    <TableRow className={isSelected ? 'bg-muted/50' : undefined}>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          aria-label={`Select request from ${request.email}`}
        />
      </TableCell>
      <TableCell>{request.email}</TableCell>
      <TableCell className="max-w-xs">
        {request.reason ? (
          <span className="text-sm text-muted-foreground line-clamp-2">
            {request.reason}
          </span>
        ) : (
          <span className="text-muted-foreground italic">No reason provided</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {new Date(request.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_ENVS.map((env) => (
            <Label key={env} className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={selectedEnvs.includes(env)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedEnvs([...selectedEnvs, env])
                  } else {
                    setSelectedEnvs(selectedEnvs.filter((e) => e !== env))
                  }
                }}
                disabled={isLoading}
              />
              <span className="text-sm">{env}</span>
            </Label>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onReview(request.id, false)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => onReview(request.id, true, selectedEnvs)}
            disabled={isLoading || selectedEnvs.length === 0}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function EnvSelector({
  selectedEnvs,
  onChange,
  disabled,
}: {
  selectedEnvs: string[]
  onChange: (envs: string[]) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {AVAILABLE_ENVS.map((env) => (
        <Label key={env} className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox
            checked={selectedEnvs.includes(env)}
            onCheckedChange={(checked) => {
              if (checked) {
                onChange([...selectedEnvs, env])
              } else {
                onChange(selectedEnvs.filter((e) => e !== env))
              }
            }}
            disabled={disabled}
          />
          <span className="text-sm">{env}</span>
        </Label>
      ))}
    </div>
  )
}

function BulkEnvSelector({
  onApprove,
  onDeny,
  isLoading,
  disabled,
}: {
  onApprove: (envs: string[]) => void
  onDeny: () => void
  isLoading: boolean
  disabled: boolean
}) {
  const [bulkEnvs, setBulkEnvs] = useState<string[]>(['dev'])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Envs:</span>
        {AVAILABLE_ENVS.map((env) => (
          <Label key={env} className="flex items-center gap-1.5 cursor-pointer">
            <Checkbox
              checked={bulkEnvs.includes(env)}
              onCheckedChange={(checked) => {
                if (checked) {
                  setBulkEnvs([...bulkEnvs, env])
                } else {
                  setBulkEnvs(bulkEnvs.filter((e) => e !== env))
                }
              }}
              disabled={isLoading || disabled}
            />
            <span className="text-sm">{env}</span>
          </Label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onDeny}
          disabled={isLoading || disabled}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <XCircle className="h-4 w-4 mr-1" />
          )}
          Deny All
        </Button>
        <Button
          size="sm"
          onClick={() => onApprove(bulkEnvs)}
          disabled={isLoading || disabled || bulkEnvs.length === 0}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-1" />
          )}
          Approve All
        </Button>
      </div>
    </div>
  )
}
