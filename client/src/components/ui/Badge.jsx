import React from 'react';

export function Badge({ 
    variant = 'meta', // 'meta', 'skill', 'match-high', 'match-medium', 'match-low', 'remote'
    className = '', 
    children, 
    ...props 
}) {
    let baseClass = 'meta-tag'; // Default

    if (variant === 'skill') {
        baseClass = 'skill-tag';
    } else if (variant === 'remote') {
        baseClass = 'meta-tag remote';
    } else if (variant.startsWith('match-')) {
        const level = variant.replace('match-', '');
        baseClass = `match-badge ${level}`;
    }

    const combinedClassName = [baseClass, className].filter(Boolean).join(' ');

    return (
        <span className={combinedClassName} {...props}>
            {children}
        </span>
    );
}
