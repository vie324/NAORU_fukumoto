import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Audio uploads go directly to Supabase Storage from the client, but the
  // transcribe route streams segments through the server, so allow a generous
  // server action / route body where needed.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
