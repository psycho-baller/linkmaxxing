import { useState, useEffect, useRef } from "react";
import { Mic, Users, Clock } from "lucide-react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import BubbleField from "../BubbleField";
import CircleBlobs from "../CircleBlobs";
import WaitingView from "./WaitingView";
import { useAuth, useUser } from "@clerk/react-router";

interface CurrentViewProps {
  conversationId: string;
}

export default function CurrentView({ conversationId }: CurrentViewProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  
  // Get current user and conversation data
  const currentUser = useQuery(api.users.getCurrentUser);
  const conversation = useQuery(
    api.conversations.get,
    { id: conversationId as Id<"conversations"> }
  );
  const [duration, setDuration] = useState(0);
  const [startTime] = useState<number>(Date.now());
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptResult, setTranscriptResult] = useState<any>(null);
  const [autoStarted, setAutoStarted] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const generateUploadUrl = useMutation(api.conversations.generateUploadUrl);
  const saveAudioStorageId = useMutation(api.conversations.saveAudioStorageId);
  const transcribeAudio = useAction(api.transcription.transcribeAudio);

  // Check if current user is the scanner (not the initiator)
  const isScanner = currentUser && conversation && currentUser._id === conversation.scannerUserId;

  // Auto-start recording when component mounts (only for initiator)
  useEffect(() => {
    if (!autoStarted && currentUser && conversation && !isScanner) {
      setAutoStarted(true);
      setTimeout(() => {
        startRecording();
      }, 500);
    }
  }, [autoStarted, currentUser, conversation, isScanner]);

  // Timer for recording duration
  useEffect(() => {
    const interval = setInterval(() => {
      const newDuration = Math.floor((Date.now() - startTime) / 1000);
      setDuration(newDuration);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      // Clear previous audio chunks
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Create audio blob from collected chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        // Clean up
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);

        // Process transcript
        setIsProcessing(true);
        try {
          // Upload audio to Convex storage
          const uploadUrl = await generateUploadUrl();

          const uploadResult = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": audioBlob.type },
            body: audioBlob,
          });

          const { storageId } = await uploadResult.json();

          // Save storage ID
          await saveAudioStorageId({
            conversationId: conversationId as Id<"conversations">,
            storageId,
          });

          // Transcribe audio
          console.log("Transcribing audio...");
          const result = await transcribeAudio({
            storageId,
            conversationId: conversationId as Id<"conversations">,
            userEmail: user?.primaryEmailAddress?.emailAddress,
            userName: user?.fullName || user?.firstName || undefined,
          });

          console.log("Transcript result:", result);
          setTranscriptResult(result);
        } catch (error) {
          console.error("Error processing transcript:", error);
          alert("Error processing recording. Please try again.");
        } finally {
          setIsProcessing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Unable to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
    }
  };

  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  // If loading user or conversation data
  if (!currentUser || !conversation) {
    return (
      <div className="w-full max-w-md flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }
  
  // If user is the scanner, show waiting view
  if (isScanner) {
    return <WaitingView conversationId={conversationId} />;
  }

  // Otherwise, show recording UI for the initiator
  return (
    <div className="w-full max-w-md space-y-8">
      {/* Main Content - Circle Section */}
      <div className="flex items-center justify-center px-6">
        <BubbleField isRecording={isRecording} />

        <div className="flex flex-col items-center">
          {/* Record Circle */}
          <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
            {/* White aura / glow */}
            {isRecording && (
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  boxShadow: "0 0 30px 15px rgba(255,255,255,0.5)",
                  animation: "pulseAura 1.5s infinite alternate",
                }}
              />
            )}

            {/* Actual button */}
            <button
              onClick={handleRecordClick}
              disabled={isProcessing}
              className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all cursor-pointer
                ${isRecording ? "bg-white/80" : "bg-gray-300"}
                ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}>
              {isProcessing ? (
                <div className="w-6 h-6 border-2 border-gray-700 border-t-transparent rounded-full animate-spin" />
              ) : isRecording ? (
                <div className="">
                  <CircleBlobs isRecording={true} onClick={handleRecordClick} />
                </div>
              ) : (
                <Mic className="w-8 h-8 text-gray-700" />
              )}
            </button>
          </div>

          {/* Add this CSS in your global stylesheet or tailwind config */}
          <style>{`
            @keyframes pulseAura {
              0% {
                box-shadow: 0 0 5px 5px rgba(255, 255, 255, 0.4);
              }
              100% {
                box-shadow: 0 0 15px 10px rgba(255, 255, 255, 0.6);
              }
            }
          `}</style>

          {/* Status text */}
          <div className="text-center mb-6">
            <p
              className="text-gray-300 text-lg"
              style={{ fontFamily: "Simonetta, serif" }}>
              {isProcessing
                ? "Processing..."
                : isRecording
                ? "Recording..."
                : "Tap to record..."}
            </p>
          </div>
        </div>
      </div>

      {/* Recording Stats */}
      <div className="bg-[#353E41] rounded-2xl p-4 w-full space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Duration</span>
          </div>
          <span className="text-lg font-mono text-white">
            {formatDuration(duration)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Participants</span>
          </div>
          <span className="text-sm text-white">2 active</span>
        </div>
      </div>

      {/* Transcript Results */}
      {transcriptResult && (
        <div className="bg-[#353E41] rounded-2xl p-4 space-y-4">
          <h3 className="text-lg font-medium">Recording Complete!</h3>
          <div className="space-y-2">
            <p className="text-sm text-gray-300">
              {transcriptResult.transcript?.length || 0} conversation turns
              processed
            </p>
            {transcriptResult.summary && (
              <p className="text-xs text-gray-400">{transcriptResult.summary}</p>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-400">
          Continue your conversation naturally
        </p>
        <p className="text-xs text-gray-500">
          Tap the button to stop recording when finished
        </p>
      </div>
    </div>
  );
}
