import { tool } from "@langchain/core/tools";
import z from "zod";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

// Load environment variables
dotenv.config();

// Load LLM
const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-4o-mini",
});

// Node - start
async function llmCall(state) {
  // LLM decides whether to call a tool or not
  const result = await llmWithTools.invoke([
    {
      role: "system",
      content:
        "You are a helpful assistant tasked with performing arithmetic on a set of inputs.",
    },
    ...state.messages,
  ]);

  return {
    messages: [result],
  };
}

// Tools
const multiply = tool(
  async (a, b) => {
    return a * b;
  },
  {
    schema: z.object({
      a: z.number().min(1).describe("First Number"),
      b: z.number().min(1).describe("Second Number"),
    }),
    name: "multiply",
    description: "Multiply two numbers.",
  }
);

const add = tool(
  async (a, b) => {
    return a + b;
  },
  {
    schema: z.object({
      a: z.number().min(1).describe("First Number"),
      b: z.number().min(1).describe("Second Number"),
    }),
    name: "add",
    description: "Add two numbers.",
  }
);

const subtract = tool(
  async (a, b) => {
    return a - b;
  },
  {
    schema: z.object({
      a: z.number().min(1).describe("First Number"),
      b: z.number().min(1).describe("Second Number"),
    }),
    name: "subtract",
    description: "Subtract two numbers.",
  }
);

const divide = tool(
  async (a, b) => {
    return a / b;
  },
  {
    schema: z.object({
      a: z.number().min(1).describe("First Number"),
      b: z.number().min(1).describe("Second Number"),
    }),
    name: "divide",
    description: "Divide two numbers.",
  }
);

// Conditional edge function to route to the tool node or end
function shouldContinue(state) {
  const messages = state.messages;
  const lastMessage = messages.at(-1);

  // If the LLM makes a tool call, then perform an action
  if (lastMessage?.tool_calls?.length) {
    return "Action";
  }
  // Otherwise, we stop (reply to the user)
  return "__end__";
}

// Setup tools array
const tools = [add, subtract, multiply, divide];

// Create tool nodes
const toolNode = new ToolNode(tools);

// Bind LLM with tools
const llmWithTools = llm.bindTools(tools);

// Build workflow
const agentBuilder = new StateGraph(MessagesAnnotation)
  .addNode("llmCall", llmCall)
  .addNode("tools", toolNode)
  // Add edges to connect nodes
  .addEdge("__start__", "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, {
    // Name returned by shouldContinue : Name of next node to visit
    Action: "tools",
    __end__: "__end__",
  })
  .addEdge("tools", "llmCall")
  .compile();

// Invoke
const messages = [
  {
    role: "user",
    content: "Add two numbers 21 and 43, then divide the add result with 20.",
  },
];

// Log result
const result = await agentBuilder.invoke({ messages });
console.log(result.messages);