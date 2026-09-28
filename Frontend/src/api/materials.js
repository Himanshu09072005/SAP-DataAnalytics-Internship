import client from "./client";

export const materialsApi = {
  getAll: async () => {
    const res = await client.get("/materials/");
    return res.data;
  },

  getById: async (id) => {
    const res = await client.get(`/materials/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await client.post("/materials/", data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await client.put(`/materials/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await client.delete(`/materials/${id}`);
    return res.data;
  },
};

export default materialsApi;

