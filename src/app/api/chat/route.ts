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

    if (body.stream) {
      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder('utf-8');
          const encoder = new TextEncoder();

          if (!reader) {
            controller.enqueue(encoder.encode(`data: {"error": "No response body from backend"}\n\n`));
            controller.close();
            return;
          }

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                break;
              }
              const chunk = decoder.decode(value, { stream: true });
              controller.enqueue(encoder.encode(chunk));
            }
          } catch (error) {
            console.error("Stream reading error:", error);
            controller.enqueue(encoder.encode(`data: {"error": "Stream interrupted mid-way"}\n\n`));
          } finally {
            controller.close();
          }
        }
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const data = await response.json();
    
    // Fallback if the backend returns an empty response
    if (!data.reply && !data.choices) {
      return NextResponse.json({ reply: "I received an empty response from the neural net, Boss." });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat API Proxy Error:", error);
    return NextResponse.json({ reply: "My connection to the main Groq neural net failed. Please ensure the backend server is running." });
  }
}
