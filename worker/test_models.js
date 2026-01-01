const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Load key from .env or paste it here directly for testing
const API_KEY = process.env.GEMINI_API_KEY; 

if (!API_KEY) {
    console.error("❌ Error: GEMINI_API_KEY is missing in your .env file.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function testModels() {
    console.log("🔍 Testing your API Key against available models...\n");

    // These are the most common model names for free/student accounts
    const candidates = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-pro",
        "gemini-1.0-pro",
        "gemini-2.5-flash",
        "gemini-2.5-flash-latest",
        "gemini-2.0-pro",
        "gemini-2.0-flash",
    ];

    let workingModel = null;

    for (const modelName of candidates) {
        process.stdout.write(`Testing "${modelName}"... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say hello");
            const response = await result.response;
            
            console.log("✅ WORKING!");
            workingModel = modelName;
            break; // Stop after finding the first working one
        } catch (error) {
            if (error.message.includes("404")) {
                console.log("❌ Not Found (404)");
            } else if (error.message.includes("API key not valid")) {
                console.log("❌ Invalid API Key");
                break; // Stop immediately if key is wrong
            } else {
                console.log(`❌ Error: ${error.message.split('[')[0]}`); // Print short error
            }
        }
    }

    console.log("\n---------------------------------------------------");
    if (workingModel) {
        console.log(`🎉 SUCCESS! Update your processor.js line 13 to:`);
        console.log(`const model = genAI.getGenerativeModel({ model: "${workingModel}" });`);
    } else {
        console.log("⚠️ ALL FAILED. Please generate a new API Key in Google AI Studio.");
    }
    console.log("---------------------------------------------------");
}

testModels();