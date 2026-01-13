import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, TrendingDown, Eye, EyeOff, ArrowUpDown } from 'lucide-react';
import { useStats } from '../data/useAssets';
import { TrendChart } from '../components/charts/TrendChart';
import { NetWorthBarChart } from '../components/charts/NetWorthBarChart';
import { format, parse } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import './Dashboard.css';

// 资产类别定义
const assetCategories = [
    {
        id: 'liquid',
        name: '流动性资产',
        description: '现金、活期存款、支付账户',
        color: '#10B981', // Emerald 500
        gradientStart: '#34D399',
        gradientEnd: '#059669',
        categories: ['liquid'],
    },
    {
        id: 'safe',
        name: '稳健型资产',
        description: '定期存款、债券、固收理财',
        color: '#3B82F6', // Blue 500
        gradientStart: '#60A5FA',
        gradientEnd: '#2563EB',
        categories: ['safe'],
    },
    {
        id: 'equity',
        name: '权益类资产',
        description: '股票、与股票相关的基金',
        color: '#8B5CF6', // Violet 500
        gradientStart: '#A78BFA',
        gradientEnd: '#7C3AED',
        categories: ['equity'],
    },
    {
        id: 'risk',
        name: '风险资产',
        description: '加密货币、衍生品',
        color: '#F59E0B', // Amber 500
        gradientStart: '#FBBF24',
        gradientEnd: '#D97706',
        categories: ['risk'],
    },
    {
        id: 'other',
        name: '其他资产',
        description: '房产、黄金、收藏品',
        color: '#EC4899', // Pink 500
        gradientStart: '#F472B6',
        gradientEnd: '#DB2777',
        categories: ['other'],
    },
    {
        id: 'liability',
        name: '负债',
        description: '信用卡、房贷、车贷',
        color: '#EF4444', // Red 500
        gradientStart: '#F87171',
        gradientEnd: '#DC2626',
        categories: ['liability'],
        isLiability: true,
    },
];

