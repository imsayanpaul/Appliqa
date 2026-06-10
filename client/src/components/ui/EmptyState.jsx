import React from 'react';

export function EmptyState({ 
    icon: Icon, 
    title, 
    description, 
    action, 
    loading = false 
}) {
    return (
        <div className="empty-state">
            {loading ? (
                <div className="spinner-container" style={{ margin: '0 auto 20px', display: 'flex', justifyContent: 'center' }}>
                    <div className="spinner primary-spinner"></div>
                </div>
            ) : Icon ? (
                <div className="empty-icon" style={{ opacity: 0.2, fontSize: 48, marginBottom: 16 }}>
                    <Icon />
                </div>
            ) : null}
            
            <h3 style={{ fontSize: 18, color: 'var(--text-primary)', marginBottom: description || action ? 8 : 0 }}>
                {loading ? (title || 'Loading...') : title}
            </h3>
            
            {description && (
                <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 400, margin: '0 auto' }}>
                    {description}
                </p>
            )}
            
            {action && (
                <div style={{ marginTop: 24 }}>
                    {action}
                </div>
            )}
        </div>
    );
}
