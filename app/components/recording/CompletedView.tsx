import { useState, useEffect } from "react";
import { Play, Pause, Download, Users, Clock, TrendingUp, Sparkles } from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import SpeechAnalytics from "../analytics/SpeechAnalytics";
import { Button } from "../ui/button";

interface CompletedViewProps {
  conversationId: string;
  conversation: any;
}

export default function CompletedView({
  conversationId,
  conversation,
}: CompletedViewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

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

  // Get analytics
  const conversationAnalytics = useQuery(api.analytics.getConversationAnalytics, {
    conversationId: conversationId as Id<"conversations">,
  }) || [];

  // Debug log whenever analytics changes
  useEffect(() => {
    console.log("📊 Analytics data updated:", conversationAnalytics);
  }, [conversationAnalytics]);

  const analyzeUserSpeech = useMutation(api.analytics.analyzeUserSpeech);
  const generateSuggestions = useAction(api.analytics.generateWeakWordSuggestions);

  // Auto-analyze when conversation is complete
  useEffect(() => {
    const runAnalysis = async () => {
      console.log("=== ANALYTICS EFFECT ===");
      console.log("Conversation:", conversation);
      console.log("Existing analytics count:", conversationAnalytics.length);
      console.log("Is analyzing:", isAnalyzing);
      console.log("Transcript turns:", transcriptTurns.length);

      if (conversation && conversationAnalytics.length === 0 && !isAnalyzing) {
        console.log("✅ Starting analysis...");
        setIsAnalyzing(true);
        try {
          // Analyze initiator
          if (conversation.initiatorUserId) {
            console.log("📊 Analyzing initiator:", conversation.initiatorUserId);
            const result = await analyzeUserSpeech({
              conversationId: conversationId as Id<"conversations">,
              userId: conversation.initiatorUserId,
            });
            console.log("✅ Initiator analysis complete:", result);
          } else {
            console.log("⚠️ No initiator userId found");
          }

          // Analyze scanner if exists
          if (conversation.scannerUserId) {
            console.log("📊 Analyzing scanner:", conversation.scannerUserId);
            const result = await analyzeUserSpeech({
              conversationId: conversationId as Id<"conversations">,
              userId: conversation.scannerUserId,
            });
            console.log("✅ Scanner analysis complete:", result);
          } else {
            console.log("No scanner userId (solo conversation)");
          }
        } catch (error) {
          console.error("❌ Error analyzing speech:", error);
        } finally {
          setIsAnalyzing(false);
          console.log("=== ANALYSIS COMPLETE ===");
        }
      } else {
        if (!conversation) console.log("No conversation data");
        if (conversationAnalytics.length > 0) console.log("Analytics already exist");
        if (isAnalyzing) console.log("Already analyzing");
      }
    };

    runAnalysis();
  }, [conversation, conversationAnalytics.length]);

  const handleGenerateSuggestions = async (userId: Id<"users">) => {
    console.log("=== GENERATING AI SUGGESTIONS ===");
    console.log("User ID:", userId);
    console.log("Conversation ID:", conversationId);

    setIsGeneratingSuggestions(true);
    try {
      const result = await generateSuggestions({
        conversationId: conversationId as Id<"conversations">,
        userId,
      });
      console.log("✅ Suggestions generated:", result);
    } catch (error) {
      console.error("❌ Error generating suggestions:", error);
    } finally {
      setIsGeneratingSuggestions(false);
      console.log("=== SUGGESTIONS COMPLETE ===");
    }
  };

  // Get unique user IDs from transcript
  const userIds = Array.from(
    new Set(transcriptTurns.map((turn) => turn.userId))
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

  // Helper function to get user name from userId
  const getUserName = (userId: Id<"users">) => {
    if (initiatorUser && userId === conversation.initiatorUserId) {
      return initiatorUser.name || "Speaker 1";
    } else if (scannerUser && userId === conversation.scannerUserId) {
      return scannerUser.name || "Speaker 2";
    }
    return "Unknown";
  };

  const handleDownload = () => {
    // Create downloadable transcript
    const transcriptText = transcriptTurns
      .map((turn) => `${getUserName(turn.userId)}: ${turn.text}`)
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
            <span className="text-muted-foreground">{userIds.length} participants</span>
          </div>
          <div className="text-muted-foreground">
            {formatDate(conversation._creationTime)}
          </div>
        </div>
      </div>

      {/* Analytics Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant={showAnalytics ? "default" : "outline"}
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="gap-2">
          <TrendingUp className="w-4 h-4" />
          {showAnalytics ? "Hide" : "Show"} Analytics
        </Button>
        {conversationAnalytics.length > 0 && !isGeneratingSuggestions && (
          <Button
            variant="outline"
            onClick={() => {
              if (conversation.initiatorUserId) {
                handleGenerateSuggestions(conversation.initiatorUserId);
              }
            }}
            className="gap-2">
            <Sparkles className="w-4 h-4" />
            Get AI Suggestions
          </Button>
        )}
      </div>

      {/* Analytics Display */}
      {showAnalytics && conversationAnalytics.length > 0 && (
        <div className="space-y-6">
          {conversationAnalytics.map((analytics) => {
            const user =
              analytics.userId === conversation.initiatorUserId
                ? initiatorUser
                : scannerUser;
            return (
              <div key={analytics._id} className="bg-muted/30 rounded-xl p-4">
                <SpeechAnalytics
                  analytics={analytics}
                  userName={user?.name || "Unknown"}
                />
              </div>
            );
          })}
        </div>
      )}

      {isAnalyzing && (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Analyzing communication patterns...</span>
          </div>
        </div>
      )}

      {/* User Filter */}
      {userIds.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedUserId(null)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedUserId === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}>
            All Participants
          </button>
          {userIds.map((userId) => (
            <button
              key={userId}
              onClick={() => setSelectedUserId(userId)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedUserId === userId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}>
              {getUserName(userId as Id<"users">)}
            </button>
          ))}
        </div>
      )}

      {/* Transcript */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-foreground mb-4">Transcript</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {transcriptTurns
            .filter((turn) => !selectedUserId || turn.userId === selectedUserId)
            .map((turn, index) => {
              const userName = getUserName(turn.userId);
              return (
                <div key={turn._id} className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-xs font-medium text-primary-foreground">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {userName}
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{turn.text}</p>
                  </div>
                </div>
              );
            })}
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
