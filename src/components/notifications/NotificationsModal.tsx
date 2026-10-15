import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useData } from '../../context/DataContext';
import { Bell, Flame, ShoppingBag, CheckCheck, Sparkles, UserPlus } from 'lucide-react';
import { NotificationItem } from '../../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectActionUrl?: (url: string) => void;
}

type NotificationTab = 'all' | 'order' | 'drop' | 'system';

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onSelectActionUrl,
}) => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useData();
  const [activeFilter, setActiveFilter] = useState<NotificationTab>('all');

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    return n.type === activeFilter;
  });

  const handleItemClick = (notif: NotificationItem) => {
    markNotificationAsRead(notif.id);
    if (notif.action_url && onSelectActionUrl) {
      onSelectActionUrl(notif.action_url);
      onClose();
    }
  };

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'order':
        return <ShoppingBag size={16} color="var(--accent-coral)" />;
      case 'drop':
        return <Flame size={16} color="#EA580C" />;
      case 'system':
        return <Sparkles size={16} color="#059669" />;
      default:
        return <Bell size={16} color="#B45309" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notifications"
      subtitle={`${unreadCount} unread updates`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Top Actions & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {[
              { key: 'all', label: 'All' },
              { key: 'order', label: 'Orders' },
              { key: 'drop', label: 'Drops' },
              { key: 'system', label: 'System' },
            ].map((tab) => {
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key as NotificationTab)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '16px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    backgroundColor: isActive ? 'var(--accent-coral)' : 'var(--bg-subtle)',
                    color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Mark All as Read */}
          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsAsRead}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                color: 'var(--accent-coral)',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <CheckCheck size={14} />
              <span>Read all</span>
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '380px', overflowY: 'auto' }}>
          {filteredNotifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
              <Bell size={36} color="var(--text-muted)" style={{ margin: '0 auto 8px', display: 'block' }} />
              <p style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>No notifications in {activeFilter}</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Updates about orders, food drops, and friends will show up here.</p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '16px',
                  backgroundColor: notif.read ? '#FFFFFF' : 'var(--bg-butter)',
                  border: `1px solid ${notif.read ? 'var(--border-light)' : 'var(--bg-butter-border)'}`,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.15s ease',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  {getIcon(notif.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {notif.title}
                    </h4>
                    <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px', margin: '3px 0 0', lineHeight: 1.4 }}>
                    {notif.message}
                  </p>
                </div>

                {/* Unread Dot */}
                {!notif.read && (
                  <div
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-coral)',
                      flexShrink: 0,
                      marginTop: '6px',
                    }}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
