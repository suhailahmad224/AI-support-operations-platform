import api from '../config/api';

export const messageService = {
  getMessages: async (ticketId) => {
    return await api.get(`/tickets/${ticketId}/messages`);
  },

  sendMessage: async (ticketId, payload) => {
    return await api.post(`/tickets/${ticketId}/messages`, payload);
  },
};
