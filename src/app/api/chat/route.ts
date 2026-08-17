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
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return "ERROR: No TAVILY_API_KEY found in .env.local. Tell the boss to add their Tavily key to activate Deep OSINT.";
    }

    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "advanced",
        include_images: true,
        include_answer: true,
        max_results: 5
      })
    });

    if (!res.ok) throw new Error(`Tavily API responded with ${res.status}`);
    const data = await res.json();
    
    let output = `[TAVILY AI ANSWER]:\n${data.answer || 'No direct answer available.'}\n\n`;
    
    if (data.images && data.images.length > 0) {
      output += `[IMAGES FOUND]:\n${data.images.slice(0, 5).join('\n')}\n\n`;
    }

    output += `[SEARCH RESULTS]:\n`;
    data.results?.forEach((r: any) => {
      output += `TITLE: ${r.title}\nURL: ${r.url}\nSNIPPET: ${r.content}\n\n`;
    });

    return output;
  } catch (error: any) {
    return `Research failed: ${error.message}`;
  }
}

async function performBrowse(url: string) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    let images: string[] = [];
    $('img').each((i, el) => {
      let src = $(el).attr('src');
      let alt = $(el).attr('alt');
      if (src && !src.startsWith('http')) {
        // Handle relative URLs
        try { src = new URL(src, url).href; } catch(e) {}
      }
      if (src && alt && alt.length > 2 && src.startsWith('http')) {
        images.push(`![${alt.replace(/\n/g, ' ')}](${src})`);
      }
    });

    $('script, style, nav, footer, header, noscript, svg').remove();
    let text = $('body').text().replace(/\s+/g, ' ').trim();
    
    let result = text.substring(0, 5000);
    if (images.length > 0) {
      result += "\n\n[PAGE IMAGES FOUND (Use these exactly as written in your response if in BLACK ALERT)]:\n" + images.slice(0, 10).join('\n');
    }
    return result;
  } catch (error: any) {
    return `Failed to browse ${url}: ${error.message}`;
  }
}

// ─── GROQ API (Primary) ───
async function callGroq(messages: any[], tools?: any[]) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "llama-3.1-70b-versatile";

  if (!apiKey) throw new Error("No GROQ_API_KEY found in environment variables.");

  const body: any = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    top_p: 0.9,
  };
  
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Groq API Error (${response.status}):`, errText);
    throw new Error(`Groq ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message || { content: "" };
}

