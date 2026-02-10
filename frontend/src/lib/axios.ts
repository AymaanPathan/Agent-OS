import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: false, // no auth for now
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
