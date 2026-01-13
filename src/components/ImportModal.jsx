import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, Loader, BrainCircuit, Clipboard, Trash2, FileText } from 'lucide-react';
import './ImportModal.css';

// 使用环境变量配置 API 地址
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const CATEGORY_MAP = {
    'liquid': '流动性资产',
    'safe': '稳健型资产',
    'equity': '权益类资产',
    'risk': '风险资产',
    'other': '其他资产',
    'liability': '负债'
};

const ImportModal = ({ isOpen, onClose, onImport }) => {
    const [file, setFile] = useState(null);
    const [activeTab, setActiveTab] = useState('file'); // 'file' or 'text'
    const [textInput, setTextInput] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isImporting, setIsImporting] = useState(false); // Add importing state
    const [previewData, setPreviewData] = useState([]);
    const [useAI, setUseAI] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            setActiveTab('file');
            processFile(droppedFile);
        }
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        console.log("File selected:", selectedFile);
        if (selectedFile) {
            processFile(selectedFile);
        }
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    const processFile = async (uploadedFile) => {
        setFile(uploadedFile);
        setIsAnalyzing(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('use_ai', String(useAI));

        try {
            const res = await fetch(`${API_BASE_URL}/import/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await res.json();
            handleResponse(data);
        } catch (err) {
            handleError(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const processText = async () => {
        if (!textInput.trim()) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/import/paste`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textInput, use_ai: useAI })
            });

            const data = await res.json();
            handleResponse(data);
        } catch (err) {
            handleError(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleResponse = (data) => {
        if (data.success) {
            if (data.data && data.data.length > 0) {
                setPreviewData(data.data);
            } else {
                throw new Error('未识别到有效数据。请检查内容格式。');
            }
        } else {
            throw new Error(data.detail || 'Analysis failed');
        }
    };

    const handleError = (err) => {
        console.error("Import failed:", err);
        setError(err.message || "处理失败，请检查服务连接");
        setFile(null);
    };

    const handleConfirm = async () => {
        setIsImporting(true);
        try {
            await onImport(previewData);
            onClose();
            resetState();
        } catch (err) {
            console.error("Import error details:", err);
            setError("导入过程发生错误，请重试");
        } finally {
            setIsImporting(false);
        }
    };

    const resetState = () => {
        setFile(null);
        setPreviewData([]);
        setTextInput('');
        setError(null);
    };

    const handleDataChange = (index, field, value) => {
        const newData = [...previewData];
        if (field === 'amount') {
            // Allow empty string for temporary editing, but convert valid numbers
            if (value === '' || value === '-') {
                newData[index][field] = value;
            } else {
                const num = parseFloat(value);
                newData[index][field] = isNaN(num) ? value : num;
            }
        } else {
            newData[index][field] = value;
        }
        setPreviewData(newData);
    };

    const handleDeleteRow = (index) => {
        setPreviewData(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="import-modal-overlay">
            <div className="import-modal">
                <div className="modal-header">
                    <h3>导入资产数据</h3>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                {!previewData.length ? (
                    <>
                        {/* ... existing upload UI ... */}
                        <div className="import-tabs">
                            <button
                                className={`tab-btn ${activeTab === 'file' ? 'active' : ''}`}
                                onClick={() => setActiveTab('file')}
                            >
                                <FileSpreadsheet size={16} /> 文件上传
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
                                onClick={() => setActiveTab('text')}
                            >
                                <Clipboard size={16} /> 粘贴文本
                            </button>
                        </div>

                        <div className="import-content-area">
                            {isAnalyzing ? (
                                <div className="analyzing-state">
                                    <div className="loader-container">
                                        <Loader className="spin" size={40} />
                                        <div className="pulse-ring"></div>
                                    </div>
                                    <p>正在智能分析数据结构...</p>
                                    <span className="text-xs opacity-60">
                                        {useAI ? '正在调用 DeepSeek AI 模型解析...' : '正在进行结构化扫描...'}
                                    </span>
                                </div>
                            ) : (
                                <>
                                    {activeTab === 'file' ? (
                                        <div
                                            className={`upload-area ${isDragging ? 'dragging' : ''}`}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            onClick={() => fileInputRef.current.click()}
                                        >
                                            <FileSpreadsheet className="upload-icon" />
                                            <p>点击或拖拽上传 Excel/CSV 文件</p>
                                            <span className="text-sm opacity-60">支持 .xlsx, .xls, .csv</span>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden-input"
                                                accept=".csv,.xlsx,.xls"
                                                onChange={handleFileSelect}
                                                style={{ display: 'none' }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-paste-area">
                                            <textarea
                                                placeholder="请直接粘贴Excel或表格中的数据..."
                                                value={textInput}
                                                onChange={(e) => setTextInput(e.target.value)}
                                            />
                                            <button
                                                className="btn btn-primary mt-2"
                                                onClick={processText}
                                                disabled={!textInput.trim()}
                                            >
                                                <FileText size={16} /> 开始识别
                                            </button>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="error-message" style={{ color: '#ff4d4f', marginTop: '15px', padding: '10px', background: 'rgba(255,77,79,0.1)', borderRadius: '8px' }}>
                                            {error}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="preview-section">
                        <div className="preview-header">
                            <h4>预览与编辑 ({previewData.length})</h4>
                            <button className="btn btn-ghost btn-sm text-danger" onClick={resetState}>
                                <Trash2 size={14} /> 清空重置
                            </button>
                        </div>
                        <div className="table-container">
                            <table className="preview-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '35%' }}>资产名称</th>
                                        <th style={{ width: '25%' }}>金额</th>
                                        <th style={{ width: '28%' }}>类别</th>
                                        <th style={{ width: '12%' }}>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="preview-input"
                                                    value={item.name}
                                                    onChange={(e) => handleDataChange(idx, 'name', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="preview-input"
                                                    value={item.amount}
                                                    onChange={(e) => handleDataChange(idx, 'amount', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <select
                                                    className="preview-select"
                                                    value={item.category || ''}
                                                    onChange={(e) => handleDataChange(idx, 'category', e.target.value)}
                                                >
                                                    <option value="">- 自动识别 -</option>
                                                    {Object.entries(CATEGORY_MAP).map(([key, label]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-ghost btn-icon delete-row-btn"
                                                    onClick={() => handleDeleteRow(idx)}
                                                    title="删除此行"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="modal-actions">
                    {!previewData.length && !isAnalyzing && (
                        <label className="ai-toggle" title="使用 DeepSeek AI 分析复杂文档">
                            <input
                                type="checkbox"
                                checked={useAI}
                                onChange={(e) => setUseAI(e.target.checked)}
                            />
                            <BrainCircuit size={16} />
                            <span>启用 AI 智能分析</span>
                        </label>
                    )}
                    <div className="flex-spacer"></div>
                    <button className="btn btn-secondary" onClick={onClose}>取消</button>
                    {previewData.length > 0 && (
                        <button
                            className="btn btn-primary"
                            onClick={handleConfirm}
                            disabled={isImporting}
                        >
                            {isImporting ? <><Loader size={16} className="spin" /> 处理中...</> : '确认导入'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportModal;
