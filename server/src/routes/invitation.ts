/**
 * Invitation routes for team member invitations
 */

import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { invitationService } from '../services/InvitationService'
import { authMiddleware } from '../middleware/auth'
import { requireTenantRole } from '../middleware/tenant'
import { Logger } from '../utils/logger'

const logger = new Logger('InvitationRoutes')

export const invitationRoutes = new Hono()

// Apply auth middleware to all routes
invitationRoutes.use('*', authMiddleware)

// Create invitation schema
const createInvitationSchema = z.object({
  email: z.string().email(),
  tenantId: z.string(),
  role: z.enum(['owner', 'admin', 'manager', 'member', 'viewer']),
  permissions: z.array(z.string()).optional()
})

// Accept invitation schema
const acceptInvitationSchema = z.object({
  token: z.string()
})

/**
 * POST /api/invitations
 * Create a new invitation (requires admin or owner role)
 */
invitationRoutes.post('/',
  requireTenantRole(['owner', 'admin']),
  zValidator('json', createInvitationSchema),
  async (c) => {
    const { email, tenantId, role, permissions } = c.req.valid('json')
    const inviter = c.get('user')

    // Validate that inviter can only invite to their own tenant
    const inviterTenantId = c.get('tenantId')
    if (inviterTenantId !== tenantId) {
      return c.json({ error: 'You can only invite users to your own organization' }, 403)
    }

    // Validate role hierarchy - can't invite someone with higher role
    const inviterRole = c.get('tenantRole')
    const roleHierarchy = ['viewer', 'member', 'manager', 'admin', 'owner']
    const inviterRoleIndex = roleHierarchy.indexOf(inviterRole)
    const inviteeRoleIndex = roleHierarchy.indexOf(role)

    if (inviteeRoleIndex > inviterRoleIndex) {
      return c.json({ error: 'Cannot invite user with higher role than your own' }, 403)
    }

    try {
      const invitation = await invitationService.createInvitation(
        email,
        tenantId,
        {
          userId: inviter._id!,
          email: inviter.email,
          name: inviter.name
        },
        role,
        permissions
      )

      return c.json({
        success: true,
        invitation: {
          id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt
        }
      })
    } catch (error) {
      logger.error('Error creating invitation', error)
      return c.json({
        error: error instanceof Error ? error.message : 'Failed to create invitation'
      }, 400)
    }
  }
)

/**
 * GET /api/invitations
 * Get all invitations for the tenant
 */
invitationRoutes.get('/',
  requireTenantRole(['owner', 'admin', 'manager']),
  async (c) => {
    const tenantId = c.get('tenantId')
    const status = c.req.query('status') as any

    try {
      const invitations = await invitationService.getTenantInvitations(tenantId, status)

      return c.json({
        success: true,
        invitations: invitations.map(inv => ({
          id: inv._id,
          email: inv.email,
          role: inv.role,
          status: inv.status,
          invitedBy: inv.invitedBy,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
          acceptedAt: inv.acceptedAt
        }))
      })
    } catch (error) {
      logger.error('Error fetching invitations', error)
      return c.json({ error: 'Failed to fetch invitations' }, 500)
    }
  }
)

/**
 * POST /api/invitations/accept
 * Accept an invitation
 */
invitationRoutes.post('/accept',
  zValidator('json', acceptInvitationSchema),
  async (c) => {
    const { token } = c.req.valid('json')
    const userId = c.get('userId')

    try {
      const success = await invitationService.acceptInvitation(token, userId)

      if (success) {
        return c.json({
          success: true,
          message: 'Invitation accepted successfully'
        })
      } else {
        return c.json({ error: 'Failed to accept invitation' }, 400)
      }
    } catch (error) {
      logger.error('Error accepting invitation', error)
      return c.json({
        error: error instanceof Error ? error.message : 'Failed to accept invitation'
      }, 400)
    }
  }
)

/**
 * DELETE /api/invitations/:id
 * Revoke an invitation
 */
invitationRoutes.delete('/:id',
  requireTenantRole(['owner', 'admin']),
  async (c) => {
    const invitationId = c.req.param('id')
    const userId = c.get('userId')

    try {
      const success = await invitationService.revokeInvitation(invitationId, userId)

      if (success) {
        return c.json({
          success: true,
          message: 'Invitation revoked successfully'
        })
      } else {
        return c.json({ error: 'Invitation not found or already processed' }, 404)
      }
    } catch (error) {
      logger.error('Error revoking invitation', error)
      return c.json({ error: 'Failed to revoke invitation' }, 500)
    }
  }
)

/**
 * POST /api/invitations/:id/resend
 * Resend an invitation
 */
invitationRoutes.post('/:id/resend',
  requireTenantRole(['owner', 'admin']),
  async (c) => {
    const invitationId = c.req.param('id')

    try {
      const success = await invitationService.resendInvitation(invitationId)

      if (success) {
        return c.json({
          success: true,
          message: 'Invitation resent successfully'
        })
      } else {
        return c.json({ error: 'Failed to resend invitation' }, 400)
      }
    } catch (error) {
      logger.error('Error resending invitation', error)
      return c.json({
        error: error instanceof Error ? error.message : 'Failed to resend invitation'
      }, 400)
    }
  }
)

/**
 * GET /api/invitations/validate/:token
 * Validate an invitation token (public endpoint, but requires auth)
 */
invitationRoutes.get('/validate/:token', async (c) => {
  const token = c.req.param('token')

  try {
    const invitation = await invitationService.getInvitationByToken(token)

    if (!invitation) {
      return c.json({
        valid: false,
        error: 'Invalid or expired invitation'
      }, 404)
    }

    return c.json({
      valid: true,
      invitation: {
        email: invitation.email,
        tenantName: invitation.tenantName,
        role: invitation.role,
        invitedBy: invitation.invitedBy.name,
        expiresAt: invitation.expiresAt
      }
    })
  } catch (error) {
    logger.error('Error validating invitation', error)
    return c.json({
      valid: false,
      error: 'Failed to validate invitation'
    }, 500)
  }
})