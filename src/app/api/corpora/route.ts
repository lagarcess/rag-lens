import { listExampleSourceCatalogItems } from "@/lib/rag/source-catalog";

export function GET() {
  return Response.json({
    sources: listExampleSourceCatalogItems(),
  });
}
