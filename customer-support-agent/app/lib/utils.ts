import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
  RetrieveCommandInput,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { queryPineconeWithText } from "@/lib/pinecone";

console.log("🔑 Have AWS AccessKey?", !!process.env.BAWS_ACCESS_KEY_ID);
console.log("🔑 Have AWS Secret?", !!process.env.BAWS_SECRET_ACCESS_KEY);

const bedrockClient = new BedrockAgentRuntimeClient({
  region: "us-east-1", // Make sure this matches your Bedrock region
  credentials: {
    accessKeyId: process.env.BAWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.BAWS_SECRET_ACCESS_KEY!,
  },
});

export interface RAGSource {
  id: string;
  fileName: string;
  snippet: string;
  score: number;
}

/**
 * Retrieve context from Pinecone vector database
 */
export async function retrieveContextFromPinecone(
  query: string,
  n: number = 3,
): Promise<{
  context: string;
  isRagWorking: boolean;
  ragSources: RAGSource[];
}> {
  try {
    console.log("🔍 Querying Pinecone with:", query);

    // Query Pinecone
    const results = await queryPineconeWithText(query, n);

    // Parse Pinecone results
    const ragSources: RAGSource[] = results.matches
      .filter((match: any) => match.metadata?.text)
      .map((match: any, index: number) => ({
        id: match.id || `pinecone-${index}`,
        fileName: match.metadata?.title || match.metadata?.category || "Knowledge Base",
        snippet: match.metadata?.text || "",
        score: match.score || 0,
      }));

    console.log("✅ Pinecone returned", ragSources.length, "results");

    // Build context from results
    const context = ragSources
      .map((source) => source.snippet)
      .join("\n\n");

    return {
      context,
      isRagWorking: ragSources.length > 0,
      ragSources,
    };
  } catch (error) {
    console.error("❌ Pinecone RAG Error:", error);
    return { context: "", isRagWorking: false, ragSources: [] };
  }
}

/**
 * Retrieve context from AWS Bedrock Knowledge Base
 */
export async function retrieveContextFromBedrock(
  query: string,
  knowledgeBaseId: string,
  n: number = 3,
): Promise<{
  context: string;
  isRagWorking: boolean;
  ragSources: RAGSource[];
}> {
  try {
    if (!knowledgeBaseId) {
      console.error("knowledgeBaseId is not provided");
      return {
        context: "",
        isRagWorking: false,
        ragSources: [],
      };
    }

    const input: RetrieveCommandInput = {
      knowledgeBaseId: knowledgeBaseId,
      retrievalQuery: { text: query },
      retrievalConfiguration: {
        vectorSearchConfiguration: { numberOfResults: n },
      },
    };

    const command = new RetrieveCommand(input);
    const response = await bedrockClient.send(command);

    // Parse results
    const rawResults = response?.retrievalResults || [];
    const ragSources: RAGSource[] = rawResults
      .filter((res: any) => res.content && res.content.text)
      .map((result: any, index: number) => {
        const uri = result?.location?.s3Location?.uri || "";
        const fileName = uri.split("/").pop() || `Source-${index}.txt`;

        return {
          id:
            result.metadata?.["x-amz-bedrock-kb-chunk-id"] || `chunk-${index}`,
          fileName: fileName.replace(/_/g, " ").replace(".txt", ""),
          snippet: result.content?.text || "",
          score: result.score || 0,
        };
      })
      .slice(0, 1);

    console.log("🔍 Parsed Bedrock RAG Sources:", ragSources);

    const context = rawResults
      .filter((res: any) => res.content && res.content.text)
      .map((res: any) => res.content.text)
      .join("\n\n");

    return {
      context,
      isRagWorking: true,
      ragSources,
    };
  } catch (error) {
    console.error("❌ Bedrock RAG Error:", error);
    return { context: "", isRagWorking: false, ragSources: [] };
  }
}

/**
 * Main retrieve context function - auto-selects between Pinecone and Bedrock
 * If knowledgeBaseId is provided, uses Bedrock. Otherwise uses Pinecone.
 */
export async function retrieveContext(
  query: string,
  knowledgeBaseId?: string,
  n: number = 3,
): Promise<{
  context: string;
  isRagWorking: boolean;
  ragSources: RAGSource[];
}> {
  // Use Pinecone by default (if no knowledgeBaseId provided)
  if (!knowledgeBaseId) {
    console.log("📍 Using Pinecone for RAG");
    return retrieveContextFromPinecone(query, n);
  }

  // Use Bedrock if knowledgeBaseId is provided
  console.log("☁️ Using AWS Bedrock for RAG");
  return retrieveContextFromBedrock(query, knowledgeBaseId, n);
}
