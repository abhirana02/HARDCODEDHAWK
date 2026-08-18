import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export const scanRepository = async (repoPath) => {
  try {
    const endpoint = `${API_BASE_URL || ''}/api/scan`;
    const response = await axios.post(endpoint, { repo_path: repoPath });
    return response.data;
  } catch (error) {
    console.error("Error connecting to backend API:", error);
    throw error;
  }
};