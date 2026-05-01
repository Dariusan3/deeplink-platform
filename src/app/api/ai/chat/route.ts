import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { TOOLS, runTool } from "@/lib/ai-tools";

// Streaming protocol — NDJSON. Each line is a self-contained JSON object:
//   {"type":"text","value":"...delta..."}
//   {"type":"action","name":"create_link","args":{...},"result":{...}}
// Newlines inside text deltas are JSON-escaped, so the client splits the
// outer stream on \n and JSON.parse each line.

export async function POST(request: NextRequest) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { messages, teamId, analyticsContext } = await request.json();

  const systemPrompt = `You are the AI Brain — an active assistant for the Tappr smart link platform.

You can ANSWER questions and TAKE ACTIONS via tools. When the user asks you to do something (create a link, make a collection, move a link, rename, pause, star), call the matching tool. When they ask analytical questions, answer using the data below.

Live data for team "${analyticsContext?.teamName || "Unknown"}":

ANALYTICS (last 30 days):
${analyticsContext ? JSON.stringify({
  totalClicks: analyticsContext.totalClicks,
  totalLinks: analyticsContext.totalLinks,
  activeLinks: analyticsContext.activeLinks,
  topLinks: analyticsContext.topLinks,
  topCountries: analyticsContext.topCountries,
  deviceSplit: analyticsContext.deviceSplit,
  topReferrers: analyticsContext.topReferrers,
  dailyTrend: analyticsContext.dailyTrend,
}, null, 2) : "No analytics data available yet."}

ALL LINKS (use these IDs when calling tools that need link_id):
${analyticsContext?.links ? JSON.stringify(analyticsContext.links, null, 2) : "No links yet."}

COLLECTIONS (use these IDs when calling tools that need collection_id):
${analyticsContext?.collections ? JSON.stringify(analyticsContext.collections, null, 2) : "No collections yet."}

BUSINESS CONTEXT:
${analyticsContext?.businessContext || "No business knowledge added yet."}

Action rules:
- For destructive actions (delete, mass-update, slug changes that break inbound links), confirm with the user FIRST in plain English, then call the tool only after they agree.
- Reads (list_links, list_collections) — call freely whenever you need fresh IDs.
- Always normalize URLs the user gives you (assume https if missing).
- After taking an action, briefly confirm what you did in 1–2 sentences. Don't repeat back the JSON.
- If a tool fails, show the error, suggest a fix, don't retry blindly.
- You can chain tools: e.g. "list_links" with a search → pick the matching id → "move_link_to_collection".

Format text answers in markdown with bullets, never JSON in your text reply.`;

  const conversationMessages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendLine = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      const sendText = (value: string) => sendLine({ type: "text", value });
      const sendAction = (action: { name: string; args: unknown; result: unknown }) =>
        sendLine({ type: "action", ...action });

      try {
        // Tool-call loop. The model can call tools multiple times before
        // emitting its final text answer. Cap iterations to keep latency
        // bounded and avoid infinite loops if the model misbehaves.
        const MAX_TOOL_HOPS = 5;
        for (let hop = 0; hop < MAX_TOOL_HOPS; hop++) {
          // Non-streaming call when we expect tool calls — Groq returns
          // a single response with `tool_calls` populated (or content).
          // If it has tool_calls, run them and loop. Otherwise STREAM the
          // text answer to the client.
          const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            max_tokens: 2048,
            tools: TOOLS,
            tool_choice: "auto",
            messages: conversationMessages,
          });

          const choice = completion.choices[0];
          const msg = choice?.message;
          if (!msg) {
            sendText("Sorry, the model returned no response.");
            return;
          }

          const toolCalls = msg.tool_calls || [];

          if (toolCalls.length === 0) {
            // No more tools — stream the final answer character-by-char
            // so the client typewriter feels live, even though we got
            // it as one piece.
            const finalText = msg.content || "";
            sendText(finalText);
            return;
          }

          // Append the assistant message with tool_calls so the next
          // model call has context that the assistant ASKED for tools.
          conversationMessages.push({
            role: "assistant",
            content: msg.content || "",
            tool_calls: toolCalls,
          });

          // Execute each tool call, append result back, surface to UI.
          for (const call of toolCalls) {
            if (call.type !== "function") continue;
            const fnName = call.function.name;
            let parsedArgs: Record<string, unknown> = {};
            try {
              parsedArgs = JSON.parse(call.function.arguments || "{}");
            } catch {
              parsedArgs = {};
            }

            const result = await runTool(fnName, parsedArgs, {
              supabase,
              userId: user.id,
              teamId: teamId || null,
            });

            // Surface to the UI immediately — user sees the action card
            // before the model's next text response.
            sendAction({
              name: fnName,
              args: parsedArgs,
              result,
            });

            conversationMessages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(result),
            });
          }
        }

        // Hit the loop cap — flush whatever final reasoning the model can give.
        sendText("\n\n_(Max tool hops reached. Refine your request and try again.)_");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "AI error";
        sendText(`\n\nError: ${errMsg}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
