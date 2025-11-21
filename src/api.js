import axios from "axios";

const API_BASE = "http://127.0.0.1:8000";

export async function predictDelay(input) {
  const res = await axios.post(`${API_BASE}/predict`, input);
  return res.data;
}

export async function healthCheck() {
  const res = await axios.get(`${API_BASE}/health`);
  return res.data;
}