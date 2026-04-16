// NVIDIA NIM LLM Client
// Supports GLM 4.7, GLM 5, Kimi 2.5, DeepSeek V3.2, Llama 3.3 70B, Gemma 3 27B, MiniMax M2.5

export interface LLMModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
  supportsThinking: boolean;
  speed: "fast" | "balanced" | "powerful";
}

export const AVAILABLE_MODELS: LLMModel[] = [
  // ⚡ Fast models — lower latency, suitable for quick drafts and interactive tasks
  {
    id: "glm-4-7",
    name: "GLM 4.7",
    provider: "NVIDIA NIM",
    description: "智谱 GLM-4.7，适合网文创作和内容生成",
    maxTokens: 8192,
    supportsThinking: false,
    speed: "fast",
  },
  {
    id: "deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "NVIDIA NIM",
    description: "DeepSeek V3.2 MoE，高速推理，创作能力强",
    maxTokens: 8192,
    supportsThinking: false,
    speed: "fast",
  },
  {
    id: "gemma-3-27b",
    name: "Gemma 3 27B",
    provider: "NVIDIA NIM",
    description: "Google Gemma 3 27B，轻量高效",
    maxTokens: 8192,
    supportsThinking: false,
    speed: "fast",
  },
  {
    id: "kimi-k2",
    name: "Kimi K2",
    provider: "NVIDIA NIM",
    description: "Moonshot Kimi K2（无思考链），响应更快",
    maxTokens: 8192,
    supportsThinking: false,
    speed: "fast",
  },
  // ⚖️ Balanced models — good quality-to-speed ratio
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    provider: "NVIDIA NIM",
    description: "Meta Llama 3.3 70B，质量与速度均衡",
    maxTokens: 8192,
    supportsThinking: false,
    speed: "balanced",
  },
  {
    id: "minimax-m2.5",
    name: "MiniMax M2.5",
    provider: "NVIDIA NIM",
    description: "MiniMax M2.5，擅长中文创作",
    maxTokens: 8192,
    supportsThinking: false,
    speed: "balanced",
  },
  // 🚀 Powerful models — best quality, higher latency
  {
    id: "glm-5",
    name: "GLM 5",
    provider: "NVIDIA NIM",
    description: "智谱 GLM-5 旗舰模型，更强理解和创作",
    maxTokens: 16384,
    supportsThinking: true,
    speed: "powerful",
  },
  {
    id: "kimi-2.5",
    name: "Kimi 2.5",
    provider: "NVIDIA NIM",
    description: "Moonshot Kimi 2.5，长文本和深度推理",
    maxTokens: 16384,
    supportsThinking: true,
    speed: "powerful",
  },
];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

const DEFAULT_MODEL = "glm-4-7";
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 4096;

function getBaseUrl(): string {
  return process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
}

function getApiKey(): string {
  return process.env.NVIDIA_API_KEY || "";
}

function getNVIDIAModelId(modelId?: string): string {
  const modelMap: Record<string, string> = {
    "glm-4-7": "z-ai/glm4.7",
    "glm-5": "z-ai/glm5",
    "kimi-2.5": "moonshotai/kimi-k2.5",
    "kimi-k2": "moonshotai/kimi-k2-instruct",
    "deepseek-v3.2": "deepseek-ai/deepseek-v3.2",
    "gemma-3-27b": "google/gemma-3-27b-it",
    "llama-3.3-70b": "meta/llama-3.3-70b-instruct",
    "minimax-m2.5": "minimaxai/minimax-m2.5",
  };
  return modelMap[modelId || DEFAULT_MODEL] || modelMap[DEFAULT_MODEL];
}

// Non-streaming generation
export async function generateChat(
  messages: ChatMessage[],
  options: GenerationOptions = {}
): Promise<string> {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();
  const model = getNVIDIAModelId(options.model);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`NVIDIA NIM API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message;
  // GLM 4.7 returns content in "reasoning_content" instead of "content"
  return message?.content || message?.reasoning_content || "";
}

// Streaming generation (returns a ReadableStream)
export async function generateChatStream(
  messages: ChatMessage[],
  options: GenerationOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();
  const model = getNVIDIAModelId(options.model);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const errText = await res.text();
    throw new Error(`NVIDIA NIM API stream error (${res.status}): ${errText}`);
  }

  return res.body;
}

// Transform SSE stream into text chunks
export function createStreamTransformer(): TransformStream<Uint8Array, string> {
  const decoder = new TextDecoder();
  return new TransformStream<Uint8Array, string>({
    transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true });
      const lines = text.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === "" || trimmed === "data: [DONE]") continue;
        if (trimmed.startsWith("data: ")) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta;
            // NVIDIA NIM models may use reasoning_content instead of content
            const content = delta?.content || delta?.reasoning_content;
            if (content) {
              controller.enqueue(content);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    },
  });
}
