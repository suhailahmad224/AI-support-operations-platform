import api from '../config/api';

export const userService = {
  getUsers: async (params = {}) => {
    return await api.get('/users', { params });
  },

  getAgents: async () => {
    return await api.get('/agents');
  },

  getUserById: async (id) => {
    return await api.get(`/users/${id}`);
  },

  createUser: async (payload) => {
    return await api.post('/users', payload);
  },

  updateUser: async (id, payload) => {
    return await api.put(`/users/${id}`, payload);
  },

  toggleUserStatus: async (id) => {
    return await api.patch(`/users/${id}/status`);
  },

  deleteUser: async (id) => {
    return await api.delete(`/users/${id}`);
  },

  updateMyProfile: async (payload) => {
    return await api.put('/users/profile/me', payload);
  },
};
