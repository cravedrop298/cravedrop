import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import {
  ShieldAlert,
  Store,
  Flag,
  Users,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Trash2,
  Eye,
  AlertTriangle,
  BadgeCheck,
} from 'lucide-react';
import { Report } from '../../types';

type AdminTab = 'reports' | 'restaurants' | 'posts' | 'metrics';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    reports,
    restaurants,
    posts,
    adminApproveRestaurant,
    adminTakeDownPost,
    adminModerateReport,
  } = useData();

  const [activeTab, setActiveTab] = useState<AdminTab>('reports');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const pendingReports = reports.filter((r) => r.status === 'pending');
  const pendingRestaurants = restaurants.filter((r) => !r.is_approved);

  return (
    <div style={{ padding: '16px 16px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={18} color="#1E293B" />
            <h2 style={{ fontSize: '18px', fontWeight: 800 }}>Platform Moderator</h2>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Super Admin Controls & Moderation Queue
          </span>
        </div>

        <span
          style={{
            fontSize: '11px',
            fontWeight: 800,
            backgroundColor: '#1E293B',
            color: 'white',
            padding: '3px 8px',
            borderRadius: '10px',
          }}
        >
          Protected
        </span>
      </div>

      {/* Admin Tabs */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          border: '1px solid var(--border-light)',
          marginBottom: '16px',
        }}
      >
        <button
          onClick={() => setActiveTab('reports')}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12.5px',
            fontWeight: 700,
            backgroundColor: activeTab === 'reports' ? '#1E293B' : 'transparent',
            color: activeTab === 'reports' ? '#FFFFFF' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <Flag size={14} />
          <span>Reports ({pendingReports.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('restaurants')}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12.5px',
            fontWeight: 700,
            backgroundColor: activeTab === 'restaurants' ? '#1E293B' : 'transparent',
            color: activeTab === 'restaurants' ? '#FFFFFF' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <Store size={14} />
          <span>Kitchens</span>
        </button>

        <button
          onClick={() => setActiveTab('posts')}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12.5px',
            fontWeight: 700,
            backgroundColor: activeTab === 'posts' ? '#1E293B' : 'transparent',
            color: activeTab === 'posts' ? '#FFFFFF' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <Eye size={14} />
          <span>Drops</span>
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12.5px',
            fontWeight: 700,
            backgroundColor: activeTab === 'metrics' ? '#1E293B' : 'transparent',
            color: activeTab === 'metrics' ? '#FFFFFF' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
        >
          <TrendingUp size={14} />
          <span>Metrics</span>
        </button>
      </div>

      {/* TAB 1: REPORTS QUEUE */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '16px' }}>
              <p>No moderation reports in queue.</p>
            </div>
          ) : (
            reports.map((rep) => (
              <div
                key={rep.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '14px',
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          padding: '2px 6px',
                          borderRadius: '6px',
                        }}
                      >
                        {rep.reported_type.toUpperCase()} REPORT
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(rep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 800, marginTop: '4px' }}>
                      Reason: {rep.reason.replace('_', ' ')}
                    </h4>
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: rep.status === 'pending' ? 'var(--bg-butter)' : 'var(--bg-subtle)',
                      color: rep.status === 'pending' ? '#B45309' : 'var(--text-secondary)',
                      padding: '2px 8px',
                      borderRadius: '8px',
                    }}
                  >
                    {rep.status}
                  </span>
                </div>

                {rep.details && (
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    "{rep.details}"
                  </p>
                )}

                {rep.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      fullWidth
                      onClick={() => adminModerateReport(rep.id, 'dismissed')}
                    >
                      Dismiss Report
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      fullWidth
                      onClick={() => adminModerateReport(rep.id, 'action_taken', 'Removed content')}
                    >
                      Take Down & Moderate
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: RESTAURANTS VERIFICATION */}
      {activeTab === 'restaurants' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {restaurants.map((rest) => (
            <div
              key={rest.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '14px',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={rest.logo_url}
                  alt={rest.name}
                  style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <h4 style={{ fontSize: '13.5px', fontWeight: 800 }}>{rest.name}</h4>
                    {rest.is_verified && <BadgeCheck size={14} color="var(--accent-coral)" />}
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    {rest.category} · {rest.city}
                  </p>
                </div>
              </div>

              <div>
                {rest.is_approved ? (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: 'var(--accent-green-light)',
                      color: 'var(--accent-green)',
                      padding: '4px 8px',
                      borderRadius: '8px',
                    }}
                  >
                    Approved Partner
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => adminApproveRestaurant(rest.id, true)}
                  >
                    Approve Kitchen
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: POSTS MODERATION */}
      {activeTab === 'posts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '12px',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <img
                src={post.thumbnail_url}
                alt={post.product_name}
                style={{ width: '50px', height: '50px', borderRadius: '10px', objectFit: 'cover' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {post.product_name}
                </h4>
                <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  {post.restaurant_name} · {post.likes_count} likes · {post.orders_count} orders
                </p>
              </div>

              {post.is_hidden ? (
                <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: 700 }}>Removed</span>
              ) : (
                <button
                  onClick={() => adminTakeDownPost(post.id)}
                  title="Remove Post"
                  style={{
                    padding: '6px',
                    color: '#DC2626',
                    backgroundColor: '#FEF2F2',
                    borderRadius: '8px',
                    border: 'none',
                  }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: PLATFORM METRICS */}
      {activeTab === 'metrics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Kitchens</span>
            <p style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>{restaurants.length}</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Live Drops</span>
            <p style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>{posts.length}</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Orders</span>
            <p style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>248</p>
          </div>
          <div style={{ backgroundColor: 'white', padding: '14px', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Platform GMV</span>
            <p style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px', color: 'var(--accent-coral)' }}>Rs. 4,892.40</p>
          </div>
        </div>
      )}
    </div>
  );
};
