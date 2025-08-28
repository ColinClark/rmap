import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TenantSettings } from './pages/TenantSettings';
import { RetailMediaWorkflow } from './workflows/RetailMediaWorkflow';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <TenantProvider>
            <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              
              {/* Workflows */}
              <Route
                path="workflows/retail-media"
                element={
                  <ProtectedRoute requiredPermission="retail_media">
                    <RetailMediaWorkflow />
                  </ProtectedRoute>
                }
              />
              
              {/* Profile & Settings */}
              <Route
                path="profile"
                element={
                  <div className="container mx-auto px-4 py-8">
                    <h1 className="text-3xl font-bold">Profile</h1>
                    <p className="text-muted-foreground mt-2">Manage your profile settings</p>
                  </div>
                }
              />
              <Route
                path="settings"
                element={
                  <div className="container mx-auto px-4 py-8">
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-muted-foreground mt-2">Configure your preferences</p>
                  </div>
                }
              />
              
              {/* Organization Settings */}
              <Route
                path="organization"
                element={
                  <ProtectedRoute>
                    <TenantSettings />
                  </ProtectedRoute>
                }
              />
              
              {/* Admin routes */}
              <Route
                path="admin"
                element={
                  <ProtectedRoute requiredPermission="admin">
                    <div className="container mx-auto px-4 py-8">
                      <h1 className="text-3xl font-bold">Admin Panel</h1>
                      <p className="text-muted-foreground mt-2">System administration</p>
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute requiredPermission="admin">
                    <div className="container mx-auto px-4 py-8">
                      <h1 className="text-3xl font-bold">User Management</h1>
                      <p className="text-muted-foreground mt-2">Manage system users</p>
                    </div>
                  </ProtectedRoute>
                }
              />
            </Route>
            
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </TenantProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}