const Dashboard = () => {
    const [showValue, setShowValue] = useState(true);
    const [viewMode, setViewMode] = useState('total');

    const { stats, categoryStats, trend, loading, refresh } = useStats();

    useEffect(() => {
        refresh();
    }, []);

    // 获取最新记录月份
    const latestMonth = useMemo(() => {
        if (trend && trend.length > 0) {
            const lastDate = trend[trend.length - 1].date;
            try {
                const date = parse(lastDate, 'yyyy-MM', new Date());
                return format(date, 'yyyy年M月', { locale: zhCN });
            } catch {
                return lastDate;
            }
        }
        return '--';
    }, [trend]);

    // 格式化金额 - 超过10万用万单位，保留两位小数
    const formatMoney = (value) => {
        if (!showValue) return '****';
        if (value === null || value === undefined) return '¥0';

        const absValue = Math.abs(value);
        if (absValue >= 100000) {
            // 超过10万，用万单位，保留两位小数
            return `¥${(value / 10000).toFixed(2)}万`;
        } else {
            // 10万以下，保留整数
            return `¥${Math.round(value).toLocaleString('zh-CN')}`;
        }
    };

    // 格式化大金额 - 用于左侧主卡片（超过10万用万单位）
    const formatMoneyLarge = (value) => {
        if (!showValue) return '****';
        if (value === null || value === undefined) return '0';

        const absValue = Math.abs(value);
        if (absValue >= 100000) {
            return (value / 10000).toFixed(2);
        } else {
            return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    };

    // 获取单位
    const getUnit = (value) => {
        if (value === null || value === undefined) return '';
        const absValue = Math.abs(value);
        if (absValue >= 100000) return '万';
        return '';
    };

    // 格式化月环比变化 - 格式: +¥2,006 (+12%)
    const formatChange = (amountChange, percentChange) => {
        if (amountChange === null || amountChange === undefined) return '--';
        if (!showValue) return '****';

        const sign = amountChange >= 0 ? '+' : '-';
        const absAmount = Math.abs(amountChange);
        // 超过10万用万单位，保留两位小数
        const amountStr = absAmount >= 100000
            ? `${(absAmount / 10000).toFixed(2)}万`
            : absAmount.toLocaleString('zh-CN');
        const percentSign = percentChange >= 0 ? '+' : '-';
        const percentStr = percentChange !== null
            ? ` (${percentSign}${Math.abs(percentChange * 100).toFixed(0)}%)`
            : '';

        return `${sign}¥${amountStr}${percentStr}`;
    };

    const formatPercentSimple = (value) => {
        if (value === null || value === undefined) return '--';
        const sign = value >= 0 ? '' : '-';
        return `${sign}${Math.abs(value * 100).toFixed(0)}%`;
    };

    // 计算每个类别的汇总数据
    const categoryData = useMemo(() => {
        if (!categoryStats) return [];

        const totalAssets = stats?.totalAssets || 0;

        return assetCategories.map(cat => {
            let amount = 0;
            let previousAmount = 0;

            cat.categories.forEach(catKey => {
                if (categoryStats[catKey]) {
                    amount += categoryStats[catKey].totalAmount || 0;
                    previousAmount += categoryStats[catKey].previousAmount || 0;
                }
            });

            const changeAmount = amount - previousAmount;
            const changePercent = previousAmount ? changeAmount / Math.abs(previousAmount) : null;
            const ratio = totalAssets > 0 ? amount / totalAssets : 0;

            return {
                ...cat,
                amount,
                previousAmount,
                changeAmount,
                changePercent,
                ratio,
            };
        });
    }, [categoryStats, stats]);

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner" />
            </div>
        );
    }

    const displayValue = viewMode === 'net' ? stats?.netWorth : stats?.totalAssets;
    const displayChangeAmount = viewMode === 'net' ? stats?.netWorthMoMValue : stats?.assetsMoMValue;
    const displayChangePercent = viewMode === 'net' ? stats?.netWorthMoMPercent : stats?.assetsMoMPercent;
    const displayLabel = viewMode === 'net' ? '净资产' : '总资产';
    const displayUnit = getUnit(displayValue);

    return (
        <div className="dashboard">
            {/* 顶部主区域 */}
            <div className="dashboard-main-section">
                {/* 左侧：总资产主卡片 */}
                <div className="main-asset-card">
                    <div className="main-card-header">
                        <div className="main-card-title-row">
                            <span className="title-text">{displayLabel}</span>
                            <button
                                className="switch-btn"
                                onClick={() => setViewMode(viewMode === 'total' ? 'net' : 'total')}
                                title={viewMode === 'total' ? '切换到净资产' : '切换到总资产'}
                            >
                                <ArrowUpDown size={14} />
                            </button>
                        </div>
                        <div className="month-badge">
                            {latestMonth}
                        </div>
                    </div>

                    <div className="main-card-value-row">
                        <span className="currency-symbol">¥</span>
                        <span className="main-value-amount">{formatMoneyLarge(displayValue)}</span>
                        {displayUnit && <span className="main-value-unit">{displayUnit}</span>}
                        <button
                            className="visibility-btn"
                            onClick={() => setShowValue(!showValue)}
                            title={showValue ? '隐藏数值' : '显示数值'}
                        >
                            {showValue ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                    </div>

                    <div className="main-change-row">
                        <span className="change-label">本月涨幅</span>
                        <span className={`change-badge ${(displayChangeAmount || 0) >= 0 ? 'positive' : 'negative'}`}>
                            {formatChange(displayChangeAmount, displayChangePercent)}
                        </span>
                    </div>

                    <div className="main-chart">
                        {trend && trend.length > 0 ? (
                            <TrendChart data={trend} height={90} viewMode={viewMode} />
                        ) : (
                            <div className="empty-chart-placeholder" style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                暂无趋势数据
                            </div>
                        )}
                    </div>
                </div>

                {/* 右侧：分类卡片网格 */}
                <div className="category-grid">
                    {categoryData.map((cat) => {
                        const isPositive = cat.isLiability
                            ? (cat.changeAmount || 0) <= 0
                            : (cat.changeAmount || 0) >= 0;

                        // Handle case where totalAssets is 0
                        const ratio = cat.ratio || 0;
                        const barHeight = ratio > 0 ? Math.min(Math.max(ratio * 100, 8), 100) : 8;

                        return (
                            <div key={cat.id} className="category-card">
                                <div className="category-left">
                                    <h4 className="category-name">{cat.name}</h4>
                                    <p className="category-description">{cat.description}</p>
                                    <div className="category-stats">
                                        <span className={`category-amount ${cat.isLiability ? 'liability' : ''}`}>
                                            {formatMoney(cat.amount)}
                                        </span>
                                        <span className={`category-change ${isPositive ? 'positive' : 'negative'}`}>
                                            {formatChange(cat.changeAmount, cat.changePercent)}
                                        </span>
                                    </div>
                                </div>
                                <div className="category-right">
                                    <div className="category-bar-track">
                                        <div
                                            className="category-bar-fill"
                                            style={{
                                                height: `${barHeight}%`,
                                                background: `linear-gradient(180deg, ${cat.gradientStart} 0%, ${cat.gradientEnd} 100%)`,
                                            }}
                                        >
                                            <span className="category-ratio">{(cat.ratio * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 底部：资金详情柱状图 */}
            <div className="cashflow-section">
                <div className="cashflow-header">
                    <h3 className="cashflow-title">资金详情</h3>
                </div>
                {trend && trend.length > 0 ? (
                    <NetWorthBarChart data={trend} height={300} showValue={showValue} />
                ) : (
                    <div className="empty-chart-placeholder" style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ textAlign: 'center' }}>
                            <p>暂无数据</p>
                            <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>请前往账本录入首月资产</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
