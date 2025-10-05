import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const possibleIdentifiers: string[] = [];
  if (identity.tokenIdentifier) {
    const parts = identity.tokenIdentifier.split("|");
    if (parts.length > 1) {
      possibleIdentifiers.push(parts[1]);
    }
  }
  if (identity.subject) {
    possibleIdentifiers.push(identity.subject);
  }

  for (const token of possibleIdentifiers) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", token))
      .unique();
    if (user) {
      return user;
    }
  }

  return null;
}

const networkEntry = v.object({
  contactId: v.id("users"),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  image: v.optional(v.string()),
  conversationCount: v.number(),
  totalTurns: v.number(),
  lastInteractionAt: v.number(),
  lastConversationId: v.id("conversations"),
});

type NetworkEntry = {
  conversationCount: number;
  totalTurns: number;
  lastInteractionAt: number;
  lastConversationId: Id<"conversations">;
};

export const list = query({
  args: {},
  returns: v.array(networkEntry),
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) {
      return [];
    }

    const [asInitiator, asScanner] = await Promise.all([
      ctx.db
        .query("conversations")
        .withIndex("by_initiator", (q) => q.eq("initiatorUserId", currentUser._id))
        .collect(),
      ctx.db
        .query("conversations")
        .withIndex("by_scanner", (q) => q.eq("scannerUserId", currentUser._id))
        .collect(),
    ]);

    const conversationMap = new Map<Id<"conversations">, Doc<"conversations">>();
    for (const conversation of [...asInitiator, ...asScanner]) {
      conversationMap.set(conversation._id, conversation);
    }

    const contacts = new Map<Id<"users">, NetworkEntry>();

    for (const conversation of conversationMap.values()) {
      const interactionTimestamp = conversation.endedAt ?? conversation.startedAt ?? conversation._creationTime;

      const participantIds = new Set<Id<"users">>();
      participantIds.add(conversation.initiatorUserId);
      if (conversation.scannerUserId) {
        participantIds.add(conversation.scannerUserId);
      }

      const turns = await ctx.db
        .query("transcriptTurns")
        .withIndex("by_conversation_and_user", (q) => q.eq("conversationId", conversation._id))
        .collect();

      const turnsByUser = new Map<Id<"users">, number>();
      for (const turn of turns) {
        if (!turn.userId) {
          continue;
        }
        participantIds.add(turn.userId);
        const count = turnsByUser.get(turn.userId) ?? 0;
        turnsByUser.set(turn.userId, count + 1);
      }

      participantIds.delete(currentUser._id);

      for (const participantId of participantIds) {
        const turnsCount = turnsByUser.get(participantId) ?? 0;
        const existing = contacts.get(participantId);

        if (!existing) {
          contacts.set(participantId, {
            conversationCount: 1,
            totalTurns: turnsCount,
            lastInteractionAt: interactionTimestamp,
            lastConversationId: conversation._id,
          });
        } else {
          const lastInteractionAt = Math.max(existing.lastInteractionAt, interactionTimestamp);
          contacts.set(participantId, {
            conversationCount: existing.conversationCount + 1,
            totalTurns: existing.totalTurns + turnsCount,
            lastInteractionAt,
            lastConversationId:
              lastInteractionAt >= existing.lastInteractionAt
                ? conversation._id
                : existing.lastConversationId,
          });
        }
      }
    }

    const results = [];
    for (const [contactId, info] of contacts.entries()) {
      const contact = await ctx.db.get(contactId);
      if (!contact) {
        continue;
      }

      results.push({
        contactId,
        name: contact.name ?? undefined,
        email: contact.email ?? undefined,
        image: contact.image ?? undefined,
        conversationCount: info.conversationCount,
        totalTurns: info.totalTurns,
        lastInteractionAt: info.lastInteractionAt,
        lastConversationId: info.lastConversationId,
      });
    }

    results.sort((a, b) => b.lastInteractionAt - a.lastInteractionAt);
    return results;
  },
});
