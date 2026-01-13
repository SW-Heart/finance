import React from 'react';
import './GoldText.css';

export const GoldText = ({
    children,
    variant = 'default',
    className = '',
    as: Component = 'span',
    ...props
}) => {
    const variantClass = {
        default: 'gold-text',
        glow: 'gold-text-glow',
        shimmer: 'gold-shimmer',
    }[variant];

    return (
        <Component className={`${variantClass} ${className}`} {...props}>
            {children}
        </Component>
    );
};

export default GoldText;
