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
  sourceFilter?: string, // Optional filter: "clinic" or empty for all
): Promise<{
  context: string;
  isRagWorking: boolean;
  ragSources: RAGSource[];
}> {
  try {
    console.log("🔍 Querying Pinecone with:", query, sourceFilter ? `(filter: ${sourceFilter})` : "(no filter)");

    // Build native Pinecone filter based on sourceFilter
    let pineconeFilter: Record<string, any> | undefined;

    if (sourceFilter === "clinic") {
      // For clinic: Filter documents with source = "clinic"
      pineconeFilter = { source: { $eq: "clinic" } };
      console.log("🏥 Using native Pinecone filter for CLINIC");
    } else if (sourceFilter) {
      // For other named sources
      pineconeFilter = { source: { $eq: sourceFilter } };
      console.log(`📍 Using native Pinecone filter for source: ${sourceFilter}`);
    }
    // If no sourceFilter: no filter = query all sources (UrbanStyle + others)

    // Query Pinecone with native filtering
    const results = await queryPineconeWithText(query, n, pineconeFilter);

    // Parse Pinecone results (no post-query filtering needed!)
    const ragSources: RAGSource[] = results.matches
      .filter((match: any) => match.metadata?.text)
      .map((match: any, index: number) => ({
        id: match.id || `pinecone-${index}`,
        fileName: match.metadata?.title || match.metadata?.category || "Knowledge Base",
        snippet: match.metadata?.text || "",
        score: match.score || 0,
        source: match.metadata?.source || "default", // Include source in object
      }));

    console.log(
      "✅ Pinecone returned",
      ragSources.length,
      "results",
      sourceFilter ? `(filtered to ${sourceFilter})` : "(all sources)"
    );

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
 * Auto-detect knowledge base based on query content
 * Returns 'clinic' for healthcare-related queries, undefined if no clinic keywords detected (no default KB)
 */
export function detectKnowledgeBase(query: string): string | undefined {
  const lowerQuery = query.toLowerCase();

  // Keywords untuk Clinic - ONLY clinic, no other business types
  const clinicKeywords = [
    'klinik', 'clinic', 'dokter', 'doctor', 'gigi', 'dental', 'teeth', 'tooth',
    'perawatan wajah', 'facial', 'skin', 'kulit', 'beauty treatment',
    'botox', 'filler', 'whitening', 'pemutihan', 'scaling', 'bleaching',
    'cabut gigi', 'tambal', 'filling', 'implant', 'veneer', 'crown', 'behel', 'kawat gigi', 'braces',
    'konsultasi dokter', 'appointment', 'janji temu', 'jadwal praktek', 'jadwal dokter', 'booking',
    'acne', 'jerawat', 'komedo', 'pori-pori', 'flek hitam', 'aging', 'keriput', 'wrinkle',
    'laser', 'peeling', 'mesotherapy', 'microdermabrasi', 'carbon laser',
    'sakit gigi', 'gusi', 'gum', 'karang gigi', 'gigi berlubang', 'rontgen gigi',
    'perawatan kecantikan', 'treatment', 'terapi', 'prosedur medis', 'estetika'
  ];

  const clinicMatches = clinicKeywords.filter(kw => lowerQuery.includes(kw)).length;

  console.log(`🔍 KB Detection - Query: "${query.slice(0, 50)}..."`);
  console.log(`   Clinic matches: ${clinicMatches}`);

  if (clinicMatches > 0) {
    console.log('🏥 Auto-detected: CLINIC');
    return 'clinic';
  }

  // NO DEFAULT KB - return undefined if no clinic match
  console.log('❌ No clinic keywords detected - no KB used');
  return undefined;
}

/**
 * Main retrieve context function - auto-selects between Pinecone (with optional filter) and Bedrock
 * - knowledgeBaseId="clinic": Use Pinecone filtered to clinic sources
 * - knowledgeBaseId=undefined: NO KB used (user must ask clinic questions)
 * - knowledgeBaseId=other: Use AWS Bedrock
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
  // Use Pinecone with clinic filter if knowledgeBaseId === "clinic"
  if (knowledgeBaseId === "clinic") {
    console.log("🏥 Using Pinecone for Clinic RAG (filtered)");
    return retrieveContextFromPinecone(query, n, "clinic");
  }

  // NO DEFAULT KB - if no knowledgeBaseId, return empty context
  if (!knowledgeBaseId) {
    console.log("❌ No KB specified - returning empty context");
    return { context: "", isRagWorking: false, ragSources: [] };
  }

  // Use Bedrock if knowledgeBaseId is provided (for other knowledge bases)
  console.log("☁️ Using AWS Bedrock for RAG");
  return retrieveContextFromBedrock(query, knowledgeBaseId, n);
}
