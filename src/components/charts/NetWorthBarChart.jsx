import React, { useState } from 'react';
import {
    ComposedChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';
import { format, parse } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import './NetWorthBarChart.css';

const formatDate = (dateStr) => {
    try {
        const date = parse(dateStr, 'yyyy-MM', new Date());
        const month = date.getMonth(); // 0 is January
        if (month === 0) {
            return format(date, 'yyyy', { locale: zhCN });
        }
        return format(date, 'M月', { locale: zhCN });
    } catch {
        return dateStr;
    }
};

const formatFullDate = (dateStr) => {
    try {
        const date = parse(dateStr, 'yyyy-MM', new Date());
        return format(date, 'yyyy年M月', { locale: zhCN });
    } catch {
        return dateStr;
    }
};

// 格式化金额 - 超过10万用万单位，保留两位小数
const formatValue = (value) => {
    const absValue = Math.abs(value);
    if (absValue >= 100000) {
        return `${(value / 10000).toFixed(2)}万`;
    }
    if (absValue >= 1000) {
        return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toLocaleString();
};

// 自定义K线形状
const CandlestickShape = (props) => {
    const { fill, x, y, width, height, open, close, high, low, first } = props;

    // 如果是第一个点，通常没有前一个月的数据来定Open，可以设为Open=Close，显示为十字星
    // 但为了美观，如果close > 0，则默认第一个月是上涨（或者是起步）
    const isUp = close >= open;
    const color = isUp ? '#10B981' : '#EF4444';
    const bodyHeight = Math.abs(open - close);
    // 最小高度1px，避免看起来像消失了
    const finalBodyHeight = Math.max(bodyHeight, 2);

    // 计算K线实体的位置
    // Y轴是从上到下的，数值越大Y越小
    // openY和closeY是对应数值的Y坐标
    // Recharts传入的 y 和 height 是针对Bar的，对于Candlestick我们需要自己计算
    // 但是 Bar 组件的 y 和 height 是基于 value (Close) 的，这不完全适合 K线。
    // 更简单的方法利用 ErrorBar 或 自定义形状传入所有坐标。
    // 这里我们传入了 open, close, high, low 的值，需要 scale 转换成 Y 坐标。
    // 但 props 里通常已经有了转换后的坐标或者我们可以利用 payload。

    // 另一种简单方案：Bar对应实体。
    // 但Bar只能从 0 到 Value。
    // 我们需要的是 Range Bar (Floating Bar)。Recharts <Bar> 支持 dataKey 为数组 [min, max]。
    // 我们可以让 dataKey=[min(open, close), max(open, close)] 来绘制实体。
    // 然后用 ErrorBar 或另一个 Bar 来绘制影线？由于 High=Low=max/min(open, close)，我们这里不需要影线，除了第一根K线？
    // 用户说“相当于月线了”，通常月线Open=上月末Close。
    // 既然 High/Low 也是 Open/Close，那么就是光头光脚的K线。

    // 所以只需要绘制一个矩形：
    // y: max(open, close) 的Y坐标
    // height: abs(open - close) 的高度

    // 问题是 Recharts 的 Custom Shape props 里的 x, y, height 是基于 dataKey 的。
    // 如果我们用 Bar dataKey={[min, max]}，那么 y 就是 max 的 y坐标，height 就是差值的高度。

    return (
        <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={color}
            // 实体可以稍微圆角
            rx={2}
            ry={2}
        />
    );
};

// 自定义 Tooltip
const CustomTooltip = ({ active, payload, showValue }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const { open, close, netGrowth, growthPercent, date } = data;

        const isUp = close >= open;
        const color = isUp ? '#10B981' : '#EF4444';

        return (
            <div className="bar-tooltip">
                <div className="bar-tooltip-header">{formatFullDate(date)}</div>
                <div className="bar-tooltip-body">
                    <div className="bar-tooltip-row">
                        <span className="bar-tooltip-label">开盘 (上月)</span>
                        <span className="bar-tooltip-value">
                            {showValue ? `¥${open.toLocaleString()}` : '****'}
                        </span>
                    </div>
                    <div className="bar-tooltip-row">
                        <span className="bar-tooltip-label">收盘 (本月)</span>
                        <span className="bar-tooltip-value">
                            {showValue ? `¥${close.toLocaleString()}` : '****'}
                        </span>
                    </div>
                    <div className="bar-tooltip-row">
                        <span className="bar-tooltip-label">涨跌额</span>
                        <span className="bar-tooltip-value" style={{ color }}>
                            {showValue ? `${netGrowth >= 0 ? '+' : ''}¥${netGrowth.toLocaleString()}` : '****'}
                        </span>
                    </div>
                    <div className="bar-tooltip-row">
                        <span className="bar-tooltip-label">涨跌幅</span>
                        <span className="bar-tooltip-value" style={{ color }}>
                            {netGrowth >= 0 ? '+' : ''}{(growthPercent * 100).toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

// 自定义图例
const CustomLegend = () => {
    return (
        <div className="bar-chart-legend">
            <div className="bar-legend-item">
                <span className="bar-legend-color k-up"></span>
                <span className="bar-legend-text">上涨</span>
            </div>
            <div className="bar-legend-item">
                <span className="bar-legend-color k-down"></span>
                <span className="bar-legend-text">下跌</span>
            </div>
        </div>
    );
};


export const NetWorthBarChart = ({ data = [], height = 350, showValue = true }) => {
    if (!data || data.length === 0) {
        return (
            <div className="networth-bar-empty">
                <p>暂无历史数据</p>
                <p className="networth-bar-empty-hint">记录多个月份后将显示K线图</p>
            </div>
        );
    }

    // 处理数据为K线格式
    // Open: 上个月TotalAssets (如果是第一条数据，Open=Close，或者Open=0? 通常设为Close以显示十字星，这里设为与Close相同)
    // Close: 本月TotalAssets
    // High = Max(Open, Close)
    // Low = Min(Open, Close)

    // 显示全部历史数据，不再slice
    const chartData = data.map((item, index) => {
        const prevItem = index > 0 ? data[index - 1] : null;
        const close = item.totalAssets || 0;
        // 如果是第一条，假设Open=Close (或者之前的初始资金，这里暂用Close)
        const open = prevItem ? (prevItem.totalAssets || 0) : close;

        const netGrowth = close - open;
        const growthPercent = open !== 0 ? netGrowth / open : 0;

        // 构造 Range Bar 数据: [min, max]
        const min = Math.min(open, close);
        const max = Math.max(open, close);

        // 如果涨跌幅为0，min=max，Bar高度为0不可见。我们可以微调 max 让它至少有高度。
        // 或者在 Shape 里处理。使用 Range Bar 时，Recharts 传入的 height 是差值。
        // 如果 min===max，height=0。

        return {
            ...item,
            label: formatDate(item.date),
            open,
            close,
            high: max,
            low: min,
            candleRange: [min, max],
            netGrowth,
            growthPercent,
            isUp: close >= open,
            isFirst: index === 0
        };
    });

    // 计算Y轴范围
    const allValues = chartData.flatMap(d => [d.open, d.close]);
    const maxVal = Math.max(...allValues);
    const minVal = Math.min(...allValues);
    const padding = (maxVal - minVal) * 0.1;

    return (
        <div className="networth-bar-container">
            <CustomLegend />
            <ResponsiveContainer width="100%" height={height}>
                <ComposedChart
                    data={chartData}
                    margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                >
                    <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748B', fontSize: 11 }}
                    />
                    <YAxis
                        domain={[Math.max(0, minVal - padding), maxVal + padding]}
                        tickFormatter={formatValue}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                        width={60}
                    />
                    <Tooltip
                        content={<CustomTooltip showValue={showValue} />}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                    />
                    {/* 使用 Bar 绘制 K线实体 */}
                    <Bar
                        dataKey="candleRange"
                        shape={(props) => <CandlestickShape {...props} open={props.payload.open} close={props.payload.close} />}
                    >
                        {
                            chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.isUp ? '#10B981' : '#EF4444'} />
                            ))
                        }
                    </Bar>
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default NetWorthBarChart;
