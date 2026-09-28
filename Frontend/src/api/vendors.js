import client from "./client";

export const vendorsApi = {
  getAll: async () => {
    const res = await client.get("/vendors/");
    return res.data;
  },

  getById: async (id) => {
    const res = await client.get(`/vendors/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await client.post("/vendors/", data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await client.put(`/vendors/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await client.delete(`/vendors/${id}`);
    return res.data;
  },
};

export default vendorsApi;

