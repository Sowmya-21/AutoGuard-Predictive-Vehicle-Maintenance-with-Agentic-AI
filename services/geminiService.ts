
import { GoogleGenAI, Type } from "@google/genai";
import { Vehicle } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to check if API key is present
export const isGeminiConfigured = () => !!apiKey;

export const generateDiagnosticReport = async (vehicle: Vehicle): Promise<string> => {
  if (!isGeminiConfigured()) return "Gemini API Key not configured. Using simulated diagnosis: Engine overheating detected due to potential coolant leak.";

  try {
    const prompt = `
      Act as an advanced automotive diagnostic AI.
      Analyze the following sensor data for vehicle ${vehicle.model} (ID: ${vehicle.id}, VIN: ${vehicle.vin}):
      - Engine Temp: ${vehicle.sensors.engineTemp}°C (Normal: 90-105)
      - Oil Pressure: ${vehicle.sensors.oilPressure} psi (Normal: 25-65)
      - Vibration: ${vehicle.sensors.vibrationLevel} mm/s (Normal: < 2.0)
      - Brake Wear: ${vehicle.sensors.brakeWear}%
      
      Provide a concise 2-sentence technical diagnosis of the potential failure mode and urgency.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Unable to generate diagnosis.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating diagnosis from AI.";
  }
};

export const generateManufacturingInsight = async (failureType: string, vehicleModel: string): Promise<{ rca: string, recommendation: string }> => {
  if (!isGeminiConfigured()) return { 
    rca: "Simulated RCA: Recurring thermal stress detected in cylinder head gasket.", 
    recommendation: "Update material specification to higher-grade composite." 
  };

  try {
    const prompt = `
      Generate a manufacturing quality insight report for a recurring failure: "${failureType}" in the "${vehicleModel}".
      Return a JSON object with two fields:
      1. "rca": A Root Cause Analysis summary (max 20 words).
      2. "recommendation": A specific manufacturing or design improvement (max 15 words).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rca: { type: Type.STRING },
            recommendation: { type: Type.STRING }
          }
        }
      }
    });

    const json = JSON.parse(response.text || '{}');
    return {
      rca: json.rca || "Analysis failed",
      recommendation: json.recommendation || "No recommendation"
    };

  } catch (error) {
    console.error("Gemini Error:", error);
    return { rca: "AI Analysis Error", recommendation: "Check logs" };
  }
};

