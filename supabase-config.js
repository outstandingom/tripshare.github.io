// Supabase Configuration
const SUPABASE_URL = 'https://oimtrjuxagzvmbllgehi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pbXRyanV4YWd6dm1ibGxnZWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3Nzk5NzksImV4cCI6MjA3ODM1NTk3OX0.hAQ7DQFfOAU5tMDj4Zc_4MyXVl10dhquQwd70OT46tg';

// Initialize Supabase client
let supabase;

try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storage: window.localStorage
        } // This closing brace was missing
    });
    console.log('Supabase client initialized successfully');
} catch (error) {
    console.error('Error initializing Supabase client:', error);
}

// Export the Supabase client
window.supabaseClient = supabase;
