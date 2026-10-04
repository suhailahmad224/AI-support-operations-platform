import api from '../config/api';

export const aiService = {
  analyzeTicket: async (ticketId) => {
    return await api.post(`/tickets/${ticketId}/ai/analyze`);
  },

  applyAnalysis: async (ticketId, payload) => {
    return await api.post(`/tickets/${ticketId}/ai/apply`, payload);
  },

  suggestReply: async (ticketId) => {
    return await api.post(`/tickets/${ticketId}/ai/suggest-reply`);
  },
};
