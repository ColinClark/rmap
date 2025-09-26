import { Hono } from 'hono'
import { emailService } from '../services/EmailService'
import { Logger } from '../utils/logger'

const logger = new Logger('TestEmail')

export const testEmailRoutes = new Hono()

// Test email sending
testEmailRoutes.post('/send-test', async (c) => {
  try {
    const { type, email } = await c.req.json()

    const testEmail = email || 'test@example.com'
    const tenantName = 'RMAP Platform'

    switch (type) {
      case 'verification':
        await emailService.sendVerificationEmail(
          testEmail,
          'test-verification-token-123',
          tenantName
        )
        break

      case 'reset':
        await emailService.sendPasswordResetEmail(
          testEmail,
          'test-reset-token-456',
          tenantName
        )
        break

      case 'invitation':
        await emailService.sendInvitationEmail(
          testEmail,
          'John Admin',
          tenantName,
          'manager',
          'test-invite-token-789'
        )
        break

      default:
        // Send a generic test email
        await emailService.sendEmail({
          to: testEmail,
          subject: 'Test Email from RMAP',
          html: '<h1>Test Email</h1><p>This is a test email from RMAP Platform.</p>',
          text: 'Test Email\n\nThis is a test email from RMAP Platform.',
        })
    }

    // Get Ethereal credentials to return to user
    const etherealCreds = emailService.getEtherealCredentials()

    return c.json({
      success: true,
      message: `Test ${type || 'generic'} email sent to ${testEmail}`,
      ethereal: etherealCreds ? {
        message: 'View the email at Ethereal web interface',
        webUrl: etherealCreds.webUrl,
        credentials: {
          email: etherealCreds.user,
          password: etherealCreds.pass,
        },
      } : null,
    })
  } catch (error) {
    logger.error('Failed to send test email', error)
    return c.json({ error: 'Failed to send test email' }, 500)
  }
})

// Get Ethereal credentials
testEmailRoutes.get('/ethereal-info', (c) => {
  const etherealCreds = emailService.getEtherealCredentials()

  if (etherealCreds) {
    return c.json({
      message: 'Ethereal Email test account is active',
      webInterface: etherealCreds.webUrl,
      credentials: {
        email: etherealCreds.user,
        password: etherealCreds.pass,
      },
      instructions: 'Login to the web interface with these credentials to view sent emails',
    })
  }

  return c.json({
    message: 'Email service is using SMTP configuration',
    ethereal: false,
  })
})