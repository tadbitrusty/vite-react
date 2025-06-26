// Placeholder supabase client for minimal build
export const supabase = {
  auth: {
    signInWithPassword: async (credentials: any) => ({ data: null, error: new Error('Not implemented') }),
    signUp: async (credentials: any) => ({ data: null, error: new Error('Not implemented') }),
    signOut: async () => ({ error: null }),
    getUser: async () => ({ data: { user: null }, error: null })
  }
};