import React, { useState } from 'react';
import { BottomSheet } from '../common/BottomSheet';
import { Button } from '../common/Button';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Send, Trash2, Flag } from 'lucide-react';
import { ReportModal } from '../common/ReportModal';

interface CommentsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postTitle?: string;
}

export const CommentsBottomSheet: React.FC<CommentsBottomSheetProps> = ({
  isOpen,
  onClose,
  postId,
  postTitle = 'this food drop',
}) => {
  const { comments, addComment, deleteComment } = useData();
  const { user } = useAuth();

  const [newCommentText, setNewCommentText] = useState('');
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);

  const postComments = comments[postId] || [];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    addComment(postId, newCommentText);
    setNewCommentText('');
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title="Comments"
        subtitle={`${postComments.length} thoughts on ${postTitle}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '320px' }}>
          {/* Comments list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
            {postComments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '35px 20px', color: 'var(--text-secondary)' }}>
                <p style={{ fontSize: '14px', fontWeight: 600 }}>No comments yet</p>
                <p style={{ fontSize: '12.5px', marginTop: '4px' }}>Be the first to ask the chef about this drop!</p>
              </div>
            ) : (
              postComments.map((comment) => {
                const isOwn = comment.user_id === user?.id;
                return (
                  <div
                    key={comment.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-subtle)',
                    }}
                  >
                    <img
                      src={comment.user_avatar}
                      alt={comment.user_name}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {comment.user_name}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>
                        {comment.content}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isOwn ? (
                        <button
                          onClick={() => deleteComment(comment.id, postId)}
                          title="Delete Comment"
                          style={{
                            padding: '4px',
                            color: 'var(--text-muted)',
                            display: 'flex',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setReportTargetId(comment.id)}
                          title="Report Comment"
                          style={{
                            padding: '4px',
                            color: 'var(--text-muted)',
                            display: 'flex',
                          }}
                        >
                          <Flag size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Comment input form */}
          <form
            onSubmit={handleSend}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '12px',
              backgroundColor: 'white',
              position: 'sticky',
              bottom: 0,
            }}
          >
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Ask about this drop or leave love..."
              className="input-control"
              style={{ padding: '10px 14px', fontSize: '13.5px' }}
            />
            <Button type="submit" variant="primary" size="sm" disabled={!newCommentText.trim()}>
              <Send size={15} />
            </Button>
          </form>
        </div>
      </BottomSheet>

      {/* Moderation report dialog */}
      {reportTargetId && (
        <ReportModal
          isOpen={!!reportTargetId}
          onClose={() => setReportTargetId(null)}
          reportedType="comment"
          reportedId={reportTargetId}
        />
      )}
    </>
  );
};
