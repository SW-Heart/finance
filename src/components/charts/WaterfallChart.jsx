import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Cell,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import './WaterfallChart.css';

const formatValue = (value) => {
    const absValue = Math.abs(value);
    if (absValue >= 10000) {
        return `${value >= 0 ? '+' : ''}${(value / 10000).toFixed(1)}万`;
    }
    return `${value >= 0 ? '+' : ''}${value.toLocaleString()}`;
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="waterfall-tooltip">
                <p className="waterfall-tooltip-name">{data.name}</p>
                <p className={`waterfall-tooltip-value ${data.isPositive ? 'positive' : 'negative'}`}>
                    {formatValue(data.value)}
                </p>
            </div>
        );
    }
    return null;
};

export const WaterfallChart = ({ data, height = 300 }) => {
    if (!data || !data.items || data.items.length === 0) {
        return (
            <div className="waterfall-empty">
                <p>暂无波动数据</p>
                <p className="waterfall-empty-hint">记录多个月份后将显示变化分析</p>
            </div>
        );
    }

    // 构建瀑布图数据
    const chartData = [];
    let runningTotal = data.startValue;

    // 起始值
    chartData.push({
        name: '上月净值',
        value: data.startValue,
        isStart: true,
        start: 0,
        end: data.startValue,
    });

    // 各项变化
    data.items.forEach(item => {
        const start = runningTotal;
        const end = runningTotal + item.value;
        chartData.push({
            name: item.name,
            value: item.value,
            isPositive: item.isPositive,
            start: Math.min(start, end),
            end: Math.max(start, end),
            actualStart: start,
            actualEnd: end,
        });
        runningTotal = end;
    });

    // 结束值
    chartData.push({
        name: '本月净值',
        value: data.endValue,
        isEnd: true,
        start: 0,
        end: data.endValue,
    });

    return (
        <div className="waterfall-container">
            <ResponsiveContainer width="100%" height={height}>
                <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 10, left: 10, bottom: 40 }}
                >
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#666', fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        interval={0}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#666', fontSize: 10 }}
                        tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v.toLocaleString()}
                        width={50}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#333" />
                    <Bar dataKey="end" radius={[2, 2, 0, 0]}>
                        {chartData.map((entry, index) => {
                            let fill;
                            if (entry.isStart || entry.isEnd) {
                                fill = '#F2C94C'; // 金色 - 总值
                            } else if (entry.isPositive) {
                                fill = '#4CAF50'; // 绿色 - 正向贡献
                            } else {
                                fill = '#8E8E8E'; // 灰色 - 负向贡献
                            }
                            return <Cell key={`cell-${index}`} fill={fill} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default WaterfallChart;
