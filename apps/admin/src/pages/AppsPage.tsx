import { useEffect, useState } from 'react'
import { Package, Star, Users, TrendingUp, Shield, Zap, Plus, Edit } from 'lucide-react'
import type { AppTile } from '@rmap/types'

export default function AppsPage() {
  const [apps, setApps] = useState<AppTile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    fetchApps()
  }, [])

  const fetchApps = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch('http://localhost:4000/admin/apps', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch apps')
      }

      const data = await response.json()
      setApps(data.apps || [])
    } catch (err) {
      console.error('Error fetching apps:', err)
    } finally {
      setLoading(false)
    }
  }

  const categories = ['all', 'marketing', 'analytics', 'data', 'automation', 'integration', 'security']

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.shortDescription.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'marketing': return TrendingUp
      case 'analytics': return TrendingUp
      case 'data': return Package
      case 'security': return Shield
      case 'automation': return Zap
      default: return Package
    }
  }

  const getPricingBadge = (pricing: AppTile['pricing']) => {
    switch (pricing.model) {
      case 'included': return 'bg-green-100 text-green-800'
      case 'addon': return 'bg-blue-100 text-blue-800'
      case 'usage_based': return 'bg-purple-100 text-purple-800'
      case 'contact': return 'bg-gray-100 text-gray-800'
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
            <h1 className="text-3xl font-bold text-gray-900">App Catalog</h1>
            <p className="text-gray-600 mt-2">Manage available apps and entitlements</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Add App
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search apps..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredApps.map((app) => {
          const Icon = getCategoryIcon(app.category)
          return (
            <div key={app.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">{app.name}</h3>
                      <p className="text-sm text-gray-500">{app.category}</p>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Edit className="h-4 w-4" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4">{app.shortDescription}</p>

                {/* Stats */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    {app.rating && (
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="ml-1 text-sm text-gray-600">{app.rating}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="ml-1 text-sm text-gray-600">{app.usageCount || 0}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPricingBadge(app.pricing)}`}>
                    {app.pricing.model.replace('_', ' ')}
                  </span>
                </div>

                {/* Features */}
                <div className="border-t pt-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Key Features</h4>
                  <div className="space-y-1">
                    {app.features.slice(0, 3).map((feature, idx) => (
                      <div key={idx} className="flex items-center text-xs text-gray-600">
                        <div className="h-1.5 w-1.5 bg-blue-600 rounded-full mr-2" />
                        {feature.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <span className={`text-xs font-medium ${app.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}>
                    {app.status === 'active' ? '● Active' : '● Inactive'}
                  </span>
                  <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    Manage Entitlements
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredApps.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No apps found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedCategory !== 'all' ? 'Try adjusting your filters' : 'Get started by adding a new app'}
          </p>
        </div>
      )}
    </div>
  )
}