import api from '../config/api';

export const analyticsService = {
  /**
   * Get main admin analytics overview metrics
   */
  getDashboardAnalytics: async (params = {}) => {
    return await api.get('/analytics/dashboard', { params });
  },

  /**
   * Get agent workload and assignment breakdown
   */
  getAgentWorkload: async (params = {}) => {
    return await api.get('/analytics/agents', { params });
  },

  /**
   * Get customer satisfaction (CSAT) reviews and distribution
   */
  getCsatAnalytics: async (params = {}) => {
    return await api.get('/analytics/csat', { params });
  },

  /**
   * Submit customer feedback for a resolved/closed ticket
   */
  submitFeedback: async (ticketId, { rating, comment, allowUpdate = false }) => {
    return await api.post(`/tickets/${ticketId}/feedback`, {
      rating,
      comment,
      allowUpdate,
    });
  },

  /**
   * Get existing feedback for a ticket
   */
  getTicketFeedback: async (ticketId) => {
    return await api.get(`/tickets/${ticketId}/feedback`);
  },
};
