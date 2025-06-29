import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  console.log('Google Auth Route - Code present:', !!code);
  console.log('Environment variables check:');
  console.log('- CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing');
  console.log('- CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing');
  console.log('- REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
  
  if (!code) {
    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent', // Force consent screen to get refresh token
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
    });
    
    console.log('Generated auth URL:', authUrl);
    
    return NextResponse.json({ authUrl });
  }
  
  try {
    console.log('Attempting token exchange with code:', code.substring(0, 10) + '...');
    
    // Use direct fetch to Google's token endpoint
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    console.log('Google token response status:', tokenResponse.status);
    console.log('Google token response:', {
      ...tokens,
      access_token: tokens.access_token ? tokens.access_token.substring(0, 20) + '...' : 'Missing',
      refresh_token: tokens.refresh_token ? 'Present' : 'Missing'
    });

    if (!tokens.access_token) {
      console.error('Token exchange failed:', tokens);
      throw new Error(`Token exchange failed: ${tokens.error || 'No access token received'}`);
    }

    return NextResponse.json({
      success: true,
      tokens: tokens,
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
} 