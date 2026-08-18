import axios from "axios";

const baseURL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export default axios.create({
    baseURL: baseURL || undefined
})