import React from 'react';

export function Input({ 
    variant = 'form', // 'form' or 'search'
    className = '', 
    ...props 
}) {
    const combinedClassName = [
        variant === 'search' ? 'search-input' : 'form-input', 
        className
    ].filter(Boolean).join(' ');

    return (
        <input className={combinedClassName} {...props} />
    );
}
