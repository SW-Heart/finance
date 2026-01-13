import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, PieChart, Settings } from 'lucide-react';
import './Navigation.css';

const Navigation = ({ onOpenSettings }) => {
    const navItems = [
        { path: '/', icon: LayoutDashboard, label: '总览' },
        { path: '/ledger', icon: BookOpen, label: '账本' },
        { path: '/portfolio', icon: PieChart, label: '分析' },
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-logo">
                    <div className="brand-icon">金</div>
                    <span className="brand-name">小金库</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <item.icon />
                        <span>{item.label}</span>
                    </NavLink>
                ))}

                <button
                    className="nav-item settings-btn-item"
                    onClick={onOpenSettings}
                    style={{ background: 'transparent', border: 'none', width: '100%', cursor: 'pointer' }}
                >
                    <Settings />
                    <span>设置</span>
                </button>
            </nav>
        </aside>
    );
};

export default Navigation;
