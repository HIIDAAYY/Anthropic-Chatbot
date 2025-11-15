import OpenAI from "openai";

// Lazy initialize OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Generate embedding using OpenAI
 * @param text - Text to convert to embedding
 * @param model - OpenAI model (default: text-embedding-3-small)
 * @returns Embedding vector (array of numbers)
 */
export async function getOpenAIEmbedding(
  text: string,
  model: string = "text-embedding-3-small"
): Promise<number[]> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }

    const response = await getOpenAIClient().embeddings.create({
      input: text,
      model: model,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("Failed to generate embedding: No embedding data returned");
    }

    const embedding = response.data[0].embedding;
    if (!embedding) {
      throw new Error("Failed to generate embedding: Empty embedding data");
    }

    return embedding;
  } catch (error) {
    console.error("Error generating embedding with OpenAI:", error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 * @param texts - Array of texts to convert to embeddings
 * @param model - OpenAI model (default: text-embedding-3-small)
 * @returns Array of embedding vectors
 */
export async function getOpenAIEmbeddings(
  texts: string[],
  model: string = "text-embedding-3-small"
): Promise<number[][]> {
  try {
    if (!texts || texts.length === 0) {
      throw new Error("Texts array cannot be empty");
    }

    const response = await getOpenAIClient().embeddings.create({
      input: texts,
      model: model,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("Failed to generate embeddings: No embedding data returned");
    }

    const embeddings = response.data
      .sort((a, b) => a.index - b.index) // Ensure correct order
      .map((item) => {
        if (!item.embedding) {
          throw new Error("Failed to generate embeddings: Empty embedding data");
        }
        return item.embedding;
      });

    return embeddings;
  } catch (error) {
    console.error("Error generating embeddings with OpenAI:", error);
    throw error;
  }
}

/**
 * Get embedding dimensions for OpenAI model
 * text-embedding-3-small: 1536 dimensions
 * text-embedding-3-large: 3072 dimensions
 */
export function getOpenAIDimensions(model: string = "text-embedding-3-small"): number {
  if (model === "text-embedding-3-large") {
    return 3072;
  }
  return 1536; // default for text-embedding-3-small
}
