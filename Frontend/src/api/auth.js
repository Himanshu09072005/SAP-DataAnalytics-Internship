import client from "./client";

export const authApi = {
  login: async (username, password) => {
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("password", password);

    const response = await client.post("/auth/login", params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data;
  },

  register: async (userData) => {
    const response = await client.post("/auth/register", userData);
    return response.data;
  },

  getMe: async () => {
    const response = await client.get("/auth/me");
    return response.data;
  },
};

export default authApi;

