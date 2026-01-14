import { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import * as api from '../api/assets';
import {
    calculateMonthlyStats,
    getAllAssetStats,
    getCategoryStats,
    calculateHistoricalTrend,
    getWaterfallData,
    getPreviousMonth,
    getNextMonth,
} from './calculations';
import { createAssetType as createAssetTypeModel } from './models'; // Only used for structure if needed
import { useAuth } from '../context/AuthContext';

// 获取当前月份字符串
export const getCurrentMonth = () => format(new Date(), 'yyyy-MM');

// ============ 资产类型 Hook ============
export const useAssetTypes = () => {
    const { user } = useAuth();
    const userId = user?.id; // backend returns user.id
    const [assetTypes, setAssetTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadAssetTypes = useCallback(async (silent = false) => {
        if (!userId) {
            setAssetTypes([]);
            setLoading(false);
            return;
        }
        try {
            if (!silent) setLoading(true);
            const types = await api.getAssetTypes(userId);
            setAssetTypes(types);
            setError(null);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadAssetTypes();
    }, [loadAssetTypes]);

    const addType = useCallback(async (name, category, parentCategory, icon) => {
        if (!userId) return null;
        try {
            // Optimistic update or wait? Wait is safer.
            // Use model helper to generate ID and structure
            const newTypeData = createAssetTypeModel(name, category, parentCategory, icon);
            const result = await api.createAssetType(userId, newTypeData);
            await loadAssetTypes(true); // Silent reload
            return result;
        } catch (err) {
            console.error(err);
            setError(err.message);
            return null;
        }
    }, [userId, loadAssetTypes]);

    const updateType = useCallback(async (id, updates) => {
        if (!userId) return;
        try {
            await api.updateAssetType(userId, id, updates);
            await api.updateAssetType(userId, id, updates);
            await loadAssetTypes(true); // Silent reload
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    }, [userId, loadAssetTypes]);

    const removeType = useCallback(async (id) => {
        if (!userId) return;
        try {
            await api.deleteAssetType(userId, id);
            await api.deleteAssetType(userId, id);
            await loadAssetTypes(true); // Silent reload
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    }, [userId, loadAssetTypes]);

    // 按分类分组
    const groupedAssets = useMemo(() => {
        const groups = {
            assets: {},
            liabilities: {},
        };

        assetTypes.forEach(asset => {
            const parent = asset.parentCategory; // API should ensure this key exists
            const category = asset.category;

            if (!groups[parent]) groups[parent] = {}; // safety
            if (!groups[parent][category]) {
                groups[parent][category] = [];
            }
            groups[parent][category].push(asset);
        });

        return groups;
    }, [assetTypes]);

    return {
        assetTypes,
        groupedAssets,
        loading,
        error,
        addType,
        updateType,
        removeType,
        refresh: loadAssetTypes,
    };
};

// ============ 月度记录 Hook ============
export const useMonthlyRecords = (initialMonth = getCurrentMonth()) => {
    const { user } = useAuth();
    const userId = user?.id;
    const [currentMonth, setCurrentMonth] = useState(initialMonth);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadRecords = useCallback(async () => {
        if (!userId) {
            setRecords([]);
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const monthRecords = await api.getMonthlyRecords(userId, currentMonth);
            setRecords(monthRecords);
            setError(null);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId, currentMonth]);

    useEffect(() => {
        loadRecords();
    }, [loadRecords]);

    // 保存记录
    const saveRecords = useCallback(async (recordsData) => {
        if (!userId) return;
        try {
            // Need asset types to map ID to structure? 
            // API upsert expects: { assetId, date, amount }
            // recordsData is { assetId: amount }
            const recordsList = Object.entries(recordsData)
                .filter(([_, amount]) => amount !== '' && amount !== null && amount !== undefined)
                .map(([assetId, amount]) => ({
                    assetId,
                    date: currentMonth,
                    amount: parseFloat(amount),
                    currency: 'CNY'
                }));

            await api.batchUpsertRecords(userId, recordsList);
            await loadRecords();
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    }, [userId, currentMonth, loadRecords]);

    // 复制上月数据
    const copyFromLastMonth = useCallback(async () => {
        if (!userId) return {};
        // Since we don't have direct access to last month's data in state if we only loaded current month,
        // we might need to fetch it.
        // OR, the UI calls this and expects a return value to populate inputs.
        // Let's fetch last month data.
        try {
            const lastMonth = getPreviousMonth(currentMonth);
            const lastMonthRecords = await api.getMonthlyRecords(userId, lastMonth);
            const recordsMap = {};
            lastMonthRecords.forEach(r => {
                recordsMap[r.assetId] = r.amount;
            });
            return recordsMap;
        } catch (err) {
            console.error(err);
            return {};
        }
    }, [userId, currentMonth]);

    // 获取所有有记录的月份
    // This requires fetching all records or a specific API.
    // For now we can fetch all records (lightweight) or just assume current functionality limitations?
    // Let's fetch all records to distinct months.
    const [recordedMonths, setRecordedMonths] = useState([]);

    useEffect(() => {
        const fetchMonths = async () => {
            if (!userId) return;
            try {
                // Fetch all records without month filter
                const allRecords = await api.getMonthlyRecords(userId);
                const months = [...new Set(allRecords.map(r => r.date))].sort().reverse();
                setRecordedMonths(months);
            } catch (e) {
                console.error(e);
            }
        };
        fetchMonths();
        // Trigger this less frequently? Or when records change?
    }, [userId, records]); // Refresh when records update (save performed)

    // 重置当月数据（删除当月所有记录）
    const resetMonth = useCallback(async () => {
        if (!userId) return;
        try {
            await api.deleteMonthlyRecords(userId, currentMonth);
            await loadRecords(); // 重新加载数据
        } catch (err) {
            console.error(err);
            throw err;
        }
    }, [userId, currentMonth, loadRecords]);

    return {
        currentMonth,
        setCurrentMonth,
        records,
        loading,
        error,
        saveRecords,
        copyFromLastMonth,
        resetMonth,
        recordedMonths,
        refresh: loadRecords,
        goToNextMonth: () => setCurrentMonth(getNextMonth(currentMonth)),
        goToPreviousMonth: () => setCurrentMonth(getPreviousMonth(currentMonth)),
    };
};

// ============ 统计数据 Hook ============
export const useStats = () => {
    const { user } = useAuth();
    const userId = user?.id;

    const [stats, setStats] = useState(null);
    const [assetStats, setAssetStats] = useState([]);
    const [categoryStats, setCategoryStats] = useState({});
    const [trend, setTrend] = useState([]);
    const [waterfall, setWaterfall] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadStats = useCallback(async () => {
        if (!userId) {
            setStats(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Fetch necessary data
            // We need AssetTypes and All Records (for trend) or at least Current + Previous month.
            // Optimized: Fetch AssetTypes and All Records in parallel.
            const [types, allRecords] = await Promise.all([
                api.getAssetTypes(userId),
                api.getMonthlyRecords(userId) // Fetch all
            ]);

            // 获取所有有记录的月份，使用最新有数据的月份作为当前月份
            const allMonths = [...new Set(allRecords.map(r => r.date))].sort();
            const latestMonth = allMonths.length > 0 ? allMonths[allMonths.length - 1] : getCurrentMonth();

            const currentRecords = allRecords.filter(r => r.date === latestMonth);
            const previousMonth = getPreviousMonth(latestMonth);
            const previousRecords = allRecords.filter(r => r.date === previousMonth);

            const monthlyStats = calculateMonthlyStats(types, currentRecords, previousRecords, latestMonth);
            const allAssetStats = getAllAssetStats(types, currentRecords, previousRecords);
            const catStats = getCategoryStats(types, currentRecords, previousRecords);
            // 显示全部历史数据，不限制12个月
            const historicalTrend = calculateHistoricalTrend(allRecords, types);
            const waterfallData = getWaterfallData(types, currentRecords, previousRecords, latestMonth);

            setStats(monthlyStats);
            setAssetStats(allAssetStats);
            setCategoryStats(catStats);
            setTrend(historicalTrend);
            setWaterfall(waterfallData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    return {
        stats,
        assetStats,
        categoryStats,
        trend,
        waterfall,
        loading,
        refresh: loadStats,
    };
};
