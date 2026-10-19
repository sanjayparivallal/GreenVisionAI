import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { FeedbackTicket } from '../types';
import toast from 'react-hot-toast';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  ShieldAlert,
  Clock,
  User,
  Inbox,
} from 'lucide-react';

// Format timestamp for chat bubbles
const formatTime = (dateStr: string) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
};

// Threaded chat bubble for feedback
const ThreadedTicket: React.FC<{
  ticket: FeedbackTicket;
  isAdmin: boolean;
  replyText: string;
  onReplyChange: (val: string) => void;
  onReplySubmit: () => void;
  isPending: boolean;
}> = ({ ticket, isAdmin, replyText, onReplyChange, onReplySubmit, isPending }) => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
    {/* Ticket header */}
    <div className="flex justify-between items-start p-5 border-b border-slate-800">
      <div>
        <h4 className="text-sm font-bold text-slate-100">{ticket.subject}</h4>
        <p className="text-[10px] text-slate-500 mt-0.5">Ticket #{ticket.id.slice(-8)} · {formatTime(ticket.created_at)}</p>
      </div>
      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase flex items-center gap-1 ${
        ticket.status === 'resolved'
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          : ticket.status === 'in_progress'
          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      }`}>
        {ticket.status === 'resolved'
          ? <><CheckCircle2 className="w-2.5 h-2.5" /> Resolved</>
          : <><Clock className="w-2.5 h-2.5" /> {ticket.status}</>
        }
      </span>
    </div>

    {/* Chat thread */}
    <div className="p-5 space-y-3">
      {/* Resident message — left bubble */}
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-[10px] font-semibold text-emerald-400">Resident</p>
          <div className="bg-slate-800 border border-slate-700/50 rounded-xl rounded-tl-none p-3">
            <p className="text-xs text-slate-200 leading-relaxed">{ticket.message}</p>
          </div>
          <p className="text-[10px] text-slate-500">{formatTime(ticket.created_at)}</p>
        </div>
      </div>

      {/* Admin response — right bubble */}
      {ticket.admin_response && (
        <div className="flex items-start gap-3 flex-row-reverse">
          <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex-1 space-y-1 text-right">
            <p className="text-[10px] font-semibold text-cyan-400">Municipal Admin</p>
            <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-xl rounded-tr-none p-3 text-left">
              <p className="text-xs text-slate-200 leading-relaxed">{ticket.admin_response}</p>
            </div>
            {ticket.updated_at && <p className="text-[10px] text-slate-500">{formatTime(ticket.updated_at)}</p>}
          </div>
        </div>
      )}
    </div>

    {/* Admin reply form */}
    {isAdmin && ticket.status !== 'resolved' && (
      <div className="p-5 pt-0 border-t border-slate-800 space-y-3">
        <label className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
          Reply as Municipal Admin
        </label>
        <textarea
          rows={2}
          placeholder="Type official municipal response..."
          value={replyText}
          onChange={(e) => onReplyChange(e.target.value)}
          className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:border-cyan-500 resize-none"
        />
        <button
          type="button"
          onClick={onReplySubmit}
          disabled={isPending || !replyText.trim()}
          className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" />
          Post Response &amp; Mark Resolved
        </button>
      </div>
    )}
  </div>
);

export const FeedbackPage: React.FC = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [replyText, setReplyText] = useState<{ [id: string]: string }>({});

  // Fetch feedback tickets
  const { data: tickets = [], isLoading } = useQuery<FeedbackTicket[]>({
    queryKey: ['feedback-tickets'],
    queryFn: async () => {
      const res = await apiClient.get('/feedback');
      return res.data;
    },
  });

  // Submit feedback (Resident)
  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/feedback', { subject, message });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Support ticket submitted to municipal team');
      queryClient.invalidateQueries({ queryKey: ['feedback-tickets'] });
      setSubject('');
      setMessage('');
    },
  });

  // Respond to feedback (Admin)
  const respondMutation = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => {
      const res = await apiClient.post(`/feedback/${id}/respond`, {
        admin_response: response,
        status: 'resolved',
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Response posted & ticket resolved');
      queryClient.invalidateQueries({ queryKey: ['feedback-tickets'] });
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-cyan-400" /> Municipal Support &amp; Resident Voice
          </span>
        </div>
        <h1 className="text-2xl font-heading font-extrabold text-white">Feedback &amp; Infrastructure Service Tickets</h1>
        <p className="text-xs text-slate-400">
          Request new bin installations, report damaged containers, or share municipal feedback directly with operators.
        </p>
      </div>

      {/* Resident Submit Form */}
      {role === 'resident' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitMutation.mutate();
          }}
          className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
        >
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-400" /> Submit New Ticket
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-300">Ticket Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Request additional recycling bin on Elm Street"
                className="w-full mt-1 p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">Detailed Request or Issue</label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your request or neighborhood feedback..."
                className="w-full mt-1 p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitMutation.isPending || !subject || !message}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-xs shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            Submit Municipal Ticket
          </button>
        </form>
      )}

      {/* Tickets Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-heading font-extrabold text-white">
            {role === 'admin' ? 'Municipal Feedback Resolution Queue' : 'My Support Tickets'}
          </h3>
          {tickets.length > 0 && (
            <span className="text-xs text-slate-400 font-medium">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-1/2 mb-3" />
                <div className="h-3 bg-slate-700/50 rounded w-full mb-2" />
                <div className="h-3 bg-slate-700/50 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No support tickets yet</p>
            <p className="text-xs text-slate-500 mt-1">
              {role === 'resident'
                ? 'Submit a ticket above to reach the municipal team.'
                : 'All resident tickets will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((t) => (
              <ThreadedTicket
                key={t.id}
                ticket={t}
                isAdmin={role === 'admin'}
                replyText={replyText[t.id] || ''}
                onReplyChange={(val) => setReplyText({ ...replyText, [t.id]: val })}
                onReplySubmit={() => {
                  const reply = replyText[t.id]?.trim();
                  if (!reply) {
                    toast.error('Please type a response before submitting');
                    return;
                  }
                  respondMutation.mutate({ id: t.id, response: reply });
                }}
                isPending={respondMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
