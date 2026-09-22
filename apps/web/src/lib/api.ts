import ky from "ky";

export const UNAUTHORIZED_EVENT = "fondo:unauthorized";

export const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  hooks: {
    afterResponse: [
      (_request, _options, response) => {
        if (response.status === 401) {
          window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
        }
        return response;
      },
    ],
  },
});
