import nodemailer from 'nodemailer';

async function getEtherealCredentials() {
  try {
    console.log('Creating Ethereal test account...\n');
    const testAccount = await nodemailer.createTestAccount();

    console.log('📧 Ethereal Email Test Account:');
    console.log('================================');
    console.log(`Email:    ${testAccount.user}`);
    console.log(`Password: ${testAccount.pass}`);
    console.log('================================\n');
    console.log('Login at: https://ethereal.email/login');
    console.log('View messages at: https://ethereal.email/messages');
    console.log('\nNote: Use these credentials to login and view all test emails sent by the system.');
  } catch (error) {
    console.error('Error creating test account:', error);
  }
}

getEtherealCredentials();