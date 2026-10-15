import React, { useState } from 'react';
import {
  MessageCircle,
  Search,
  Plus,
  UserCheck,
  UserPlus,
  Clock,
  CheckCheck,
  X,
  Sparkles,
  Users,
  Store,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Conversation, FoodPost, Restaurant, UserProfile } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { ChatScreen } from './ChatScreen';

interface MessagesViewProps {
  onOpenOrderModal?: (post: FoodPost) => void;
  onSelectRestaurant?: (restaurantId: string) => void;
  initialConversationId?: string | null;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  onOpenOrderModal,
  onSelectRestaurant,
  initialConversationId,
}) => {
  const { user } = useAuth();
  const {
    conversations = [],
    messageRequests = [],
    sendMessage,
    getFollowStatus,
    toggleFollow,
    allUsers = [],
    restaurants = [],
  } = useData();

  const [activeTab, setActiveTab] = useState<'all' | 'requests' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(() => {
    if (initialConversationId) {
      return conversations.find((c) => c.id === initialConversationId) || null;
    }
    return null;
  });
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Filtering conversations
  const filteredConversations = conversations.filter((c) => {
    const other = c.participants.find((p) => p.id !== user?.id) || c.participants[0];
    const matchesSearch =
      other?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.last_message?.text?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'requests') return c.is_request;
    if (activeTab === 'unread') return c.unread_count > 0;
    return !c.is_request;
  });

  const requestsCount = (messageRequests || []).length;

  const handleStartConversationWithUser = (targetUserId: string, targetName: string, targetAvatar: string, targetRole: 'customer' | 'restaurant' | 'admin') => {
    const existing = conversations.find((c) => c.participant_ids.includes(targetUserId));
    if (existing) {
      setActiveConversation(existing);
    } else {
      // Create new conversation
      const newConv: Conversation = {
        id: `conv-new-${Date.now()}`,
        participant_ids: [user?.id || 'u1', targetUserId],
        participants: [
          { id: user?.id || 'u1', name: user?.name || 'Me', avatar_url: user?.avatar_url || '', role: user?.role || 'customer' },
          { id: targetUserId, name: targetName, avatar_url: targetAvatar, role: targetRole, is_online: true },
        ],
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        created_at: new Date().toISOString(),
      };
      setActiveConversation(newConv);
    }
    setShowNewMessageModal(false);
  };

  // If a chat is open, render ChatScreen directly
  if (activeConversation) {
    return (
      <ChatScreen
        conversation={activeConversation}
        onBack={() => setActiveConversation(null)}
        onOpenOrderModal={onOpenOrderModal}
        onSelectRestaurant={onSelectRestaurant}
      />
    );
  }

  return (
    <div style={{ padding: '14px 14px 40px', backgroundColor: '#FAF7F2', minHeight: '100%' }}>
      {/* 1. HEADER & NEW MESSAGE TRIGGER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
            Messages
          </h1>
          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            Chat with foodies, food creators & specialty kitchens
          </p>
        </div>

        <button
          onClick={() => setShowNewMessageModal(true)}
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '7px 12px',
            borderRadius: '20px',
            fontSize: '11.5px',
            fontWeight: 800,
          }}
        >
          <Plus size={14} />
          <span>New Chat</span>
        </button>
      </div>

      {/* 2. SEARCH MESSAGES BAR */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Search people, kitchens, or chats..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            height: '42px',
            padding: '0 14px 0 36px',
            borderRadius: '14px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-light)',
            fontSize: '13px',
            color: 'var(--text-primary)',
            outline: 'none',
            boxShadow: 'var(--shadow-sm)',
          }}
        />
      </div>

      {/* 3. FILTER TABS */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 800,
            backgroundColor: activeTab === 'all' ? 'var(--accent-coral)' : '#FFFFFF',
            color: activeTab === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
            border: `1px solid ${activeTab === 'all' ? 'var(--accent-coral)' : 'var(--border-light)'}`,
            cursor: 'pointer',
          }}
        >
          All Chats
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 800,
            backgroundColor: activeTab === 'requests' ? 'var(--accent-coral)' : '#FFFFFF',
            color: activeTab === 'requests' ? '#FFFFFF' : 'var(--text-secondary)',
            border: `1px solid ${activeTab === 'requests' ? 'var(--accent-coral)' : 'var(--border-light)'}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <span>Requests</span>
          {requestsCount > 0 && (
            <span style={{ backgroundColor: activeTab === 'requests' ? '#FFFFFF' : 'var(--accent-coral)', color: activeTab === 'requests' ? 'var(--accent-coral)' : '#FFFFFF', padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 900 }}>
              {requestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('unread')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 800,
            backgroundColor: activeTab === 'unread' ? 'var(--accent-coral)' : '#FFFFFF',
            color: activeTab === 'unread' ? '#FFFFFF' : 'var(--text-secondary)',
            border: `1px solid ${activeTab === 'unread' ? 'var(--accent-coral)' : 'var(--border-light)'}`,
            cursor: 'pointer',
          }}
        >
          Unread
        </button>
      </div>

      {/* 4. CONVERSATIONS LIST */}
      {filteredConversations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--border-light)' }}>
          <MessageCircle size={36} color="var(--text-muted)" style={{ margin: '0 auto 10px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>No conversations yet</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Tap <strong>New Chat</strong> to start messaging customers, foodies or kitchens!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredConversations.map((conv) => {
            const other = conv.participants.find((p) => p.id !== user?.id) || conv.participants[0];
            const followStatus = getFollowStatus(other.id);

            return (
              <div
                key={conv.id}
                onClick={() => setActiveConversation(conv)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid var(--border-light)',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Avatar with Online Indicator */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={other.avatar_url}
                    alt={other.name}
                    style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border-light)' }}
                  />
                  {other.is_online && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '1px',
                        right: '1px',
                        width: '11px',
                        height: '11px',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        border: '2px solid #FFFFFF',
                      }}
                    />
                  )}
                </div>

                {/* Conversation Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                        {other.name}
                      </h4>
                      {followStatus === 'mutual' && (
                        <span style={{ fontSize: '9.5px', fontWeight: 800, backgroundColor: 'var(--accent-coral-light)', color: 'var(--accent-coral)', padding: '1px 5px', borderRadius: '6px' }}>
                          Mutual
                        </span>
                      )}
                    </div>

                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {conv.last_message ? new Date(conv.last_message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: '12px', color: conv.unread_count > 0 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: conv.unread_count > 0 ? 800 : 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '190px' }}>
                      {conv.last_message?.text || (conv.last_message?.message_type === 'shared_post' ? '🍕 Shared a Food Drop' : 'Shared an item')}
                    </p>

                    {conv.unread_count > 0 && (
                      <span style={{ backgroundColor: 'var(--accent-coral)', color: '#FFFFFF', fontSize: '10px', fontWeight: 900, width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. NEW MESSAGE MODAL */}
      {showNewMessageModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '20px', width: '100%', maxWidth: '380px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16.5px', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>Start New Conversation</h3>
              <button onClick={() => setShowNewMessageModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search foodies or kitchens..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                style={{ width: '100%', height: '38px', borderRadius: '12px', backgroundColor: '#FAF7F2', border: '1px solid var(--border-light)', padding: '0 12px 0 34px', fontSize: '12.5px', outline: 'none' }}
              />
            </div>

            {/* User & Restaurant Selection List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', margin: '4px 0 2px' }}>FOOD CREATORS & KITCHENS:</p>
              {restaurants.map((rest) => (
                <div
                  key={rest.id}
                  onClick={() => handleStartConversationWithUser(rest.owner_id || rest.id, rest.name, rest.logo_url, 'restaurant')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '12px', backgroundColor: '#FAF7F2', border: '1px solid var(--border-light)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={rest.logo_url} alt="r" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <h5 style={{ fontSize: '13px', fontWeight: 800, margin: 0 }}>{rest.name}</h5>
                      <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', margin: 0 }}>{rest.category} · {rest.city}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--accent-coral)" />
                </div>
              ))}

              <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', margin: '8px 0 2px' }}>COMMUNITY MEMBERS:</p>
              {allUsers.filter((u) => u.id !== user?.id).map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleStartConversationWithUser(u.id, u.name, u.avatar_url, u.role)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '12px', backgroundColor: '#FAF7F2', border: '1px solid var(--border-light)', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={u.avatar_url} alt="u" style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div>
                      <h5 style={{ fontSize: '13px', fontWeight: 800, margin: 0 }}>{u.name}</h5>
                      <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', margin: 0 }}>@{u.username}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--accent-coral)" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
