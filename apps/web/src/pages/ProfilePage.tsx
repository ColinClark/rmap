import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, Lock, Shield, Bell, Globe, Trash2 } from 'lucide-react'
import { userAPI } from '../services/api'

interface UserProfile {
  id: string
  email: string
  name: string
  emailVerified: boolean
  twoFactorEnabled: boolean
  createdAt: string
  updatedAt: string
  tenants: Array<{
    tenantId: string
    role: string
    companyRole?: string
    phoneNumber?: string
  }>
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'security' | 'preferences'>('profile')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Profile form state
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    companyRole: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: 'en',
    notifications: {
      email: true,
      inApp: true,
      marketing: false
    }
  })

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const data = await userAPI.getProfile()
      setProfile(data)

      // Set form data from profile
      setFormData({
        name: data.name || '',
        phoneNumber: data.tenants?.[0]?.phoneNumber || '',
        companyRole: data.tenants?.[0]?.companyRole || '',
        timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: data.language || 'en',
        notifications: data.notifications || {
          email: true,
          inApp: true,
          marketing: false
        }
      })
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      setMessage({ type: 'error', text: 'Failed to load profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      await userAPI.updateProfile(formData)
      setMessage({ type: 'success', text: 'Profile updated successfully' })
      fetchProfile()
    } catch (error) {
      console.error('Failed to update profile:', error)
      setMessage({ type: 'error', text: 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      await userAPI.changePassword(passwordData)
      setMessage({ type: 'success', text: 'Password changed successfully' })
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      console.error('Failed to change password:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to change password' })
    } finally {
      setSaving(false)
    }
  }

  const handleEnable2FA = async () => {
    try {
      const data = await userAPI.enable2FA()
      // Show QR code modal or redirect to 2FA setup
      console.log('2FA setup:', data)
      setMessage({ type: 'success', text: '2FA setup initiated' })
    } catch (error) {
      console.error('Failed to enable 2FA:', error)
      setMessage({ type: 'error', text: 'Failed to enable 2FA' })
    }
  }

  const handleDisable2FA = async () => {
    const password = prompt('Enter your password to disable 2FA:')
    if (!password) return

    try {
      await userAPI.disable2FA(password)
      setMessage({ type: 'success', text: '2FA has been disabled' })
      fetchProfile()
    } catch (error) {
      console.error('Failed to disable 2FA:', error)
      setMessage({ type: 'error', text: 'Failed to disable 2FA' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

      {/* Alert Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'password', label: 'Password', icon: Lock },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'preferences', label: 'Preferences', icon: Bell }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Profile Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {profile?.emailVerified ? '✓ Verified' : '⚠ Not verified'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Role
                </label>
                <input
                  type="text"
                  value={formData.companyRole}
                  onChange={(e) => setFormData({ ...formData, companyRole: e.target.value })}
                  placeholder="e.g., Marketing Manager"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <form onSubmit={handleChangePassword} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Change Password</h2>

            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must be at least 8 characters with uppercase, lowercase, and numbers
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Security Settings</h2>

            <div className="space-y-6">
              {/* 2FA Section */}
              <div className="border-b pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  {profile?.twoFactorEnabled ? (
                    <button
                      onClick={handleDisable2FA}
                      className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                    >
                      Disable 2FA
                    </button>
                  ) : (
                    <button
                      onClick={handleEnable2FA}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Enable 2FA
                    </button>
                  )}
                </div>
              </div>

              {/* Active Sessions */}
              <div className="border-b pb-6">
                <h3 className="font-medium mb-2">Active Sessions</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Manage your active sessions across devices
                </p>
                <button className="text-blue-600 hover:text-blue-700 text-sm">
                  View active sessions →
                </button>
              </div>

              {/* Account Deletion */}
              <div>
                <h3 className="font-medium text-red-600 mb-2">Danger Zone</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Permanently delete your account and all associated data
                </p>
                <button className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Preferences</h2>

            <div className="space-y-6">
              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Globe className="inline h-4 w-4 mr-1" />
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>

              {/* Notifications */}
              <div>
                <h3 className="font-medium mb-4">
                  <Bell className="inline h-4 w-4 mr-1" />
                  Notification Preferences
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.notifications.email}
                      onChange={(e) => setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, email: e.target.checked }
                      })}
                      className="mr-3"
                    />
                    <span className="text-sm">Email notifications</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.notifications.inApp}
                      onChange={(e) => setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, inApp: e.target.checked }
                      })}
                      className="mr-3"
                    />
                    <span className="text-sm">In-app notifications</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.notifications.marketing}
                      onChange={(e) => setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, marketing: e.target.checked }
                      })}
                      className="mr-3"
                    />
                    <span className="text-sm">Marketing emails</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}