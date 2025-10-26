import { useEffect, useState } from 'react'
import { Building2, Package, Users, TrendingUp, AlertCircle } from 'lucide-react'
import AuthUtils from '../utils/auth'

interface DashboardStats {
  totalTenants: number
  activeTenants: number
  totalApps: number
  totalAdmins: number
  recentActivity: Array<{
    id: string
    type: 'tenant_created' | 'app_granted' | 'app_revoked' | 'admin_added'
    description: string
    timestamp: string
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await AuthUtils.fetchWithAuth('/admin/stats')

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats')
      }

      const data = await response.json()
      // Map backend response to frontend format
      setStats({
        totalTenants: data.tenants?.total || 0,
        activeTenants: data.tenants?.active || 0,
        totalApps: data.apps?.total || 0,
        totalAdmins: data.users?.total || 0, // Using total users as admins for now
        recentActivity: [] // Backend doesn't provide this yet
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Tenants',
      value: stats.totalTenants,
      icon: Building2,
      color: 'bg-blue-500',
      subtitle: `${stats.activeTenants} active`
    },
    {
      title: 'Total Apps',
      value: stats.totalApps,
      icon: Package,
      color: 'bg-green-500',
      subtitle: 'Available in catalog'
    },
    {
      title: 'Platform Admins',
      value: stats.totalAdmins,
      icon: Users,
      color: 'bg-purple-500',
      subtitle: 'Managing platform'
    },
    {
      title: 'Growth',
      value: '+12%',
      icon: TrendingUp,
      color: 'bg-orange-500',
      subtitle: 'This month'
    }
  ]

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Platform overview and recent activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color} rounded-lg p-3`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
            <p className="text-sm font-medium text-gray-600">{stat.title}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          {stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      {activity.type === 'tenant_created' && <Building2 className="h-4 w-4 text-gray-600" />}
                      {activity.type === 'app_granted' && <Package className="h-4 w-4 text-green-600" />}
                      {activity.type === 'app_revoked' && <Package className="h-4 w-4 text-red-600" />}
                      {activity.type === 'admin_added' && <Users className="h-4 w-4 text-blue-600" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  )
}