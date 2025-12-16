import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FlaskConical, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { FormSkeleton } from '@/components/ui/skeletons'
import { getSession } from '@/lib/auth'
import { submitTesterRequest, getMyTesterRequest } from '@/lib/tester-request'
import { getMyRole } from '@/lib/user-role'
import { adminQueryKeys } from '@/routes/admin/users'
import { toast } from 'sonner'

// Query keys for tester request
export const testerRequestQueryKeys = {
  myRequest: () => ['tester-request', 'my-request'] as const,
  myRole: () => ['tester-request', 'my-role'] as const,
}

export const Route = createFileRoute('/account/tester-request')({
  component: TesterRequestPage,
})

function TesterRequestPage() {
  return (
    <ProtectedRoute>
      <TesterRequestContent />
    </ProtectedRoute>
  )
}

function TesterRequestContent() {
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')

  // Query for current role
  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: testerRequestQueryKeys.myRole(),
    queryFn: async () => {
      const session = await getSession()
      if (!session?.access_token) return { role: null }
      const result = await getMyRole({ data: { accessToken: session.access_token } })
      return { role: result.success ? result.role : null }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Query for existing request
  const { data: requestData, isLoading: requestLoading } = useQuery({
    queryKey: testerRequestQueryKeys.myRequest(),
    queryFn: async () => {
      const session = await getSession()
      if (!session?.access_token) return { request: null }
      const result = await getMyTesterRequest({ data: { accessToken: session.access_token } })
      if (result.success && result.request) {
        return {
          request: {
            status: result.request.status,
            createdAt: result.request.createdAt.toString(),
          },
        }
      }
      return { request: null }
    },
    staleTime: 30 * 1000, // 30 seconds
  })

  // Mutation for submitting request
  const submitMutation = useMutation({
    mutationFn: async (reason: string) => {
      const session = await getSession()
      if (!session?.access_token) throw new Error('Please log in again')
      const result = await submitTesterRequest({
        data: { accessToken: session.access_token, reason },
      })
      if (!result.success) throw new Error(result.error || 'Failed to submit request')
      return result
    },
    onSuccess: () => {
      toast.success('Request submitted! An admin will review it soon.')
      // Invalidate local queries
      queryClient.invalidateQueries({ queryKey: testerRequestQueryKeys.myRequest() })
      // Invalidate admin queries so they see the new request immediately
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.pendingRequests() })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.allRequests() })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const currentRole = roleData?.role ?? null
  const existingRequest = requestData?.request ?? null
  const checkingStatus = roleLoading || requestLoading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    submitMutation.mutate(reason)
  }

  const handleNewRequest = () => {
    // Clear the cached request to allow submitting a new one
    queryClient.setQueryData(testerRequestQueryKeys.myRequest(), { request: null })
  }

  if (checkingStatus) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <div className="h-6 w-48 bg-muted rounded animate-pulse" />
              <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
            </CardHeader>
            <CardContent>
              <FormSkeleton />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // If user already has elevated access
  if (currentRole && currentRole !== 'user') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            to="/account"
            className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">Tester Access</h1>
        </div>

        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                You Have {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)} Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {currentRole === 'admin'
                  ? 'As an admin, you have full access to all environments.'
                  : 'You already have tester access. You can access development environments in the patcher.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/account"
          className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mb-2">Request Tester Access</h1>
        <p className="text-muted-foreground">
          Get access to development and test environments
        </p>
      </div>

      <div className="max-w-2xl">
        {existingRequest ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {existingRequest.status === 'pending' && <Clock className="h-5 w-5 text-yellow-500" />}
                {existingRequest.status === 'approved' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {existingRequest.status === 'denied' && <XCircle className="h-5 w-5 text-red-500" />}
                Request {existingRequest.status.charAt(0).toUpperCase() + existingRequest.status.slice(1)}
              </CardTitle>
              <CardDescription>
                Submitted on {new Date(existingRequest.createdAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {existingRequest.status === 'pending' && (
                <p>Your request is being reviewed. You'll be notified when it's processed.</p>
              )}
              {existingRequest.status === 'approved' && (
                <p>Your request was approved! You can now access development environments in the patcher.</p>
              )}
              {existingRequest.status === 'denied' && (
                <div className="space-y-4">
                  <p>Your request was denied. You may submit a new request if you'd like to try again.</p>
                  <Button
                    onClick={handleNewRequest}
                    variant="outline"
                  >
                    Submit New Request
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Request Tester Access
              </CardTitle>
              <CardDescription>
                Testers get early access to new features and can help find bugs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reason">Why do you want tester access? (optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Tell us about your experience with WoW private servers, testing, or why you'd be a good tester..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    disabled={submitMutation.isPending}
                  />
                </div>

                <Button type="submit" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
