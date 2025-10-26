import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Users,
  ArrowLeft,
  Search,
  Shield,
  Mail,
  Phone,
  Building,
  Calendar,
  CheckCircle,
  XCircle,
  UserPlus,
  Settings,
  MoreVertical,
  Key
} from 'lucide-react'
import Tooltip from '../components/Tooltip'

interface Employee {
  id: string
  userId: string
  email: string
  name: string
  tenantRole: string
  phoneNumber?: string
  companyRole?: string
  emailDomain?: string
  groups: Array<{ id: string; name: string }>
  directAppPermissions: any[]
  joinedAt: string
  lastLoginAt?: string
  emailVerified: boolean
  twoFactorEnabled: boolean
}

interface TenantInfo {
  id: string
  name: string
  slug: string
}

export default function TenantEmployeesPage() {
  const { tenantId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showActions, setShowActions] = useState<string | null>(null)

  useEffect(() => {
    if (tenantId) {
      fetchEmployees()
    }
  }, [tenantId])

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/admin/tenants/${tenantId}/employees`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch employees')
      }

      const data = await response.json()
      setEmployees(data.employees || [])
      setTenant(data.tenant)
    } catch (err) {
      console.error('Error fetching employees:', err)
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      owner: { color: 'bg-purple-100 text-purple-800', icon: '👑' },
      admin: { color: 'bg-blue-100 text-blue-800', icon: '🛡️' },
      manager: { color: 'bg-green-100 text-green-800', icon: '📊' },
      member: { color: 'bg-gray-100 text-gray-800', icon: '👤' },
      employee: { color: 'bg-gray-100 text-gray-800', icon: '👤' },
      viewer: { color: 'bg-yellow-100 text-yellow-800', icon: '👁️' }
    }

    const config = roleConfig[role] || roleConfig.member
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <span className="mr-1">{config.icon}</span>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.companyRole?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.groups.some(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading employees...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Tooltip text="Back to Tenants">
            <button
              onClick={() => navigate('/admin/tenants')}
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Tooltip>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {tenant?.name} - Employees
            </h1>
            <p className="text-sm text-gray-500">
              Manage employees, roles, and permissions for {tenant?.name}
            </p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Employee
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by name, email, role, or group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Employees</p>
              <p className="text-2xl font-bold">{employees.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Admins</p>
              <p className="text-2xl font-bold">
                {employees.filter(e => e.tenantRole === 'admin' || e.tenantRole === 'owner').length}
              </p>
            </div>
            <Shield className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Verified</p>
              <p className="text-2xl font-bold">
                {employees.filter(e => e.emailVerified).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">2FA Enabled</p>
              <p className="text-2xl font-bold">
                {employees.filter(e => e.twoFactorEnabled).length}
              </p>
            </div>
            <Key className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Employee Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Groups
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredEmployees.map((employee) => (
              <tr key={employee.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                    <div className="text-sm text-gray-500">{employee.email}</div>
                    {employee.companyRole && (
                      <div className="text-xs text-gray-400 mt-1 flex items-center">
                        <Building className="h-3 w-3 mr-1" />
                        {employee.companyRole}
                      </div>
                    )}
                    {employee.phoneNumber && (
                      <div className="text-xs text-gray-400 mt-1 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {employee.phoneNumber}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleBadge(employee.tenantRole)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {employee.groups.length > 0 ? (
                      employee.groups.map(group => (
                        <span
                          key={group.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                        >
                          {group.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">No groups</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Tooltip text={employee.emailVerified ? "Email Verified" : "Email Not Verified"}>
                      <div className="flex items-center">
                        {employee.emailVerified ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-300" />
                        )}
                      </div>
                    </Tooltip>
                    <Tooltip text={employee.twoFactorEnabled ? "2FA Enabled" : "2FA Not Enabled"}>
                      <div className="flex items-center">
                        {employee.twoFactorEnabled ? (
                          <Key className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Key className="h-4 w-4 text-gray-300" />
                        )}
                      </div>
                    </Tooltip>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(employee.joinedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDateTime(employee.lastLoginAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="relative">
                    <Tooltip text="More Actions">
                      <button
                        onClick={() => setShowActions(showActions === employee.id ? null : employee.id)}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </Tooltip>
                    {showActions === employee.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                        <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center">
                          <Settings className="h-4 w-4 mr-2" />
                          Edit Details
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Manage Groups
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center">
                          <Shield className="h-4 w-4 mr-2" />
                          Change Role
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center">
                          <Key className="h-4 w-4 mr-2" />
                          Reset Password
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          Resend Verification
                        </button>
                        <hr className="my-1" />
                        <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center">
                          <XCircle className="h-4 w-4 mr-2" />
                          Remove from Tenant
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No employees found matching your search' : 'No employees in this tenant yet'}
          </div>
        )}
      </div>
    </div>
  )
}