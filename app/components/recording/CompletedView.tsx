import { useState } from "react";
import { Play, Pause, Download, Users, Clock } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

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

  // Get initiator and scanner user data
  const initiatorUser = useQuery(
    api.users.get,
    conversation?.initiatorUserId ? { id: conversation.initiatorUserId } : "skip"
  );
  const scannerUser = useQuery(
    api.users.get,
    conversation?.scannerUserId ? { id: conversation.scannerUserId } : "skip"
  );

  // Get unique speakers
  const speakers = Array.from(
    new Set(transcriptTurns.map((turn) => turn.speaker))
  );

  // Convert facts array to object, mapping userId to user name
  const facts: Record<string, string[]> = {};
  conversationFacts.forEach((fact) => {
    let userName = "Unknown";
    if (initiatorUser && fact.userId === conversation.initiatorUserId) {
      userName = initiatorUser.name || "Unknown";
    } else if (scannerUser && fact.userId === conversation.scannerUserId) {
      userName = scannerUser.name || "Unknown";
    }
    facts[userName] = fact.facts;
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
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Conversation Complete</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePlayPause}
              className="p-2 bg-primary hover:bg-primary/90 rounded-lg transition-colors">
              {isPlaying ? (
                <Pause className="w-4 h-4 text-primary-foreground" />
              ) : (
                <Play className="w-4 h-4 text-primary-foreground" />
              )}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors">
              <Download className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>

        {/* Conversation Stats */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{calculateDuration()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{speakers.length} speakers</span>
          </div>
          <div className="text-muted-foreground">
            {formatDate(conversation._creationTime)}
          </div>
        </div>
      </div>

      {/* Speaker Filter */}
      {speakers.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedSpeaker(null)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedSpeaker === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}>
            All Speakers
          </button>
          {speakers.map((speaker) => (
            <button
              key={speaker}
              onClick={() => setSelectedSpeaker(speaker)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedSpeaker === speaker
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}>
              {speaker}
            </button>
          ))}
        </div>
      )}

      {/* Transcript */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-foreground mb-4">Transcript</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {transcriptTurns
            .filter((turn) => !selectedSpeaker || turn.speaker === selectedSpeaker)
            .map((turn, index) => (
              <div key={turn._id} className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-xs font-medium text-primary-foreground">
                    {turn.speaker.charAt(0)}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {turn.speaker}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{turn.text}</p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Key Facts */}
      {Object.keys(facts).length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-foreground mb-4">Key Facts</h3>
          <div className="grid gap-4">
            {Object.entries(facts).map(([speaker, speakerFacts]) => (
              <div key={speaker} className="space-y-2">
                <h4 className="font-medium text-foreground">{speaker}</h4>
                <ul className="space-y-2 ml-4">
                  {speakerFacts.map((fact: string, index: number) => (
                    <li
                      key={index}
                      className="text-muted-foreground text-sm flex items-start">
                      <span className="text-primary mr-2 mt-1">•</span>
                      <span className="flex-1">{fact}</span>
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
