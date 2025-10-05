import { mutation } from "./_generated/server";

/**
 * Migration: Add userId to conversationFacts and remove speaker field
 * This migrates old conversationFacts records to the new schema
 */
export const migrateConversationFacts = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all conversation facts
    const allFacts = await ctx.db.query("conversationFacts").collect();
    
    console.log(`Found ${allFacts.length} conversation facts to migrate`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const fact of allFacts) {
      const factAny = fact as any;
      
      // Check if already migrated (has userId and no speaker field at all)
      if (factAny.userId && !('speaker' in factAny)) {
        console.log(`Fact ${fact._id} already migrated, skipping`);
        skipped++;
        continue;
      }
      
      // Get the conversation to extract initiatorUserId
      const conversation = await ctx.db.get(fact.conversationId);
      
      if (!conversation) {
        console.error(`Conversation ${fact.conversationId} not found for fact ${fact._id}`);
        continue;
      }
      
      // Replace the document to remove speaker field
      await ctx.db.replace(fact._id, {
        conversationId: fact.conversationId,
        userId: factAny.userId || conversation.initiatorUserId,
        facts: fact.facts,
      });
      
      migrated++;
      
      console.log(`Migrated fact ${fact._id}: removed speaker, ensured userId ${factAny.userId || conversation.initiatorUserId}`);
    }
    
    console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped`);
    
    return {
      total: allFacts.length,
      migrated,
      skipped,
    };
  },
});
