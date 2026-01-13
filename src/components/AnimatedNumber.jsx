import React, { useState, useEffect, useRef } from 'react';
import './AnimatedNumber.css';

export const AnimatedNumber = ({
    value,
    duration = 1200,
    formatter = (v) => v.toLocaleString(),
    className = '',
    prefix = '',
    suffix = '',
}) => {
    const [displayValue, setDisplayValue] = useState(0);
    const previousValue = useRef(0);
    const animationRef = useRef(null);

    useEffect(() => {
        const startValue = previousValue.current;
        const endValue = value || 0;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function: easeOutExpo
            const easeOutExpo = 1 - Math.pow(2, -10 * progress);

            const currentValue = startValue + (endValue - startValue) * easeOutExpo;
            setDisplayValue(currentValue);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                previousValue.current = endValue;
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [value, duration]);

    return (
        <span className={`animated-number ${className}`}>
            {prefix}{formatter(Math.round(displayValue))}{suffix}
        </span>
    );
};

export default AnimatedNumber;
