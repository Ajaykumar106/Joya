import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Proxy the request to the real Groq/Render backend so we get real AI responses
    const response = await fetch("https://riya-backend-ujz7.onrender.com/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status ${response.status}`);
    }

    const data = await response.json();
    
    // Fallback if the backend returns an empty response
    if (!data.reply) {
      return NextResponse.json({ reply: "I received an empty response from the neural net, Boss." });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat API Proxy Error:", error);
    return NextResponse.json({ reply: "My connection to the main Groq neural net failed. Please ensure the backend server is running." });
  }
}
