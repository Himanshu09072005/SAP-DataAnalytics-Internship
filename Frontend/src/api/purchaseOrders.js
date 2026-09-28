import client from "./client";

export const purchaseOrdersApi = {
  getAll: async () => {
    const res = await client.get("/purchase-orders/");
    return res.data;
  },

  getById: async (id) => {
    const res = await client.get(`/purchase-orders/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await client.post("/purchase-orders/", data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await client.put(`/purchase-orders/${id}`, data);
    return res.data;
  },

  complete: async (id) => {
    const res = await client.put(`/purchase-orders/${id}/complete`);
    return res.data;
  },

  cancel: async (id) => {
    const res = await client.put(`/purchase-orders/${id}/cancel`);
    return res.data;
  },

  delete: async (id) => {
    const res = await client.delete(`/purchase-orders/${id}`);
    return res.data;
  },
};

export default purchaseOrdersApi;

