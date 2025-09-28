/**
 * Tenant Admin API Routes
 * Endpoints for tenant admins to manage groups and app permissions
 */

import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { requireTenantRole } from '../middleware/tenant'
import { groupService } from '../services/GroupService'
import { userService } from '../services/UserService'
import { permissionService } from '../services/PermissionService'
import { Logger } from '../utils/logger'
import type {
  TenantGroup,
  AssignAppToGroupRequest,
  BulkInviteEmployeesRequest
} from '@rmap/types'

const logger = new Logger('TenantAdminAPI')
const tenantAdminRoutes = new Hono()

// All routes require authentication and tenant admin role
tenantAdminRoutes.use('*', authMiddleware)
tenantAdminRoutes.use('*', requireTenantRole('owner', 'admin'))

// ===== GROUP MANAGEMENT =====

// Get all groups for the tenant
tenantAdminRoutes.get('/groups', async (c) => {
  try {
    const tenantId = c.get('tenantId')
    const includeMembers = c.req.query('includeMembers') === 'true'
    const includePermissions = c.req.query('includePermissions') === 'true'

    const groups = await groupService.getGroupsByTenant(
      tenantId,
      includeMembers,
      includePermissions
    )

    return c.json({ groups })
  } catch (error) {
    logger.error('Error fetching groups:', error)
    return c.json({ error: 'Failed to fetch groups' }, 500)
  }
})

// Create a new group
tenantAdminRoutes.post('/groups', async (c) => {
  try {
    const tenantId = c.get('tenantId')
    const userId = c.get('userId')
    const body = await c.req.json()

    const group = await groupService.createGroup(
      tenantId,
      {
        name: body.name,
        description: body.description,
        memberIds: body.members
      },
      userId
    )

    if (!group) {
      return c.json({ error: 'Group name already exists' }, 400)
    }

    return c.json({ group })
  } catch (error) {
    logger.error('Error creating group:', error)
    return c.json({ error: 'Failed to create group' }, 500)
  }
})

// Update a group
tenantAdminRoutes.patch('/groups/:groupId', async (c) => {
  try {
    const groupId = c.req.param('groupId')
    const userId = c.get('userId')
    const body = await c.req.json()

    const success = await groupService.updateGroup(
      groupId,
      {
        name: body.name,
        description: body.description
      },
      userId
    )

    if (!success) {
      return c.json({ error: 'Group not found' }, 404)
    }

    return c.json({ success: true })
  } catch (error) {
    logger.error('Error updating group:', error)
    return c.json({ error: 'Failed to update group' }, 500)
  }
})

// Delete a group
tenantAdminRoutes.delete('/groups/:groupId', async (c) => {
  try {
    const groupId = c.req.param('groupId')

    const success = await groupService.deleteGroup(groupId)

    if (!success) {
      return c.json({ error: 'Group not found' }, 404)
    }

    return c.json({ success: true })
  } catch (error) {
    logger.error('Error deleting group:', error)
    return c.json({ error: 'Failed to delete group' }, 500)
  }
})

// ===== GROUP MEMBERS =====

// Add members to a group
tenantAdminRoutes.post('/groups/:groupId/members', async (c) => {
  try {
    const groupId = c.req.param('groupId')
    const userId = c.get('userId')
    const body = await c.req.json()

    const success = await groupService.addMembers(
      groupId,
      body.userIds,
      userId
    )

    if (!success) {
      return c.json({ error: 'Failed to add members' }, 400)
    }

    return c.json({ success: true })
  } catch (error) {
    logger.error('Error adding members to group:', error)
    return c.json({ error: 'Failed to add members' }, 500)
  }
})

// Remove members from a group
tenantAdminRoutes.delete('/groups/:groupId/members', async (c) => {
  try {
    const groupId = c.req.param('groupId')
    const userId = c.get('userId')
    const body = await c.req.json()

    const success = await groupService.removeMembers(
      groupId,
      body.userIds,
      userId
    )

    if (!success) {
      return c.json({ error: 'Failed to remove members' }, 400)
    }

    return c.json({ success: true })
  } catch (error) {
    logger.error('Error removing members from group:', error)
    return c.json({ error: 'Failed to remove members' }, 500)
  }
})

// ===== APP PERMISSIONS =====

