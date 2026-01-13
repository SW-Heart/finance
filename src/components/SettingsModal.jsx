import React, { useState } from 'react';
import { X, LogOut, User, Shield, Info, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('account');

    if (!isOpen) return null;

    const handleLogout = () => {
        if (window.confirm('确定要退出登录吗？')) {
            logout();
            onClose();
            navigate('/login');
        }
    };

    const tabs = [
        { id: 'account', label: '账号信息', icon: User },
        { id: 'security', label: '数据安全', icon: Shield },
        { id: 'about', label: '关于应用', icon: Info },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content settings-modal-classic" onClick={e => e.stopPropagation()}>
                {/* Left Sidebar */}
                <aside className="modal-sidebar">
                    <div className="sidebar-header">
                        <h2>系统设置</h2>
                        <p>Settings</p>
                    </div>
                    <nav className="sidebar-menu">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`menu-item ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <tab.icon size={18} />
                                <span>{tab.label}</span>
                                <ChevronRight size={14} className="arrow" />
                            </button>
                        ))}
                    </nav>
                    <div className="sidebar-footer">
                        <button className="sidebar-logout" onClick={handleLogout}>
                            <LogOut size={16} />
                            <span>退出登录</span>
                        </button>
                    </div>
                </aside>

                {/* Right Content Area */}
                <div className="modal-main">
                    <header className="main-header">
                        <h3>{tabs.find(t => t.id === activeTab)?.label}</h3>
                    </header>

                    <button className="modal-close-floating" onClick={onClose} title="关闭">
                        <X size={20} />
                    </button>

                    <div className="main-scroll-area">
                        {activeTab === 'account' && (
                            <div className="tab-pane">
                                <section className="info-group">
                                    <div className="info-item-classic">
                                        <div className="info-label">手机号码</div>
                                        <div className="info-value font-mono">{user?.phone || '未登录'}</div>
                                    </div>
                                    <div className="info-item-classic">
                                        <div className="info-label">用户唯一 ID</div>
                                        <div className="info-value font-mono text-muted">{user?.id}</div>
                                    </div>
                                    <div className="info-item-classic">
                                        <div className="info-label">注册时间</div>
                                        <div className="info-value font-mono text-muted">
                                            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '--'}
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="tab-pane">
                                <div className="security-card-classic">
                                    <div className="shield-icon">
                                        <Shield size={48} />
                                    </div>
                                    <h4>数据安全保护</h4>
                                    <p>您的所有财务数据均已启用端到端加密存储。只有通过您绑定的手机验证码登录后才能解锁访问。</p>
                                    <div className="security-tips">
                                        <h5>安全建议：</h5>
                                        <ul>
                                            <li>切勿将登录验证码告知他人</li>
                                            <li>定期检查账号登录记录</li>
                                            <li>不在公共受控设备上保存登录状态</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'about' && (
                            <div className="tab-pane about-pane">
                                <div className="app-logo-large">金</div>
                                <div className="app-info-classic">
                                    <h4>小金库 Asset Manager</h4>
                                    <p className="version">Version 1.0.0 (Build 20260112)</p>
                                    <p className="description">一款极致简约、专业的个人资产管理工具，助您清晰掌控财富脉络。</p>
                                </div>
                                <div className="copyright">
                                    © 2026 小金库 Team. All rights reserved.
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