// ─── NVIDIA API (Backup) ───
async function callNvidiaFallback(messages: any[], tools?: any[]) {
  const apiKey = process.env.NVIDIA_API_KEY;
  const model = process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct";
  if (!apiKey) throw new Error("No NVIDIA_API_KEY found.");

  const body: any = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 1024,
    top_p: 0.9,
  };
  
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`NVIDIA API Error (${response.status}):`, errText);
    throw new Error(`NVIDIA ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message || { content: "" };
}

async function callLLM(messages: any[], tools?: any[]) {
  try {
    return await callGroq(messages, tools);
  } catch (err: any) {
    console.warn(`[JOYA] Groq failed (${err.message}), switching to NVIDIA backup...`);
    return await callNvidiaFallback(messages, tools);
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
   CRITICAL RULE: When you search, you will receive a list of links. YOU MUST IMMEDIATELY USE THE <BROWSE> TOOL to read the best link. DO NOT just give the boss a list of links. Give them the actual output/answer.

4. BROWSE WEBSITE (read full text of a webpage):
   <BROWSE>url here</BROWSE>

5. TACTICAL STRIKE SIMULATION:
   <LAUNCH>Country Name</LAUNCH>

6. SCREEN SWITCHING:
   <SWITCH_MODE>AURA3D</SWITCH_MODE>

7. ALERT PROTOCOLS (include in your response to change the UI):
   <ALERT>RED</ALERT> — Fight/Defense mode. Be tactical, warn about threats, prepare defenses.
   <ALERT>YELLOW</ALERT> — Warning/Caution. Analyze danger, offer to lock down & protect data.
   <ALERT>BLACK</ALERT> — Deep Research mode. Ask boss what to research. Give detailed analysis.
   <ALERT>BLUE</ALERT> — Normal operations.

7. DATA DISPLAY:
   <DATA_PANEL>text to display on right side</DATA_PANEL>

8. OPEN VISUAL BROWSER (Visually opens a website for the boss to see):
   <OPEN_BROWSER>https://en.wikipedia.org/wiki/Kakashi_Hatake</OPEN_BROWSER>
   Use this when you want to literally pop open a website on the boss's screen!

9. SATELLITE MAP:
   <MAP>Paris, France</MAP>
   Use this to open a holographic satellite map of any location for the boss.

10. READ FILE (read source code or text files):
    <READ_FILE>path/to/file</READ_FILE>
    Use this to autonomously scan and analyze files.

11. WRITE FILE (write or overwrite a file):
    <WRITE_FILE path="path/to/file">code here</WRITE_FILE>
    Use this to write fixes or countermeasures.

## CURRENT ALERT STATE (STRICT INSTRUCTIONS):
${memoryString}

## RESPONSE RULES:
- You are FRIDAY. Speak with a natural, conversational, and highly intelligent personality.
- Always provide a full, helpful sentence. (e.g., "I'm online and ready, boss." or "Initiating defense protocols now.")
- For casual chat, alerts, and commands: Keep responses SHORT and PUNCHY (2-3 sentences max).
- For BLACK ALERT research: Give DETAILED, comprehensive analysis. Ask what boss wants to explore next.
- **DESKTOP CONTROL (Agentic Workflow)**: You have full control over the boss's Windows computer.
  - YOU MUST NEVER say "Task complete" or "I have opened it" UNLESS you actually use the <EXEC> tool in your response.
  - If boss says "play [song] on YouTube", you MUST output: <OPEN_BROWSER>https://www.youtube.com/embed?listType=search&list=[song]</OPEN_BROWSER>
  - If boss says "stop" or "stop Spotify", you MUST output: <EXEC>Stop-Process -Name Spotify -ErrorAction SilentlyContinue</EXEC>
  - If boss says "open my instagram reels", you MUST output: <EXEC>start "https://www.instagram.com/reels/"</EXEC>
  - If boss says "Open YouTube", you MUST output: <OPEN_BROWSER>https://www.youtube.com/embed?listType=search&list=music</OPEN_BROWSER>
  - If boss says "Search Google for X", you MUST output: <EXEC>start "https://google.com/search?q=X"</EXEC>
  - If boss says "Open Notepad" or any app, you MUST output: <EXEC>start notepad</EXEC>
- For file/folder operations: Use <EXEC> to list files, then push the file list to <DATA_PANEL>, and give your analysis in chat.
- **IMAGE RENDERING (CRITICAL)**: If your research returns [IMAGES FOUND], you MUST render at least one of those images in your chat response using markdown syntax (e.g. \`![Image Description](URL)\`). 
- **PERMISSION PROTOCOL (CRITICAL)**: You must NEVER execute system-altering terminal commands (like deleting files) or write to files without asking for permission. However, for safe commands like reading, you may proceed autonomously.
- Always respond in English or Hinglish. NEVER use Hindi/Devanagari script.
- **AGENTIC TOOLS**: You have access to backend functions (JSON tool calling) to execute commands, read files, and search the web. Use them! You can call multiple tools simultaneously.
- **FRONTEND UI WIDGETS**: To display data on the screen, embed XML tags in your final text response:
  - <DATA_PANEL>raw file data or terminal output</DATA_PANEL>
  - <OPEN_BROWSER>url</OPEN_BROWSER>
  - <MAP>location</MAP>
- You can combine multiple tags in one response (e.g., <ALERT>RED</ALERT> with <DATA_PANEL>threat analysis</DATA_PANEL>).`;

    // Build message array with system prompt at the start
    const llmMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role === "ai" ? "assistant" : m.role, content: m.content }))
    ];

    const tools = [
      { type: "function", function: { name: "execute_terminal", description: "Execute a terminal command on the host.", parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } } },
      { type: "function", function: { name: "save_memory", description: "Save key-value memory.", parameters: { type: "object", properties: { key: { type: "string" }, value: { type: "string" } }, required: ["key", "value"] } } },
      { type: "function", function: { name: "perform_research", description: "Deep OSINT web research.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
      { type: "function", function: { name: "browse_website", description: "Read a specific URL.", parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } } },
      { type: "function", function: { name: "read_file", description: "Read a local file.", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } } },
      { type: "function", function: { name: "write_file", description: "Write a local file.", parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] } } }
    ];

    let maxLoops = 15;
    let loopCount = 0;
    
    while (loopCount < maxLoops) {
      loopCount++;
      let responseMessage = await callLLM(llmMessages, tools);
      console.log(`[LOOP ${loopCount} RAW LLM]:`, responseMessage);

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        llmMessages.push(responseMessage);
        
        const toolPromises = responseMessage.tool_calls.map(async (toolCall: any) => {
          const args = JSON.parse(toolCall.function.arguments);
          let toolResult = "";
          try {
            if (toolCall.function.name === "execute_terminal") {
              const { stdout, stderr } = await execPromise(args.command);
              toolResult = (stdout || stderr || "Command executed successfully.").slice(0, 3000);
            } else if (toolCall.function.name === "save_memory") {
              saveMemory(args.key, args.value);
              toolResult = "Memory saved.";
            } else if (toolCall.function.name === "perform_research") {
              toolResult = await performResearch(args.query);
            } else if (toolCall.function.name === "browse_website") {
              toolResult = await performBrowse(args.url);
            } else if (toolCall.function.name === "read_file") {
              toolResult = require('fs').readFileSync(args.path, 'utf8').slice(0, 5000);
            } else if (toolCall.function.name === "write_file") {
              require('fs').writeFileSync(args.path, args.content, 'utf8');
              toolResult = "File written successfully.";
            }
          } catch (err: any) {
            toolResult = `ERROR: ${err.message}`;
          }
          
          return {
            role: "tool",
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: toolResult
          };
        });

        const toolMessages = await Promise.all(toolPromises);
        llmMessages.push(...toolMessages);
      } else {
        return NextResponse.json({ reply: responseMessage.content });
      }
    }

    return NextResponse.json({ reply: "Maximum processing loops reached. Standing by for new orders, boss." });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ reply: `Neural net connection issue: ${error.message}. Attempting to reconnect...` });
  }
}
