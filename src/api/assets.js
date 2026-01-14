const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api') + '/assets';

/**
 * Fetch all asset types for a user
 * @param {string} userId
 */
export const getAssetTypes = async (userId) => {
    const response = await fetch(`${API_BASE_URL}/types?user_id=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch asset types');
    return response.json();
};

/**
 * Create a custom asset type
 * @param {string} userId
 * @param {object} typeData
 */
export const createAssetType = async (userId, typeData) => {
    const response = await fetch(`${API_BASE_URL}/types?user_id=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeData),
    });
    if (!response.ok) throw new Error('Failed to create asset type');
    return response.json();
};

/**
 * Update an asset type
 * @param {string} userId
 * @param {string} typeId
 * @param {object} updates
 */
export const updateAssetType = async (userId, typeId, updates) => {
    const response = await fetch(`${API_BASE_URL}/types/${typeId}?user_id=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update asset type');
    return response.json();
};

/**
 * Delete an asset type
 * @param {string} userId
 * @param {string} typeId
 */
export const deleteAssetType = async (userId, typeId) => {
    const response = await fetch(`${API_BASE_URL}/types/${typeId}?user_id=${userId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete asset type');
    return response.json();
};

/**
 * Fetch monthly records
 * @param {string} userId
 * @param {string|null} month
 */
export const getMonthlyRecords = async (userId, month = null) => {
    let url = `${API_BASE_URL}/records?user_id=${userId}`;
    if (month) {
        url += `&month=${month}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch records');
    return response.json();
};

/**
 * Upsert a monthly record
 * @param {string} userId
 * @param {object} recordData
 */
export const upsertMonthlyRecord = async (userId, recordData) => {
    const response = await fetch(`${API_BASE_URL}/records?user_id=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordData),
    });
    if (!response.ok) throw new Error('Failed to save record');
    return response.json();
};

/**
 * Batch upsert records
 * @param {string} userId
 * @param {Array} records 
 */
export const batchUpsertRecords = async (userId, records) => {
    const response = await fetch(`${API_BASE_URL}/records/batch?user_id=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(records),
    });
    if (!response.ok) throw new Error('Failed to batch save records');
    return response.json();
};

/**
 * 删除指定月份的所有记录（重置当月数据）
 * @param {string} userId
 * @param {string} month - 格式: yyyy-MM
 */
export const deleteMonthlyRecords = async (userId, month) => {
    const response = await fetch(`${API_BASE_URL}/records/month/${month}?user_id=${userId}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete monthly records');
    return response.json();
};
