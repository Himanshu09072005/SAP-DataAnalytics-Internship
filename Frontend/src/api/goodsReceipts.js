import client from "./client";

export const goodsReceiptsApi = {
  getAll: async () => {
    const res = await client.get("/goods-receipts/");
    return res.data;
  },

  getById: async (id) => {
    const res = await client.get(`/goods-receipts/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await client.post("/goods-receipts/", data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await client.put(`/goods-receipts/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await client.delete(`/goods-receipts/${id}`);
    return res.data;
  },
};

export default goodsReceiptsApi;

