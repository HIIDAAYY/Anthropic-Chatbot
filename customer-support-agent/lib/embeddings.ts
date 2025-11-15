import { VoyageAIClient } from "voyageai";

// Lazy initialization of Voyage AI client
let voyageClientInstance: VoyageAIClient | null = null;

function getVoyageClient() {
  if (!voyageClientInstance) {
    if (!process.env.VOYAGE_API_KEY) {
      throw new Error("VOYAGE_API_KEY is not defined in environment variables");
    }
    voyageClientInstance = new VoyageAIClient({
      apiKey: process.env.VOYAGE_API_KEY,
    });
  }
  return voyageClientInstance;
}

/**
 * Generate embeddings using Voyage AI
 * @param text - Text to convert to embedding
 * @param model - Voyage AI model (default: voyage-3)
 * @returns Embedding vector (array of numbers)
 */
export async function getEmbedding(
  text: string,
  model: string = "voyage-3"
): Promise<number[]> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }

    const voyageClient = getVoyageClient();
    const response = await voyageClient.embed({
      input: text,
      model: model,
    });

    // Return the first embedding (since we're sending single text)
    if (!response.data || response.data.length === 0) {
      throw new Error("Failed to generate embedding: No embedding data returned");
    }
    const embedding = response.data[0].embedding;
    if (!embedding) {
      throw new Error("Failed to generate embedding: Empty embedding data");
    }
    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 * @param texts - Array of texts to convert to embeddings
 * @param model - Voyage AI model (default: voyage-3)
 * @returns Array of embedding vectors
 */
export async function getEmbeddings(
  texts: string[],
  model: string = "voyage-3"
): Promise<number[][]> {
  try {
    if (!texts || texts.length === 0) {
      throw new Error("Texts array cannot be empty");
    }

    const voyageClient = getVoyageClient();
    const response = await voyageClient.embed({
      input: texts,
      model: model,
    });

    // Return all embeddings
    if (!response.data || response.data.length === 0) {
      throw new Error("Failed to generate embeddings: No embedding data returned");
    }
    const embeddings = response.data.map((item) => {
      if (!item.embedding) {
        throw new Error("Failed to generate embeddings: Empty embedding data");
      }
      return item.embedding;
    });
    return embeddings;
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw error;
  }
}

/**
 * Available Voyage AI models for embeddings:
 * - voyage-3: Latest general-purpose model (1024 dimensions) - RECOMMENDED
 * - voyage-3-lite: Faster, smaller model (512 dimensions)
 * - voyage-code-3: Optimized for code search (1024 dimensions)
 * - voyage-finance-2: Optimized for financial documents
 * - voyage-law-2: Optimized for legal documents
 */
