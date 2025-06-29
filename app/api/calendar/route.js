import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import OpenAI from 'openai';
import { parseISO, addDays, addHours, format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import chrono from 'chrono-node';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Google Calendar setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function POST(request) {
  console.log('Calendar POST route called');
  
  // Check environment variables
  console.log('Environment check:');
  console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Missing');
  console.log('- GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing');
  console.log('- GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing');
  
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      success: false,
      error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to environment variables.',
    }, { status: 500 });
  }
  
  try {
    const { input, accessToken, action = 'add' } = await request.json();
    
    console.log('Request data:', { input, action, accessToken: accessToken ? 'Present' : 'Missing' });
    
    if (!input || !accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: input and accessToken are required',
      }, { status: 400 });
    }
    
    // Set the credentials
    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Test the token first by trying to get user info
    console.log('Testing Google Calendar access...');
    try {
      await calendar.calendarList.list({ maxResults: 1 });
      console.log('Google Calendar access confirmed');
    } catch (authError) {
      console.error('Google Calendar auth test failed:', authError);
      return NextResponse.json({
        success: false,
        error: 'Google Calendar authentication failed. Your access token has expired. Please reconnect your account.',
      }, { status: 401 });
    }

    // AI Processing - Analyze the natural language input
    console.log('Sending request to OpenAI...');
    let aiResponse;
    try {
      aiResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a smart calendar assistant. Analyze the user's input and extract:
            1. Event title
            2. Date/time (if not specified, suggest optimal times)
            3. Duration (default 1 hour if not specified)  
            4. Event type (meeting, task, personal, etc.)
            5. Priority level (high, medium, low)
            6. Description/notes
            
            Respond in JSON format:
            {
              "title": "Event title",
              "dateTime": "2024-01-15T14:00:00Z",
              "duration": 60,
              "type": "meeting|task|personal|workout|etc",
              "priority": "high|medium|low",
              "description": "Additional details",
              "action": "add|delete|modify",
              "tags": ["tag1", "tag2"]
            }
            
            For time suggestions, prefer:
            - Morning (9-11am) for important meetings
            - Afternoon (2-4pm) for deep work
            - Evening (6-8pm) for personal tasks
            
            Current time context: ${new Date().toISOString()}`
          },
          {
            role: "user",
            content: input
          }
        ],
        temperature: 0.3,
      });
    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError);
      return NextResponse.json({
        success: false,
        error: 'OpenAI API error: ' + openaiError.message,
      }, { status: 500 });
    }

    console.log('OpenAI response received');
    let aiData;
    try {
      aiData = JSON.parse(aiResponse.choices[0].message.content);
    } catch (parseError) {
      console.error('AI Response parsing error. Raw response:', aiResponse?.choices?.[0]?.message?.content);
      return NextResponse.json({
        success: false,
        error: 'AI response parsing failed. The AI returned invalid JSON.',
      }, { status: 500 });
    }
    console.log('AI analysis result:', aiData);
    
    // Get existing events to find optimal time slots
    const now = new Date();
    const endTime = addDays(now, 7); // Look ahead 7 days
    
    console.log('Fetching existing calendar events...');
    const existingEvents = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    console.log('Found', existingEvents.data.items.length, 'existing events');

    // Smart scheduling - find optimal time slot
    const optimalTime = findOptimalTimeSlot(
      existingEvents.data.items,
      aiData.dateTime ? parseISO(aiData.dateTime) : null,
      aiData.duration,
      aiData.type,
      aiData.priority
    );
    
    console.log('Optimal time calculated:', optimalTime);

    if (aiData.action === 'add') {
      // Create the event
      const event = {
        summary: aiData.title,
        description: `${aiData.description || ''}\n\nTags: ${aiData.tags ? aiData.tags.join(', ') : ''}\nPriority: ${aiData.priority}\nType: ${aiData.type}`,
        start: {
          dateTime: optimalTime.toISOString(),
          timeZone: 'America/New_York', // Adjust to your timezone
        },
        end: {
          dateTime: addHours(optimalTime, aiData.duration / 60).toISOString(),
          timeZone: 'America/New_York',
        },
        colorId: getColorId(aiData.type, aiData.priority),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 15 },     // 15 minutes before
          ],
        },
      };

      console.log('Creating calendar event:', event);
      
      const createdEvent = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
      
      console.log('Event created successfully:', createdEvent.data.id);

      return NextResponse.json({
        success: true,
        event: createdEvent.data,
        aiAnalysis: aiData,
        suggestedTime: optimalTime,
        message: `✅ Added "${aiData.title}" to your calendar for ${format(optimalTime, 'MMM d, h:mm a')}`
      });
    }

    // Handle other actions (delete, modify) here...
    return NextResponse.json({
      success: false,
      error: 'Action not supported yet: ' + aiData.action,
    }, { status: 400 });
    
  } catch (error) {
    console.error('Calendar API Error:', error);
    
    // Better error categorization
    if (error.code === 401) {
      return NextResponse.json({
        success: false,
        error: 'Google Calendar authentication failed. Please reconnect your account.',
      }, { status: 401 });
    }
    
    if (error.code === 403) {
      return NextResponse.json({
        success: false,
        error: 'Google Calendar access denied. Please check permissions.',
      }, { status: 403 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred',
      details: error.stack ? error.stack.split('\n')[0] : 'No additional details',
    }, { status: 500 });
  }
}

// Smart time slot finder
function findOptimalTimeSlot(existingEvents, preferredTime, duration, type, priority) {
  const now = new Date();
  let searchStart = preferredTime || now;
  
  // If preferred time is in the past, start from now
  if (preferredTime && isBefore(preferredTime, now)) {
    searchStart = now;
  }

  // Define optimal time windows based on event type
  const timePreferences = {
    'meeting': { start: 9, end: 17 }, // 9am-5pm
    'task': { start: 9, end: 12 }, // Morning focus time
    'personal': { start: 18, end: 21 }, // Evening
    'workout': { start: 6, end: 8 }, // Early morning
    'default': { start: 9, end: 17 }
  };

  const prefs = timePreferences[type] || timePreferences.default;
  
  // Search for next available slot
  for (let day = 0; day < 14; day++) { // Search up to 2 weeks
    const checkDate = addDays(startOfDay(searchStart), day);
    
    for (let hour = prefs.start; hour <= prefs.end - (duration / 60); hour++) {
      const candidateTime = addHours(checkDate, hour);
      
      // Skip if in the past
      if (isBefore(candidateTime, now)) continue;
      
      // Check if slot is free
      const isSlotFree = !existingEvents.some(event => {
        const eventStart = parseISO(event.start.dateTime || event.start.date);
        const eventEnd = parseISO(event.end.dateTime || event.end.date);
        const candidateEnd = addHours(candidateTime, duration / 60);
        
        return (
          (isAfter(candidateTime, eventStart) && isBefore(candidateTime, eventEnd)) ||
          (isAfter(candidateEnd, eventStart) && isBefore(candidateEnd, eventEnd)) ||
          (isBefore(candidateTime, eventStart) && isAfter(candidateEnd, eventEnd))
        );
      });
      
      if (isSlotFree) {
        return candidateTime;
      }
    }
  }
  
  // Fallback - just add 1 hour from now
  return addHours(now, 1);
}

// Color coding based on event type and priority
function getColorId(type, priority) {
  const colorMap = {
    'meeting_high': '11', // Red
    'meeting_medium': '3', // Purple
    'meeting_low': '1', // Blue
    'task_high': '6', // Orange
    'task_medium': '5', // Yellow
    'task_low': '2', // Green
    'personal': '10', // Green
    'workout': '4', // Red
    'default': '1' // Blue
  };
  
  return colorMap[`${type}_${priority}`] || colorMap.default;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('accessToken');
    
    console.log('Calendar GET request - Access token:', accessToken ? accessToken.substring(0, 20) + '...' : 'Missing');
    
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'No access token provided',
      }, { status: 401 });
    }
    
    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const now = new Date();
    const endTime = addDays(now, 7);
    
    console.log('Fetching events from', now.toISOString(), 'to', endTime.toISOString());
    
    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: endTime.toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    console.log('Successfully fetched', events.data.items.length, 'events');

    return NextResponse.json({
      success: true,
      events: events.data.items,
    });
    
  } catch (error) {
    console.error('Calendar fetch error:', error);
    
    // Handle specific Google API errors
    if (error.code === 401) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or expired access token',
      }, { status: 401 });
    }
    
    if (error.code === 403) {
      return NextResponse.json({
        success: false,
        error: 'Calendar access denied - check permissions',
      }, { status: 403 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code || 'unknown',
    }, { status: 500 });
  }
} 