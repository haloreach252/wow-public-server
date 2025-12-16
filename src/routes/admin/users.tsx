import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Users, Shield, FlaskConical, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                <Table>
                  <TableHeader>
                    <TableRow>
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
                      />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Roles</CardTitle>
              <CardDescription>
                View and manage user roles and environment access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No users found
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
                    {users.map((user) => (
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
}: {
  request: TesterRequest
  onReview: (id: string, approved: boolean, envs?: string[]) => void
  isLoading: boolean
}) {
  const [selectedEnvs, setSelectedEnvs] = useState<string[]>(['dev'])

  return (
    <TableRow>
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
