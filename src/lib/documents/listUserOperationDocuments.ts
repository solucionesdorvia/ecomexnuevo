import { prisma } from "@/lib/db";

/** Documentos de importaciones del usuario (índice global). */
export async function listUserOperationDocuments(userId: string) {
  return prisma.operationDocument.findMany({
    where: { operation: { userId } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      operation: {
        select: {
          id: true,
          stage: true,
          quote: { select: { productJson: true, userText: true } },
        },
      },
    },
  });
}
