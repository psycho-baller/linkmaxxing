import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate a random invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new conversation
export const create = mutation({
  args: {
    location: v.optional(v.string()),
  },
  returns: v.object({
    id: v.id("conversations"),
    inviteCode: v.string(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user from users table
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier.split("|")[1]))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check for existing pending conversation
    const existingPending = await ctx.db
      .query("conversations")
      .withIndex("by_initiator_and_status", (q) =>
        q.eq("initiatorUserId", user._id).eq("status", "pending")
      )
      .first();

    if (existingPending) {
      return {
        id: existingPending._id,
        inviteCode: existingPending.inviteCode,
      };
    }

    // Create new conversation
    const inviteCode = generateInviteCode();
    const conversationId = await ctx.db.insert("conversations", {
      initiatorUserId: user._id,
      status: "pending",
      inviteCode,
      location: args.location,
      startedAt: Date.now(),
    });

    return {
      id: conversationId,
      inviteCode,
    };
  },
});

// Claim scanner spot in a conversation
export const claimScanner = mutation({
  args: {
    conversationId: v.id("conversations"),
    inviteCode: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier.split("|")[1]))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (conversation.inviteCode !== args.inviteCode) {
      throw new Error("Invalid invite code");
    }

    if (conversation.scannerUserId) {
      throw new Error("Scanner already claimed");
    }

    // Update conversation with scanner
    await ctx.db.patch(args.conversationId, {
      scannerUserId: user._id,
      scannerEmail: user.email,
      status: "active",
      startedAt: Date.now(),
    });

    return null;
  },
});

// Update conversation status
export const updateStatus = mutation({
  args: {
    conversationId: v.id("conversations"),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("ended")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const updates: any = { status: args.status };

    if (args.status === "ended" && !conversation.endedAt) {
      updates.endedAt = Date.now();
    }

    await ctx.db.patch(args.conversationId, updates);
    return null;
  },
});

// Save transcript data after processing
export const saveTranscriptData = mutation({
  args: {
    conversationId: v.id("conversations"),
    transcript: v.array(v.object({ speaker: v.string(), text: v.string() })),
    facts: v.any(), // Record<string, string[]>
    summary: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Save summary to conversation
    await ctx.db.patch(args.conversationId, {
      summary: args.summary,
      status: "ended",
      endedAt: Date.now(),
    });

    // Save transcript turns
    for (let i = 0; i < args.transcript.length; i++) {
      await ctx.db.insert("transcriptTurns", {
        conversationId: args.conversationId,
        speaker: args.transcript[i].speaker,
        text: args.transcript[i].text,
        order: i,
      });
    }

    // Save facts
    for (const [speaker, speakerFacts] of Object.entries(args.facts as Record<string, string[]>)) {
      await ctx.db.insert("conversationFacts", {
        conversationId: args.conversationId,
        speaker,
        facts: speakerFacts,
      });
    }

    return null;
  },
});

// Get a single conversation
export const get = query({
  args: { id: v.id("conversations") },
  returns: v.union(
    v.object({
      _id: v.id("conversations"),
      _creationTime: v.number(),
      initiatorUserId: v.id("users"),
      scannerUserId: v.optional(v.id("users")),
      scannerEmail: v.optional(v.string()),
      status: v.union(v.literal("pending"), v.literal("active"), v.literal("ended")),
      inviteCode: v.string(),
      location: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      endedAt: v.optional(v.number()),
      summary: v.optional(v.string()),
      audioStorageId: v.optional(v.id("_storage")),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.id);
    return conversation;
  },
});

// List user's conversations
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("conversations"),
      _creationTime: v.number(),
      initiatorUserId: v.id("users"),
      scannerUserId: v.optional(v.id("users")),
      scannerEmail: v.optional(v.string()),
      status: v.union(v.literal("pending"), v.literal("active"), v.literal("ended")),
      inviteCode: v.string(),
      location: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      endedAt: v.optional(v.number()),
      summary: v.optional(v.string()),
      audioStorageId: v.optional(v.id("_storage")),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return [];
    }

    // Get conversations where user is initiator or scanner
    const asInitiator = await ctx.db
      .query("conversations")
      .withIndex("by_initiator", (q) => q.eq("initiatorUserId", user._id))
      .collect();

    const asScanner = await ctx.db
      .query("conversations")
      .withIndex("by_scanner", (q) => q.eq("scannerUserId", user._id))
      .collect();

    // Combine and sort by creation time
    const all = [...asInitiator, ...asScanner];
    return all.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Get conversation by invite code
export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("conversations"),
      _creationTime: v.number(),
      initiatorUserId: v.id("users"),
      scannerUserId: v.optional(v.id("users")),
      scannerEmail: v.optional(v.string()),
      status: v.union(v.literal("pending"), v.literal("active"), v.literal("ended")),
      inviteCode: v.string(),
      location: v.optional(v.string()),
      startedAt: v.optional(v.number()),
      endedAt: v.optional(v.number()),
      summary: v.optional(v.string()),
      audioStorageId: v.optional(v.id("_storage")),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();
    return conversation;
  },
});

// Get transcript turns for a conversation
export const getTranscript = query({
  args: { conversationId: v.id("conversations") },
  returns: v.array(
    v.object({
      _id: v.id("transcriptTurns"),
      _creationTime: v.number(),
      conversationId: v.id("conversations"),
      speaker: v.string(),
      text: v.string(),
      order: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const turns = await ctx.db
      .query("transcriptTurns")
      .withIndex("by_conversation_and_order", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    return turns.sort((a, b) => a.order - b.order);
  },
});

// Get facts for a conversation
export const getFacts = query({
  args: { conversationId: v.id("conversations") },
  returns: v.array(
    v.object({
      _id: v.id("conversationFacts"),
      _creationTime: v.number(),
      conversationId: v.id("conversations"),
      speaker: v.string(),
      facts: v.array(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const facts = await ctx.db
      .query("conversationFacts")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    return facts;
  },
});

// Generate upload URL for audio
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

// Save audio storage ID to conversation
export const saveAudioStorageId = mutation({
  args: {
    conversationId: v.id("conversations"),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.conversationId, {
      audioStorageId: args.storageId,
    });
    return null;
  },
});
