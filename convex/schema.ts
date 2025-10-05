import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    tokenIdentifier: v.string(),
    phoneNumber: v.optional(v.string()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),
  subscriptions: defineTable({
    userId: v.optional(v.string()),
    polarId: v.optional(v.string()),
    polarPriceId: v.optional(v.string()),
    currency: v.optional(v.string()),
    interval: v.optional(v.string()),
    status: v.optional(v.string()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    amount: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    customerCancellationReason: v.optional(v.string()),
    customerCancellationComment: v.optional(v.string()),
    metadata: v.optional(v.any()),
    customFieldData: v.optional(v.any()),
    customerId: v.optional(v.string()),
  })
    .index("userId", ["userId"])
    .index("polarId", ["polarId"]),
  webhookEvents: defineTable({
    type: v.string(),
    polarEventId: v.string(),
    createdAt: v.string(),
    modifiedAt: v.string(),
    data: v.any(),
  })
    .index("type", ["type"])
    .index("polarEventId", ["polarEventId"]),

  // Conversation-related tables for privacy-first recording platform
  conversations: defineTable({
    initiatorUserId: v.id("users"),
    scannerUserId: v.optional(v.id("users")),
    scannerEmail: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("ended")
    ),
    inviteCode: v.string(),
    location: v.optional(v.string()),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    summary: v.optional(v.string()),
    audioStorageId: v.optional(v.id("_storage")),
  })
    .index("by_initiator", ["initiatorUserId"])
    .index("by_scanner", ["scannerUserId"])
    .index("by_status", ["status"])
    .index("by_invite_code", ["inviteCode"])
    .index("by_initiator_and_status", ["initiatorUserId", "status"]),

  transcriptTurns: defineTable({
    conversationId: v.id("conversations"),
    speaker: v.string(),
    text: v.string(),
    order: v.number(),
  }).index("by_conversation_and_order", ["conversationId", "order"]),

  conversationFacts: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    facts: v.array(v.string()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"]),
});
