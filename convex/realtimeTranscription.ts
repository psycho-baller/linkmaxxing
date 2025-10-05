"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { generateObject } from "ai";
import { openai as openaiProvider } from "@ai-sdk/openai";
import { z } from "zod";
import { ZepClient } from "@getzep/zep-cloud";

const zepClient = new ZepClient({
  apiKey: process.env.ZEP_API_KEY!,
});

const GRAPH_ID = process.env.ZEP_GRAPH_ID || "all_users_htn";

/**
 * Process real-time transcript from Speechmatics with speaker labels
 * This replaces the OpenAI Whisper transcription step
 */
export const processRealtimeTranscript = action({
  args: {
    conversationId: v.id("conversations"),
    transcriptTurns: v.array(
      v.object({
        speaker: v.string(),
        text: v.string(),
        startTime: v.number(),
        endTime: v.number(),
      })
    ),
    userEmail: v.optional(v.string()),
    userName: v.optional(v.string()),
  },
  returns: v.object({
    transcript: v.array(v.object({ speaker: v.string(), text: v.string() })),
    facts: v.any(),
    summary: v.string(),
  }),
  handler: async (ctx, args) => {
    console.log("Processing real-time transcript with speaker labels...");
    console.log(`Received ${args.transcriptTurns.length} conversation turns`);

    // Format transcript for AI processing
    const formattedTranscript = args.transcriptTurns
      .map(
        (turn) =>
          //[${turn.startTime.toFixed(2)}-${turn.endTime.toFixed(2)}]
          `${turn.speaker}: ${turn.text}`
      )
      .join("\n");

    console.log("Formatted transcript:", formattedTranscript);

    // Process with AI for structured output and speaker name identification
    const { object: parsedResult } = await generateObject({
      model: openaiProvider("gpt-4o"),
      schema: z.object({
        transcript: z.array(
          z.object({
            speaker: z.string().describe("Name or identifier of the speaker (try to identify actual names from context)"),
            text: z.string().describe("What the speaker said"),
          })
        ),
        facts: z.record(
          z.string(),
          z.array(z.string())
        ).describe("Facts extracted for each speaker, with speaker name as key"),
        summary: z.string().describe("Brief summary of the conversation"),
      }),
      prompt: `You are an AI assistant that processes audio transcripts with speaker labels. The speakers are labeled as S1, S2, etc. Try to identify their actual names from the conversation context.

REQUIREMENTS:
- Speakers are labeled as "S1", "S2" by the speech recognition system
- Try to deduce the speakers' actual names from the transcript (e.g., if someone says "Hi, I'm John", that speaker should be labeled "John")
- If someone addresses another person by name, that name belongs to the OTHER speaker
- If you cannot determine actual names, use descriptive labels like "Speaker 1", "Speaker 2"
- Merge the transcript turns into a clean conversation format
- Extract only explicit, concrete facts directly stated by each person
- Do not include questions, opinions, or interpretations in facts

TRANSCRIPT WITH SPEAKER LABELS:
${formattedTranscript}

Provide:
1. transcript: Array of conversation turns with identified speaker names (not S1/S2)
2. facts: Key facts extracted for each speaker separately (using identified names)
3. summary: Concise summary of key points and outcomes`,
    });

    console.log("AI processing complete:", parsedResult);

    // Process with Zep if available
    if (parsedResult.transcript && parsedResult.facts) {
      try {
        await processWithZep(
          parsedResult,
          args.conversationId,
          args.userEmail,
          args.userName
        );
      } catch (error) {
        console.error("Zep processing error:", error);
        // Continue without Zep
      }
    }

    // Save to Convex database
    await ctx.runMutation(api.conversations.saveTranscriptData, {
      conversationId: args.conversationId,
      transcript: parsedResult.transcript,
      facts: parsedResult.facts,
      summary: parsedResult.summary,
    });

    return {
      transcript: parsedResult.transcript,
      facts: parsedResult.facts,
      summary: parsedResult.summary,
    };
  },
});

// Helper function to process with Zep (same as in transcription.ts)
async function processWithZep(
  parsedResult: any,
  conversationId: Id<"conversations">,
  userEmail?: string,
  userName?: string
) {
  // Ensure graph exists
  try {
    await zepClient.graph.get(GRAPH_ID);
  } catch {
    await zepClient.graph.create({
      graphId: GRAPH_ID,
    });
  }

  // Get unique speakers
  const speakers = new Set<string>();
  for (const turn of parsedResult.transcript) {
    if (turn.speaker) {
      speakers.add(turn.speaker);
    }
  }

  console.log("Identified speakers:", Array.from(speakers));

  // Create user entities
  for (const speaker of speakers) {
    await createUserEntity(speaker, userEmail, userName);
  }

  // Extract and store entities from facts
  await extractAndStoreEntities(parsedResult.facts, speakers);

  // Create friendship relationships
  await createFriendshipRelationships(speakers);

  // Store conversation summary
  await storeConversationSummary(parsedResult.summary, conversationId, speakers);
}

async function createUserEntity(speaker: string, userEmail?: string, userName?: string) {
  try {
    const searchResults = await zepClient.graph.search({
      graphId: GRAPH_ID,
      query: speaker,
      scope: "nodes",
      searchFilters: { nodeLabels: ["User"] },
      limit: 1,
    });

    if (searchResults.nodes && searchResults.nodes.length > 0) {
      console.log(`User ${speaker} already exists`);
      return;
    }

    const userData = {
      action: "Create_entity",
      entity_type: "User",
      name: speaker,
      description: `User identified from conversation: ${speaker}`,
    };

    await zepClient.graph.add({
      data: JSON.stringify(userData),
      type: "json",
      graphId: GRAPH_ID,
    });

    console.log(`Created user entity: ${speaker}`);
  } catch (error) {
    console.error(`Failed to create user entity ${speaker}:`, error);
  }
}

