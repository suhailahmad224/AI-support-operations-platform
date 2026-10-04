import api from '../config/api';

export const ticketService = {
  getTickets: async (params = {}) => {
    return await api.get('/tickets', { params });
  },

  getTicketStats: async () => {
    return await api.get('/tickets/stats');
  },

  getTicketById: async (id) => {
    return await api.get(`/tickets/${id}`);
  },

  createTicket: async (payload) => {
    return await api.post('/tickets', payload);
  },

  updateTicket: async (id, payload) => {
    return await api.put(`/tickets/${id}`, payload);
  },

  updateTicketStatus: async (id, status) => {
    return await api.patch(`/tickets/${id}/status`, { status });
  },

  assignTicket: async (id, agentId) => {
    return await api.patch(`/tickets/${id}/assign`, { agentId });
  },

  deleteTicket: async (id) => {
    return await api.delete(`/tickets/${id}`);
  },
};
