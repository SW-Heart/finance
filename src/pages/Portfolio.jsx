import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useStats, getCurrentMonth } from '../data/useAssets';
import { formatPercent } from '../data/calculations';
import { ASSET_CATEGORIES } from '../data/models';
import './Portfolio.css';

const Portfolio = () => {
    const currentMonth = getCurrentMonth();
    const { stats, categoryStats, waterfall, loading } = useStats(currentMonth);
    const [activeTab, setActiveTab] = useState('detail');
    const [expandedCategories, setExpandedCategories] = useState({});

    const formatMoney = (value) => {
        if (value === null || value === undefined) return '--';
        if (Math.abs(value) >= 10000) {
            return `¥${(value / 10000).toFixed(2)}万`;
        }
        return `¥${value.toLocaleString()}`;
    };

    const formatDiff = (value) => {
        if (value === null || value === undefined) return '--';
        const sign = value >= 0 ? '+' : '';
        if (Math.abs(value) >= 10000) {
            return `${sign}${(value / 10000).toFixed(2)}万`;
        }
        return `${sign}${value.toLocaleString()}`;
    };

    const getTrendClass = (value) => {
        if (value === null || value === undefined) return '';
        if (value > 0) return 'positive';
        if (value < 0) return 'negative';
        return '';
    };

    const categorySummary = useMemo(() => {
        const summary = {};
        Object.entries(categoryStats).forEach(([categoryId, data]) => {
            const categoryInfo = Object.values(ASSET_CATEGORIES).find(c => c.id === categoryId);
            if (!categoryInfo) return;
            summary[categoryId] = {
                ...data,
                info: categoryInfo,
                weight: data.totalAmount / (stats?.totalAssets || 1),
            };
        });
        return summary;
    }, [categoryStats, stats]);

    const toggleCategory = (categoryId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    if (loading) {
        return <div className="page-loading"><div className="spinner" /></div>;
    }

    const assetCategories = Object.entries(categorySummary)
        .filter(([_, data]) => data.parentCategory === 'assets')
        .sort((a, b) => b[1].totalAmount - a[1].totalAmount);

    const liabilityCategories = Object.entries(categorySummary)
        .filter(([_, data]) => data.parentCategory === 'liabilities')
        .sort((a, b) => b[1].totalAmount - a[1].totalAmount);

    return (
        <div className="portfolio-page">
            <div className="tabs-container">
                <div className="tabs">
                    <button className={`tab ${activeTab === 'detail' ? 'active' : ''}`} onClick={() => setActiveTab('detail')}>资产明细</button>
                    <button className={`tab ${activeTab === 'waterfall' ? 'active' : ''}`} onClick={() => setActiveTab('waterfall')}>波动归因</button>
                </div>
            </div>

            {activeTab === 'detail' && (
                <div className="detail-content">
                    <div className="detail-section">
                        <div className="section-header">
                            <h3 className="section-title">资产分类</h3>
                            <span className="section-total">{formatMoney(stats?.totalAssets)}</span>
                        </div>
                        <div className="categories-list">
                            {assetCategories.map(([categoryId, categoryData]) => {
                                const isExpanded = expandedCategories[categoryId] !== false;
                                const items = categoryData.items || [];
                                return (
                                    <div key={categoryId} className="category-block">
                                        <button className="category-header" onClick={() => toggleCategory(categoryId)}>
                                            <div className="category-info">
                                                <span className="category-dot assets" />
                                                <span className="category-name">{categoryData.info?.name}</span>
                                                <span className="category-count">{items.length}</span>
                                            </div>
                                            <div className="category-stats">
                                                <span className="category-amount">{formatMoney(categoryData.totalAmount)}</span>
                                                <span className={`category-change ${getTrendClass(categoryData.momPercent)}`}>{formatPercent(categoryData.momPercent)}</span>
                                                <span className="category-weight">{((categoryData.weight || 0) * 100).toFixed(1)}%</span>
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </div>
                                        </button>
                                        {isExpanded && items.length > 0 && (
                                            <table className="items-table">
                                                <thead>
                                                    <tr><th>名称</th><th>金额</th><th>月度变化</th><th>波动率</th><th>占比</th></tr>
                                                </thead>
                                                <tbody>
                                                    {items.map(item => (
                                                        <tr key={item.assetId}>
                                                            <td>{item.assetType?.name}</td>
                                                            <td className="text-right font-mono">{formatMoney(item.currentAmount)}</td>
                                                            <td className={`text-right font-mono ${getTrendClass(item.momValue)}`}>{formatDiff(item.momValue)}</td>
                                                            <td className={`text-right font-mono ${getTrendClass(item.momPercent)}`}>{formatPercent(item.momPercent)}</td>
                                                            <td className="text-right font-mono">{item.weight !== null ? `${(item.weight * 100).toFixed(2)}%` : '--'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {liabilityCategories.length > 0 && (
                        <div className="detail-section">
                            <div className="section-header">
                                <h3 className="section-title danger">负债分类</h3>
                                <span className="section-total danger">{formatMoney(stats?.totalLiabilities)}</span>
                            </div>
                            <div className="categories-list">
                                {liabilityCategories.map(([categoryId, categoryData]) => {
                                    const isExpanded = expandedCategories[categoryId] !== false;
                                    const items = categoryData.items || [];
                                    return (
                                        <div key={categoryId} className="category-block">
                                            <button className="category-header" onClick={() => toggleCategory(categoryId)}>
                                                <div className="category-info">
                                                    <span className="category-dot liabilities" />
                                                    <span className="category-name">{categoryData.info?.name}</span>
                                                    <span className="category-count">{items.length}</span>
                                                </div>
                                                <div className="category-stats">
                                                    <span className="category-amount danger">{formatMoney(categoryData.totalAmount)}</span>
                                                    <span className={`category-change ${getTrendClass(-categoryData.momPercent)}`}>{formatPercent(categoryData.momPercent)}</span>
                                                    <span className="category-weight">--</span>
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </div>
                                            </button>
                                            {isExpanded && items.length > 0 && (
                                                <table className="items-table">
                                                    <thead>
                                                        <tr><th>名称</th><th>金额</th><th>月度变化</th><th>波动率</th><th>占比</th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {items.map(item => (
                                                            <tr key={item.assetId}>
                                                                <td>{item.assetType?.name}</td>
                                                                <td className="text-right font-mono danger">{formatMoney(item.currentAmount)}</td>
                                                                <td className={`text-right font-mono ${getTrendClass(-item.momValue)}`}>{formatDiff(item.momValue)}</td>
                                                                <td className={`text-right font-mono ${getTrendClass(-item.momPercent)}`}>{formatPercent(item.momPercent)}</td>
                                                                <td className="text-right font-mono">--</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'waterfall' && waterfall?.items?.length > 0 && (
                <div className="waterfall-content">
                    <table className="items-table">
                        <thead><tr><th>资产项</th><th>变化金额</th></tr></thead>
                        <tbody>
                            {waterfall.items.map((item, index) => (
                                <tr key={index}>
                                    <td>{item.name}</td>
                                    <td className={`text-right font-mono ${item.isPositive ? 'positive' : 'negative'}`}>
                                        {item.value >= 0 ? '+' : ''}{formatMoney(item.value).replace('¥', '')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Portfolio;