// Assign app to group
tenantAdminRoutes.post('/groups/:groupId/apps/:appId', async (c) => {
  try {
    const groupId = c.req.param('groupId')
    const appId = c.req.param('appId')
    const tenantId = c.get('tenantId')
    const userId = c.get('userId')
    const body = await c.req.json() as AssignAppToGroupRequest

    // Check if tenant admin can manage this app
    const canManage = await permissionService.canTenantAdminManageApp(tenantId, appId)
    if (!canManage) {
      return c.json({ error: 'Cannot manage this app' }, 403)
    }

    const success = await groupService.assignAppToGroup(
      groupId,
      appId,
      body.permissions,
      userId,
      body.expiresAt ? new Date(body.expiresAt) : undefined
    )

    if (!success) {
      return c.json({ error: 'Failed to assign app to group' }, 400)
    }

    return c.json({ success: true })
  } catch (error) {
    logger.error('Error assigning app to group:', error)
    return c.json({ error: 'Failed to assign app' }, 500)
  }
})

// Remove app from group
tenantAdminRoutes.delete('/groups/:groupId/apps/:appId', async (c) => {
  try {
    const groupId = c.req.param('groupId')
    const appId = c.req.param('appId')
    const userId = c.get('userId')

    const success = await groupService.removeAppFromGroup(
      groupId,
      appId,
      userId
    )

    if (!success) {
      return c.json({ error: 'Failed to remove app from group' }, 400)
    }

    return c.json({ success: true })
  } catch (error) {
    logger.error('Error removing app from group:', error)
    return c.json({ error: 'Failed to remove app' }, 500)
  }
})

// ===== EMPLOYEE MANAGEMENT =====

// Bulk invite employees
tenantAdminRoutes.post('/employees/invite', async (c) => {
  try {
    const tenantId = c.get('tenantId')
    const userId = c.get('userId')
    const body = await c.req.json() as BulkInviteEmployeesRequest

    const result = await userService.bulkInviteEmployees(
      tenantId,
      userId,
      body.employees
    )

    return c.json(result)
  } catch (error) {
    logger.error('Error inviting employees:', error)
    return c.json({ error: 'Failed to invite employees' }, 500)
  }
})

// Assign app directly to user
tenantAdminRoutes.post('/users/:userId/apps/:appId', async (c) => {
  try {
    const targetUserId = c.req.param('userId')
    const appId = c.req.param('appId')
    const tenantId = c.get('tenantId')
    const assignedBy = c.get('userId')
    const body = await c.req.json()

    // Check if tenant admin can manage this app
    const canManage = await permissionService.canTenantAdminManageApp(tenantId, appId)
    if (!canManage) {
      return c.json({ error: 'Cannot manage this app' }, 403)
    }

    const success = await userService.assignDirectAppPermission(
      targetUserId,
      tenantId,
      appId,
      body.permissions,
      assignedBy,
      body.expiresAt ? new Date(body.expiresAt) : undefined
    )

    if (!success) {
      return c.json({ error: 'Failed to assign app to user' }, 400)
    }

    return c.json({ success: true })
  } catch (error) {
    logger.error('Error assigning app to user:', error)
    return c.json({ error: 'Failed to assign app' }, 500)
  }
})

// Get user's effective permissions
tenantAdminRoutes.get('/users/:userId/permissions', async (c) => {
  try {
    const targetUserId = c.req.param('userId')
    const tenantId = c.get('tenantId')

    const permissions = await userService.calculateEffectivePermissions(
      targetUserId,
      tenantId
    )

    return c.json({ permissions })
  } catch (error) {
    logger.error('Error fetching user permissions:', error)
    return c.json({ error: 'Failed to fetch permissions' }, 500)
  }
})

// ===== STATISTICS =====

// Get permission statistics
tenantAdminRoutes.get('/stats/permissions', async (c) => {
  try {
    const tenantId = c.get('tenantId')

    const stats = await permissionService.getPermissionStats(tenantId)

    return c.json(stats)
  } catch (error) {
    logger.error('Error fetching permission stats:', error)
    return c.json({ error: 'Failed to fetch statistics' }, 500)
  }
})

// Get manageable apps for tenant admin
tenantAdminRoutes.get('/manageable-apps', async (c) => {
  try {
    const tenantId = c.get('tenantId')

    const apps = await permissionService.getTenantManageableApps(tenantId)

    return c.json({ apps })
  } catch (error) {
    logger.error('Error fetching manageable apps:', error)
    return c.json({ error: 'Failed to fetch apps' }, 500)
  }
})

export { tenantAdminRoutes }