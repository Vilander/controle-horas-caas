import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUserSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error || !profileData || profileData.status === 'inativo') {
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
          } else {
            setUser(session.user);
            setProfile(profileData);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err);
      } finally {
        setLoading(false);
      }
    }

    checkUserSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!profileData || profileData.status === 'inativo') {
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
        } else {
          setUser(session.user);
          setProfile(profileData);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // RESTAURADO: Função de login
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    // RESTAURADO: signIn exportado no value do Provider
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      isAdmin: profile?.role === 'admin', 
      signIn, 
      signOut, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);