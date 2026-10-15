import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Send,
  MoreVertical,
  Share2,
  ShieldAlert,
  Ban,
  ShoppingBag,
  ExternalLink,
  Sparkles,
  CheckCheck,
  AlertCircle,
  X,
  User,
  Store,
} from 'lucide-react';
import { Conversation, ChatMessage, FoodPost, Restaurant, UserProfile, Order } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { isPostExpired } from '../../services/expiryService';

interface ChatScreenProps {
  conversation: Conversation;
  onBack: () => void;
  onSelectPost?: (post: FoodPost) => void;
  onSelectRestaurant?: (restaurantId: string) => void;
  onOpenOrderModal?: (post: FoodPost) => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  conversation,
  onBack,
  onSelectPost,
  onSelectRestaurant,
  onOpenOrderModal,
}) => {
  const { user } = useAuth();
  const {
    messages,
    sendMessage,
    markConversationRead,
    blockUser,
    blockedUserIds,
    reportItem,
    posts,
    restaurants,
    orders,
    allUsers,
  } = useData();

  const [text, setText] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSharePicker, setShowSharePicker] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<'spam' | 'harassment' | 'inappropriate_content' | 'fraud_scam' | 'other'>('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const otherParticipant = conversation.participants.find((p) => p.id !== user?.id) || conversation.participants[0];
  const isBlocked = blockedUserIds.has(otherParticipant?.id);

  const conversationMessages: ChatMessage[] = messages[conversation.id] || [];

  useEffect(() => {
    markConversationRead(conversation.id);
  }, [conversation.id, conversationMessages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages.length]);

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isBlocked) return;

    sendMessage(otherParticipant.id, 'text', text.trim());
    setText('');
  };

  const handleSendSharedPost = (post: FoodPost) => {
    sendMessage(otherParticipant.id, 'shared_post', undefined, { post });
    setShowSharePicker(false);
  };

  const handleSendSharedRestaurant = (restaurant: Restaurant) => {
    sendMessage(otherParticipant.id, 'shared_profile', undefined, { restaurant });
    setShowSharePicker(false);
  };

  const handleSendSharedOrder = (order: Order) => {
    sendMessage(otherParticipant.id, 'shared_order', undefined, { order });
    setShowSharePicker(false);
  };

  const handleBlockUserToggle = () => {
    blockUser(otherParticipant.id);
    setShowMoreMenu(false);
  };

  const handleReportSubmit = () => {
    reportItem('user', otherParticipant.id, reportReason, reportDetails);
    setReportSuccess(true);
    setTimeout(() => {
      setReportSuccess(false);
      setShowReportModal(false);
      setShowMoreMenu(false);
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#FAF7F2', position: 'relative' }}>
      {/* 1. CHAT HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--border-light)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
            }}
          >
            <ArrowLeft size={20} />
          </button>

          {/* Profile Avatar & Name */}
          <div
            onClick={() => {
              if (otherParticipant?.role === 'restaurant') {
                const rest = restaurants.find((r) => r.owner_id === otherParticipant.id || r.id === otherParticipant.id);
                if (rest && onSelectRestaurant) onSelectRestaurant(rest.id);
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={otherParticipant?.avatar_url}
                alt={otherParticipant?.name}
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--border-light)' }}
              />
              {otherParticipant?.is_online && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    border: '2px solid #FFFFFF',
                  }}
                />
              )}
            </div>

            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                {otherParticipant?.name}
              </h4>
              <p style={{ fontSize: '11px', color: otherParticipant?.is_online ? '#10B981' : 'var(--text-muted)', margin: 0, fontWeight: 600 }}>
                {otherParticipant?.is_online ? 'Active Now' : otherParticipant?.role === 'restaurant' ? 'Specialty Kitchen' : 'Foodie Member'}
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: 'var(--text-secondary)' }}
          >
            <MoreVertical size={20} />
          </button>

          {/* Dropdown Menu */}
          {showMoreMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                width: '170px',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--border-light)',
                zIndex: 30,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={handleBlockUserToggle}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: isBlocked ? '#10B981' : '#DC2626',
                  cursor: 'pointer',
                }}
              >
                <Ban size={15} />
                <span>{isBlocked ? 'Unblock User' : 'Block User'}</span>
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  borderTop: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
              >
                <ShieldAlert size={15} color="var(--accent-coral)" />
                <span>Report Chat</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. MESSAGES AREA */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Safety Notice Banner */}
        <div
          style={{
            alignSelf: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '8px 14px',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
            textAlign: 'center',
            maxWidth: '85%',
            marginBottom: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--accent-coral)', fontSize: '11px', fontWeight: 800 }}>
            <Sparkles size={12} />
            <span>Crave Drop Social Connect</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            Messages are end-to-end secured. Share food drops, restaurant profiles & recommendations.
          </p>
        </div>

        {conversationMessages.length === 0 ? (
          <div style={{ textAlign: 'center', margin: 'auto', padding: '20px' }}>
            <img src={otherParticipant?.avatar_url} alt="User" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 10px' }} />
            <h4 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>{otherParticipant?.name}</h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Say hello and start sharing your favorite food drops! 👋🍕
            </p>
          </div>
        ) : (
          conversationMessages.map((msg) => {
            const isMe = msg.sender_id === user?.id;

            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Message Bubble Container */}
                <div
                  style={{
                    backgroundColor: isMe ? 'var(--accent-coral)' : '#FFFFFF',
                    color: isMe ? '#FFFFFF' : 'var(--text-primary)',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: msg.message_type === 'text' ? '9px 13px' : '6px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                    border: isMe ? 'none' : '1px solid var(--border-light)',
                  }}
                >
                  {/* TYPE: TEXT */}
                  {msg.message_type === 'text' && (
                    <p style={{ fontSize: '13px', margin: 0, lineHeight: 1.4, wordBreak: 'break-word' }}>
                      {msg.text}
                    </p>
                  )}

                  {/* TYPE: SHARED FOOD POST */}
                  {msg.message_type === 'shared_post' && msg.shared_data?.post && (
                    <div style={{ width: '230px', backgroundColor: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                      <div style={{ position: 'relative', width: '100%', height: '120px' }}>
                        <img
                          src={msg.shared_data.post.thumbnail_url || msg.shared_data.post.media_url}
                          alt="food"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{ position: 'absolute', top: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: '#FFF', padding: '2px 7px', borderRadius: '10px', fontSize: '9.5px', fontWeight: 800 }}>
                          FOOD DROP
                        </div>
                      </div>
                      <div style={{ padding: '8px 10px', color: 'var(--text-primary)' }}>
                        <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', margin: 0, fontWeight: 700 }}>
                          {msg.shared_data.post.restaurant_name}
                        </p>
                        <h5 style={{ fontSize: '13px', fontWeight: 800, margin: '2px 0 4px', lineHeight: 1.2 }}>
                          {msg.shared_data.post.product_name}
                        </h5>
                        <p style={{ fontSize: '12.5px', fontWeight: 900, color: 'var(--accent-coral)', margin: '0 0 6px' }}>
                          Rs. {msg.shared_data.post.product_price % 1 === 0 ? Math.round(msg.shared_data.post.product_price) : msg.shared_data.post.product_price.toFixed(2)}
                        </p>

                        {isPostExpired(msg.shared_data.post.expires_at) || msg.shared_data.post.is_expired ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#FEF2F2', color: '#DC2626', padding: '4px 8px', borderRadius: '8px', fontSize: '10.5px', fontWeight: 800 }}>
                            <AlertCircle size={12} />
                            <span>This food drop has expired</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (msg.shared_data?.post && onOpenOrderModal) {
                                onOpenOrderModal(msg.shared_data.post);
                              }
                            }}
                            className="btn-primary"
                            style={{ width: '100%', padding: '6px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <ShoppingBag size={12} />
                            <span>VIEW FOOD & ORDER</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TYPE: SHARED RESTAURANT PROFILE */}
                  {msg.message_type === 'shared_profile' && msg.shared_data?.restaurant && (
                    <div style={{ width: '220px', backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '10px', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <img src={msg.shared_data.restaurant.logo_url} alt="rest" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                          <h5 style={{ fontSize: '13px', fontWeight: 800, margin: 0 }}>{msg.shared_data.restaurant.name}</h5>
                          <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', margin: 0 }}>{msg.shared_data.restaurant.category} · {msg.shared_data.restaurant.city}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (msg.shared_data?.restaurant && onSelectRestaurant) {
                            onSelectRestaurant(msg.shared_data.restaurant.id);
                          }
                        }}
                        style={{ width: '100%', padding: '5px', borderRadius: '8px', border: '1px solid var(--accent-coral)', backgroundColor: 'var(--accent-coral-light)', color: 'var(--accent-coral)', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        Visit Kitchen Profile →
                      </button>
                    </div>
                  )}

                  {/* TYPE: SHARED ORDER */}
                  {msg.message_type === 'shared_order' && msg.shared_data?.order && (
                    <div style={{ width: '220px', backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '10px', border: '1px solid var(--border-light)', color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-coral)' }}>Order #{msg.shared_data.order.id}</span>
                        <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#ECFDF5', color: '#059669', padding: '1px 5px', borderRadius: '4px' }}>
                          {msg.shared_data.order.status.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', fontWeight: 800, margin: '2px 0' }}>{msg.shared_data.order.restaurant_name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0 0 6px' }}>
                        Total: Rs. {msg.shared_data.order.total} ({msg.shared_data.order.items.length} items)
                      </p>
                    </div>
                  )}
                </div>

                {/* Timestamp & Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px', padding: '0 4px' }}>
                  <span style={{ fontSize: '9.5px', color: 'var(--text-muted)' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isMe && <CheckCheck size={11} color="var(--accent-coral)" />}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. CHAT COMPOSER BAR */}
      {isBlocked ? (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', borderTop: '1px solid #FCA5A5', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#DC2626', fontWeight: 700, margin: 0 }}>
            Messaging is disabled because this user is blocked.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSendText}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 12px max(10px, env(safe-area-inset-bottom))',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid var(--border-light)',
            zIndex: 20,
          }}
        >
          {/* Share Food / Profile Attachment Trigger */}
          <button
            type="button"
            onClick={() => setShowSharePicker(true)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-coral)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title="Share Food Drop or Kitchen"
          >
            <Share2 size={16} />
          </button>

          {/* Text Input */}
          <input
            type="text"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              flex: 1,
              height: '40px',
              borderRadius: '20px',
              backgroundColor: '#FAF7F2',
              border: '1px solid var(--border-light)',
              padding: '0 14px',
              fontSize: '13px',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!text.trim()}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: text.trim() ? 'var(--accent-coral)' : 'var(--bg-subtle)',
              color: text.trim() ? '#FFFFFF' : 'var(--text-muted)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            <Send size={16} style={{ marginLeft: text.trim() ? '2px' : 0 }} />
          </button>
        </form>
      )}

      {/* 4. SHARE ATTACHMENT MODAL */}
      {showSharePicker && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: '20px 20px 0 0', padding: '16px', maxHeight: '75%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Share Item into Chat</h3>
              <button onClick={() => setShowSharePicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-coral)', marginBottom: '8px' }}>Select Live Food Drop:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {posts.slice(0, 4).map((post) => (
                <div
                  key={post.id}
                  onClick={() => handleSendSharedPost(post)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', backgroundColor: '#FAF7F2', cursor: 'pointer', border: '1px solid var(--border-light)' }}
                >
                  <img src={post.thumbnail_url || post.media_url} alt="p" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '12.5px', fontWeight: 800, margin: 0 }}>{post.product_name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{post.restaurant_name} · Rs. {post.product_price}</p>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-coral)' }}>Send →</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-coral)', marginBottom: '8px' }}>Select Specialty Kitchen:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {restaurants.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleSendSharedRestaurant(r)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', backgroundColor: '#FAF7F2', cursor: 'pointer', border: '1px solid var(--border-light)' }}
                >
                  <img src={r.logo_url} alt="r" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '12.5px', fontWeight: 800, margin: 0 }}>{r.name}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{r.category}</p>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-coral)' }}>Send →</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. REPORT MODAL */}
      {showReportModal && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '20px', width: '100%', maxWidth: '340px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#1E242B', margin: '0 0 6px' }}>Report Conversation</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px' }}>Help us keep Crave Drop safe for all foodies.</p>

            {reportSuccess ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#059669' }}>
                <CheckCheck size={36} style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: '13px', fontWeight: 800 }}>Report Submitted</p>
              </div>
            ) : (
              <>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>Reason:</label>
                <select
                  value={reportReason}
                  onChange={(e: any) => setReportReason(e.target.value)}
                  style={{ width: '100%', height: '40px', borderRadius: '10px', border: '1px solid var(--border-light)', padding: '0 10px', fontSize: '12.5px', marginBottom: '12px' }}
                >
                  <option value="spam">Spam / Unsolicited Messages</option>
                  <option value="harassment">Harassment or Bullying</option>
                  <option value="inappropriate_content">Inappropriate Content</option>
                  <option value="fraud_scam">Fraud / Fake Orders</option>
                  <option value="other">Other Reason</option>
                </select>

                <textarea
                  placeholder="Additional details (optional)..."
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={3}
                  style={{ width: '100%', borderRadius: '10px', border: '1px solid var(--border-light)', padding: '8px 10px', fontSize: '12.5px', marginBottom: '16px', outline: 'none' }}
                />

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowReportModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid var(--border-light)', background: '#FFF', fontWeight: 700, fontSize: '12px' }}>Cancel</button>
                  <button onClick={handleReportSubmit} className="btn-primary" style={{ flex: 1, padding: '10px', borderRadius: '10px', fontWeight: 800, fontSize: '12px' }}>Submit Report</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
