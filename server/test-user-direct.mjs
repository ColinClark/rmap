#!/usr/bin/env node

// Test user lookup directly to debug the issue
import { mongoService } from './src/services/mongodb.js'
import { userService } from './src/services/UserService.js'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

async function test() {
  try {
    await mongoService.connect()
    console.log('Connected to MongoDB')

    const db = mongoService.getControlDB()
    console.log('Control DB name:', db.databaseName)

    const testEmail = process.env.TEST_EMAIL || 'test@example.com'

    // Direct query
    const directUser = await db.collection('users').findOne({ email: testEmail })
    console.log('\nDirect query result:')
    console.log('  ID:', directUser?.id || directUser?._id)
    console.log('  Name:', directUser?.name)
    console.log('  Email:', directUser?.email)

    // UserService query
    const serviceUser = await userService.getUserByEmail(testEmail)
    console.log('\nUserService query result:')
    console.log('  ID:', serviceUser?.id || serviceUser?._id)
    console.log('  Name:', serviceUser?.name)
    console.log('  Email:', serviceUser?.email)

    await mongoService.disconnect()
  } catch (error) {
    console.error('Error:', error)
  }
}

test()