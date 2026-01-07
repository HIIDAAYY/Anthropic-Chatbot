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
 * Now supports multi-clinic filtering with clinicId!
 */
export async function retrieveContextFromPinecone(
  query: string,
  n: number = 3,
  sourceFilter?: string | { kb: string; clinicId: string | null }, // Enhanced to support clinic-specific filtering
): Promise<{
  context: string;
  isRagWorking: boolean;
  ragSources: RAGSource[];
}> {
  try {
    console.log(
      "🔍 Querying Pinecone with:",
      query,
      sourceFilter ? `(filter: ${JSON.stringify(sourceFilter)})` : "(no filter)"
    );

    // Build native Pinecone filter based on sourceFilter
    let pineconeFilter: Record<string, any> | undefined;

    // Handle new object format from detectKnowledgeBase()
    if (
      typeof sourceFilter === "object" &&
      sourceFilter !== null &&
      "kb" in sourceFilter
    ) {
      if (sourceFilter.kb === "clinic") {
        if (sourceFilter.clinicId) {
          // SPECIFIC CLINIC: Compound filter (source=clinic AND clinicId=specific)
          pineconeFilter = {
            $and: [
              { source: { $eq: "clinic" } },
              { clinicId: { $eq: sourceFilter.clinicId } },
            ],
          };
          console.log(
            `🏥 Using native Pinecone filter for SPECIFIC CLINIC: ${sourceFilter.clinicId}`
          );
        } else {
          // GENERIC CLINIC: All clinics (source=clinic only)
          pineconeFilter = { source: { $eq: "clinic" } };
          console.log("🏥 Using native Pinecone filter for ALL CLINICS");
        }
      }
    } else if (sourceFilter === "clinic") {
      // Backward compatibility: string "clinic"
      pineconeFilter = { source: { $eq: "clinic" } };
      console.log("🏥 Using native Pinecone filter for CLINIC (backward compat)");
    } else if (sourceFilter) {
      // For other named sources (string)
      pineconeFilter = { source: { $eq: sourceFilter } };
      console.log(`📍 Using native Pinecone filter for source: ${sourceFilter}`);
    }
    // If no sourceFilter: no filter = query all sources

    // Query Pinecone with native filtering
    const results = await queryPineconeWithText(query, n, pineconeFilter);

    // Parse Pinecone results with enhanced metadata
    const ragSources: RAGSource[] = results.matches
      .filter((match: any) => match.metadata?.text)
      .map((match: any, index: number) => ({
        id: match.id || `pinecone-${index}`,
        fileName:
          match.metadata?.title ||
          match.metadata?.category ||
          "Knowledge Base",
        snippet: match.metadata?.text || "",
        score: match.score || 0,
        source: match.metadata?.source || "default",
        clinicId: match.metadata?.clinicId, // NEW: Include clinicId
        clinicName: match.metadata?.clinicName, // NEW: Include clinicName
      }));

    console.log(
      "✅ Pinecone returned",
      ragSources.length,
      "results",
      sourceFilter ? `(filtered)` : "(all sources)"
    );

    // Build context from results
    const context = ragSources.map((source) => source.snippet).join("\n\n");

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
 * Returns object with kb type and specific clinicId, or undefined if no clinic keywords detected
 * Now supports multi-clinic detection!
 */
export function detectKnowledgeBase(
  query: string
): { kb: string; clinicId: string | null } | undefined {
  const lowerQuery = query.toLowerCase();

  // CLINIC-SPECIFIC KEYWORDS (check first for specific clinic detection)
  const CLINIC_DETECTION_MAP: Record<string, string[]> = {
    "glow-clinic": [
      "glow",
      "glow aesthetic",
      "senopati",
      "blok m",
      "dr amanda",
      "amanda kusuma",
    ],
    "purity-clinic": [
      "purity",
      "the purity",
      "gereja ayam",
      "pasar baru",
      "dr jonathan",
      "dr fairly",
      "jonathan anindita",
      "fairly thamrin",
    ],
    "pramudia-clinic": [
      "pramudia",
      "kh mansyur",
      "tambora",
      "jembatan lima",
      "dr anthony handoko",
      "kulit kelamin",
      "dermatologi",
      "venerologi",
      "vitiligo",
      "sexual health",
    ],
    "beauty-plus-clinic": [
      "beauty plus",
      "beauty+",
      "gajah mada",
      "pik",
      "pluit",
      "tanjung duren",
      "dharmawangsa",
      "summarecon bekasi",
      "fat laser",
    ],
  };

  // Check for specific clinic keywords first
  for (const [clinicId, keywords] of Object.entries(CLINIC_DETECTION_MAP)) {
    if (keywords.some((kw) => lowerQuery.includes(kw))) {
      console.log(`🔍 KB Detection - Query: "${query.slice(0, 50)}..."`);
      console.log(`🏥 Auto-detected SPECIFIC clinic: ${clinicId}`);
      return { kb: "clinic", clinicId };
    }
  }

  // GENERIC CLINIC KEYWORDS (fallback to search all clinics)
  const genericClinicKeywords = [
    "klinik",
    "clinic",
    "dokter",
    "doctor",
    "gigi",
    "dental",
    "teeth",
    "tooth",
    "perawatan wajah",
    "facial",
    "skin",
    "kulit",
    "beauty treatment",
    "botox",
    "filler",
    "whitening",
    "pemutihan",
    "scaling",
    "bleaching",
    "cabut gigi",
    "tambal",
    "filling",
    "implant",
    "veneer",
    "crown",
    "behel",
    "kawat gigi",
    "braces",
    "konsultasi dokter",
    "appointment",
    "janji temu",
    "jadwal praktek",
    "jadwal dokter",
    "booking",
    "acne",
    "jerawat",
    "komedo",
    "pori-pori",
    "flek hitam",
    "aging",
    "keriput",
    "wrinkle",
    "laser",
    "peeling",
    "mesotherapy",
    "microdermabrasi",
    "carbon laser",
    "sakit gigi",
    "gusi",
    "gum",
    "karang gigi",
    "gigi berlubang",
    "rontgen gigi",
    "perawatan kecantikan",
    "treatment",
    "terapi",
    "prosedur medis",
    "estetika",
  ];

  const genericMatches = genericClinicKeywords.filter((kw) =>
    lowerQuery.includes(kw)
  ).length;

  console.log(`🔍 KB Detection - Query: "${query.slice(0, 50)}..."`);
  console.log(`   Generic clinic matches: ${genericMatches}`);

  if (genericMatches > 0) {
    console.log("🏥 Auto-detected: GENERIC clinic (search all clinics)");
    return { kb: "clinic", clinicId: null }; // null = search all clinics
  }

  // NO CLINIC KEYWORDS - return undefined
  console.log("❌ No clinic keywords detected - no KB used");
  return undefined;
}

/**
 * Main retrieve context function - auto-selects between Pinecone (with optional filter) and Bedrock
 * - knowledgeBaseId="clinic": Use Pinecone filtered to clinic sources
 * - knowledgeBaseId={ kb: "clinic", clinicId: "..." }: Use Pinecone filtered to specific clinic
 * - knowledgeBaseId=undefined: NO KB used (user must ask clinic questions)
 * - knowledgeBaseId=other: Use AWS Bedrock
 */
export async function retrieveContext(
  query: string,
  knowledgeBaseId?: string | { kb: string; clinicId: string | null },
  n: number = 3,
): Promise<{
  context: string;
  isRagWorking: boolean;
  ragSources: RAGSource[];
}> {
  // Handle new object format from detectKnowledgeBase()
  if (
    typeof knowledgeBaseId === "object" &&
    knowledgeBaseId !== null &&
    "kb" in knowledgeBaseId
  ) {
    if (knowledgeBaseId.kb === "clinic") {
      const clinicLog = knowledgeBaseId.clinicId
        ? `SPECIFIC clinic: ${knowledgeBaseId.clinicId}`
        : "ALL clinics (generic)";
      console.log(`🏥 Using Pinecone for Clinic RAG (${clinicLog})`);
      return retrieveContextFromPinecone(query, n, knowledgeBaseId);
    }
  }

  // Backward compatibility: string "clinic"
  if (knowledgeBaseId === "clinic") {
    console.log("🏥 Using Pinecone for Clinic RAG (backward compat)");
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
