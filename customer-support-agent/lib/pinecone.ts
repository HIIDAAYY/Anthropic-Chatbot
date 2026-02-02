import { Pinecone } from "@pinecone-database/pinecone";
import { getOpenAIEmbedding, getOpenAIEmbeddings } from "./openai-embeddings";

// Lazy initialization of Pinecone client
let pineconeInstance: Pinecone | null = null;

function getPineconeClient() {
  if (!pineconeInstance) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY is not defined in environment variables");
    }
    pineconeInstance = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pineconeInstance;
}

/**
 * Get Pinecone index instance
 */
export const getPineconeIndex = () => {
  const indexName = process.env.PINECONE_INDEX_NAME;

  if (!indexName) {
    throw new Error("PINECONE_INDEX_NAME is not defined in environment variables");
  }

  const pinecone = getPineconeClient();
  return pinecone.Index(indexName);
};

/**
 * Query Pinecone with embedding vector
 * @param embedding - Vector embedding (array of numbers)
 * @param topK - Number of results to return
 * @param filter - Optional metadata filter
 */
export async function queryPinecone(
  embedding: number[],
  topK: number = 5,
  filter?: Record<string, any>
) {
  try {
    const index = getPineconeIndex();

    // Query Pinecone dengan vector embedding
    const results = await index.query({
      vector: embedding,
      topK: topK,
      includeMetadata: true,
      ...(filter && { filter }),
    });

    return results;
  } catch (error) {
    console.error("Error querying Pinecone:", error);
    throw error;
  }
}

/**
 * Query Pinecone with text (automatically converts to embedding)
 * @param text - Text query to search for
 * @param topK - Number of results to return
 * @param filter - Optional metadata filter
 */
export async function queryPineconeWithText(
  text: string,
  topK: number = 5,
  filter?: Record<string, any>
) {
  try {
    // Convert text to embedding using OpenAI
    const embedding = await getOpenAIEmbedding(text);

    // Query Pinecone with the embedding
    return await queryPinecone(embedding, topK, filter);
  } catch (error) {
    console.error("Error querying Pinecone with text:", error);
    throw error;
  }
}

/**
 * Query Pinecone with text in a specific namespace (MULTI-TENANT SAFE)
 * @param text - Text query to search for
 * @param namespace - Namespace to query (e.g., "glow-clinic")
 * @param topK - Number of results to return
 * @param filter - Optional metadata filter (additional filtering within namespace)
 */
export async function queryPineconeWithTextInNamespace(
  text: string,
  namespace: string,
  topK: number = 5,
  filter?: Record<string, any>
) {
  try {
    // Convert text to embedding using OpenAI
    const embedding = await getOpenAIEmbedding(text);

    // Get namespaced index
    const index = getPineconeIndex();
    const namespacedIndex = index.namespace(namespace);

    // Query within namespace
    const results = await namespacedIndex.query({
      vector: embedding,
      topK: topK,
      includeMetadata: true,
      ...(filter && { filter }),
    });

    return results;
  } catch (error) {
    console.error(`Error querying namespace ${namespace}:`, error);
    throw error;
  }
}

/**
 * Upsert vectors to Pinecone index
 * @param vectors - Array of vectors with id, values, and metadata
 */
export async function upsertVectors(
  vectors: Array<{
    id: string;
    values: number[];
    metadata?: Record<string, any>;
  }>
) {
  try {
    const index = getPineconeIndex();

    await index.upsert(vectors);

    return { success: true, count: vectors.length };
  } catch (error) {
    console.error("Error upserting vectors to Pinecone:", error);
    throw error;
  }
}

/**
 * Upsert texts to Pinecone (automatically converts to embeddings)
 * @param texts - Array of texts with id, text content, and metadata
 */
export async function upsertTexts(
  texts: Array<{
    id: string;
    text: string;
    metadata?: Record<string, any>;
  }>
) {
  try {
    // Extract text contents for batch embedding
    const textContents = texts.map((item) => item.text);

    // Generate embeddings for all texts using OpenAI
    const embeddings = await getOpenAIEmbeddings(textContents);

    // Create vectors with embeddings
    const vectors = texts.map((item, index) => ({
      id: item.id,
      values: embeddings[index],
      metadata: {
        ...item.metadata,
        text: item.text, // Store original text in metadata
      },
    }));

    // Upsert to Pinecone
    return await upsertVectors(vectors);
  } catch (error) {
    console.error("Error upserting texts to Pinecone:", error);
    throw error;
  }
}

/**
 * Upsert texts to a specific namespace (MULTI-TENANT SAFE)
 * @param texts - Array of texts with id, text content, and metadata
 * @param namespace - Namespace to upsert to (e.g., "glow-clinic")
 */
export async function upsertTextsToNamespace(
  texts: Array<{
    id: string;
    text: string;
    metadata?: Record<string, any>;
  }>,
  namespace: string
) {
  try {
    // Extract text contents for batch embedding
    const textContents = texts.map((item) => item.text);

    // Generate embeddings for all texts using OpenAI
    const embeddings = await getOpenAIEmbeddings(textContents);

    // Create vectors with embeddings
    const vectors = texts.map((item, index) => ({
      id: item.id,
      values: embeddings[index],
      metadata: {
        ...item.metadata,
        text: item.text, // Store original text in metadata
      },
    }));

    // Get namespaced index
    const index = getPineconeIndex();
    const namespacedIndex = index.namespace(namespace);

    // Upsert to specific namespace
    await namespacedIndex.upsert(vectors);

    return { success: true, count: vectors.length, namespace };
  } catch (error) {
    console.error(`Error upserting texts to namespace ${namespace}:`, error);
    throw error;
  }
}

/**
 * Delete vectors from Pinecone index
 * @param ids - Array of vector IDs to delete
 */
export async function deleteVectors(ids: string[]) {
  try {
    const index = getPineconeIndex();

    await index.deleteMany(ids);

    return { success: true, count: ids.length };
  } catch (error) {
    console.error("Error deleting vectors from Pinecone:", error);
    throw error;
  }
}

/**
 * Get index statistics
 */
export async function getIndexStats() {
  try {
    const index = getPineconeIndex();

    const stats = await index.describeIndexStats();

    return stats;
  } catch (error) {
    console.error("Error getting index stats:", error);
    throw error;
  }
}
