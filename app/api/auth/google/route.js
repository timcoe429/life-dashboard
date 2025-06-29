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
      // Redirect back to app with error
      const baseUrl = process.env.GOOGLE_REDIRECT_URI.replace('/api/auth/google', '');
      const redirectUrl = new URL('/', baseUrl);
      redirectUrl.searchParams.set('auth_error', tokens.error || 'Token exchange failed');
      return NextResponse.redirect(redirectUrl);
    }

    // Successful authentication - redirect back to app with tokens
    const baseUrl = process.env.GOOGLE_REDIRECT_URI.replace('/api/auth/google', '');
    const redirectUrl = new URL('/', baseUrl);
    redirectUrl.searchParams.set('access_token', tokens.access_token);
    if (tokens.refresh_token) {
      redirectUrl.searchParams.set('refresh_token', tokens.refresh_token);
    }
    redirectUrl.searchParams.set('auth_success', 'true');
    
    return NextResponse.redirect(redirectUrl);
    
  } catch (error) {
    console.error('Auth error:', error);
    // Redirect back to app with error
    const baseUrl = process.env.GOOGLE_REDIRECT_URI.replace('/api/auth/google', '');
    const redirectUrl = new URL('/', baseUrl);
    redirectUrl.searchParams.set('auth_error', error.message);
    return NextResponse.redirect(redirectUrl);
  }
} 