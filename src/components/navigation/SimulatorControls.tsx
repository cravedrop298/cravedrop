import React from 'react';
import { Smartphone, Monitor, ShieldAlert, Store, User, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface SimulatorControlsProps {
  isPhoneFrame: boolean;
  onToggleFrame: () => void;
  onOpenCreateDrop: () => void;
}

export const SimulatorControls: React.FC<SimulatorControlsProps> = ({
  isPhoneFrame,
  onToggleFrame,
  onOpenCreateDrop,
}) => {
  const { role, switchRole } = useAuth();

  return (
    <aside
      aria-label="Interactive Demo Switcher"
      style={{
        width: '100%',
        maxWidth: '820px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        padding: '10px 16px',
        marginBottom: '12px',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border-light)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        zIndex: 50,
      }}
    >
      {/* Brand & Demo Tag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-coral)' }}>
          🔥 CraveDrop Interactive Demo
        </span>
        <span
          style={{
            fontSize: '11px',
            backgroundColor: 'var(--bg-butter)',
            color: '#B45309',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: 700,
          }}
        >
          Mobile-First
        </span>
      </div>

      {/* Role Switcher Quick Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Role:
        </span>
        <button
          onClick={() => switchRole('customer')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            borderRadius: '8px',
            fontSize: '11.5px',
            fontWeight: 700,
            backgroundColor: role === 'customer' ? 'var(--accent-coral)' : 'var(--bg-subtle)',
            color: role === 'customer' ? 'white' : 'var(--text-secondary)',
            border: 'none',
          }}
        >
          <User size={13} />
          <span>Customer</span>
        </button>

        <button
          onClick={() => switchRole('restaurant')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            borderRadius: '8px',
            fontSize: '11.5px',
            fontWeight: 700,
            backgroundColor: role === 'restaurant' ? 'var(--accent-coral)' : 'var(--bg-subtle)',
            color: role === 'restaurant' ? 'white' : 'var(--text-secondary)',
            border: 'none',
          }}
        >
          <Store size={13} />
          <span>Kitchen</span>
        </button>

        <button
          onClick={() => switchRole('admin')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            borderRadius: '8px',
            fontSize: '11.5px',
            fontWeight: 700,
            backgroundColor: role === 'admin' ? '#1E293B' : 'var(--bg-subtle)',
            color: role === 'admin' ? 'white' : 'var(--text-secondary)',
            border: 'none',
          }}
        >
          <ShieldAlert size={13} />
          <span>Admin</span>
        </button>
      </div>

      {/* Viewport Toggle (Phone Frame vs Full Width) & Quick Drop */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {role === 'restaurant' && (
          <button
            onClick={onOpenCreateDrop}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              borderRadius: '8px',
              fontSize: '11.5px',
              fontWeight: 700,
              backgroundColor: 'var(--bg-butter)',
              color: '#B45309',
              border: '1px solid var(--bg-butter-border)',
            }}
          >
            <Sparkles size={13} />
            <span>+ Drop Food</span>
          </button>
        )}

        <button
          onClick={onToggleFrame}
          title={isPhoneFrame ? 'Switch to Full Width View' : 'Switch to iPhone Frame Simulator'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            borderRadius: '8px',
            fontSize: '11.5px',
            fontWeight: 600,
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-light)',
          }}
        >
          {isPhoneFrame ? <Monitor size={13} /> : <Smartphone size={13} />}
          <span>{isPhoneFrame ? 'Full Width' : 'Phone Frame'}</span>
        </button>
      </div>
    </aside>
  );
};
