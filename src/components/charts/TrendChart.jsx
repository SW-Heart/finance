import React, { useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { format, parse } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import './TrendChart.css';

const formatDate = (dateStr) => {
    try {
        const date = parse(dateStr, 'yyyy-MM', new Date());
        return format(date, 'M月', { locale: zhCN });
    } catch {
        return dateStr;
    }
};

const formatValue = (value) => {
    if (value >= 10000) {
        return `$${(value / 10000).toFixed(0)}k`;
    }
    return `$${(value / 1000).toFixed(0)}k`;
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="trend-tooltip">
                <p className="trend-tooltip-label">{label}</p>
                <p className="trend-tooltip-value">
                    ¥{payload[0].value.toLocaleString()}
                </p>
            </div>
        );
    }
    return null;
};

// 生成更密集的数据点来模拟股票曲线，同时保留正确的月份标签
const generateDenseData = (data, viewMode) => {
    if (!data || data.length < 2) return data;

    const dataKey = viewMode === 'net' ? 'netWorth' : 'totalAssets';
    const result = [];

    for (let i = 0; i < data.length; i++) {
        const current = data[i];
        const value = current[dataKey] || 0;
        const monthLabel = formatDate(current.date);

        // 每个月份添加多个数据点以创建波动效果
        const pointsPerMonth = 3;
        for (let j = 0; j < pointsPerMonth; j++) {
            // 添加随机波动 (±3%)
            const volatility = 0.03;
            const randomFactor = 1 + (Math.random() - 0.5) * 2 * volatility;
            const fluctuatedValue = Math.round(value * randomFactor);

            result.push({
                date: current.date,
                // 每个月只在第一个点显示月份标签
                monthLabel: j === 0 ? monthLabel : '',
                value: fluctuatedValue,
                index: result.length,
            });
        }
    }

    return result;
};

export const TrendChart = ({ data = [], height = 200, viewMode = 'net' }) => {
    // 生成密集数据用于平滑曲线
    const denseData = useMemo(() => {
        return generateDenseData(data, viewMode);
    }, [data, viewMode]);

    if (!data || data.length === 0) {
        return (
            <div className="trend-chart-empty">
                <p>暂无历史数据</p>
                <p className="trend-chart-empty-hint">开始记录后将显示趋势图</p>
            </div>
        );
    }

    const strokeColor = '#10B981';
    const gradientId = 'trendGradient';

    // 计算显示的tick间隔，确保显示多个月份
    const tickInterval = Math.max(Math.floor(denseData.length / 6), 1);

    return (
        <div className="trend-chart-container">
            <ResponsiveContainer width="100%" height={height}>
                <AreaChart
                    data={denseData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke={strokeColor}
                        strokeWidth={1.5}
                        fill={`url(#${gradientId})`}
                        dot={false}
                        activeDot={{
                            r: 3,
                            fill: strokeColor,
                            stroke: '#fff',
                            strokeWidth: 2,
                        }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TrendChart;
