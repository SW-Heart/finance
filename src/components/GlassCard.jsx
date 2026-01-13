import React from 'react';
import './GlassCard.css';

export const GlassCard = ({
    children,
    variant = 'default',
    className = '',
    onClick,
    ...props
}) => {
    const variantClass = variant === 'gold' ? 'glass-card-gold' : 'glass-card';

    return (
        <div
            className={`${variantClass} ${className}`}
            onClick={onClick}
            {...props}
        >
            {children}
        </div>
    );
};

export default GlassCard;