export const generateCustomerMessage = async (vehicle: Vehicle, diagnosis: string): Promise<string> => {
  if (!isGeminiConfigured()) return `Hello ${vehicle.owner}, we detected an issue with your ${vehicle.model}. ${diagnosis}`;

  try {
    const prompt = `
      Write a short, persuasive, and empathetic notification message to the vehicle owner ${vehicle.owner}.
      Vehicle: ${vehicle.model}.
      Issue: ${diagnosis}.
      Goal: Convince them to approve an autonomously scheduled service appointment immediately.
      Keep it under 40 words.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Service required.";
  } catch (error) {
    return "Service required due to detected anomaly.";
  }
};

export const askMaintenanceCopilot = async (vehicle: Vehicle, question: string, language: string): Promise<string> => {
  if (!isGeminiConfigured()) {
    // Return intelligent local mock responses based on question keywords
    const q = question.toLowerCase();
    let ans = "";
    if (q.includes("why") || q.includes("alert") || q.includes("problem") || q.includes("issue")) {
      if (vehicle.status === "Healthy") {
        ans = `Your vehicle is currently in excellent condition with a reliability score of ${vehicle.reliabilityScore}%. No active alerts.`;
      } else if (vehicle.sensors.engineTemp > 105) {
        ans = `Your engine temperature is high at ${vehicle.sensors.engineTemp.toFixed(1)}°C (normal: 90-105°C). The master agent has diagnosed a potential thermal stress in the cooling system. Replacement of the cooling pump gasket is advised.`;
      } else if (vehicle.sensors.brakeWear > 80) {
        ans = `Your brake pads have reached ${vehicle.sensors.brakeWear}% wear, which is close to the critical 90% wear limit. Replacement is recommended within the next 450 km.`;
      } else {
        ans = `We detected anomalous readings on vehicle ${vehicle.id}. Engine temp is ${vehicle.sensors.engineTemp.toFixed(1)}°C and vibration is ${vehicle.sensors.vibrationLevel.toFixed(1)} mm/s. A scheduling agent has pre-booked a technician slot.`;
      }
    } else if (q.includes("hill") || q.includes("route") || q.includes("terrain") || q.includes("mountain")) {
      if (vehicle.sensors.brakeWear > 60 || vehicle.sensors.engineTemp > 95) {
        ans = `Entering hilly terrain with ${vehicle.sensors.brakeWear}% brake wear and ${vehicle.sensors.engineTemp.toFixed(1)}°C temperature is high risk. Downhill braking will cause extreme thermal stress and possible brake fade. We recommend servicing immediately.`;
      } else {
        ans = `Your vehicle is fully cleared for hilly terrain. Brakes are at ${vehicle.sensors.brakeWear}% wear and cooling systems are operating normally. Drive safely!`;
      }
    } else if (q.includes("cost") || q.includes("expense") || q.includes("price") || q.includes("budget")) {
      const baseCost = vehicle.status === "Healthy" ? 120 : vehicle.status === "Warning" ? 280 : 850;
      ans = `Based on historical repair data for ${vehicle.model}, we forecast maintenance costs of $${baseCost} in the next 30 days. Probability of component replacement: Brakes (85%), Cooling Loop (60%). Coverage status: 95% likely approved under warranty.`;
    } else if (q.includes("emissions") || q.includes("sustainability") || q.includes("carbon") || q.includes("co2")) {
      ans = `Your current carbon footprint is ${vehicle.carbonEmissions.current} g/km. Resolving the active telemetry issues (vibration and high engine temperature) will reduce emissions by ${vehicle.carbonEmissions.potentialReduction} g/km.`;
    } else if (q.includes("fraud") || q.includes("warranty") || q.includes("claim")) {
      ans = `Our UEBA Analytics has calculated a Warranty Fraud Risk of ${vehicle.fraudRisk.score}%. ${vehicle.fraudRisk.flags.length > 0 ? `Flagged concerns: ${vehicle.fraudRisk.flags.join(', ')}.` : 'No warranty abuse flags detected.'}`;
    } else {
      ans = `Hello! I am your AI Maintenance Copilot. Your ${vehicle.model} (Reliability: ${vehicle.reliabilityScore}%) is running in ${vehicle.drivingHabit} mode. I can answer questions about your health alerts, route risks, emissions, or cost forecasts. How can I help?`;
    }

    if (language !== "English") {
      const translationMocks: { [key: string]: string } = {
        "Hindi": `नमस्ते! मैं आपका AI मेंटेनेंस कोपायलट हूँ। ${ans}`,
        "Telugu": `నమస్కారం! నేను మీ AI మెయింటెనెన్స్ కోపైలట్. ${ans}`,
        "Tamil": `வணக்கம்! நான் உங்கள் AI பராமரிப்பு கோபிலட். ${ans}`,
        "Kannada": `ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ AI ನಿರ್ವಹಣಾ ಕೊಪೈಲಟ್. ${ans}`,
        "Bengali": `নমস্কার! আমি আপনার AI রক্ষণাবেক্ষণ কোপাইলট। ${ans}`
      };
      return translationMocks[language] || ans;
    }
    return ans;
  }

  try {
    const prompt = `
      You are an advanced AI Maintenance Copilot for a connected car system.
      Vehicle Details:
      - Model: ${vehicle.model}
      - Mileage: ${vehicle.mileage} km
      - Status: ${vehicle.status}
      - Sensors: Temp: ${vehicle.sensors.engineTemp}°C, Oil: ${vehicle.sensors.oilPressure} psi, Battery: ${vehicle.sensors.batteryVoltage}V, Vibration: ${vehicle.sensors.vibrationLevel} mm/s, Brake Wear: ${vehicle.sensors.brakeWear}%
      - Route Context: Terrain: ${vehicle.routeContext.terrain}, Weather: ${vehicle.routeContext.weather}, Road Condition: ${vehicle.routeContext.roadCondition}, Risk: ${vehicle.routeContext.riskLevel} (${vehicle.routeContext.riskReason})
      - Reliability Score: ${vehicle.reliabilityScore}%
      - Emissions: Current ${vehicle.carbonEmissions.current} g/km, potential reduction ${vehicle.carbonEmissions.potentialReduction} g/km
      - Fraud Risk: Score ${vehicle.fraudRisk.score}%, Flags: ${vehicle.fraudRisk.flags.join(', ')}
      
      User's Question: "${question}"
      Language requested: ${language}. You MUST translate the complete response into ${language} (with appropriate script) and return only the translation.
      
      Provide a helpful, precise, and conversational answer. Use the vehicle's sensor data and route context to explain the issue. Keep it under 65 words.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "I apologize, I could not generate an answer at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error communicating with AI Copilot.";
  }
};