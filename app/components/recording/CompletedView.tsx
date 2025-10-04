import { useState } from "react";
import { Play, Pause, Download, Users, Clock } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface CompletedViewProps {
  conversationId: string;
  conversation: any;
}

export default function CompletedView({
  conversationId,
  conversation,
}: CompletedViewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);

  const transcriptTurns = useQuery(api.conversations.getTranscript, {
    conversationId: conversationId as Id<"conversations">,
  }) || [];
  
  const conversationFacts = useQuery(api.conversations.getFacts, {
    conversationId: conversationId as Id<"conversations">,
  }) || [];

  // Get unique speakers
  const speakers = Array.from(
    new Set(transcriptTurns.map((turn) => turn.speaker))
  );

  // Convert facts array to object
  const facts: Record<string, string[]> = {};
  conversationFacts.forEach((fact) => {
    facts[fact.speaker] = fact.facts;
  });

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    // TODO: Implement actual audio playback
  };

  const handleDownload = () => {
    // Create downloadable transcript
    const transcriptText = transcriptTurns
      .map((turn) => `${turn.speaker}: ${turn.text}`)
      .join("\n\n");

    const fullContent = `CONVERSATION TRANSCRIPT\n\nSummary:\n${
      conversation.summary || "No summary available"
    }\n\n${transcriptText}\n\nKey Facts:\n${Object.entries(facts)
      .map(
        ([speaker, speakerFacts]: [string, string[]]) =>
          `${speaker}:\n${speakerFacts.map((fact: string) => `- ${fact}`).join("\n")}`
      )
      .join("\n\n")}`;

    const blob = new Blob([fullContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${conversationId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateDuration = () => {
    if (conversation.startedAt && conversation.endedAt) {
      const durationMs = conversation.endedAt - conversation.startedAt;
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
    return "N/A";
  };

  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="bg-[#353E41] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Conversation Complete</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePlayPause}
              className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">
              {isPlaying ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white" />
              )}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors">
              <Download className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Conversation Stats */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">{calculateDuration()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">{speakers.length} participants</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      {conversation.summary && (
        <div className="bg-[#353E41] rounded-2xl p-6">
          <h3 className="text-lg font-medium mb-3">Summary</h3>
          <p className="text-gray-300 leading-relaxed">{conversation.summary}</p>
        </div>
      )}

      {/* Speaker Filter */}
      {speakers.length > 1 && (
        <div className="flex items-center space-x-2 flex-wrap">
          <span className="text-sm text-gray-400">Filter by speaker:</span>
          <button
            onClick={() => setSelectedSpeaker(null)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              selectedSpeaker === null
                ? "bg-blue-500 text-white"
                : "bg-gray-600 text-gray-300 hover:bg-gray-500"
            }`}>
            All
          </button>
          {speakers.map((speaker) => (
            <button
              key={speaker}
              onClick={() => setSelectedSpeaker(speaker)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                selectedSpeaker === speaker
                  ? "bg-blue-500 text-white"
                  : "bg-gray-600 text-gray-300 hover:bg-gray-500"
              }`}>
              {speaker}
            </button>
          ))}
        </div>
      )}

      {/* Transcript */}
      <div className="bg-[#353E41] rounded-2xl p-6">
        <h3 className="text-lg font-medium mb-4">Transcript</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {transcriptTurns
            .filter((turn) => !selectedSpeaker || turn.speaker === selectedSpeaker)
            .map((turn, index) => (
              <div key={turn._id} className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                    {turn.speaker.charAt(0)}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-200">
                      {turn.speaker}
                    </span>
                  </div>
                  <p className="text-gray-300 leading-relaxed">{turn.text}</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Key Facts */}
      {Object.keys(facts).length > 0 && (
        <div className="bg-[#353E41] rounded-2xl p-6">
          <h3 className="text-lg font-medium mb-4">Key Facts</h3>
          <div className="grid gap-4">
            {Object.entries(facts).map(([speaker, speakerFacts]) => (
              <div key={speaker} className="space-y-2">
                <h4 className="font-medium text-gray-200">{speaker}</h4>
                <ul className="space-y-1 ml-4">
                  {speakerFacts.map((fact: string, index: number) => (
                    <li
                      key={index}
                      className="text-gray-300 text-sm flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
