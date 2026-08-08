import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Trash2, PanelLeftClose, Menu } from 'lucide-react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export function useChatHistory() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('joya_chat_history');
      if (stored) {
        setConversations(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  }, []);

  const saveToLocal = (data: Conversation[]) => {
    setConversations(data);
    try {
      localStorage.setItem('joya_chat_history', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save chat history', e);
    }
  };

  const createNew = useCallback(() => {
    const newChat: Conversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
    };
    saveToLocal([newChat, ...conversations]);
    setActiveId(newChat.id);
    return newChat.id;
  }, [conversations]);

  const deleteConversation = useCallback((id: string) => {
    const updated = conversations.filter(c => c.id !== id);
    saveToLocal(updated);
    if (activeId === id) {
      setActiveId(updated.length > 0 ? updated[0].id : null);
    }
  }, [conversations, activeId]);

  const updateConversation = useCallback((id: string, updates: Partial<Conversation>) => {
    const updated = conversations.map(c => 
      c.id === id ? { ...c, ...updates } : c
    );
    saveToLocal(updated);
  }, [conversations]);

  const getActive = useCallback(() => {
    return conversations.find(c => c.id === activeId) || null;
  }, [conversations, activeId]);

  return {
    conversations,
    activeId,
    setActiveId,
    createNew,
    deleteConversation,
    updateConversation,
    getActive
  };
}

const groupConversations = (conversations: Conversation[]) => {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const groups: Record<string, Conversation[]> = {
    'Today': [],
    'Yesterday': [],
    'Previous 7 Days': [],
    'Older': []
  };

  conversations.forEach(c => {
    const diff = now - c.createdAt;
    if (diff < day) groups['Today'].push(c);
    else if (diff < day * 2) groups['Yesterday'].push(c);
    else if (diff < day * 7) groups['Previous 7 Days'].push(c);
    else groups['Older'].push(c);
  });

  return groups;
};

export interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  activeId: string | null;
  conversations: Conversation[];
  deleteChat?: (id: string) => void;
}

export function ChatSidebar({
  isOpen,
  onClose,
  onSelectChat,
  onNewChat,
  activeId,
  conversations,
  deleteChat
}: ChatSidebarProps) {
  const grouped = useMemo(() => groupConversations(conversations), [conversations]);

  const sidebarVariants = {
    open: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    closed: { x: '-100%', transition: { type: 'spring', stiffness: 300, damping: 30 } },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />

          {/* Sidebar */}
          <motion.div
            variants={sidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-y-0 left-0 z-50 flex w-full flex-col border-r lg:w-[280px] font-mono"
            style={{
              backgroundColor: 'rgba(2, 11, 28, 0.95)',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(136, 192, 255, 0.2)',
              boxShadow: '4px 0 24px rgba(136, 192, 255, 0.05)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 pb-2">
              <button
                onClick={() => {
                  onNewChat();
                  if (window.innerWidth < 1024) onClose();
                }}
                className="flex flex-1 items-center gap-2 rounded-lg border border-[rgba(136,192,255,0.2)] bg-[rgba(136,192,255,0.05)] p-2 text-sm text-[#88c0ff] transition-colors hover:bg-[rgba(136,192,255,0.1)]"
              >
                <Plus className="h-4 w-4" />
                <span>New Chat</span>
              </button>
              <button
                onClick={onClose}
                className="ml-2 flex items-center justify-center rounded-lg p-2 text-[#88c0ff] opacity-70 transition-all hover:bg-[rgba(136,192,255,0.1)] hover:opacity-100 lg:hidden"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 scrollbar-thin scrollbar-thumb-[rgba(136,192,255,0.2)]">
              {Object.entries(grouped).map(([label, groupItems]) => {
                if (groupItems.length === 0) return null;
                return (
                  <div key={label} className="mb-6">
                    <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-[#88c0ff] opacity-50">
                      {label}
                    </h3>
                    <div className="flex flex-col gap-1">
                      {groupItems.map(chat => (
                        <div
                          key={chat.id}
                          className={`group relative flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm transition-colors ${activeId === chat.id ? 'bg-[rgba(136,192,255,0.15)] text-[#88c0ff]' : 'text-[#88c0ff] opacity-80 hover:bg-[rgba(136,192,255,0.1)] hover:opacity-100'}`}
                          onClick={() => {
                            onSelectChat(chat.id);
                            if (window.innerWidth < 1024) onClose();
                          }}
                        >
                          <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
                          <span className="truncate flex-1">{chat.title}</span>
                          
                          {deleteChat && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteChat(chat.id);
                              }}
                              className="invisible opacity-0 group-hover:visible group-hover:opacity-100 p-1 rounded hover:bg-[rgba(136,192,255,0.2)] transition-all text-[#88c0ff]"
                              title="Delete conversation"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export const SidebarToggle = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center justify-center rounded-lg p-2 text-[#88c0ff] transition-colors hover:bg-[rgba(136,192,255,0.1)] font-mono"
  >
    <Menu className="h-5 w-5" />
  </button>
);
