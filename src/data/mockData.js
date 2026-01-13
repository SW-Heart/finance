// 模拟数据生成器 - 用于生成多月份的测试数据
import { DEFAULT_ASSET_TYPES, generateId } from './models';

// 生成模拟月度记录
export const generateMockData = () => {
    const records = [];
    const assetTypes = DEFAULT_ASSET_TYPES;

    // 生成过去12个月的数据
    const baseDate = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(baseDate);
        d.setMonth(d.getMonth() - i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        months.push(`${year}-${month}`);
    }

    // 基础金额配置
    const baseAmounts = {
        // 流动性资产 (Liquid)
        'cmb_card': 85000,
        'alipay': 32000,
        'wechat': 18000,
        'cash_other': 5000,

        // 权益类 (Equity)
        'a_stock': 180000,
        'hk_stock': 65000,
        'us_stock': 120000,
        'fund': 95000,

        // 稳健型 (Safe)
        'bond': 50000,
        'deposit': 200000,
        'money_fund': 80000,

        // 风险 (Risk)
        'binance': 45000,
        'okx': 28000,
        'wallet': 15000,

        // 其他 (Other)
        'real_estate': 0,
        'car': 150000,
        'gold': 35000,
        'collectibles': 12000,

        // 负债 (Liabilities)
        'credit_cmb': 8500,
        'credit_other': 3200,
        'mortgage': 0,
        'car_loan': 45000,
        'consumer_loan': 0,
        'margin': 0,
    };

    // 波动系数配置
    const volatility = {
        'liquid': 0.02,        // 流动性资产
        'safe': 0.01,          // 稳健型资产
        'equity': 0.15,        // 权益类
        'risk': 0.25,          // 风险资产
        'other': 0.03,         // 其他资产
        'liability': 0.05,     // 负债
    };

    // 趋势系数（每月增长）
    const trendFactor = {
        'liquid': 0.02,
        'safe': 0.015,
        'equity': 0.03,
        'risk': 0.05,
        'other': 0.01,
        'liability': -0.02,    // 负债总量逐步减少
    };

    months.forEach((month, monthIndex) => {
        assetTypes.forEach(asset => {
            const baseAmount = baseAmounts[asset.id] || 0;
            if (baseAmount === 0) return; // 跳过没有初始值的资产

            const vol = volatility[asset.category] || 0.05;
            const trend = trendFactor[asset.category] || 0;

            // 计算当月金额：基础 + 趋势 + 随机波动
            const trendAmount = baseAmount * (1 + trend * monthIndex);
            const randomFactor = 1 + (Math.random() - 0.5) * 2 * vol;
            const amount = Math.round(trendAmount * randomFactor);

            records.push({
                id: generateId(),
                date: month,
                assetId: asset.id,
                amount: Math.max(0, amount),
                currency: 'CNY',
                createdAt: new Date().toISOString(),
            });
        });
    });

    return records;
};

// 初始化模拟数据到 localStorage
export const initializeMockData = () => {
    const STORAGE_KEY_RECORDS = 'vault_monthly_records';
    const STORAGE_KEY_TYPES = 'vault_asset_types';

    // 检查是否需要迁移（如果存在旧的分类 'cash'）
    const existingTypes = localStorage.getItem(STORAGE_KEY_TYPES);
    let needsMigration = false;
    if (existingTypes) {
        try {
            const types = JSON.parse(existingTypes);
            // 如果发现旧分类 'cash'，说明是旧数据，需要重置
            if (types.some(t => t.category === 'cash')) {
                console.log('Detected legacy asset categories, migrating data...');
                needsMigration = true;
            }
        } catch (e) {
            console.error('Error parsing asset types', e);
        }
    }

    const existingRecords = localStorage.getItem(STORAGE_KEY_RECORDS);

    // 如果需要迁移，或者没有记录，则初始化
    if (needsMigration || !existingRecords) {
        // 1. 重置资产类型为新的默认值
        localStorage.setItem(STORAGE_KEY_TYPES, JSON.stringify(DEFAULT_ASSET_TYPES));

        // 2. 重置月度记录
        const mockRecords = generateMockData();
        localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(mockRecords));

        console.log(`Initialized/Migrated ${mockRecords.length} mock records and updated asset types.`);
        return true;
    }

    console.log('Data is up to date, skipping initialization');
    return false;
};

// 强制重新生成模拟数据
export const resetMockData = () => {
    const STORAGE_KEY = 'vault_monthly_records';
    const mockRecords = generateMockData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockRecords));
    console.log(`Reset to ${mockRecords.length} mock records`);
    return true;
};
