import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useBlocker, useNavigate } from 'react-router-dom';
import { format, parse } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
    ChevronDown,
    ChevronUp,
    Copy,
    Check,
    Calendar,
    ChevronLeft,
    ChevronRight,

    Trash2,
    X,
    UploadCloud
} from 'lucide-react';
import ImportModal from '../components/ImportModal';
import ConfirmModal from '../components/ConfirmModal';
import GlassCard from '../components/GlassCard';
import { useAssetTypes, useMonthlyRecords, getCurrentMonth } from '../data/useAssets';
import { ASSET_CATEGORIES } from '../data/models';
import './Ledger.css';

const Ledger = () => {
    const {
        groupedAssets,
        addType,
        updateType,
        removeType,
        loading: typesLoading
    } = useAssetTypes();

    const {
        currentMonth,
        records,
        saveRecords,
        copyFromLastMonth,
        loading: recordsLoading,
        goToPreviousMonth,
        goToNextMonth
    } = useMonthlyRecords();

    const [formData, setFormData] = useState({});
    const [namesData, setNamesData] = useState({}); // Local state for asset names
    const [lastLoadedMonth, setLastLoadedMonth] = useState(null); // Track loaded month to prevent overwrite
    const [expandedCategories, setExpandedCategories] = useState({});
    const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error

    const [showImport, setShowImport] = useState(false);

    // State for adding new asset
    const [addingCategory, setAddingCategory] = useState(null);
    const [newAssetName, setNewAssetName] = useState('');
    const [newAssetAmount, setNewAssetAmount] = useState('');

    useEffect(() => {
        // Sync namesData whenever groupedAssets changes (e.g. after load or add)
        // We only overwrite if user is NOT currently editing that specific field?
        // Actually, if data reloads from server, it might be safer to sync.
        // But since we are "always editing", we need to be careful not to reset while typing if unnecessary re-render happens.
        // However, groupedAssets changes mainly when we add/remove/update types.
        if (groupedAssets) {
            const newNames = {};
            Object.values(groupedAssets).forEach(group => {
                Object.values(group).forEach(assetList => {
                    assetList.forEach(asset => {
                        // Only set if not already set, or force update? 
                        // If we just saved 'New Name', groupedAssets will have 'New Name'.
                        // If we are typing 'New Na...', groupedAssets still has 'Old'.
                        // We should strictly sync on mount or specific updates.
                        // Simple approach: Use defaultValue? No, controlled is better for validation.
                        // Let's initialize once or check diff.
                        newNames[asset.id] = asset.name;
                    });
                });
            });
            // Merge with existing to preserve in-progress edits if re-render happens?
            // Actually, if we updateType, it reloads.
            setNamesData(prev => {
                const merged = { ...newNames };
                // If we want to keep unsaved typing?
                // But validation says we save on blur. So mostly it's synced.
                return merged;
            });
        }
    }, [groupedAssets]);

    // 初始化表单数据
    useEffect(() => {
        // Only update formData if the month changed relative to what we last loaded.
        // This prevents overwriting user input when 'records' updates due to a save operation.
        if (currentMonth !== lastLoadedMonth && !recordsLoading) {
            const initialData = {};
            records.forEach(r => {
                initialData[r.assetId] = r.amount;
            });
            setFormData(initialData);
            setLastLoadedMonth(currentMonth);
        }
    }, [records, currentMonth, lastLoadedMonth, recordsLoading]);

    // Auto-save logic
    useEffect(() => {
        // Don't auto-save on initial load or empty data implies just loaded
        // We need to track if user has modified anything?
        // 'isDirty' logic can helper here, but we want to debounce 'formData' changes.

        // Skip initial
        if (!lastLoadedMonth) return;

        const timer = setTimeout(async () => {
            // Find changes compared to server records?
            // Actually, we can just save everything or dirty check.
            // isDirty calculates based on current 'records'.
            // If records haven't updated yet (optimistic), isDirty might be persist.

            // Simpler: Just save formData if it's different from what we last saved?
            // Or rely on isDirty.

            // Let's rely on isDirty check inside the effect?
            // But isDirty is memoized.
            // We need to avoid saving immediately on load.

            // Check if there are changes to save
            const serverMap = {};
            records.forEach(r => serverMap[r.assetId] = Number(r.amount));
            let hasChanges = false;
            for (const [id, val] of Object.entries(formData)) {
                const formVal = (val === '' || val === null || val === undefined) ? null : Number(val);
                const serverVal = (serverMap[id] === undefined || serverMap[id] === null) ? null : Number(serverMap[id]);
                if (formVal !== serverVal) {
                    hasChanges = true;
                    break;
                }
            }

            if (hasChanges) {
                setSaveStatus('saving');
                try {
                    await saveRecords(formData);
                    setSaveStatus('saved');
                    setTimeout(() => setSaveStatus('idle'), 2000);
                } catch (err) {
                    console.error("Auto-save failed", err);
                    setSaveStatus('error');
                }
            }
        }, 1000); // 1s Debounce

        return () => clearTimeout(timer);
    }, [formData, records, saveRecords, lastLoadedMonth]);

    // Calculate Totals
    const totals = useMemo(() => {
        let totalAssets = 0;
        let totalLiabilities = 0;

        if (groupedAssets.assets) {
            Object.values(groupedAssets.assets).forEach(list => {
                list.forEach(asset => {
                    const val = formData[asset.id];
                    if (val && typeof val === 'number') totalAssets += val;
                });
            });
        }

        if (groupedAssets.liabilities) {
            Object.values(groupedAssets.liabilities).forEach(list => {
                list.forEach(asset => {
                    const val = formData[asset.id];
                    if (val && typeof val === 'number') totalLiabilities += val;
                });
            });
        }

        return {
            assets: totalAssets,
            liabilities: totalLiabilities,
            net: totalAssets - totalLiabilities
        };
    }, [formData, groupedAssets]);

    // Detect Dirty State
    const isDirty = useMemo(() => {
        // Convert records to map for comparison
        const serverMap = {};
        records.forEach(r => serverMap[r.assetId] = Number(r.amount));

        // Check if any current form data differs from server record
        for (const [id, val] of Object.entries(formData)) {
            // Treat empty string or null as equivalent to missing/0 for dirty check purposes?
            // Actually, we should match exact values.
            // If val is '', and server is null/undefined, it's NOT dirty (both mean "no value").
            // If val is 0, and server is 0, clean.

            const formVal = (val === '' || val === null || val === undefined) ? null : Number(val);
            const serverVal = (serverMap[id] === undefined || serverMap[id] === null) ? null : Number(serverMap[id]);

            if (formVal !== serverVal) return true;
        }
        return false;
    }, [formData, records]);

    // Navigation Blocker
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) => isDirty && currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        if (blocker.state === "blocked") {
            setConfirmConfig({
                title: '未保存的修改',
                message: '您有未保存的修改，确定要离开吗？离开后修改将丢失。',
                type: 'danger',
                confirmText: '确认离开',
                cancelText: '取消',
                onConfirm: () => blocker.proceed(),
                onCancel: () => blocker.reset()
            });
        }
    }, [blocker]);

    // Browser Close/Refresh Blocker
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handleInputChange = (assetId, value) => {
        setFormData(prev => ({
            ...prev,
            [assetId]: value === '' ? null : parseFloat(value)
        }));
    };

    const toggleCategory = (categoryId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    const handleCopyLastMonth = useCallback(async () => {
        try {
            const data = await copyFromLastMonth();
            if (data && Object.keys(data).length > 0) {
                setFormData(prev => ({
                    ...prev,
                    ...data
                }));
                // Optional: Show a small toast or visual feedback?
            }
        } catch (err) {
            console.error("Copy failed", err);
        }
    }, [copyFromLastMonth]);

    // Manual save removed, logic integrated into auto-save
    // Keep handleSave for 'Enter' key or similar if needed, or remove.
    // Let's keep a simplified version just in case, but UI button is gone.

    const handleImport = async (importedData) => {
        const nameToIdMap = {};
        const assetMap = {}; // store full asset object
        Object.values(groupedAssets).forEach(categoryGroup => {
            if (!categoryGroup) return;
            Object.values(categoryGroup).forEach(assets => {
                assets.forEach(asset => {
                    nameToIdMap[asset.name] = asset.id;
                    assetMap[asset.id] = asset;
                });
            });
        });

        const newFormData = { ...formData };
        let matchCount = 0;
        let createdCount = 0;
        const failedNames = [];

        for (const item of importedData) {
            let id = nameToIdMap[item.name];

            // If asset doesn't exist, create it
            if (!id) {
                try {
                    // Determine parent category based on item.category
                    // Default to 'assets' unless category implies liability
                    let parentCategory = 'assets';
                    let category = item.category || 'other';

                    if (['liability', 'mortgage', 'credit_card', 'loan'].includes(category)) {
                        parentCategory = 'liabilities';
                        category = 'liability'; // Simplify to generic liability if unknown?
                        // Or map specific liability types if in CATEGORY_MAP
                    }

                    // Map Chinese category names back to keys if possible, or assume keys are passed
                    // The ImportModal passes keys like 'liquid', 'equity' etc.

                    const newAsset = await addType(item.name, category, parentCategory, 'Circle');
                    if (newAsset) {
                        id = newAsset.id;
                        createdCount++;
                    } else {
                        failedNames.push(item.name);
                        continue;
                    }
                } catch (e) {
                    console.error("Failed to auto-create asset", item.name, e);
                    failedNames.push(item.name);
                    continue;
                }
            }

            if (id) {
                newFormData[id] = item.amount;
                matchCount++;
            }
        }

        if (matchCount > 0 || createdCount > 0) {
            setFormData(newFormData);
            let msg = `匹配并更新: ${matchCount - createdCount} 个\n新增并创建: ${createdCount} 个`;
            if (failedNames.length > 0) {
                msg += `\n\n失败 (${failedNames.length}):\n${failedNames.join(', ')}`;
            }
            setConfirmConfig({
                title: '导入成功',
                message: msg,
                type: 'success',
                confirmText: '我知道了',
                onConfirm: undefined // Just a close button basically, or specific action
            });
        } else {
            setConfirmConfig({
                title: '导入失败',
                message: `Failed: ${failedNames.join(', ')}`,
                type: 'danger',
                confirmText: '关闭'
            });
        }
    };

    const formatMonthDisplay = (monthStr) => {
        try {
            const date = parse(monthStr, 'yyyy-MM', new Date());
            return format(date, 'yyyy年M月', { locale: zhCN });
        } catch {
            return monthStr;
        }
    };

    // Unified handle name change
    const handleNameChange = (id, newName) => {
        setNamesData(prev => ({ ...prev, [id]: newName }));
    };

    const saveName = async (asset, e) => {
        const newName = namesData[asset.id];
        // If undefined/null, means no change from initial sync.
        // If same as original asset.name, no need to save.
        if (newName === undefined || newName === null || newName === asset.name) {
            return;
        }

        if (!newName.trim()) {
            // Revert if empty
            setNamesData(prev => ({ ...prev, [asset.id]: asset.name }));
            return;
        }

        try {
            await updateType(asset.id, newName.trim());
        } catch (err) {
            console.error("Failed to save name", err);
            // Revert on error
            setNamesData(prev => ({ ...prev, [asset.id]: asset.name }));
        }
    };

    const [confirmConfig, setConfirmConfig] = useState(null);

    const handleDelete = (id, name) => {
        setConfirmConfig({
            title: '确认删除资产',
            message: `您确定要删除资产 "${name}" 吗？此操作将同时删除该资产的所有历史记录，且无法恢复。`,
            type: 'danger',
            confirmText: '确认删除',
            onConfirm: async () => {
                try {
                    await removeType(id);
                } catch (err) {
                    console.error("Delete failed", err);
                }
            }
        });
    };

    const startAdding = (categoryId) => {
        setAddingCategory(categoryId);
        setNewAssetName('');
        setNewAssetAmount('');
    };

    const cancelAdding = () => {
        setAddingCategory(null);
        setNewAssetName('');
        setNewAssetAmount('');
    };

    const confirmAdding = async (categoryId, parentCategory) => {
        if (!newAssetName.trim()) return;
        try {
            const newAsset = await addType(newAssetName.trim(), categoryId, parentCategory);

            // Initialize in formData so it becomes visible immediately
            if (newAsset && newAsset.id) {
                // If amount is provided, save it immediately
                const amountVal = newAssetAmount === '' ? '' : parseFloat(newAssetAmount);

                // Update local state first for immediate UI feedback
                const updatedFormData = {
                    ...formData,
                    [newAsset.id]: amountVal === '' ? '' : amountVal
                };
                setFormData(updatedFormData);

                // Force save if amount is valid number
                if (typeof amountVal === 'number' && !isNaN(amountVal)) {
                    // Since addType is silent, we can trigger save safely
                    // But wait, setFormData will trigger auto-save if we rely on it.
                    // However, auto-save has 1s debounce.
                    // For "Create", users expect immediate save.
                    setSaveStatus('saving');
                    await saveRecords(updatedFormData);
                    setSaveStatus('saved');
                    setTimeout(() => setSaveStatus('idle'), 2000);
                }
            }

            setAddingCategory(null);
            setNewAssetName('');
            setNewAssetAmount('');
        } catch (err) {
            console.error("Add failed", err);
        }
    };

    const renderCategorySection = (parentCategory, categories) => {
        if (!categories) return null;

        return Object.entries(categories).map(([categoryId, assets]) => {
            const categoryInfo = Object.values(ASSET_CATEGORIES).find(c => c.id === categoryId);
            const isExpanded = expandedCategories[categoryId] !== false;

            const categoryTotal = assets.reduce((sum, asset) => {
                const val = formData[asset.id];
                return sum + (typeof val === 'number' ? val : 0);
            }, 0);

            return (
                <div key={categoryId} className="category-section">
                    <button className="category-header" onClick={() => toggleCategory(categoryId)}>
                        <div className="category-info">
                            <span className={`category-dot ${parentCategory}`} />
                            <span className="category-name">{categoryInfo?.name || categoryId}</span>
                        </div>
                        <div className="category-right">
                            <span className="category-total">
                                {parentCategory === 'liabilities' ? '-' : ''}
                                ¥{categoryTotal.toLocaleString()}
                            </span>
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                    </button>

                    {isExpanded && (
                        <div className="category-items">
                            <div className="items-table">
                                <div className="table-header-row">
                                    <div className="col-name">资产名称</div>
                                    <div className="col-value">当前余额</div>
                                    <div className="col-action">操作</div>
                                </div>
                                {assets.map(asset => {
                                    // Month-specific visibility:
                                    // Show if it's NOT custom (system default)
                                    // OR if it has a value in formData (record exists for this month)
                                    // OR if we are currently editing it (rare case)
                                    const hasRecord = formData[asset.id] !== undefined && formData[asset.id] !== null;
                                    const isVisible = !asset.isCustom || hasRecord;

                                    if (!isVisible) return null;

                                    return (
                                        <div key={asset.id} className="item-row">
                                            <div className="col-name">
                                                <input
                                                    className="inline-edit-input"
                                                    value={namesData[asset.id] ?? asset.name}
                                                    onChange={(e) => handleNameChange(asset.id, e.target.value)}
                                                    onBlur={(e) => saveName(asset, e)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') e.target.blur();
                                                        if (e.key === 'Escape') {
                                                            handleNameChange(asset.id, asset.name);
                                                            e.target.blur();
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="col-value">
                                                <div className="input-wrapper">
                                                    <span className="input-prefix">¥</span>
                                                    <input
                                                        type="number"
                                                        className="input font-mono"
                                                        value={formData[asset.id] ?? ''}
                                                        onChange={(e) => handleInputChange(asset.id, e.target.value)}
                                                        onKeyDown={async (e) => {
                                                            if (e.key === 'Enter') {
                                                                e.currentTarget.blur();
                                                                setSaveStatus('saving');
                                                                try {
                                                                    await saveRecords(formData);
                                                                    setSaveStatus('saved');
                                                                    setTimeout(() => setSaveStatus('idle'), 2000);
                                                                } catch (err) {
                                                                    setSaveStatus('error');
                                                                }
                                                            }
                                                        }}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-action">
                                                <button
                                                    className="action-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(asset.id, asset.name);
                                                    }}
                                                    title="删除"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {addingCategory === categoryId ? (
                                    <div className="item-row add-mode-row">
                                        <div className="col-name">
                                            <input
                                                autoFocus
                                                className="inline-edit-input"
                                                placeholder="输入名称"
                                                value={newAssetName}
                                                onChange={(e) => setNewAssetName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') confirmAdding(categoryId, parentCategory);
                                                    if (e.key === 'Escape') cancelAdding();
                                                }}
                                            />
                                        </div>
                                        <div className="col-value">
                                            <div className="input-wrapper">
                                                <span className="input-prefix">¥</span>
                                                <input
                                                    type="number"
                                                    className="input font-mono"
                                                    value={newAssetAmount}
                                                    onChange={(e) => setNewAssetAmount(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') confirmAdding(categoryId, parentCategory);
                                                        if (e.key === 'Escape') cancelAdding();
                                                    }}
                                                    placeholder="初始余额"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-action">
                                            <button className="action-btn" onClick={() => confirmAdding(categoryId, parentCategory)}><Check size={16} /></button>
                                            <button className="action-btn" onClick={cancelAdding}><X size={16} /></button>
                                        </div>
                                    </div>
                                ) : (
                                    <button className="add-asset-btn" onClick={() => startAdding(categoryId)}>
                                        + 添加{categoryInfo?.name || '资产'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        });
    };

    // typesLoading can be global, recordsLoading should be local to prevent jitter
    if (typesLoading) {
        return <div className="ledger-loading"><div className="spinner" /></div>;
    }

    return (
        <div className="ledger">
            <div className="toolbar-section">
                <GlassCard className="date-card">
                    <button className="date-nav-btn" onClick={goToPreviousMonth}><ChevronLeft size={18} /></button>
                    <div className="date-display">
                        <Calendar size={18} className="date-icon" />
                        <span className="date-text">{formatMonthDisplay(currentMonth)}</span>
                    </div>
                    <button className="date-nav-btn" onClick={goToNextMonth} disabled={currentMonth === getCurrentMonth()}><ChevronRight size={18} /></button>
                </GlassCard>

                <div className="toolbar-actions">
                    <GlassCard className="stats-card-mini">
                        <div className="stat-item">
                            <span className="stat-label">本月净资产</span>
                            <span className={`stat-value ${totals.net >= 0 ? 'positive' : 'negative'}`}>
                                ¥{totals.net.toLocaleString()}
                            </span>
                        </div>
                    </GlassCard>
                    <div className="actions-group">
                        <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
                            <UploadCloud size={16} />
                            <span>导入</span>
                        </button>
                        <button className="btn btn-secondary" onClick={handleCopyLastMonth}>
                            <Copy size={16} />
                            <span>复制上月</span>
                        </button>
                        <div className="save-status-indicator">
                            {saveStatus === 'saving' && <span className="text-gold"><span className="spinner-small" /> 保存中...</span>}
                            {saveStatus === 'saved' && <span className="text-green flex-center"><Check size={16} /> 已保存</span>}
                            {saveStatus === 'error' && <span className="text-red">保存失败</span>}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`ledger-content ${recordsLoading ? 'is-loading' : ''}`}>
                <div className="ledger-column">
                    <h2 className="column-title">资产列表</h2>
                    {renderCategorySection('assets', groupedAssets.assets)}
                </div>
                <div className="ledger-column">
                    <h2 className="column-title negative">负债列表</h2>
                    {renderCategorySection('liabilities', groupedAssets.liabilities)}
                </div>
            </div>
            <ImportModal
                isOpen={showImport}
                onClose={() => setShowImport(false)}
                onImport={handleImport}
            />
            {confirmConfig && (
                <ConfirmModal
                    isOpen={!!confirmConfig}
                    onClose={() => {
                        setConfirmConfig(null);
                        if (confirmConfig.onCancel) confirmConfig.onCancel();
                    }}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    onConfirm={confirmConfig.onConfirm}
                    type={confirmConfig.type}
                    confirmText={confirmConfig.confirmText}
                    cancelText={confirmConfig.cancelText}
                />
            )}
        </div>
    );
};

export default Ledger;
