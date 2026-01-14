// 纯函数计算逻辑 - 不再直接从 Storage 读取数据

// 获取上个月的日期字符串
export const getPreviousMonth = (date) => {
    const [year, month] = date.split('-').map(Number);
    if (month === 1) {
        return `${year - 1}-12`;
    }
    return `${year}-${String(month - 1).padStart(2, '0')}`;
};

// 获取下个月的日期字符串
export const getNextMonth = (date) => {
    const [year, month] = date.split('-').map(Number);
    if (month === 12) {
        return `${year + 1}-01`;
    }
    return `${year}-${String(month + 1).padStart(2, '0')}`;
};

// 格式化货币
export const formatCurrency = (amount, currency = 'CNY') => {
    const formatter = new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
    return formatter.format(amount);
};

// 格式化百分比
export const formatPercent = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) {
        return '--';
    }
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(decimals)}%`;
};

// 格式化差值
export const formatDiff = (value, currency = 'CNY') => {
    if (value === null || value === undefined || isNaN(value)) {
        return '--';
    }
    const sign = value >= 0 ? '+' : '';
    return `${sign}${formatCurrency(value, currency).replace('¥', '¥')}`;
};

// ============ 核心计算函数 ============

// 计算月环比差值
export const calculateMoMValue = (current, previous) => {
    if (previous === null || previous === undefined) return null;
    return current - previous;
};

// 计算月环比百分比
export const calculateMoMPercent = (current, previous) => {
    if (!previous || previous === 0) return null;
    return (current - previous) / Math.abs(previous);
};

// 计算占比
export const calculateWeight = (amount, total) => {
    if (!total || total === 0) return 0;
    return amount / total;
};

// 计算负债率
export const calculateDebtRatio = (totalLiabilities, totalAssets) => {
    if (!totalAssets || totalAssets === 0) return 0;
    return totalLiabilities / totalAssets;
};

// 计算净资产
export const calculateNetWorth = (totalAssets, totalLiabilities) => {
    return totalAssets - totalLiabilities;
};

// ============ 统计汇总函数 ============

/**
 * 计算指定月份的汇总统计
 * @param {Array} assetTypes 资产类型列表
 * @param {Array} currentRecords 当前月记录列表
 * @param {Array} previousRecords 上个月记录列表
 * @param {string} date 日期字符串
 */
export const calculateMonthlyStats = (assetTypes, currentRecords, previousRecords, date) => {
    if (!assetTypes) return null;

    // 创建记录映射 (assetId -> amount)
    const currentMap = new Map(currentRecords.map(r => [r.assetId, r.amount]));
    const previousMap = new Map(previousRecords.map(r => [r.assetId, r.amount]));

    // 计算总资产和总负债
    let totalAssets = 0;
    let totalLiabilities = 0;
    let previousTotalAssets = 0;
    let previousTotalLiabilities = 0;

    assetTypes.forEach(asset => {
        const currentAmount = currentMap.get(asset.id) || 0;
        const previousAmount = previousMap.get(asset.id) || 0;

        if (asset.parentCategory === 'assets') {
            totalAssets += currentAmount;
            previousTotalAssets += previousAmount;
        } else {
            totalLiabilities += currentAmount;
            previousTotalLiabilities += previousAmount;
        }
    });

    const netWorth = calculateNetWorth(totalAssets, totalLiabilities);
    const previousNetWorth = calculateNetWorth(previousTotalAssets, previousTotalLiabilities);

    return {
        date,
        totalAssets,
        totalLiabilities,
        netWorth,
        debtRatio: calculateDebtRatio(totalLiabilities, totalAssets),
        // 环比数据
        previousTotalAssets,
        previousTotalLiabilities,
        previousNetWorth,
        // 环比变化
        assetsMoMValue: calculateMoMValue(totalAssets, previousTotalAssets),
        assetsMoMPercent: calculateMoMPercent(totalAssets, previousTotalAssets),
        liabilitiesMoMValue: calculateMoMValue(totalLiabilities, previousTotalLiabilities),
        liabilitiesMoMPercent: calculateMoMPercent(totalLiabilities, previousTotalLiabilities),
        netWorthMoMValue: calculateMoMValue(netWorth, previousNetWorth),
        netWorthMoMPercent: calculateMoMPercent(netWorth, previousNetWorth),
    };
};

/**
 * 计算单个资产的详细统计
 */
export const calculateAssetStats = (assetTypes, currentRecords, previousRecords, assetId) => {
    const currentRecord = currentRecords.find(r => r.assetId === assetId);
    const previousRecord = previousRecords.find(r => r.assetId === assetId);
    const assetType = assetTypes.find(t => t.id === assetId);

    const currentAmount = currentRecord?.amount || 0;
    const previousAmount = previousRecord?.amount || 0;

    // 计算总资产（用于占比计算）
    let totalAssets = 0;
    assetTypes.forEach(asset => {
        if (asset.parentCategory === 'assets') {
            const record = currentRecords.find(r => r.assetId === asset.id);
            totalAssets += record?.amount || 0;
        }
    });

    return {
        assetId,
        assetType,
        currentAmount,
        previousAmount,
        momValue: calculateMoMValue(currentAmount, previousAmount),
        momPercent: calculateMoMPercent(currentAmount, previousAmount),
        weight: assetType?.parentCategory === 'assets'
            ? calculateWeight(currentAmount, totalAssets)
            : null,
    };
};

/**
 * 获取所有资产的统计列表
 */
export const getAllAssetStats = (assetTypes, currentRecords, previousRecords) => {
    if (!assetTypes) return [];
    return assetTypes.map(asset => calculateAssetStats(assetTypes, currentRecords, previousRecords, asset.id));
};

/**
 * 按分类汇总资产统计
 */
export const getCategoryStats = (assetTypes, currentRecords, previousRecords) => {
    const assetStats = getAllAssetStats(assetTypes, currentRecords, previousRecords);
    const categories = {};

    assetStats.forEach(stat => {
        const category = stat.assetType?.category;
        if (!category) return;

        if (!categories[category]) {
            categories[category] = {
                category,
                parentCategory: stat.assetType.parentCategory,
                totalAmount: 0,
                previousAmount: 0,
                items: [],
            };
        }

        categories[category].totalAmount += stat.currentAmount;
        categories[category].previousAmount += stat.previousAmount;
        categories[category].items.push(stat);
    });

    // 计算每个分类的环比
    Object.values(categories).forEach(cat => {
        cat.momValue = calculateMoMValue(cat.totalAmount, cat.previousAmount);
        cat.momPercent = calculateMoMPercent(cat.totalAmount, cat.previousAmount);
    });

    return categories;
};

/**
 * 获取历史趋势数据（用于图表）
 * @param {Array} allRecords 所有历史记录
 * @param {Array} assetTypes 资产类型
 * @param {number} months 显示最近多少个月
 */
export const calculateHistoricalTrend = (allRecords, assetTypes, months = null) => {
    // 获取所有有记录的月份
    const allMonths = [...new Set(allRecords.map(r => r.date))].sort();
    // 如果指定了月份数量则取最近 N 个月，否则显示全部数据
    const recentMonths = months ? allMonths.slice(-months) : allMonths;

    // 创建 assetType 的映射，用于判断资产/负债
    // 注意：已删除的资产可能不在当前 assetTypes 中，需要从记录中推断
    const assetTypeMap = new Map(assetTypes.map(t => [t.id, t]));

    return recentMonths.map(date => {
        // 筛选当月记录
        const currentRecords = allRecords.filter(r => r.date === date);

        // 直接从记录计算，而不是遍历 assetTypes
        let totalAssets = 0;
        let totalLiabilities = 0;

        currentRecords.forEach(record => {
            const assetType = assetTypeMap.get(record.assetId);
            // 如果资产类型不存在（可能已删除），尝试从记录中的其他信息推断
            // 如果无法推断，默认当作资产处理
            const isLiability = assetType?.parentCategory === 'liabilities';

            if (isLiability) {
                totalLiabilities += record.amount || 0;
            } else {
                totalAssets += record.amount || 0;
            }
        });

        const netWorth = totalAssets - totalLiabilities;

        return {
            date,
            netWorth,
            totalAssets,
            totalLiabilities,
        };
    });
};

/**
 * 计算瀑布图数据
 */
export const getWaterfallData = (assetTypes, currentRecords, previousRecords, date) => {
    const assetStats = getAllAssetStats(assetTypes, currentRecords, previousRecords);
    const monthlyStats = calculateMonthlyStats(assetTypes, currentRecords, previousRecords, date);

    if (!monthlyStats) return null;

    const waterfallItems = assetStats
        .filter(stat => stat.momValue !== null && stat.momValue !== 0)
        .map(stat => ({
            name: stat.assetType?.name || stat.assetId,
            value: stat.assetType?.parentCategory === 'liabilities'
                ? -stat.momValue  // 负债增加对净值是负面的
                : stat.momValue,
            isPositive: stat.assetType?.parentCategory === 'liabilities'
                ? stat.momValue < 0  // 负债减少是正面的
                : stat.momValue > 0,
            category: stat.assetType?.category,
        }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)); // 按影响大小排序

    return {
        startValue: monthlyStats.previousNetWorth || 0,
        endValue: monthlyStats.netWorth,
        items: waterfallItems,
    };
};
