import client from "./client";

export const paymentsApi = {
  getAll: async () => {
    const res = await client.get("/payments/");
    return res.data;
  },

  getById: async (id) => {
    const res = await client.get(`/payments/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await client.post("/payments/", data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await client.put(`/payments/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await client.delete(`/payments/${id}`);
    return res.data;
  },
};

export default paymentsApi;

