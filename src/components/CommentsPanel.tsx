"use client";

import React, { useState, useEffect } from "react";
import { FormComment } from "../types/form";
import { getComments, addComment, updateCommentStatus, deleteComment } from "../lib/api";
import { X, Send, CheckCircle2, MessageSquare, Trash2, Loader2 } from "lucide-react";

interface CommentsPanelProps {
  formId: string;
  elementId: string;
  elementTitle: string;
  isEditorMode: boolean;
  onClose: () => void;
}

export default function CommentsPanel({ formId, elementId, elementTitle, isEditorMode, onClose }: CommentsPanelProps) {
  const [comments, setComments] = useState<FormComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [elementId]);

  const loadComments = async () => {
    setIsLoading(true);
    const data = await getComments(formId);
    // Filter only for this element
    setComments(data.filter((c: FormComment) => c.element_id === elementId));
    setIsLoading(false);
  };

  const handleSend = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    const added = await addComment(formId, elementId, newComment.trim());
    if (added) {
      setComments(prev => [...prev, added]);
      setNewComment("");
    }
    setIsSubmitting(false);
  };

  const handleResolve = async (commentId: string) => {
    const updated = await updateCommentStatus(commentId, 'resolved');
    if (updated) {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, status: 'resolved' } : c));
    }
  };

  const handleDelete = async (commentId: string) => {
    const success = await deleteComment(commentId);
    if (success) {
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l border-slate-200 z-50 flex flex-col transform transition-transform duration-300">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <h3 className="font-semibold text-slate-800 flex items-center">
          <MessageSquare size={18} className="mr-2 text-indigo-600" />
          Comentários
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100">
        <p className="text-xs text-indigo-800 font-medium line-clamp-2">
          Referente a: {elementTitle}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-indigo-600" size={24} />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Nenhum comentário ainda.<br/>Seja o primeiro!
          </div>
        ) : (
          comments.map(c => (
            <div key={c.id} className={`p-3 rounded-xl border ${c.status === 'resolved' ? 'bg-green-50 border-green-200 opacity-75' : 'bg-white border-slate-200 shadow-sm'}`}>
              <p className={`text-sm ${c.status === 'resolved' ? 'text-slate-500' : 'text-slate-800'} whitespace-pre-wrap`}>
                {c.text}
              </p>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                <span>{new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <div className="flex space-x-2">
                  {c.status === 'open' && isEditorMode && (
                    <button onClick={() => handleResolve(c.id)} className="text-green-600 hover:text-green-700 font-medium flex items-center" title="Marcar como Resolvido">
                      <CheckCircle2 size={14} className="mr-1" /> Resolvido
                    </button>
                  )}
                  {c.status === 'resolved' && (
                    <span className="text-green-600 font-medium flex items-center">
                      <CheckCircle2 size={14} className="mr-1" /> Resolvido
                    </span>
                  )}
                  {isEditorMode && (
                    <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600" title="Excluir Comentário">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Adicione um comentário..."
            className="w-full border border-slate-300 rounded-lg pr-12 pl-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!newComment.trim() || isSubmitting}
            className="absolute bottom-2 right-2 p-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
