import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, MoreVertical, Search, Plus, Edit, Package, Users, X, UserPlus, Trash2, Copy, Check, Eye } from 'lucide-react'
import type { Tenant } from '@rmap/types'
import Tooltip from '../components/Tooltip'
import AuthUtils from '../utils/auth'

export default function TenantsPage() {
  const navigate = useNavigate()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showOnboardModal, setShowOnboardModal] = useState(false)
  const [onboardingTenant, setOnboardingTenant] = useState<Tenant | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)
  const [adminCredentials, setAdminCredentials] = useState<{
    email: string
    temporaryPassword: string
    userCreated?: boolean
    message?: string
  } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    contactEmail: '',
    contactName: '',
    plan: 'free' as 'free' | 'starter' | 'professional' | 'enterprise' | 'custom'
  })
  const [onboardFormData, setOnboardFormData] = useState({
    email: '',
    name: '',
    phoneNumber: '',
    companyRole: '',
    emailDomains: [''],
    sendWelcomeEmail: true,
    selectedApps: [] as {appId: string, adminManageable: boolean}[]
  })
  const [availableApps, setAvailableApps] = useState<any[]>([])
  const [loadingApps, setLoadingApps] = useState(false)

  useEffect(() => {
    fetchTenants()
  }, [])

  // Fetch available apps for tenant's subscription plan
  const fetchAvailableApps = async (plan: string) => {
    setLoadingApps(true)
    try {
      const response = await AuthUtils.fetchWithAuth(`/admin/apps/catalog/${plan}`)

      if (!response.ok) {
        throw new Error('Failed to fetch apps')
      }

      const data = await response.json()
      setAvailableApps(data.apps || [])

      // Set default selected apps
      const defaultApps = data.defaultApps || []
      setOnboardFormData(prev => ({
        ...prev,
        selectedApps: defaultApps
      }))
    } catch (error) {
      console.error('Error fetching apps:', error)
      setAvailableApps([])
    } finally {
      setLoadingApps(false)
    }
  }

  const fetchTenants = async () => {
    try {
      const response = await AuthUtils.fetchWithAuth('/admin/tenants')

      if (!response.ok) {
        throw new Error('Failed to fetch tenants')
      }

      const data = await response.json()
      setTenants(data.tenants || [])
    } catch (err) {
      console.error('Error fetching tenants:', err)
      // If auth error, user will be redirected to login
      if (err instanceof Error && err.message.includes('Authentication required')) {
        return
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTenant = async () => {
    try {
      const response = await AuthUtils.fetchWithAuth('/admin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create tenant')
      }

      const data = await response.json()
      console.log('Created tenant:', data)

      // Reset form and close modal
      setFormData({
        name: '',
        slug: '',
        contactEmail: '',
        contactName: '',
        plan: 'free'
      })
      setShowAddModal(false)

      // Refresh tenants list
      fetchTenants()
    } catch (err) {
      console.error('Error creating tenant:', err)
      alert(err instanceof Error ? err.message : 'Failed to create tenant')
    }
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  const handleOnboardAdmin = async () => {
    if (!onboardingTenant) return

    try {
      const response = await AuthUtils.fetchWithAuth(`/admin/tenants/${onboardingTenant.id}/onboard-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          admin: {
            email: onboardFormData.email,
            name: onboardFormData.name,
            phoneNumber: onboardFormData.phoneNumber,
            companyRole: onboardFormData.companyRole
          },
          emailDomains: onboardFormData.emailDomains.filter(d => d.trim()),
          initialApps: onboardFormData.selectedApps
        })
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Onboard admin error:', error)
        throw new Error(error.details || error.error || 'Failed to onboard admin')
      }

      const data = await response.json()

      // Show the success modal with credentials
      setAdminCredentials({
        email: data.user.email,
        temporaryPassword: data.user.temporaryPassword,
        userCreated: data.userCreated,
        message: data.message
      })
      setShowSuccessModal(true)

      // Reset form and close modal
      setOnboardFormData({
        email: '',
        name: '',
        phoneNumber: '',
        companyRole: '',
        emailDomains: [''],
        sendWelcomeEmail: true,
        selectedApps: []
      })
      setShowOnboardModal(false)
      setOnboardingTenant(null)

      // Refresh tenants list
      fetchTenants()
    } catch (err) {
      console.error('Error onboarding admin:', err)
      alert(err instanceof Error ? err.message : 'Failed to onboard admin')
    }
  }

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (!confirm(`Are you sure you want to delete ${tenant.name}? This will permanently delete all tenant data.`)) {
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/admin/tenants/${tenant.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete tenant')
      }

      // Refresh tenants list
      fetchTenants()
    } catch (err) {
      console.error('Error deleting tenant:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete tenant')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedPassword(true)
      setTimeout(() => setCopiedPassword(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-purple-100 text-purple-800'
      case 'professional': return 'bg-blue-100 text-blue-800'
      case 'starter': return 'bg-green-100 text-green-800'
      case 'free': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'trialing': return 'bg-yellow-100 text-yellow-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tenants</h1>
            <p className="text-gray-600 mt-2">Manage platform tenants and their configurations</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tenant
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Plan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Users
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Apps
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                      <div className="text-sm text-gray-500">{tenant.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPlanBadgeColor(tenant.subscription.plan)}`}>
                    {tenant.subscription.plan}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(tenant.subscription.status)}`}>
                    {tenant.subscription.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-gray-400 mr-1" />
                    {tenant.subscription.usage?.users || 0} / {tenant.subscription.limits?.users || '∞'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <Package className="h-4 w-4 text-gray-400 mr-1" />
                    {tenant.appEntitlements?.length || 0}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(tenant.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <Tooltip text="View Employees">
                      <button
                        onClick={() => navigate(`/tenants/${tenant.id}/employees`)}
                        className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Onboard Admin">
                      <button
                        onClick={() => {
                          setOnboardingTenant(tenant)
                          setShowOnboardModal(true)
                          // Pre-fill email domain from contact email
                          const domain = tenant.contactEmail?.split('@')[1] || ''
                          setOnboardFormData({
                            ...onboardFormData,
                            emailDomains: domain ? [domain] : [''],
                            selectedApps: []
                          })
                          // Fetch available apps for this tenant's plan
                          fetchAvailableApps(tenant.subscription.plan)
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip text="Delete Tenant">
                      <button
                        onClick={() => handleDeleteTenant(tenant)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTenants.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tenants found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search' : 'Get started by adding a new tenant'}
            </p>
          </div>
        )}
      </div>

      {/* Add Tenant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New Tenant</h2>
              <Tooltip text="Close">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </Tooltip>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: generateSlug(e.target.value)
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Acme Corporation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="acme-corp"
                  pattern="[a-z0-9-]+"
                />
                <p className="text-xs text-gray-500 mt-1">Lowercase letters, numbers, and dashes only</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="john@acme.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subscription Plan
                </label>
                <select
                  value={formData.plan}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTenant}
                disabled={!formData.name || !formData.slug || !formData.contactEmail || !formData.contactName}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Create Tenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboard Admin Modal */}
      {showOnboardModal && onboardingTenant && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">Onboard Tenant Admin</h2>
                <p className="text-sm text-gray-600">For {onboardingTenant.name}</p>
              </div>
              <Tooltip text="Close">
                <button
                  onClick={() => {
                    setShowOnboardModal(false)
                    setOnboardingTenant(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </Tooltip>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Email *
                </label>
                <input
                  type="email"
                  value={onboardFormData.email}
                  onChange={(e) => setOnboardFormData({ ...onboardFormData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={onboardFormData.name}
                  onChange={(e) => setOnboardFormData({ ...onboardFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={onboardFormData.phoneNumber}
                  onChange={(e) => setOnboardFormData({ ...onboardFormData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1-555-0123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Role *
                </label>
                <input
                  type="text"
                  value={onboardFormData.companyRole}
                  onChange={(e) => setOnboardFormData({ ...onboardFormData, companyRole: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="IT Director"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allowed Email Domains
                </label>
                {onboardFormData.emailDomains.map((domain, index) => (
                  <div key={index} className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => {
                        const newDomains = [...onboardFormData.emailDomains]
                        newDomains[index] = e.target.value
                        setOnboardFormData({ ...onboardFormData, emailDomains: newDomains })
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="company.com"
                    />
                    {onboardFormData.emailDomains.length > 1 && (
                      <button
                        onClick={() => {
                          const newDomains = onboardFormData.emailDomains.filter((_, i) => i !== index)
                          setOnboardFormData({ ...onboardFormData, emailDomains: newDomains })
                        }}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    setOnboardFormData({
                      ...onboardFormData,
                      emailDomains: [...onboardFormData.emailDomains, '']
                    })
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add another domain
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Only employees with these email domains can be invited
                </p>
              </div>

              {/* Initial Apps Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Apps
                </label>
                {loadingApps ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-500">Loading apps...</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {availableApps.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-2">No apps available for this plan</p>
                    ) : (
                      availableApps.map((app) => {
                        const isSelected = onboardFormData.selectedApps.some(selected => selected.appId === app.id)
                        return (
                          <div key={app.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-gray-50">
                            <input
                              type="checkbox"
                              id={`app-${app.id}`}
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setOnboardFormData(prev => ({
                                    ...prev,
                                    selectedApps: [...prev.selectedApps, { appId: app.id, adminManageable: true }]
                                  }))
                                } else {
                                  setOnboardFormData(prev => ({
                                    ...prev,
                                    selectedApps: prev.selectedApps.filter(selected => selected.appId !== app.id)
                                  }))
                                }
                              }}
                              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <label htmlFor={`app-${app.id}`} className="text-sm font-medium text-gray-900 cursor-pointer">
                                {app.name}
                                {app.isDefaultForPlan && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    Default
                                  </span>
                                )}
                              </label>
                              <p className="text-xs text-gray-500 mt-1">{app.shortDescription}</p>
                              <div className="flex items-center mt-1 space-x-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${app.color} text-white`}>
                                  {app.category}
                                </span>
                                {app.badge && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {app.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Selected apps will be available to the tenant immediately. Apps can be managed later.
                </p>
              </div>
            </div>

            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> A temporary password will be generated. Please share it securely with the admin.
              </p>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowOnboardModal(false)
                  setOnboardingTenant(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleOnboardAdmin}
                disabled={!onboardFormData.email || !onboardFormData.name || !onboardFormData.phoneNumber || !onboardFormData.companyRole}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Create Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal - Admin Created */}
      {showSuccessModal && adminCredentials && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-green-600">Admin Created Successfully!</h2>
              <Tooltip text="Close">
                <button
                  onClick={() => {
                    setShowSuccessModal(false)
                    setAdminCredentials(null)
                    setCopiedPassword(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </Tooltip>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  {adminCredentials.userCreated
                    ? 'Please save and share these credentials securely:'
                    : 'User already exists and has been added as admin to the tenant:'}
                </p>
                {adminCredentials.message && (
                  <p className="text-xs text-blue-700 mt-1">{adminCredentials.message}</p>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={adminCredentials.email}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                    <Tooltip text="Copy email">
                      <button
                        onClick={() => copyToClipboard(adminCredentials.email)}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {adminCredentials.userCreated ? "Temporary Password" : "Password Status"}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={adminCredentials.temporaryPassword}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm"
                    />
                    {adminCredentials.userCreated && (
                      <Tooltip text={copiedPassword ? "Copied!" : "Copy password"}>
                        <button
                          onClick={() => copyToClipboard(adminCredentials.temporaryPassword)}
                          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
                        >
                          {copiedPassword ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </div>

              {adminCredentials.userCreated ? (
                <div className="bg-yellow-50 p-3 rounded-md">
                  <p className="text-xs text-yellow-800">
                    ⚠️ The admin will be required to change this password on first login.
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 p-3 rounded-md">
                  <p className="text-xs text-green-800">
                    ✅ The existing user has been granted admin access to the tenant.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowSuccessModal(false)
                  setAdminCredentials(null)
                  setCopiedPassword(false)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}