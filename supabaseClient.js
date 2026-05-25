// Supabase Initialization
const SUPABASE_URL = 'https://sxuxasjvlmqnatlucphp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4dXhhc2p2bG1xbmF0bHVjcGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MjM0MDAsImV4cCI6MjA5NTE5OTQwMH0.LVbLzdPPRR30semc7N29YIPNoEoLnxQccGrNR02T_k0';

if (!window.supabase) {
    console.error("Supabase SDK is not loaded. Make sure to include the CDN link in your HTML.");
}

// Initialize the Supabase client
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
