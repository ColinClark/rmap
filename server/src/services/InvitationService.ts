/**
 * InvitationService - Handles user invitations to tenants
 */

import { Collection, ObjectId } from 'mongodb'
import { mongoService } from './mongodb'
import { userService } from './UserService'
import { tenantService } from './TenantService'
import { emailService } from './EmailService'
import { Logger } from '../utils/logger'
import * as crypto from 'crypto'
import type { TenantUser } from '../types/tenant'

const logger = new Logger('InvitationService')

export interface Invitation {
  _id?: string
  token: string
  email: string
  tenantId: string
  tenantName: string
  invitedBy: {
    userId: string
    email: string
    name: string
  }
  role: TenantUser['tenantRole']
  permissions?: string[]
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expiresAt: Date
  acceptedAt?: Date
  acceptedBy?: string
  createdAt: Date
  updatedAt: Date
}

export class InvitationService {
  private get invitationsCollection(): Collection<Invitation> {
    return mongoService.getControlDB().collection<Invitation>('invitations')
  }

  /**
   * Create a new invitation
   */
  async createInvitation(
    email: string,
    tenantId: string,
    invitedBy: { userId: string; email: string; name: string },
    role: TenantUser['tenantRole'] = 'member',
    permissions?: string[]
  ): Promise<Invitation> {
    try {
      // Get tenant info
      const tenant = await tenantService.getTenant(tenantId)
      if (!tenant) {
        throw new Error('Tenant not found')
      }

      // Check if user already exists in tenant
      const existingUser = await userService.getUser(email)
      if (existingUser) {
        const tenantUsers = await userService.getTenantUsers(tenantId)
        const userInTenant = tenantUsers.find(tu => tu.email === email.toLowerCase())
        if (userInTenant) {
          throw new Error('User already belongs to this organization')
        }
      }

      // Check for existing pending invitation
      const existingInvite = await this.invitationsCollection.findOne({
        email: email.toLowerCase(),
        tenantId,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      })

      if (existingInvite) {
        throw new Error('An invitation has already been sent to this email')
      }

      // Create invitation
      const invitation: Invitation = {
        token: this.generateToken(),
        email: email.toLowerCase(),
        tenantId,
        tenantName: tenant.name,
        invitedBy,
        role,
        permissions,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await this.invitationsCollection.insertOne(invitation as any)
      invitation._id = result.insertedId.toString()

      // Send invitation email
      await emailService.sendInvitationEmail(
        email,
        invitation.token,
        tenant.name,
        invitedBy.name,
        role
      )

      logger.info(`Invitation sent to ${email} for tenant ${tenant.name}`)
      return invitation
    } catch (error) {
      logger.error('Error creating invitation', error)
      throw error
    }
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<Invitation | null> {
    try {
      const invitation = await this.invitationsCollection.findOne({
        token,
        status: 'pending',
        expiresAt: { $gt: new Date() }
      })
      return invitation
    } catch (error) {
      logger.error('Error fetching invitation', error)
      return null
    }
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(token: string, userId: string): Promise<boolean> {
    try {
      // Get invitation
      const invitation = await this.getInvitationByToken(token)
      if (!invitation) {
        throw new Error('Invalid or expired invitation')
      }

      // Get user
      const user = await userService.getUser(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Check email matches
      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new Error('This invitation was sent to a different email address')
      }

      // Add user to tenant
      await userService.addUserToTenant(
        userId,
        invitation.tenantId,
        invitation.role,
        invitation.permissions
      )

      // Update invitation status
      await this.invitationsCollection.updateOne(
        { _id: new ObjectId(invitation._id) },
        {
          $set: {
            status: 'accepted',
            acceptedAt: new Date(),
            acceptedBy: userId,
            updatedAt: new Date()
          }
        }
      )

      logger.info(`Invitation accepted by ${user.email} for tenant ${invitation.tenantName}`)
      return true
    } catch (error) {
      logger.error('Error accepting invitation', error)
      throw error
    }
  }

  /**
   * Get all invitations for a tenant
   */
  async getTenantInvitations(
    tenantId: string,
    status?: 'pending' | 'accepted' | 'expired' | 'revoked'
  ): Promise<Invitation[]> {
    try {
      const query: any = { tenantId }
      if (status) {
        if (status === 'expired') {
          query.status = 'pending'
          query.expiresAt = { $lt: new Date() }
        } else {
          query.status = status
        }
      }

      const invitations = await this.invitationsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray()

      return invitations
    } catch (error) {
      logger.error('Error fetching tenant invitations', error)
      return []
    }
  }

  /**
   * Revoke an invitation
   */
  async revokeInvitation(invitationId: string, revokedBy: string): Promise<boolean> {
    try {
      const result = await this.invitationsCollection.updateOne(
        {
          _id: new ObjectId(invitationId),
          status: 'pending'
        },
        {
          $set: {
            status: 'revoked',
            updatedAt: new Date()
          }
        }
      )

      if (result.modifiedCount > 0) {
        logger.info(`Invitation ${invitationId} revoked by ${revokedBy}`)
        return true
      }
      return false
    } catch (error) {
      logger.error('Error revoking invitation', error)
      return false
    }
  }

  /**
   * Resend an invitation
   */
  async resendInvitation(invitationId: string): Promise<boolean> {
    try {
      const invitation = await this.invitationsCollection.findOne({
        _id: new ObjectId(invitationId)
      })

      if (!invitation) {
        throw new Error('Invitation not found')
      }

      if (invitation.status !== 'pending') {
        throw new Error('Can only resend pending invitations')
      }

      // Update expiration date
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      await this.invitationsCollection.updateOne(
        { _id: new ObjectId(invitationId) },
        {
          $set: {
            expiresAt: newExpiresAt,
            updatedAt: new Date()
          }
        }
      )

      // Resend email
      await emailService.sendInvitationEmail(
        invitation.email,
        invitation.token,
        invitation.tenantName,
        invitation.invitedBy.name,
        invitation.role
      )

      logger.info(`Invitation resent to ${invitation.email}`)
      return true
    } catch (error) {
      logger.error('Error resending invitation', error)
      throw error
    }
  }

  /**
   * Clean up expired invitations
   */
  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const result = await this.invitationsCollection.updateMany(
        {
          status: 'pending',
          expiresAt: { $lt: new Date() }
        },
        {
          $set: {
            status: 'expired',
            updatedAt: new Date()
          }
        }
      )

      if (result.modifiedCount > 0) {
        logger.info(`Marked ${result.modifiedCount} invitations as expired`)
      }

      return result.modifiedCount
    } catch (error) {
      logger.error('Error cleaning up expired invitations', error)
      return 0
    }
  }

  /**
   * Generate random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }
}

// Export singleton instance
export const invitationService = new InvitationService()