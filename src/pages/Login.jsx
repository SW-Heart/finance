import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Wallet, Phone, KeyRound, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sendVerifyCode, verifyCode } from '../api/auth';
import './Login.css';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated } = useAuth();

    const [phoneNumber, setPhoneNumber] = useState('');
    const [code, setCode] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [loading, setLoading] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // 如果已登录，重定向到首页
    useEffect(() => {
        if (isAuthenticated) {
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, location]);

    // 倒计时
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // 验证手机号格式
    const isValidPhone = (phone) => {
        return /^1[3-9]\d{9}$/.test(phone);
    };

    // 发送验证码
    const handleSendCode = async () => {
        if (!isValidPhone(phoneNumber)) {
            setError('请输入有效的手机号');
            return;
        }

        setError('');
        setSuccess('');
        setSendingCode(true);

        try {
            const result = await sendVerifyCode(phoneNumber);

            if (result.success) {
                setSuccess('验证码已发送，请注意查收短信');
                setCountdown(60);
            } else {
                setError(result.message || '发送失败，请稍后重试');
            }
        } catch (err) {
            setError('发送失败，请检查网络连接');
        } finally {
            setSendingCode(false);
        }
    };

    // 登录
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isValidPhone(phoneNumber)) {
            setError('请输入有效的手机号');
            return;
        }

        if (!code || code.length < 4) {
            setError('请输入验证码');
            return;
        }

        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const result = await verifyCode(phoneNumber, code);

            if (result.success) {
                // 登录成功
                login(result.user);
                const from = location.state?.from?.pathname || '/';
                navigate(from, { replace: true });
            } else {
                setError(result.message || '验证失败，请重试');
            }
        } catch (err) {
            setError('登录失败，请检查网络连接');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="login-logo">
                            <Wallet />
                        </div>
                        <h1 className="login-title">Vault</h1>
                        <p className="login-subtitle">个人资产管理</p>
                    </div>

                    <form className="login-form" onSubmit={handleSubmit}>
                        {error && (
                            <div className="error-message">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        {success && (
                            <div className="success-message">
                                <CheckCircle size={18} />
                                <span>{success}</span>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">手机号</label>
                            <div className="input-wrapper">
                                <Phone size={18} className="input-icon" />
                                <input
                                    type="tel"
                                    className="form-input"
                                    placeholder="请输入手机号"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                    maxLength={11}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">验证码</label>
                            <div className="code-input-group">
                                <div className="input-wrapper">
                                    <KeyRound size={18} className="input-icon" />
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="请输入验证码"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        maxLength={6}
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="send-code-btn"
                                    onClick={handleSendCode}
                                    disabled={countdown > 0 || sendingCode || !isValidPhone(phoneNumber)}
                                >
                                    {sendingCode ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="login-btn"
                            disabled={loading || !phoneNumber || !code}
                        >
                            {loading ? '登录中...' : '登录'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>登录即表示您同意服务条款和隐私政策</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
