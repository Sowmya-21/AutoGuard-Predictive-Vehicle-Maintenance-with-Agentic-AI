import { Vehicle } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Helper to check if API key is present (always true for client proxy since server handles fallback)
export const isGeminiConfigured = () => true;

export const generateDiagnosticReport = async (vehicle: Vehicle): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/diagnose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vehicle }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.report || "Unable to generate diagnosis.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating diagnosis from AI.";
  }
};

export const generateManufacturingInsight = async (failureType: string, vehicleModel: string): Promise<{ rca: string, recommendation: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/manufacturing-insight`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ failureType, vehicleModel }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Gemini Error:", error);
    return { rca: "AI Analysis Error", recommendation: "Check logs" };
  }
};

export const generateCustomerMessage = async (vehicle: Vehicle, diagnosis: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/customer-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vehicle, diagnosis }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.message || "Service required.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Service required due to detected anomaly.";
  }
};

export const askMaintenanceCopilot = async (vehicle: Vehicle, question: string, language: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/copilot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vehicle, question, language }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.answer || "I apologize, I could not generate an answer at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error communicating with AI Copilot.";
  }
};