import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, testConnection } from '../firebase/config';
import { UserProfile, Business, DailySession } from '../types';
import { getUserProfile, getActiveSession, isDemoId, logoutAttendant } from '../firebase/services';
import { handleFirestoreError, OperationType } from '../firebase/errors';

interface AuthContextType {
  firebaseUser: FirebaseUser | { uid: string; email: string } | null;
  userProfile: UserProfile | null;
  business: Business | null;
  activeSession: DailySession | null;
  loading: boolean;
  isDemoMode: boolean;
  startDemoMode: (fullName?: string, businessName?: string, email?: string) => void;
  refreshBusiness: () => Promise<void>;
  refreshActiveSession: () => Promise<void>;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearNotification: () => void;
  signOutApp: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | { uid: string; email: string } | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [activeSession, setActiveSession] = useState<DailySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const clearNotification = () => setNotification(null);

  // Initialize demo mode if stored
  const initDemoUser = (name = 'Maureen Okafor', bName = 'Maureen Cash & POS Spot', email = 'maureen@cashflow.ng') => {
    let storedUser: UserProfile | null = null;
    let storedBiz: Business | null = null;
    try {
      const rawUser = localStorage.getItem('maureen_cashflow_user');
      if (rawUser) storedUser = JSON.parse(rawUser);
      const rawBiz = localStorage.getItem('maureen_cashflow_business');
      if (rawBiz) storedBiz = JSON.parse(rawBiz);
    } catch {}

    const demoUid = storedUser?.uid || `demo_attendant_${Date.now()}`;
    const demoBizId = storedBiz?.id || `demo_biz_${Date.now()}`;
    const profile: UserProfile = storedUser || {
      uid: demoUid,
      email,
      fullName: name,
      phoneNumber: '08012345678',
      businessId: demoBizId,
      createdAt: new Date().toISOString(),
    };

    const biz: Business = storedBiz || {
      id: demoBizId,
      name: bName,
      ownerId: demoUid,
      currency: 'NGN',
      cashInDrawer: 100000,
      terminalBalance: 250000,
      currentSessionId: null,
      phoneNumber: '08012345678',
      createdAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem('maureen_cashflow_user', JSON.stringify(profile));
      localStorage.setItem('maureen_cashflow_business', JSON.stringify(biz));
    } catch {}

    setFirebaseUser({ uid: demoUid, email: profile.email });
    setUserProfile(profile);
    setBusiness(biz);
    setIsDemoMode(true);
    localStorage.setItem('maureen_cashflow_active_demo', 'true');
  };

  const startDemoMode = (fullName?: string, businessName?: string, email?: string) => {
    initDemoUser(fullName, businessName, email);
    showNotification('Welcome! You are now logged in.');
  };

  const signOutApp = async () => {
    if (isDemoMode) {
      localStorage.removeItem('maureen_cashflow_active_demo');
      setIsDemoMode(false);
      setFirebaseUser(null);
      setUserProfile(null);
      setBusiness(null);
      setActiveSession(null);
    } else {
      await logoutAttendant();
    }
  };

  // Test connection on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Listen to Auth state
  useEffect(() => {
    // Check if demo mode was active
    const wasDemo = localStorage.getItem('maureen_cashflow_active_demo') === 'true';
    if (wasDemo) {
      initDemoUser();
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async user => {
      setFirebaseUser(user);
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);

          if (profile?.businessId) {
            const active = await getActiveSession(profile.businessId);
            setActiveSession(active);
          }
        } catch (err) {
          console.error('Error fetching initial profile/session', err);
        }
      } else {
        setUserProfile(null);
        setBusiness(null);
        setActiveSession(null);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Demo event listeners for live state updates
  useEffect(() => {
    if (!isDemoMode) return;

    const onBizUpdate = () => {
      try {
        const raw = localStorage.getItem('maureen_cashflow_business');
        if (raw) setBusiness(JSON.parse(raw));
      } catch {}
    };

    window.addEventListener('maureen_demo_business_updated', onBizUpdate);
    return () => window.removeEventListener('maureen_demo_business_updated', onBizUpdate);
  }, [isDemoMode]);

  // Realtime listener for business profile & balances (when using real Firebase)
  useEffect(() => {
    if (!userProfile?.businessId || isDemoId(userProfile.businessId)) {
      return;
    }

    const unsubBusiness = onSnapshot(
      doc(db, 'businesses', userProfile.businessId),
      docSnap => {
        if (docSnap.exists()) {
          setBusiness(docSnap.data() as Business);
        }
      },
      error => {
        handleFirestoreError(error, OperationType.GET, `businesses/${userProfile.businessId}`);
      }
    );

    return () => unsubBusiness();
  }, [userProfile?.businessId]);

  // Realtime listener for active session
  useEffect(() => {
    if (!userProfile?.businessId) return;

    const checkSession = async () => {
      try {
        const session = await getActiveSession(userProfile.businessId);
        setActiveSession(session);
      } catch (e) {
        console.error('Failed to get active session', e);
      }
    };
    checkSession();
  }, [userProfile?.businessId, business?.currentSessionId]);

  const refreshBusiness = async () => {
    if (!userProfile?.businessId) return;
    if (isDemoId(userProfile.businessId)) {
      try {
        const raw = localStorage.getItem('maureen_cashflow_business');
        if (raw) setBusiness(JSON.parse(raw));
      } catch {}
    }
  };

  const refreshActiveSession = async () => {
    if (!userProfile?.businessId) return;
    const session = await getActiveSession(userProfile.businessId);
    setActiveSession(session);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        business,
        activeSession,
        loading,
        isDemoMode,
        startDemoMode,
        refreshBusiness,
        refreshActiveSession,
        notification,
        showNotification,
        clearNotification,
        signOutApp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
