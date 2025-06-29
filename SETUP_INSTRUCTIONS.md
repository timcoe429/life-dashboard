# 🤖 AI Calendar Setup Instructions

Your Life Dashboard now has full AI-powered Google Calendar integration! Here's how to set it up:

## 1. Get Google Calendar API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Calendar API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen (Internal/External)
6. For **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/auth/google` (development)
   - `https://your-railway-domain.railway.app/api/auth/google` (production)

## 2. Get OpenAI API Key

1. Go to [OpenAI Dashboard](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-`)

## 3. Set Environment Variables

Create a `.env.local` file in your project root:

```env
# Copy from .env.example and fill in your actual keys
GOOGLE_CLIENT_ID=your_actual_google_client_id
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret  
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google
OPENAI_API_KEY=sk-your_actual_openai_key
NEXTAUTH_SECRET=any_random_string_here
```

## 4. For Railway Deployment

In Railway dashboard, add these environment variables:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET` 
- `GOOGLE_REDIRECT_URI` (use your Railway domain)
- `OPENAI_API_KEY`
- `NEXTAUTH_SECRET`

## 🎯 What You Can Do Now

Type naturally into the **Quick Add** box:

### Examples:
- **"Meeting with John tomorrow at 2pm"** → AI schedules it automatically
- **"Gym workout 3 times this week"** → AI finds optimal times
- **"Dentist appointment next week"** → AI suggests available slots
- **"Delete all meetings on Friday"** → AI handles bulk operations
- **"Reschedule client call to morning"** → AI finds better time

### Smart Features:
- ✅ **Auto-scheduling** - Finds optimal times based on your calendar
- 🏷️ **Smart tagging** - Categorizes events (meeting, personal, workout)
- 📅 **Conflict resolution** - Avoids double-booking
- 🎨 **Color coding** - Different colors for different types/priorities
- ⏰ **Smart reminders** - Automatic email/popup notifications
- 🔄 **Real-time sync** - Updates Google Calendar instantly

The AI understands context and preferences:
- Important meetings → Morning slots (9-11am)
- Deep work → Afternoon focus time (2-4pm)  
- Personal tasks → Evening (6-8pm)
- Workouts → Early morning (6-8am)

## 🚀 Try It Out

1. Push your code to Railway
2. Set up the environment variables
3. Visit your dashboard
4. Click "🔗 Connect Google Calendar"
5. Start typing: *"Schedule a team meeting for next Tuesday"*

The AI will handle the rest! 🎉 