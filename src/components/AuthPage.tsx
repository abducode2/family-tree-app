'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import '@/styles/AuthPage.css';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) { setError('يرجى إدخال البريد وكلمة المرور'); return; }
    if (tab === 'register' && password !== confirmPassword) { setError('كلمة المرور غير متطابقة'); return; }
    setLoading(true);
    setError('');
    try {
      if (tab === 'login') await login(email, password);
      else await register(email, password);
    } catch (e: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found': 'البريد الإلكتروني غير موجود',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/email-already-in-use': 'البريد مسجل مسبقاً',
        'auth/weak-password': 'كلمة المرور ضعيفة (6 أحرف على الأقل)',
        'auth/invalid-email': 'بريد إلكتروني غير صالح',
        'auth/invalid-credential': 'بيانات الدخول غير صحيحة',
      };
      setError(msg[e.code] || 'حدث خطأ، يرجى المحاولة مجدداً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">  
          <h1>شجرة العائلة</h1>
          <p>سجّل دخولك للوصول إلى شجرة عائلتك</p>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); setConfirmPassword(''); }}
          >
            تسجيل الدخول
          </button>
          <button
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError(''); }}
          >
            حساب جديد
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">البريد الإلكتروني</label>
          <input
            type="email"
            className="form-input"
            placeholder="example@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            dir="ltr"
          />
        </div>

        <div className="form-group">
          <label className="form-label">كلمة المرور</label>
          <div className='form-password'>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              dir="ltr"
              
            />
             <button className="show-confirm"
              type="button"
              onClick={() => setShowPassword(v => !v)}
             
            >
              {showPassword ? '🙈' : '👁️'}
            </button> 
          </div>
        </div>

        {tab === 'register' && (
          <div className="form-group">
            <label className="form-label">تأكيد كلمة المرور</label>
            <div className='form-password'>
              <input
                type={showConfirm ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                dir="ltr"
                
              />
            <button className='show-confirm'
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                
              >
                {showConfirm ? '🙈' : '👁️'}
              </button> 
            </div>
          </div>
        )}

        <button
          className="btn btn-primary btn-lg aut-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading 
          ? 'جاري التحميل...' 
          : tab === 'login' 
          ? 'دخول' 
          : 'إنشاء الحساب'}
        </button>
      </div>
    </div>
  );
}
