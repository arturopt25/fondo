import ky from "ky";

export const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
});
