import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  User,
  Settings,
  LogOut,
  TrendingUp,
  Bell,
  Menu,
  X,
  Shield,
  Users,
  Home,
  ChevronLeft,
  Building2
} from 'lucide-react';
import { cn } from '../lib/utils';

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isWorkflowActive = location.pathname.includes('/workflows/');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation Bar */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left section */}
            <div className="flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              
              <Link 
                to="/dashboard" 
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                onClick={(e) => {
                  // Ensure navigation happens even if we're already on a child route
                  e.preventDefault();
                  navigate('/dashboard');
                }}
              >
                <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xl font-semibold hidden sm:block">Marketing Platform</span>
              </Link>

              {isWorkflowActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-4"
                  onClick={() => navigate('/dashboard')}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back to Dashboard
                </Button>
              )}
            </div>

            {/* Center section - Breadcrumbs for workflows */}
            {isWorkflowActive && (
              <div className="hidden md:flex items-center text-sm text-muted-foreground">
                <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
                <span className="mx-2">/</span>
                <span className="text-foreground">Retail Media Audience Planner</span>
              </div>
            )}

            {/* Right section */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                      <div className="flex items-center mt-2">
                        <Shield className="h-3 w-3 mr-1 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/organization')}>
                    <Building2 className="mr-2 h-4 w-4" />
                    Organization
                  </DropdownMenuItem>
                  {user?.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/users')}>
                        <Users className="mr-2 h-4 w-4" />
                        Manage Users
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/dashboard"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home className="inline-block h-4 w-4 mr-2" />
              Dashboard
            </Link>
            <Link
              to="/profile"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <User className="inline-block h-4 w-4 mr-2" />
              Profile
            </Link>
            <Link
              to="/settings"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Settings className="inline-block h-4 w-4 mr-2" />
              Settings
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Shield className="inline-block h-4 w-4 mr-2" />
                Admin Panel
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}