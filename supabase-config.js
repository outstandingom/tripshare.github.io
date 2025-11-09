// Supabase Configuration
const SUPABASE_URL = 'https://jrwlqtnqjlaspfcrvvpn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyd2xxdG5xamxhc3BmY3J2dnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzI3NDcsImV4cCI6MjA3ODEwODc0N30.SacP5qRWQ3-WLnw79_BA7IlWgTCqzIgtPcmFEXvkRRU';

// Initialize Supabase client
let supabase;

try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storage: window.localStorage
        }
    });
    console.log('Supabase client initialized successfully');
} catch (error) {
    console.error('Error initializing Supabase client:', error);
}

// Export the Supabase client
window.supabaseClient = supabase;
