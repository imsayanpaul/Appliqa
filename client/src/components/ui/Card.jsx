import React from 'react';

export function Card({ 
    className = '', 
    children, 
    ...props 
}) {
    const combinedClassName = ['ui-card', className].filter(Boolean).join(' ');

    return (
        <div className={combinedClassName} {...props}>
            {children}
        </div>
    );
}
