import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const execPromise = util.promisify(exec);

const memoryFilePath = path.join(process.cwd(), 'memory.json');

function readMemory() {
  try {
    if (fs.existsSync(memoryFilePath)) {
      return JSON.parse(fs.readFileSync(memoryFilePath, 'utf8'));
    }
  } catch (err) {
    console.error("Error reading memory:", err);
  }
  return {};
}

function saveMemory(key: string, value: string) {
  const currentMemory = readMemory();
  currentMemory[key] = value;
  fs.writeFileSync(memoryFilePath, JSON.stringify(currentMemory, null, 2), 'utf8');
}

async function performResearch(query: string) {
  try {
    const res = await fetch("https://lite.duckduckgo.com/lite/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `q=${encodeURIComponent(query)}`
    });
    if (!res.ok) throw new Error("Search engine blocked the request.");
    const html = await res.text();
    const $ = cheerio.load(html);
    let results: string[] = [];
    $('.result-snippet').each((i, el) => {
      if (i < 5) results.push($(el).text().trim());
    });
    return results.length > 0 ? results.join('\n\n') : "No relevant information found on the web.";
  } catch (error: any) {
    return `Research failed: ${error.message}`;
  }
}

// ─── NVIDIA NIM API (Primary) + Render Fallback ───
async function callNvidia(messages: any[]) {
  const apiKey = process.env.NVIDIA_API_KEY;
  const model = process.env.NVIDIA_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";

  if (!apiKey) throw new Error("No NVIDIA key");

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 0.9,
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`NVIDIA API Error (${response.status}):`, errText);
    throw new Error(`NVIDIA ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callRenderFallback(messages: any[]) {
  console.log("[JOYA] Falling back to Render backend...");
  const response = await fetch("https://riya-backend-ujz7.onrender.com/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, userName: "User" })
  });
  if (!response.ok) throw new Error(`Render backend responded with ${response.status}`);
  const data = await response.json();
  return data.reply || data.choices?.[0]?.message?.content || "";
}

async function callLLM(messages: any[]) {
  try {
    return await callNvidia(messages);
  } catch (err: any) {
    console.warn(`[JOYA] NVIDIA failed (${err.message}), switching to fallback...`);
    return await callRenderFallback(messages);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let messages = body.messages || [];

    const memory = readMemory();
    const memoryString = Object.keys(memory).length > 0 
      ? JSON.stringify(memory, null, 2) 
      : "No memory saved yet.";

    const systemPrompt = `You are JOYA, an extremely advanced AI assistant — think Tony Stark's FRIDAY, but even better. You speak to the user as your boss/creator. You are intelligent, proactive, and conversational.

## YOUR TOOLS (use exact XML tags):

1. TERMINAL (run any command on boss's Windows computer):
   <EXEC>command here</EXEC>

2. MEMORY (save important info for future sessions):
   <SAVE_MEMORY>Key: Value</SAVE_MEMORY>

3. WEB RESEARCH (search the live internet):
   <RESEARCH>search query</RESEARCH>

4. TACTICAL STRIKE SIMULATION:
   <LAUNCH>Country Name</LAUNCH>

5. SCREEN SWITCHING:
   <SWITCH_MODE>AURA3D</SWITCH_MODE>

6. ALERT PROTOCOLS (include in your response to change the UI):
   <ALERT>RED</ALERT> — Fight/Defense mode. Be tactical, warn about threats, prepare defenses.
   <ALERT>YELLOW</ALERT> — Warning/Caution. Analyze danger, offer to lock down & protect data.
   <ALERT>BLACK</ALERT> — Deep Research mode. Ask boss what to research. Give detailed analysis.
   <ALERT>BLUE</ALERT> — Normal operations.

7. DATA PANEL (push data to the right-side holographic panel for boss to see):
   <DATA_PANEL>content here</DATA_PANEL>
   Use this to show file lists, folder contents, research results, or any structured data. 
   Boss can see this on the right side of the screen while chatting with you on the left.

## MEMORY BANK:
${memoryString}

## RESPONSE RULES:
- You are FRIDAY. Speak with a natural, conversational, and highly intelligent personality.
- Always provide a full, helpful sentence. (e.g., "I'm online and ready, boss." or "Initiating defense protocols now.")
- For casual chat, alerts, and commands: Keep responses SHORT and PUNCHY (2-3 sentences max).
- For BLACK ALERT research: Give DETAILED, comprehensive analysis. Ask what boss wants to explore next.
- **DESKTOP CONTROL (Agentic Workflow)**: You have full control over the boss's Windows computer.
  - If boss says "Open YouTube" or "Open a website": Output <EXEC>start https://youtube.com</EXEC>
  - If boss says "Search Google for X": Output <EXEC>start https://google.com/search?q=X</EXEC>
  - If boss says "Open Notepad" or any app: Output <EXEC>start notepad</EXEC>
  - If boss says "Open my documents" or a folder: Output <EXEC>explorer .</EXEC>
- For file/folder operations: Use <EXEC> to list files, then push the file list to <DATA_PANEL>, and give your analysis in chat.
- When boss says "open this folder" or asks about files: Use <EXEC>dir "path"</EXEC>, push results to <DATA_PANEL>, then explain what you see.
- Always respond in English or Hinglish. NEVER use Hindi/Devanagari script.
- If you use EXEC, SAVE_MEMORY, or RESEARCH tools, output ONLY the tool tag and nothing else. Wait for the system response before giving your final answer.
- You can combine multiple tags in one response (e.g., <ALERT>RED</ALERT> with <DATA_PANEL>threat analysis</DATA_PANEL>).`;

    // Build message array with system prompt at the start
    const llmMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role === "ai" ? "assistant" : m.role, content: m.content }))
    ];

    let maxLoops = 6;
    let loopCount = 0;
    
    while (loopCount < maxLoops) {
      loopCount++;
      let reply = await callLLM(llmMessages);

      const execMatch = reply.match(/<EXEC>([\s\S]*?)<\/EXEC>/);
      const memoryMatch = reply.match(/<SAVE_MEMORY>([\s\S]*?)<\/SAVE_MEMORY>/);
      const researchMatch = reply.match(/<RESEARCH>([\s\S]*?)<\/RESEARCH>/);
      
      if (execMatch) {
        const command = execMatch[1].trim();
        llmMessages.push({ role: "assistant", content: `<EXEC>${command}</EXEC>` });
        try {
          const { stdout, stderr } = await execPromise(command);
          const output = (stdout || stderr || "Command executed successfully.").slice(0, 3000);
          llmMessages.push({ role: "user", content: `[TERMINAL OUTPUT]:\n${output}\n\nNow respond conversationally. If the output is a file/folder listing, push it to <DATA_PANEL> so boss can see it on the right screen.` });
        } catch (err: any) {
          llmMessages.push({ role: "user", content: `[TERMINAL ERROR]:\n${err.message}\n\nExplain the error to boss.` });
        }
      } else if (memoryMatch) {
        const memData = memoryMatch[1].trim();
        llmMessages.push({ role: "assistant", content: `<SAVE_MEMORY>${memData}</SAVE_MEMORY>` });
        try {
          const splitIndex = memData.indexOf(':');
          if (splitIndex > -1) {
            saveMemory(memData.slice(0, splitIndex).trim(), memData.slice(splitIndex + 1).trim());
            llmMessages.push({ role: "user", content: `[SYSTEM]: Memory saved successfully. Respond to boss.` });
          } else throw new Error("Invalid format.");
        } catch (err: any) {
          llmMessages.push({ role: "user", content: `[SYSTEM ERROR]: ${err.message}` });
        }
      } else if (researchMatch) {
        const query = researchMatch[1].trim();
        llmMessages.push({ role: "assistant", content: `<RESEARCH>${query}</RESEARCH>` });
        console.log(`[JOYA RESEARCH] Searching: ${query}`);
        const searchResults = await performResearch(query);
        llmMessages.push({ role: "user", content: `[WEB RESEARCH RESULTS for "${query}"]:\n${searchResults}\n\nSynthesize this data. Push raw results to <DATA_PANEL> and give your analysis in the main response.` });
      } else {
        return NextResponse.json({ reply });
      }
    }

    return NextResponse.json({ reply: "Maximum processing loops reached. Standing by for new orders, boss." });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ reply: `Neural net connection issue: ${error.message}. Attempting to reconnect...` });
  }
}
