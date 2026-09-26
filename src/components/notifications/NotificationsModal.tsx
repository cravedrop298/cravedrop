import React from 'react';
import { Modal } from '../common/Modal';
import { useData } from '../../context/DataContext';
import { Bell, Flame, ShoppingBag, CheckCheck } from 'lucide-react';
import { NotificationItem } from '../../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectActionUrl?: (url: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onSelectActionUrl,
}) => {
  const { notifications, markNotificationAsRead } = useData();

  if (!isOpen) return null;

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
      default:
        return <Bell size={16} color="#B45309" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notifications"
      subtitle={`${notifications.filter((n) => !n.read).length} unread updates`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleItemClick(notif)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: notif.read ? 'var(--bg-subtle)' : 'var(--bg-butter)',
                border: `1px solid ${notif.read ? 'var(--border-light)' : 'var(--bg-butter-border)'}`,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                {getIcon(notif.type)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 800 }}>{notif.title}</h4>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {notif.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};
