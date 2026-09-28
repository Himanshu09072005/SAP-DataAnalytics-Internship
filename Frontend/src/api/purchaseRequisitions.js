import client from "./client";

export const purchaseRequisitionsApi = {
  getAll: async () => {
    const res = await client.get("/purchase-requisitions/");
    return res.data;
  },

  getById: async (id) => {
    const res = await client.get(`/purchase-requisitions/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await client.post("/purchase-requisitions/", data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await client.put(`/purchase-requisitions/${id}`, data);
    return res.data;
  },

  approve: async (id) => {
    const res = await client.put(`/purchase-requisitions/${id}/approve`);
    return res.data;
  },

  reject: async (id) => {
    const res = await client.put(`/purchase-requisitions/${id}/reject`);
    return res.data;
  },

  delete: async (id) => {
    const res = await client.delete(`/purchase-requisitions/${id}`);
    return res.data;
  },
};

export default purchaseRequisitionsApi;

