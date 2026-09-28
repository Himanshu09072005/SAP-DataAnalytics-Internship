import client from "./client";

export const dashboardApi = {
  getSummary: async () => {
    const res = await client.get("/dashboard/summary");
    return res.data;
  },

  getPrStatus: async () => {
    const res = await client.get("/dashboard/pr-status");
    return res.data;
  },

  getPoStatus: async () => {
    const res = await client.get("/dashboard/po-status");
    return res.data;
  },

  getInventory: async () => {
    const res = await client.get("/dashboard/inventory");
    return res.data;
  },

  getPaymentStatus: async () => {
    const res = await client.get("/dashboard/payment-status");
    return res.data;
  },

  getUsers: async () => {
    const res = await client.get("/dashboard/users");
    return res.data;
  },

  getVendors: async () => {
    const res = await client.get("/dashboard/vendors");
    return res.data;
  },

  getInvoices: async () => {
    const res = await client.get("/dashboard/invoices");
    return res.data;
  },

  getMonthlyPurchases: async () => {
    const res = await client.get("/dashboard/monthly-purchases");
    return res.data;
  },

  getTopMaterials: async () => {
    const res = await client.get("/dashboard/top-materials");
    return res.data;
  },
};

export default dashboardApi;

