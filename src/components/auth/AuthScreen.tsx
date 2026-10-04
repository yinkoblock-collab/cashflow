import React, { useState } from 'react';
import {
  Banknote,
  Lock,
  Mail,
  User,
  Phone,
  Building2,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  registerAttendant,
  loginAttendant,
  sendPasswordReset,
} from '../../firebase/services';
import { useAuth } from '../../contexts/AuthContext';

type AuthMode = 'login' | 'register' | 'forgot_password';

export const AuthScreen: React.FC = () => {
  const { startDemoMode } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsOperationNotAllowed(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginAttendant(email.trim(), password);
      if (res?.isFallback) {
        startDemoMode(res.user?.fullName || 'Maureen Okafor', res.business?.name || 'Maureen Cash & POS Spot', email.trim());
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
        setIsOperationNotAllowed(true);
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setErrorMsg('Invalid email or password. Please check and try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMsg('Too many unsuccessful attempts. Please try again later or reset password.');
      } else {
        setErrorMsg(err.message || 'Failed to sign in. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!businessName.trim()) {
      setErrorMsg('Please enter your POS business name.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerAttendant({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        businessName: businessName.trim(),
      });
      if (res?.isFallback) {
        startDemoMode(fullName.trim(), businessName.trim(), email.trim());
      } else {
        setSuccessMsg('Account created successfully! Logging you in...');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
        setIsOperationNotAllowed(true);
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email already exists. Please log in.');
      } else {
        setErrorMsg(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSuccessMsg('Password reset instructions have been sent to your email.');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
        setIsOperationNotAllowed(true);
      } else {
        setErrorMsg(err.message || 'Failed to send password reset email.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Icon & Heading */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-700/20 mb-3">
            <Banknote className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            MAUREEN CASHFLOW
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {mode === 'login' && 'Sign in to manage your POS cash & terminal'}
            {mode === 'register' && 'Set up your POS business account'}
            {mode === 'forgot_password' && 'Reset your account password'}
          </p>
        </div>

        {/* Card Box */}
        <div className="mt-6 bg-white py-8 px-6 shadow-sm border border-slate-200/90 rounded-2xl sm:px-8 space-y-4">
          {/* Helpful Banner for auth/operation-not-allowed */}
          {isOperationNotAllowed && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2.5">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block text-amber-950">
                    Firebase Console setup required for Email/Password
                  </strong>
                  <p className="mt-0.5 text-amber-800 leading-relaxed">
                    By default, newly provisioned Firebase projects do not have the Email/Password sign-in provider turned on.
                  </p>
                </div>
              </div>

              <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 space-y-1 font-sans text-[11px] text-amber-900">
                <p className="font-semibold text-slate-800">To enable in Firebase Console:</p>
                <ol className="list-decimal pl-4 space-y-0.5 text-slate-700">
                  <li>Open <strong>Authentication → Sign-in method</strong></li>
                  <li>Click <strong>Email/Password</strong> and toggle <strong>Enable</strong> to ON</li>
                  <li>Click <strong>Save</strong></li>
                </ol>
                <a
                  href="https://console.firebase.google.com/project/gen-lang-client-0809561891/authentication/providers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800 underline mt-1"
                >
                  <span>Open Firebase Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="pt-1">
                <p className="font-medium text-slate-700 mb-1.5">
                  Want to use Maureen Cashflow right now?
                </p>
                <button
                  type="button"
                  onClick={() => startDemoMode(fullName || 'Maureen Okafor', businessName || 'Maureen Cash & POS Spot')}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Launch Instant Attendant Mode</span>
                </button>
              </div>
            </div>
          )}

          {/* Standard Notifications */}
          {errorMsg && !isOperationNotAllowed && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="attendant@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setMode('forgot_password');
                    }}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-3 border-t border-slate-200 text-center space-y-2">
                <p className="text-xs text-slate-600">
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setMode('register');
                    }}
                    className="font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    Create account
                  </button>
                </p>

                {/* Instant Launch Demo Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => startDemoMode()}
                    className="w-full py-2 px-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Quick test: Open Instant Attendant Mode</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Maureen Okafor"
                    className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business name
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="Maureen Cash & POS Spot"
                    className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="08012345678"
                    className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="maureen@example.com"
                    className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3.5 py-2 text-sm bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Creating business profile...' : 'Register & get started'}
              </button>

              <div className="pt-3 border-t border-slate-200 text-center">
                <p className="text-xs text-slate-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      clearMessages();
                      setMode('login');
                    }}
                    className="font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Your registered email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="attendant@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>{loading ? 'Sending link...' : 'Send reset instructions'}</span>
              </button>

              <div className="pt-4 border-t border-slate-200 text-center">
                <button
                  type="button"
                  onClick={() => {
                    clearMessages();
                    setMode('login');
                  }}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Back to login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
