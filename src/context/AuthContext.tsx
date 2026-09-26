// Authentication & Role Management Context

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  switchRole: (newRole: UserRole) => void;
  login: (email: string, role?: UserRole) => Promise<void>;
  signup: (email: string, name: string, role: UserRole) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

// Pre-configured persona accounts for effortless testing of all 3 roles
const DEMO_PERSONAS: Record<UserRole, UserProfile> = {
  customer: {
    id: 'user-customer-1',
    email: 'hamza.foodie@cravedrop.com',
    name: 'Hamza Khan',
    username: 'hamza_eats',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    role: 'customer',
    phone: '+1 555-019-2834',
    location: {
      address: 'Apartment 4B, 32 Riverside Crescent',
      city: 'Metropolis',
      lat: 40.7128,
      lng: -74.006,
    },
    saved_post_ids: ['post-1', 'post-3'],
    created_at: '2026-01-01T00:00:00Z',
  },
  restaurant: {
    id: 'user-vendor-1',
    email: 'chef.marco@firecrust.com',
    name: 'Chef Marco Rossi',
    username: 'firecrust_kitchen',
    avatar_url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200&auto=format&fit=crop&q=80',
    role: 'restaurant',
    restaurant_id: 'rest-1',
    phone: '+1 555-019-7721',
    saved_post_ids: [],
    created_at: '2026-01-05T00:00:00Z',
  },
  admin: {
    id: 'user-admin-1',
    email: 'admin@cravedrop.food',
    name: 'Platform Moderator',
    username: 'crave_admin',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
    role: 'admin',
    saved_post_ids: [],
    created_at: '2025-12-01T00:00:00Z',
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(() => {
    return (localStorage.getItem('cravedrop_active_role') as UserRole) || 'customer';
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('cravedrop_user_profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEMO_PERSONAS[role];
      }
    }
    return DEMO_PERSONAS[role];
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('cravedrop_user_profile', JSON.stringify(user));
      localStorage.setItem('cravedrop_active_role', user.role);
    }
  }, [user]);

  const switchRole = (newRole: UserRole) => {
    const persona = DEMO_PERSONAS[newRole];
    setUser(persona);
    setRole(newRole);
    localStorage.setItem('cravedrop_active_role', newRole);
    localStorage.setItem('cravedrop_user_profile', JSON.stringify(persona));
  };

  const login = async (email: string, selectedRole: UserRole = 'customer') => {
    // In production with Supabase Auth: await supabase.auth.signInWithPassword({ email, password })
    const base = DEMO_PERSONAS[selectedRole];
    const loggedUser: UserProfile = {
      ...base,
      email,
      name: email.split('@')[0],
      role: selectedRole,
    };
    setUser(loggedUser);
    setRole(selectedRole);
  };

  const signup = async (email: string, name: string, selectedRole: UserRole) => {
    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      email,
      name,
      username: name.toLowerCase().replace(/\s+/g, '_'),
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
      role: selectedRole,
      restaurant_id: selectedRole === 'restaurant' ? 'rest-1' : undefined,
      saved_post_ids: [],
      created_at: new Date().toISOString(),
    };
    setUser(newUser);
    setRole(selectedRole);
  };

  const logout = () => {
    // Revert to guest/customer default
    switchRole('customer');
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || role,
        isAuthenticated: !!user,
        switchRole,
        login,
        signup,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
