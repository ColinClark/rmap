/**
 * EmailService - Handles all email operations
 */

import nodemailer, { Transporter } from 'nodemailer'
import { Logger } from '../utils/logger'

const logger = new Logger('EmailService')

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export class EmailService {
  private transporter: Transporter | null = null
  private etherealUser: string | null = null
  private etherealPass: string | null = null
  private etherealWebUrl: string | null = null

  /**
   * Initialize the email service
   */
  async initialize(): Promise<void> {
    try {
      // Check if we're in production with real SMTP settings
      if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
        // Production SMTP configuration
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        })
        logger.info('Email service initialized with SMTP settings')
      } else {
        // Development: Create Ethereal test account
        const testAccount = await nodemailer.createTestAccount()

        this.etherealUser = testAccount.user
        this.etherealPass = testAccount.pass

        this.transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        })

        logger.info('📧 Ethereal Email Test Account Created:')
        logger.info(`   Email: ${testAccount.user}`)
        logger.info(`   Password: ${testAccount.pass}`)
        logger.info(`   Web Interface: https://ethereal.email/messages`)
        logger.info('   (Login with above credentials to view sent emails)')
      }

      // Verify connection
      await this.transporter.verify()
      logger.info('Email service ready to send messages')
    } catch (error) {
      logger.error('Failed to initialize email service', error)
      throw error
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, resetToken: string, tenantName: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
            .button { display: inline-block; padding: 12px 30px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${tenantName}</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hello,</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p style="font-size: 0.9em; color: #666;">Or copy this link: ${resetUrl}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
              <div class="footer">
                <p>Best regards,<br>The ${tenantName} Team</p>
                <p style="font-size: 0.8em;">This is an automated message, please do not reply.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
Password Reset Request

Hello,

We received a request to reset your password for ${tenantName}.

Click here to reset your password: ${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email.

Best regards,
The ${tenantName} Team
    `

    await this.sendEmail({
      to: email,
      subject: `Password Reset - ${tenantName}`,
      html,
      text,
    })
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(email: string, verificationToken: string, tenantName: string): Promise<void> {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Email Verification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
            .button { display: inline-block; padding: 12px 30px; background: #10B981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${tenantName}!</h1>
            </div>
            <div class="content">
              <h2>Verify Your Email Address</h2>
              <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
              <div style="text-align: center;">
                <a href="${verifyUrl}" class="button">Verify Email</a>
              </div>
              <p style="font-size: 0.9em; color: #666;">Or copy this link: ${verifyUrl}</p>
              <p>Once verified, you'll have full access to all features.</p>
              <div class="footer">
                <p>Best regards,<br>The ${tenantName} Team</p>
                <p style="font-size: 0.8em;">If you didn't create an account, please ignore this email.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
Welcome to ${tenantName}!

Please verify your email address to complete your registration.

Click here to verify: ${verifyUrl}

Once verified, you'll have full access to all features.

Best regards,
The ${tenantName} Team
    `

    await this.sendEmail({
      to: email,
      subject: `Verify Your Email - ${tenantName}`,
      html,
      text,
    })
  }

  /**
   * Send team invitation email
   */
  async sendInvitationEmail(
    email: string,
    inviterName: string,
    tenantName: string,
    role: string,
    inviteToken: string
  ): Promise<void> {
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite?token=${inviteToken}`

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Team Invitation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #6366F1; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; }
            .button { display: inline-block; padding: 12px 30px; background: #6366F1; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .role-badge { display: inline-block; padding: 5px 10px; background: #E0E7FF; color: #4338CA; border-radius: 3px; font-weight: bold; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You're Invited to Join ${tenantName}!</h1>
            </div>
            <div class="content">
              <h2>Team Invitation</h2>
              <p>Hi there,</p>
              <p><strong>${inviterName}</strong> has invited you to join the ${tenantName} team as a <span class="role-badge">${role}</span>.</p>
              <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
              </div>
              <p style="font-size: 0.9em; color: #666;">Or copy this link: ${inviteUrl}</p>
              <p><strong>This invitation will expire in 7 days.</strong></p>
              <div class="footer">
                <p>Looking forward to having you on the team!</p>
                <p>Best regards,<br>The ${tenantName} Team</p>
                <p style="font-size: 0.8em;">If you don't know ${inviterName} or believe this email was sent in error, please ignore it.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
You're Invited to Join ${tenantName}!

Hi there,

${inviterName} has invited you to join the ${tenantName} team as a ${role}.

Accept invitation: ${inviteUrl}

This invitation will expire in 7 days.

Looking forward to having you on the team!

Best regards,
The ${tenantName} Team
    `

    await this.sendEmail({
      to: email,
      subject: `Team Invitation - ${tenantName}`,
      html,
      text,
    })
  }

  /**
   * Send generic email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service not initialized')
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"RMAP Platform" <noreply@rmap.app>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      })

      logger.info(`Email sent to ${options.to}: ${info.messageId}`)

      // If using Ethereal, log the preview URL
      if (this.etherealUser) {
        const previewUrl = nodemailer.getTestMessageUrl(info)
        logger.info(`📧 Preview Email: ${previewUrl}`)
      }
    } catch (error) {
      logger.error(`Failed to send email to ${options.to}`, error)
      throw error
    }
  }

  /**
   * Get Ethereal credentials (for development)
   */
  getEtherealCredentials(): { user: string; pass: string; webUrl: string } | null {
    if (this.etherealUser && this.etherealPass) {
      return {
        user: this.etherealUser,
        pass: this.etherealPass,
        webUrl: 'https://ethereal.email/messages',
      }
    }
    return null
  }
}

// Export singleton instance
export const emailService = new EmailService()