async function extractAndStoreEntities(facts: Record<string, string[]>, speakers: Set<string>) {
  const entityPatterns: Record<string, RegExp[]> = {
    Goal: [
      /(?:wants to|plans to|hopes to|aims to|goal is to|trying to)\s+(.+)/i,
      /(?:my goal is|i want to|i plan to|i hope to|i aim to)\s+(.+)/i,
    ],
    Language: [
      /(?:speaks|knows|fluent in|can speak)\s+([\w\s]+?)(?:\s+(?:language|fluently))?/i,
      /(?:native|bilingual|multilingual)\s+(?:in\s+)?([\w\s]+)/i,
    ],
    Organization: [
      /(?:works at|employed by|job at|working at)\s+(.+)/i,
      /(?:my job is at|i work at|employed at)\s+(.+)/i,
    ],
    Topic: [
      /(?:interested in|likes|enjoys|passionate about|loves|into)\s+(.+)/i,
      /(?:my interest is|i like|i enjoy|i love)\s+(.+)/i,
    ],
    Trait: [
      /(?:is|personality|character).*?(outgoing|introverted|friendly|shy|confident|creative|analytical|organized|spontaneous|patient|ambitious|calm|energetic)/i,
      /(?:i am|i'm)\s+(outgoing|introverted|friendly|shy|confident|creative|analytical|organized|spontaneous|patient|ambitious|calm|energetic)/i,
    ],
  };

  const relationshipTypes: Record<string, string> = {
    Goal: "HAS_GOAL",
    Language: "SPEAKS",
    Organization: "WORKS_AT",
    Topic: "INTERESTED_IN",
    Trait: "HAS_TRAIT",
  };

  for (const [speaker, speakerFacts] of Object.entries(facts)) {
    for (const fact of speakerFacts) {
      for (const [entityType, patterns] of Object.entries(entityPatterns)) {
        for (const pattern of patterns) {
          const match = pattern.exec(fact);
          if (match) {
            const entityName = match[1].trim();

            if (entityName.length < 2 || ["it", "that", "this", "them"].includes(entityName.toLowerCase())) {
              continue;
            }

            try {
              // Create entity
              const entityData = {
                action: "Create_entity",
                entity_type: entityType,
                name: entityName,
                description: fact,
              };

              await zepClient.graph.add({
                data: JSON.stringify(entityData),
                type: "json",
                graphId: GRAPH_ID,
              });

              // Create relationship
              const relationshipData = {
                action: "Create_relationship",
                source_entity_type: "User",
                source_entity_name: speaker,
                target_entity_type: entityType,
                target_entity_name: entityName,
                relationship_type: relationshipTypes[entityType],
                description: fact,
              };

              await zepClient.graph.add({
                data: JSON.stringify(relationshipData),
                type: "json",
                graphId: GRAPH_ID,
              });

              console.log(`Created relationship: ${speaker} -> ${relationshipTypes[entityType]} -> ${entityName}`);
            } catch (error) {
              console.error(`Failed to create entity/relationship for ${entityName}:`, error);
            }

            break;
          }
        }
      }
    }
  }
}

async function createFriendshipRelationships(speakers: Set<string>) {
  if (speakers.size < 2) return;

  const speakerList = Array.from(speakers);
  for (let i = 0; i < speakerList.length; i++) {
    for (let j = i + 1; j < speakerList.length; j++) {
      const speaker1 = speakerList[i];
      const speaker2 = speakerList[j];

      for (const [source, target] of [[speaker1, speaker2], [speaker2, speaker1]]) {
        try {
          const friendshipData = {
            action: "Create_relationship",
            source_entity_type: "User",
            source_entity_name: source,
            target_entity_type: "User",
            target_entity_name: target,
            relationship_type: "FRIENDS_WITH",
            description: "Friends based on conversation",
          };

          await zepClient.graph.add({
            data: JSON.stringify(friendshipData),
            type: "json",
            graphId: GRAPH_ID,
          });
        } catch (error) {
          console.error(`Failed to create friendship ${source} -> ${target}:`, error);
        }
      }

      console.log(`Created friendship: ${speaker1} <-> ${speaker2}`);
    }
  }
}

async function storeConversationSummary(
  summary: string,
  conversationId: Id<"conversations">,
  speakers: Set<string>
) {
  try {
    const conversationName = `Conversation_${conversationId}_${Date.now()}`;

    const summaryData = {
      action: "Create_entity",
      entity_type: "Conversation",
      name: conversationName,
      description: `Summary: ${summary} | Participants: ${Array.from(speakers).join(", ")} | ConversationID: ${conversationId}`,
    };

    await zepClient.graph.add({
      data: JSON.stringify(summaryData),
      type: "json",
      graphId: GRAPH_ID,
    });

    // Create participation relationships
    for (const speaker of speakers) {
      try {
        const participationData = {
          action: "Create_relationship",
          source_entity_type: "User",
          source_entity_name: speaker,
          target_entity_type: "Conversation",
          target_entity_name: conversationName,
          relationship_type: "PARTICIPATED_IN",
          description: `Participated in conversation on ${new Date().toISOString()}`,
        };

        await zepClient.graph.add({
          data: JSON.stringify(participationData),
          type: "json",
          graphId: GRAPH_ID,
        });
      } catch (error) {
        console.error(`Failed to create participation for ${speaker}:`, error);
      }
    }

    console.log(`Added conversation summary to graph: ${conversationName}`);
  } catch (error) {
    console.error("Failed to add conversation summary:", error);
  }
}
