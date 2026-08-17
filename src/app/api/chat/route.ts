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
    
    $('tr').each((i, el) => {
      const titleNode = $(el).find('.result-link');
      const title = titleNode.text().trim();
      const link = titleNode.attr('href');
      const snippet = $(el).find('.result-snippet').text().trim();
      
      if (title && link) {
        results.push(`TITLE: ${title}\nURL: ${link}\nSNIPPET: ${snippet || 'No snippet available'}`);
      } else if (snippet && results.length > 0) {
        // sometimes snippet is on the next row
        results[results.length - 1] += `\nSNIPPET: ${snippet}`;
      }
    });
    
    // limit to top 5
    results = results.slice(0, 5);
    return results.length > 0 ? results.join('\n\n---\n\n') : "No relevant information found on the web.";
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

// ─── NVIDIA API (Primary Backend) ───

async function callLLM(messages: any[]) {
  const apiKey = process.env.NVIDIA_API_KEY;
  const model = process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct";
  if (!apiKey) throw new Error("No NVIDIA_API_KEY found.");

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
- **PERMISSION PROTOCOL (CRITICAL)**: You must NEVER use <EXEC> for system-altering commands (like deleting files) or <WRITE_FILE> without explicitly asking the boss for permission first. HOWEVER, for opening websites, playing YouTube, opening Instagram, or stopping Spotify, you CAN and MUST use <EXEC> autonomously without asking for permission.
- Always respond in English or Hinglish. NEVER use Hindi/Devanagari script.
- **CRITICAL**: If you need to use a tool (<EXEC>, <READ_FILE>, <WRITE_FILE>, <SAVE_MEMORY>, <RESEARCH>, <BROWSE>), output ONLY the tool tag and nothing else. Wait for the system response before giving your final conversational answer!
- You can combine multiple tags in one response (e.g., <ALERT>RED</ALERT> with <DATA_PANEL>threat analysis</DATA_PANEL>).`;

    // Build message array with system prompt at the start
    const llmMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role === "ai" ? "assistant" : m.role, content: m.content }))
    ];

    let maxLoops = 15;
    let loopCount = 0;
    
    while (loopCount < maxLoops) {
      loopCount++;
      let reply = await callLLM(llmMessages);
      console.log(`[LOOP ${loopCount} RAW LLM]:`, reply);

      const execMatch = reply.match(/<EXEC>([\s\S]*?)<\/EXEC>/);
      const memoryMatch = reply.match(/<SAVE_MEMORY>([\s\S]*?)<\/SAVE_MEMORY>/);
      const researchMatch = reply.match(/<RESEARCH>([\s\S]*?)<\/RESEARCH>/);
      const browseMatch = reply.match(/<BROWSE>([\s\S]*?)<\/BROWSE>/);
      const readFileMatch = reply.match(/<READ_FILE>([\s\S]*?)<\/READ_FILE>/);
      const writeFileMatch = reply.match(/<WRITE_FILE\s+path="([^"]+)">([\s\S]*?)<\/WRITE_FILE>/);
      
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
      } else if (browseMatch) {
        const url = browseMatch[1].trim();
        llmMessages.push({ role: "assistant", content: `<BROWSE>${url}</BROWSE>` });
        console.log(`[JOYA BROWSE] Fetching: ${url}`);
        const pageText = await performBrowse(url);
        llmMessages.push({ role: "user", content: `[WEBSITE CONTENT for "${url}"]:\n${pageText}\n\nSynthesize this data. Push raw results to <DATA_PANEL> and give your analysis in the main response.` });
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
