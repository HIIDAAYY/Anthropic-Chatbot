/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "@aws-sdk/client-bedrock-agent-runtime",
      "@pinecone-database/pinecone",
      "voyageai",
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        "@aws-sdk/client-bedrock-agent-runtime":
          "commonjs @aws-sdk/client-bedrock-agent-runtime",
        "@pinecone-database/pinecone":
          "commonjs @pinecone-database/pinecone",
        "voyageai": "commonjs voyageai",
      });
    }
    return config;
  },
};

export default nextConfig;
