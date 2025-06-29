'use client'

import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Circle, Brain, ExternalLink, TrendingUp, Mic, MicOff, ChevronRight, Clock, MapPin } from 'lucide-react';

const LifeDashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [taskInput, setTaskInput] = useState("");
  const [completedToday, setCompletedToday] = useState(0);
  const [accessToken, setAccessToken] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAiResponse, setLastAiResponse] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [todayTasks, setTodayTasks] = useState([]);
  const [tomorrowTasks, setTomorrowTasks] = useState([]);

  // Update clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load saved access token and check for OAuth callback
  useEffect(() => {
    const savedToken = localStorage.getItem('google_access_token');
    if (savedToken) {
      setAccessToken(savedToken);
    }
    
    // Check if we're returning from OAuth via URL parameters
    const params = new URLSearchParams(window.location.search);
    const accessTokenFromUrl = params.get('access_token');
    const refreshTokenFromUrl = params.get('refresh_token');
    const authSuccess = params.get('auth_success');
    const authError = params.get('auth_error');
    
    if (authError) {
      console.error('Auth error from URL:', authError);
      alert('Authentication failed: ' + authError);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    if (authSuccess && accessTokenFromUrl) {
      console.log('Successfully received tokens from OAuth redirect');
      setAccessToken(accessTokenFromUrl);
      localStorage.setItem('google_access_token', accessTokenFromUrl);
      
      if (refreshTokenFromUrl) {
        localStorage.setItem('google_refresh_token', refreshTokenFromUrl);
      }
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Show success message
      alert('✅ Connected to Google Calendar! You can now use AI scheduling.');
      
      // Fetch calendar events
      setTimeout(() => {
        fetchCalendarEvents();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (accessToken) {
      fetchCalendarEvents();
    }
  }, [accessToken]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'en-US';
        
        recognitionInstance.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          console.log('Speech recognized:', transcript);
          setTaskInput(transcript);
          setIsRecording(false);
          setVoiceProcessing(true);
          
          // Auto-submit after a brief delay to let user see the transcription
          setTimeout(() => {
            if (accessToken && transcript.trim()) {
              handleTaskSubmit({ preventDefault: () => {} });
            }
            setVoiceProcessing(false);
          }, 1500);
        };
        
        recognitionInstance.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          if (event.error === 'no-speech') {
            alert('No speech detected. Please try again.');
          } else if (event.error === 'not-allowed') {
            alert('Microphone access denied. Please allow microphone access and try again.');
          } else {
            alert('Speech recognition failed: ' + event.error);
          }
        };
        
        recognitionInstance.onend = () => {
          setIsRecording(false);
        };
        
        setRecognition(recognitionInstance);
        setSpeechSupported(true);
      } else {
        console.log('Speech recognition not supported');
        setSpeechSupported(false);
      }
    }
  }, [accessToken]);

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskInput.trim()) return;
    
    setIsProcessing(true);
    setVoiceProcessing(false);
    
    try {
      if (!accessToken) {
        await authenticateWithGoogle();
        return;
      }

      console.log('Submitting task to AI:', taskInput);
      console.log('Using access token:', accessToken.substring(0, 20) + '...');

      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: taskInput,
          accessToken: accessToken,
          action: 'add'
        }),
      });

      console.log('Calendar API response status:', response.status);
      const result = await response.json();
      console.log('Calendar API result:', result);
      
      if (result.success) {
        setLastAiResponse(result);
        setTaskInput('');
        
        // Refresh calendar events
        setTimeout(() => {
          fetchCalendarEvents();
        }, 1000);
      } else {
        console.error('Calendar API error:', result.error);
        alert('Error: ' + result.error);
        
        if (result.error.includes('authentication') || result.error.includes('expired')) {
          clearTokens();
        }
      }
    } catch (error) {
      console.error('Error submitting task:', error);
      alert('Error submitting task: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const authenticateWithGoogle = async () => {
    try {
      console.log('Starting Google OAuth flow...');
      
      const response = await fetch('/api/auth/google');
      const data = await response.json();
      
      if (data.authUrl) {
        console.log('Redirecting to Google OAuth...');
        window.location.href = data.authUrl;
      } else {
        throw new Error('No auth URL received');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      alert('Authentication failed: ' + error.message);
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      console.log('Fetching calendar events...');
      const response = await fetch(`/api/calendar?accessToken=${encodeURIComponent(accessToken)}`);
      const result = await response.json();
      
      if (result.success) {
        console.log('Calendar events fetched:', result.events.length);
        setCalendarEvents(result.events);
        
        // Process events into today and tomorrow
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const dayAfterTomorrow = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
        
        const todayEvents = result.events.filter(event => {
          const eventDate = new Date(event.start?.dateTime || event.start?.date);
          return eventDate >= today && eventDate < tomorrow;
        }).map(event => ({
          id: event.id,
          title: event.summary || 'Untitled Event',
          time: formatEventTime(event),
          completed: false,
          location: event.location,
          description: event.description
        }));
        
        const tomorrowEvents = result.events.filter(event => {
          const eventDate = new Date(event.start?.dateTime || event.start?.date);
          return eventDate >= tomorrow && eventDate < dayAfterTomorrow;
        }).map(event => ({
          id: event.id,
          title: event.summary || 'Untitled Event',
          time: formatEventTime(event),
          completed: false,
          location: event.location,
          description: event.description
        }));
        
        setTodayTasks(todayEvents);
        setTomorrowTasks(tomorrowEvents);
        
      } else {
        console.error('Failed to fetch calendar events:', result.error);
        
        if (result.error.includes('Invalid or expired')) {
          await refreshAccessToken();
        }
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  };

  const formatEventTime = (event) => {
    if (event.start?.dateTime) {
      const startTime = new Date(event.start.dateTime);
      const endTime = new Date(event.end?.dateTime);
      return `${startTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })} - ${endTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else {
      return 'All Day';
    }
  };

  const clearTokens = () => {
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_refresh_token');
    setAccessToken(null);
    setCalendarEvents([]);
    setTodayTasks([]);
    setTomorrowTasks([]);
  };

  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem('google_refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();
      
      if (data.success && data.accessToken) {
        setAccessToken(data.accessToken);
        localStorage.setItem('google_access_token', data.accessToken);
        
        // Retry fetching events
        setTimeout(() => {
          fetchCalendarEvents();
        }, 100);
      } else {
        throw new Error('Failed to refresh token');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearTokens();
      alert('Your Google Calendar connection has expired. Please reconnect.');
    }
  };

  const toggleTask = (id) => {
    setTodayTasks(tasks => 
      tasks.map(task => 
        task.id === id 
          ? { ...task, completed: !task.completed }
          : task
      )
    );
    
    // Update completed count
    const task = todayTasks.find(t => t.id === id);
    if (task && !task.completed) {
      setCompletedToday(prev => prev + 1);
    } else if (task && task.completed) {
      setCompletedToday(prev => Math.max(0, prev - 1));
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const startVoiceRecording = () => {
    if (recognition && !isRecording) {
      setIsRecording(true);
      recognition.start();
    }
  };

  const stopVoiceRecording = () => {
    if (recognition && isRecording) {
      recognition.stop();
    }
  };

  const completionRate = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-6 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, Tim</h1>
          <p className="text-gray-600">{currentTime.toLocaleString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          })}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className={`relative overflow-hidden rounded-xl p-6 shadow-sm border transition-all duration-300 hover:shadow-md ${todayTasks.length > 0 ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-600">Today's Schedule</p>
              <div className={`text-xs font-semibold px-2 py-1 rounded-full ${todayTasks.length > 0 ? 'text-blue-700 bg-blue-100' : 'text-gray-700 bg-gray-100'}`}>
                {todayTasks.length > 0 ? 'Active' : 'Open'}
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">{todayTasks.length}</p>
            <p className="text-sm text-gray-500">Events scheduled</p>
            <div className={`absolute top-0 right-0 w-16 h-16 rounded-full opacity-10 ${todayTasks.length > 0 ? 'bg-blue-400' : 'bg-gray-400'} transform translate-x-6 -translate-y-6`}></div>
          </div>
          
          <div className={`relative overflow-hidden rounded-xl p-6 shadow-sm border transition-all duration-300 hover:shadow-md ${completedToday >= 1 ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <div className={`text-xs font-semibold flex items-center gap-1 ${completedToday >= 1 ? 'text-green-700' : 'text-orange-700'}`}>
                <TrendingUp size={12} />
                +{completedToday}
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">{completedToday}</p>
            <p className="text-sm text-gray-500">Tasks finished today</p>
            <div className={`absolute top-0 right-0 w-16 h-16 rounded-full opacity-10 ${completedToday >= 1 ? 'bg-green-400' : 'bg-orange-400'} transform translate-x-6 -translate-y-6`}></div>
          </div>
          
          <div className={`relative overflow-hidden rounded-xl p-6 shadow-sm border transition-all duration-300 hover:shadow-md ${completionRate >= 50 ? 'bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200' : 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-600">Progress</p>
              <div className={`text-xs font-semibold ${completionRate >= 50 ? 'text-purple-700' : 'text-yellow-700'}`}>
                {completionRate >= 50 ? 'On track' : 'Getting started'}
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">{completionRate}%</p>
            <p className="text-sm text-gray-500">Daily completion rate</p>
            <div className={`absolute top-0 right-0 w-16 h-16 rounded-full opacity-10 ${completionRate >= 50 ? 'bg-purple-400' : 'bg-yellow-400'} transform translate-x-6 -translate-y-6`}></div>
          </div>
        </div>

        {/* Main Schedule Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Today's Schedule */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Calendar className="text-blue-500" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Today</h3>
                <p className="text-sm text-gray-500">{todayTasks.length} events scheduled</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {todayTasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="text-gray-400" size={24} />
                  </div>
                  <p className="text-gray-500 text-sm">No events scheduled for today</p>
                  <p className="text-gray-400 text-xs mt-1">Use the AI scheduler to add some!</p>
                </div>
              ) : (
                todayTasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-all cursor-pointer hover:bg-gray-50 ${
                      task.completed ? 'opacity-60' : ''
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTask(task.id);
                      }}
                      className={`mt-0.5 transition-colors ${
                        task.completed ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'
                      }`}
                    >
                      {task.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={12} className="text-gray-400" />
                        <p className="text-xs text-gray-500">{task.time}</p>
                      </div>
                      {task.location && (
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin size={12} className="text-gray-400" />
                          <p className="text-xs text-gray-500 truncate">{task.location}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tomorrow's Schedule */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <ChevronRight className="text-indigo-500" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Tomorrow</h3>
                <p className="text-sm text-gray-500">{tomorrowTasks.length} events scheduled</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {tomorrowTasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ChevronRight className="text-gray-400" size={24} />
                  </div>
                  <p className="text-gray-500 text-sm">No events scheduled for tomorrow</p>
                  <p className="text-gray-400 text-xs mt-1">Plan ahead with the AI scheduler!</p>
                </div>
              ) : (
                tomorrowTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg transition-all hover:bg-gray-50"
                  >
                    <div className="w-4 h-4 mt-0.5 border-2 border-gray-300 rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={12} className="text-gray-400" />
                        <p className="text-xs text-gray-500">{task.time}</p>
                      </div>
                      {task.location && (
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin size={12} className="text-gray-400" />
                          <p className="text-xs text-gray-500 truncate">{task.location}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* AI Quick Add */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                <Brain className="text-orange-500" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">AI Scheduler</h3>
                <p className="text-sm text-gray-500">Add events naturally</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTaskSubmit(e)}
                  placeholder={accessToken ? (isRecording ? "Listening..." : "\"Meet with John tomorrow at 2pm\"") : "Connect Google Calendar first..."}
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isProcessing || isRecording}
                />
                {speechSupported && !isProcessing && (
                  <button
                    onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                    className={`absolute right-3 top-3 p-1.5 rounded-full transition-all ${
                      isRecording 
                        ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    disabled={!accessToken}
                    title={isRecording ? 'Stop recording' : 'Start voice recording'}
                  >
                    {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                )}
                {isProcessing && (
                  <div className="absolute right-3 top-3.5">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-top-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              
              {isRecording && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span>Listening... Speak now!</span>
                </div>
              )}
              
              {voiceProcessing && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Processing voice input...</span>
                </div>
              )}
              
              {!speechSupported && accessToken && (
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                  💡 Voice input not supported in this browser. Try Chrome or Edge for voice features.
                </div>
              )}
              
              {!accessToken ? (
                <button
                  onClick={authenticateWithGoogle}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  🔗 Connect Google Calendar
                </button>
              ) : (
                <div>
                  <button
                    onClick={handleTaskSubmit}
                    disabled={isProcessing || !taskInput.trim()}
                    className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? '🤖 AI Processing...' : '🤖 Add to Schedule'}
                  </button>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-green-600">Calendar Connected</span>
                    </div>
                    <button
                      onClick={() => setShowDebug(!showDebug)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Debug
                    </button>
                  </div>
                  
                  {showDebug && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs space-y-2">
                      <div>Status: {accessToken ? '✅ Connected' : '❌ Not Connected'}</div>
                      <div>Token: {accessToken ? accessToken.substring(0, 20) + '...' : 'None'}</div>
                      <div>Events: {calendarEvents.length}</div>
                      <button
                        onClick={clearTokens}
                        className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 transition-colors"
                      >
                        Clear Connection
                      </button>
                    </div>
                  )}
                  
                  {lastAiResponse && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-700">{lastAiResponse.message}</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="text-xs text-gray-500 space-y-1">
                <p className="font-medium">💡 Try saying:</p>
                <p>• "Schedule a meeting with Sarah tomorrow at 3pm"</p>
                <p>• "Block 2 hours for project work Friday morning"</p>
                <p>• "Lunch with mom next Tuesday"</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Access</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Projects Card */}
            <a
              href="https://onetask.today"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                  </div>
                  <ExternalLink size={18} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
                <h4 className="text-xl font-bold mb-2">Projects</h4>
                <p className="text-blue-100 text-sm opacity-90">Manage your active projects and deadlines</p>
                <div className="mt-4 flex items-center text-xs">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="opacity-80">3 Active</span>
                </div>
              </div>
            </a>

            {/* Fitness Card */}
            <a
              href="https://dohardshit.today"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-transparent"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/>
                    </svg>
                  </div>
                  <ExternalLink size={18} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
                <h4 className="text-xl font-bold mb-2">Fitness</h4>
                <p className="text-orange-100 text-sm opacity-90">Track workouts and fitness goals</p>
                <div className="mt-4 flex items-center text-xs">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                  <span className="opacity-80">2 this week</span>
                </div>
              </div>
            </a>

            {/* Google Calendar Card */}
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-transparent"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Calendar size={24} />
                  </div>
                  <ExternalLink size={18} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
                <h4 className="text-xl font-bold mb-2">Calendar</h4>
                <p className="text-green-100 text-sm opacity-90">View full calendar and upcoming events</p>
                <div className="mt-4 flex items-center text-xs">
                  <div className={`w-2 h-2 rounded-full mr-2 ${accessToken ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="opacity-80">{accessToken ? 'Connected' : 'Disconnected'}</span>
                </div>
              </div>
            </a>
          </div>

          {/* Additional Quick Actions */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Focus on what matters most</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.open('https://calendar.google.com', '_blank')}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                >
                  View Full Calendar
                </button>
                <button 
                  onClick={fetchCalendarEvents}
                  className="px-3 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LifeDashboard;
