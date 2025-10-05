"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { BatchClient } from "@speechmatics/batch-client";

/**
 * Transcribe audio file using Speechmatics Batch API
 * This provides more accurate transcription than real-time, processed after recording ends
 */
export const batchTranscribe = action({
  args: {
    storageId: v.id("_storage"),
    conversationId: v.id("conversations"),
    initiatorUserName: v.string(),
    scannerUserName: v.string(),
  },
  returns: v.object({
    transcript: v.array(
      v.object({
        speaker: v.string(),
        text: v.string(),
        startTime: v.number(),
        endTime: v.number(),
      })
    ),
    metadata: v.any(),
  }),
  handler: async (ctx, args) => {
    console.log("Starting batch transcription for conversation:", args.conversationId);

    // Get audio file from storage
    const audioBlob = await ctx.storage.get(args.storageId);
    if (!audioBlob) {
      throw new Error("Audio file not found in storage");
    }

    // Convert blob to buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`Audio file size: ${buffer.length} bytes`);
    console.log(`Audio MIME type: ${audioBlob.type}`);

    // Determine file extension based on MIME type
    const mimeType = audioBlob.type || "audio/webm";
    let extension = "webm";
    if (mimeType.includes("mp4")) extension = "mp4";
    else if (mimeType.includes("mpeg") || mimeType.includes("mp3")) extension = "mp3";
    else if (mimeType.includes("ogg")) extension = "ogg";
    else if (mimeType.includes("wav")) extension = "wav";
    else if (mimeType.includes("flac")) extension = "flac";
    else if (mimeType.includes("m4a")) extension = "m4a";

    console.log(`Using file extension: ${extension}`);

    // Create File object for Speechmatics
    // Speechmatics supports: mp3, wav, ogg, flac, m4a, opus
    const file = new File([buffer], `recording.${extension}`, { type: mimeType });

    // Initialize Speechmatics batch client
    const client = new BatchClient({
      apiKey: process.env.SPEECHMATICS_API_KEY!,
      appId: "convex-batch-transcription",
    });

    console.log("Sending file to Speechmatics batch API...");

    try {
      // Transcribe with speaker diarization
      const response = await client.transcribe(
        file,
        {
          transcription_config: {
            language: "en",
            operating_point: "enhanced",
            diarization: "speaker",
            speaker_diarization_config: {
              // max_speakers: 2,
              // prefer_current_speaker: true,
              // speaker_sensitivity: 1,
            },
          },
        },
        "json-v2"
      );

      console.log("Batch transcription complete!");
      return processTranscriptResponse(response);
    } catch (error: any) {
      console.error("Speechmatics error:", error);
      console.error("Error details:", error.message);
      if (error.response) {
        console.error("Error response:", JSON.stringify(error.response));
      }
      throw new Error(`Speechmatics transcription failed: ${error.message}`);
    }
  },
});

// Helper function to process transcript response
function processTranscriptResponse(response: any) {
  // Process results into structured format
  const transcript: Array<{
    speaker: string;
    text: string;
    startTime: number;
    endTime: number;
  }> = [];

  if (typeof response !== "string" && response.results) {
    let currentTurn: {
      speaker: string;
      text: string;
      startTime: number;
      endTime: number;
    } | null = null;

    for (const result of response.results) {
      if (result.type === "word") {
        const speaker = result.alternatives?.[0]?.speaker || "Unknown";
        const content = result.alternatives?.[0]?.content || "";
        const startTime = result.start_time || 0;
        const endTime = result.end_time || 0;

        // If new speaker or first word, create new turn
        if (!currentTurn || currentTurn.speaker !== speaker) {
          if (currentTurn) {
            transcript.push(currentTurn);
          }
          currentTurn = {
            speaker,
            text: content,
            startTime,
            endTime,
          };
        } else {
          // Same speaker, append text
          currentTurn.text += " " + content;
          currentTurn.endTime = endTime;
        }
      } else if (result.type === "punctuation" && currentTurn) {
        // Add punctuation
        currentTurn.text += result.alternatives?.[0]?.content || "";
      }
    }

    // Push last turn
    if (currentTurn) {
      transcript.push(currentTurn);
    }
  }

  console.log(`Processed ${transcript.length} conversation turns from batch transcription`);

  return {
    transcript,
    metadata: {
      format: typeof response === "string" ? "text" : "json-v2",
      processingTime: Date.now(),
    },
  };
}
