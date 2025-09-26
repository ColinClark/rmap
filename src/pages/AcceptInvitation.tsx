import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, CheckCircle, XCircle, UserPlus, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface InvitationDetails {
  email: string;
  tenantName: string;
  role: string;
  invitedBy: string;
  expiresAt: string;
}

export function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'validating' | 'accepting' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Invalid invitation link');
      return;
    }

    validateInvitation();
  }, [token]);

  const validateInvitation = async () => {
    setStatus('validating');
    try {
      const response = await fetch(`/api/invitations/validate/${token}`);
      const data = await response.json();

      if (!data.valid) {
        setStatus('error');
        setError(data.error || 'Invalid or expired invitation');
        return;
      }

      setInvitationDetails(data.invitation);

      // Check if user needs to login or register
      if (!isAuthenticated) {
        setStatus('loading');
        // Store token in session storage for after login/register
        sessionStorage.setItem('pendingInvitation', token);
      } else {
        // User is logged in, check if email matches
        if (user?.email.toLowerCase() !== data.invitation.email.toLowerCase()) {
          setStatus('error');
          setError('This invitation was sent to a different email address. Please login with the correct account.');
        } else {
          // Ready to accept
          setStatus('loading');
        }
      }
    } catch (err: any) {
      setStatus('error');
      setError('Failed to validate invitation');
    }
  };

  const acceptInvitation = async () => {
    if (!token) return;

    setStatus('accepting');
    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setStatus('success');
      // Clear the pending invitation
      sessionStorage.removeItem('pendingInvitation');

      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to accept invitation');
    }
  };

  if (status === 'validating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md px-4">
          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <CardTitle className="text-center">Validating Invitation</CardTitle>
              <CardDescription className="text-center">
                Please wait while we verify your invitation...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'accepting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md px-4">
          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <CardTitle className="text-center">Accepting Invitation</CardTitle>
              <CardDescription className="text-center">
                Adding you to {invitationDetails?.tenantName}...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md px-4">
          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="text-center">Welcome to {invitationDetails?.tenantName}!</CardTitle>
              <CardDescription className="text-center">
                You've been successfully added as a {invitationDetails?.role}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Redirecting to your dashboard...
              </p>
              <Link to="/dashboard">
                <Button className="w-full">
                  Go to Dashboard Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md px-4">
          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <XCircle className="h-12 w-12 text-red-500" />
              </div>
              <CardTitle className="text-center">Invitation Error</CardTitle>
              <CardDescription className="text-center">
                We couldn't process your invitation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>

              <Link to="/login">
                <Button variant="outline" className="w-full">
                  Go to Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (invitationDetails && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md px-4">
          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <UserPlus className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-center">You're Invited!</CardTitle>
              <CardDescription className="text-center">
                {invitationDetails.invitedBy} has invited you to join {invitationDetails.tenantName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Organization:</span>
                  <span className="font-medium">{invitationDetails.tenantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Role:</span>
                  <span className="font-medium capitalize">{invitationDetails.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{invitationDetails.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Link to={`/register?email=${encodeURIComponent(invitationDetails.email)}`}>
                  <Button className="w-full">
                    Create Account & Accept
                  </Button>
                </Link>
                <Link to={`/login?email=${encodeURIComponent(invitationDetails.email)}`}>
                  <Button variant="outline" className="w-full">
                    Already Have an Account? Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (invitationDetails && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md px-4">
          <Card>
            <CardHeader>
              <div className="flex justify-center mb-4">
                <UserPlus className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-center">Join {invitationDetails.tenantName}</CardTitle>
              <CardDescription className="text-center">
                You've been invited by {invitationDetails.invitedBy}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Role:</span>
                  <span className="font-medium capitalize">{invitationDetails.role}</span>
                </div>
              </div>

              <Button onClick={acceptInvitation} className="w-full">
                Accept Invitation
              </Button>

              <Link to="/dashboard">
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}