import client from "./client";

export const invoicesApi = {
  getAll: async () => {
    const res = await client.get("/invoices/");
    return res.data;
  },

  getById: async (id) => {
    const res = await client.get(`/invoices/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await client.post("/invoices/", data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await client.put(`/invoices/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await client.delete(`/invoices/${id}`);
    return res.data;
  },
};

export default invoicesApi;

