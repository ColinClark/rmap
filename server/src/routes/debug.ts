import { Hono } from 'hono'
import { userService } from '../services/UserService'
import { authService } from '../services/AuthService'
import { mongoService } from '../services/mongodb'
import bcrypt from 'bcrypt'

export const debugRoutes = new Hono()

// Debug endpoint to test getUserByEmail
debugRoutes.get('/test-user/:email', async (c) => {
  const email = c.req.param('email')

  console.log('DEBUG: Testing getUserByEmail for:', email)

  // Test direct DB query first
  const db = mongoService.getControlDB()
  const directUser = await db.collection('users').findOne({ email: email.toLowerCase() })
  console.log('DEBUG: Direct DB query found:', directUser ? {
    id: directUser.id || directUser._id,
    name: directUser.name,
    email: directUser.email
  } : 'NOT FOUND')

  const user = await userService.getUserByEmail(email)

  if (user) {
    console.log('DEBUG: User found:', {
      id: user.id || user._id,
      email: user.email,
      hasPassword: !!user.passwordHash
    })

    return c.json({
      found: true,
      directDb: directUser ? {
        id: directUser.id || directUser._id,
        name: directUser.name,
        email: directUser.email
      } : null,
      userService: {
        id: user.id || user._id,
        email: user.email,
        name: user.name,
        hasPassword: !!user.passwordHash,
        emailVerified: user.emailVerified
      }
    })
  } else {
    console.log('DEBUG: User not found')
    return c.json({ found: false })
  }
})

// Debug endpoint to get lastUserQuery global data
debugRoutes.get('/last-query', async (c) => {
  const lastQuery = (global as any).lastUserQuery

  if (!lastQuery) {
    return c.json({ message: 'No query data available. Call getUserByEmail first.' })
  }

  return c.json({
    ...lastQuery,
    currentTime: new Date().toISOString(),
    timeSinceQuery: Date.now() - new Date(lastQuery.timestamp).getTime()
  })
})

// Debug endpoint to test login
debugRoutes.post('/test-login', async (c) => {
  const body = await c.req.json()
  const { email, password } = body

  console.log('DEBUG: Testing login for:', email)

  // Test getUserByEmail
  const user = await userService.getUserByEmail(email)
  console.log('DEBUG: getUserByEmail result:', user ? 'Found' : 'Not found')

  if (user) {
    console.log('DEBUG: User details:', {
      id: user.id || user._id,
      email: user.email,
      hasPassword: !!user.passwordHash
    })

    if (user.passwordHash) {
      const match = await bcrypt.compare(password, user.passwordHash)
      console.log('DEBUG: Password match:', match)
    }
  }

  // Test authService.login
  const loginResult = await authService.login(email, password)
  console.log('DEBUG: Login result:', loginResult)

  return c.json({
    getUserByEmail: user ? 'Found' : 'Not found',
    loginResult
  })
})