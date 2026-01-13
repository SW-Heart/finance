import { DEFAULT_ASSET_TYPES } from './models';

const getStorageKeys = (userId) => ({
    ASSET_TYPES: `vault_asset_types_${userId}`,
    MONTHLY_RECORDS: `vault_monthly_records_${userId}`,
});

// ============ 资产类型操作 ============

// 获取所有资产类型
export const getAssetTypes = (userId) => {
    if (!userId) return [];

    const keys = getStorageKeys(userId);
    const stored = localStorage.getItem(keys.ASSET_TYPES);
    if (stored) {
        return JSON.parse(stored);
    }
    // 首次使用，初始化默认资产类型
    localStorage.setItem(keys.ASSET_TYPES, JSON.stringify(DEFAULT_ASSET_TYPES));
    return DEFAULT_ASSET_TYPES;
};

// 保存资产类型
export const saveAssetTypes = (userId, assetTypes) => {
    if (!userId) return;
    const keys = getStorageKeys(userId);
    localStorage.setItem(keys.ASSET_TYPES, JSON.stringify(assetTypes));
};

// 添加资产类型
export const addAssetType = (userId, assetType) => {
    const types = getAssetTypes(userId);
    types.push(assetType);
    saveAssetTypes(userId, types);
    return types;
};

// 更新资产类型
export const updateAssetType = (userId, id, updates) => {
    const types = getAssetTypes(userId);
    const index = types.findIndex(t => t.id === id);
    if (index !== -1) {
        types[index] = { ...types[index], ...updates };
        saveAssetTypes(userId, types);
    }
    return types;
};

// 删除资产类型
export const deleteAssetType = (userId, id) => {
    const types = getAssetTypes(userId).filter(t => t.id !== id);
    saveAssetTypes(userId, types);
    // 同时删除相关的月度记录
    const records = getMonthlyRecords(userId).filter(r => r.assetId !== id);
    saveMonthlyRecords(userId, records);
    return types;
};

// 获取单个资产类型
export const getAssetTypeById = (userId, id) => {
    return getAssetTypes(userId).find(t => t.id === id);
};

// ============ 月度记录操作 ============

// 获取所有月度记录
export const getMonthlyRecords = (userId) => {
    if (!userId) return [];
    const keys = getStorageKeys(userId);
    const stored = localStorage.getItem(keys.MONTHLY_RECORDS);
    return stored ? JSON.parse(stored) : [];
};

// 保存月度记录
export const saveMonthlyRecords = (userId, records) => {
    if (!userId) return;
    const keys = getStorageKeys(userId);
    localStorage.setItem(keys.MONTHLY_RECORDS, JSON.stringify(records));
};

// 获取指定月份的记录
export const getRecordsByMonth = (userId, date) => {
    return getMonthlyRecords(userId).filter(r => r.date === date);
};

// 获取指定资产的所有记录
export const getRecordsByAsset = (userId, assetId) => {
    return getMonthlyRecords(userId).filter(r => r.assetId === assetId).sort((a, b) => a.date.localeCompare(b.date));
};

// 添加或更新月度记录
export const upsertMonthlyRecord = (userId, record) => {
    const records = getMonthlyRecords(userId);
    const existingIndex = records.findIndex(
        r => r.date === record.date && r.assetId === record.assetId
    );

    if (existingIndex !== -1) {
        records[existingIndex] = { ...records[existingIndex], ...record, updatedAt: new Date().toISOString() };
    } else {
        records.push(record);
    }

    saveMonthlyRecords(userId, records);
    return records;
};

// 批量更新月度记录
export const batchUpsertMonthlyRecords = (userId, newRecords) => {
    const records = getMonthlyRecords(userId);

    newRecords.forEach(newRecord => {
        const existingIndex = records.findIndex(
            r => r.date === newRecord.date && r.assetId === newRecord.assetId
        );

        if (existingIndex !== -1) {
            records[existingIndex] = { ...records[existingIndex], ...newRecord, updatedAt: new Date().toISOString() };
        } else {
            records.push(newRecord);
        }
    });

    saveMonthlyRecords(userId, records);
    return records;
};

// 删除月度记录
export const deleteMonthlyRecord = (userId, id) => {
    const records = getMonthlyRecords(userId).filter(r => r.id !== id);
    saveMonthlyRecords(userId, records);
    return records;
};

// 获取所有有记录的月份列表
export const getAllRecordedMonths = (userId) => {
    const records = getMonthlyRecords(userId);
    const months = [...new Set(records.map(r => r.date))];
    return months.sort().reverse(); // 最新的在前
};

// 复制上月数据
export const copyLastMonthData = (userId, targetDate) => {
    const [year, month] = targetDate.split('-').map(Number);
    const lastMonth = month === 1
        ? `${year - 1}-12`
        : `${year}-${String(month - 1).padStart(2, '0')}`;

    const lastMonthRecords = getRecordsByMonth(userId, lastMonth);
    return lastMonthRecords.map(r => ({
        ...r,
        date: targetDate,
        id: undefined, // 将在创建时生成新ID
    }));
};

// ============ 数据导入/导出 ============

// 导出所有数据
export const exportAllData = (userId) => {
    if (!userId) return null;
    return {
        assetTypes: getAssetTypes(userId),
        monthlyRecords: getMonthlyRecords(userId),
        exportedAt: new Date().toISOString(),
    };
};

// 导入数据
export const importData = (userId, data) => {
    if (!userId) return;
    if (data.assetTypes) {
        saveAssetTypes(userId, data.assetTypes);
    }
    if (data.monthlyRecords) {
        saveMonthlyRecords(userId, data.monthlyRecords);
    }
};

// 重置所有用户数据（清空记录，保留分类）
export const resetToEmpty = (userId) => {
    if (!userId) return;
    const keys = getStorageKeys(userId);
    localStorage.removeItem(keys.MONTHLY_RECORDS);
    // 可选：如果希望连分类也重置回默认，可以 uncomment 下面这行
    // localStorage.removeItem(keys.ASSET_TYPES);
};

// 清除所有数据 (完全重置)
export const clearAllData = (userId) => {
    if (!userId) return;
    const keys = getStorageKeys(userId);
    localStorage.removeItem(keys.ASSET_TYPES);
    localStorage.removeItem(keys.MONTHLY_RECORDS);
};
