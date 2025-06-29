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
  
  if (!code) {
    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
    });
    
    return NextResponse.json({ authUrl });
  }
  
  try {
    // Exchange code for tokens
    const response = await oauth2Client.getAccessToken(code);
    console.log('Token response:', response);
    
    if (!response.tokens) {
      throw new Error('No tokens received from Google');
    }
    
    return NextResponse.json({
      success: true,
      tokens: response.tokens,
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.toString(),
    }, { status: 500 });
  }
} 