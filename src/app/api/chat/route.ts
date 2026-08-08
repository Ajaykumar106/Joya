import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

const execPromise = util.promisify(exec);

// Path to our persistent memory datastore
const memoryFilePath = path.join(process.cwd(), 'memory.json');

// Helper to read memory
function readMemory() {
  try {
    if (fs.existsSync(memoryFilePath)) {
      const data = fs.readFileSync(memoryFilePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading memory:", err);
  }
  return {};
}

// Helper to save memory
function saveMemory(key: string, value: string) {
  const currentMemory = readMemory();
  currentMemory[key] = value;
  fs.writeFileSync(memoryFilePath, JSON.stringify(currentMemory, null, 2), 'utf8');
}

// Helper function to call the Render backend
async function callLLM(messages: any[]) {
  const response = await fetch("https://riya-backend-ujz7.onrender.com/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, userName: "User" })
  });
  
  if (!response.ok) throw new Error(`Backend responded with status ${response.status}`);
  
  const data = await response.json();
  return data.reply || data.choices?.[0]?.message?.content || "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let messages = body.messages || [];

    // Load long-term memory
    const memory = readMemory();
    const memoryString = Object.keys(memory).length > 0 
      ? JSON.stringify(memory, null, 2) 
      : "No memory saved yet.";

    // Base system instruction for the agent (Phase 2: Execution + Memory)
    const agentInstruction = `
[SYSTEM INSTRUCTION: You are Joya, a powerful Autonomous Agent (Hermes Protocol).

You have two powerful tools at your disposal. You MUST use these exact XML tags to trigger them. Do not output anything else if you are using a tool.

1. TERMINAL EXECUTION:
You can run terminal commands on the user's computer.
Usage: <EXEC>your command here</EXEC>
Example: <EXEC>dir</EXEC>

2. PERSISTENT MEMORY:
You have a permanent memory database. If the user tells you their name, preferences, or important project details, SAVE IT.
Usage: <SAVE_MEMORY>Key: Value</SAVE_MEMORY>
Example: <SAVE_MEMORY>User Name: Ajay</SAVE_MEMORY>

LONG-TERM MEMORY BANK:
${memoryString}

RULES:
- Always respond in English or Hinglish. Do NOT use the Hindi (Devanagari) script unless explicitly requested.
- If you use a tool, wait for the system response before giving your final answer to the user.
]`;

    if (messages.length > 0) {
      messages[messages.length - 1].content += "\n\n" + agentInstruction;
    }

    let maxLoops = 5; // Allow a few loops for multiple tool calls
    let loopCount = 0;
    
    while (loopCount < maxLoops) {
      loopCount++;
      let reply = await callLLM(messages);

      // Check for <EXEC> command
      const execMatch = reply.match(/<EXEC>([\s\S]*?)<\/EXEC>/);
      // Check for <SAVE_MEMORY> command
      const memoryMatch = reply.match(/<SAVE_MEMORY>([\s\S]*?)<\/SAVE_MEMORY>/);
      
      if (execMatch) {
        const command = execMatch[1].trim();
        messages.push({ role: "assistant", content: `<EXEC>${command}</EXEC>` });
        
        try {
          console.log(`[AGENT EXECUTION] Running: ${command}`);
          const { stdout, stderr } = await execPromise(command);
          const output = stdout || stderr || "Command executed successfully with no output.";
          
          messages.push({ 
            role: "user", 
            content: `[COMMAND OUTPUT]:\n${output.slice(0, 2000)}\n\nNow provide the next step or final answer.` 
          });
        } catch (err: any) {
          console.error(`[AGENT EXECUTION ERROR] ${err.message}`);
          messages.push({ 
            role: "user", 
            content: `[COMMAND ERROR]:\n${err.message}\n\nPlease fix the command and try again.` 
          });
        }
      } else if (memoryMatch) {
        const memData = memoryMatch[1].trim();
        messages.push({ role: "assistant", content: `<SAVE_MEMORY>${memData}</SAVE_MEMORY>` });
        
        try {
          // Parse "Key: Value"
          const splitIndex = memData.indexOf(':');
          if (splitIndex > -1) {
            const key = memData.slice(0, splitIndex).trim();
            const val = memData.slice(splitIndex + 1).trim();
            saveMemory(key, val);
            console.log(`[AGENT MEMORY SAVED] ${key}: ${val}`);
            messages.push({ 
              role: "user", 
              content: `[SYSTEM]: Memory successfully saved into the datastore. Now answer the user.` 
            });
          } else {
            throw new Error("Invalid memory format. Must be 'Key: Value'.");
          }
        } catch (err: any) {
          messages.push({ 
            role: "user", 
            content: `[SYSTEM ERROR]: ${err.message}` 
          });
        }
      } else {
        // No tools called, this is the final answer
        return NextResponse.json({ reply: reply });
      }
    }

    return NextResponse.json({ reply: "Agent reached maximum execution loops (5). The task was too complex to finish in one go." });

  } catch (error) {
    console.error("Chat API Proxy Error:", error);
    return NextResponse.json({ reply: "My connection to the main neural net failed or I encountered a critical system error." });
  }
}
