import { useAuth } from "@clerk/react-router";
import { useNavigate } from "react-router";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import ConversationHistory from "../components/ConversationHistory";
import { Users, Phone } from "lucide-react";
import { useState } from "react";

export default function RecordPage() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const createConversation = useMutation(api.conversations.create);
  const [isCreating, setIsCreating] = useState(false);

  if (!isSignedIn) {
    navigate("/sign-in");
    return null;
  }

  const handleStartRecording = async () => {
    try {
      setIsCreating(true);
      const result = await createConversation({
        location: "Mount Royal University Library",
      });
      navigate(`/conversations/${result.id}`);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      alert("Failed to start recording. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-[#343D40] to-[#131519]">
      {/* Top section with conversation history */}
      <div className="flex-grow overflow-auto px-6 pb-4">
        <div className="flex justify-start mt-5 mb-4"></div>

        <h1
          className="text-2xl font-normal text-gray-200 mb-8 text-center"
          style={{ fontFamily: "Simonetta, serif" }}>
          Conversation History
        </h1>

        <ConversationHistory />
      </div>

      {/* Bottom Section - Two Side-by-Side Cards */}
      <div className="flex-shrink-0 pb-8 px-6">
        <div className="space-y-4">
          {/* Cards with justify-between */}
          <div className="flex justify-between">
            {/* Access your network card */}
            <a
              href="/network"
              className="bg-[#353E41] rounded-2xl w-40 h-16 flex items-center justify-between px-4 cursor-pointer hover:bg-slate-600 transition-colors">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-300" />
                <p className="text-white text-sm">Network</p>
              </div>
            </a>

            {/* Phone icon */}
            <a
              href={`tel:${import.meta.env.VITE_TWILIO_PHONE_NUMBER || ""}`}
              className="bg-[#353E41] rounded-2xl w-16 h-16 flex items-center justify-center hover:bg-slate-600 transition-colors">
              <Phone className="w-5 h-5 text-gray-300" />
            </a>

            {/* WhatsApp icon */}
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#353E41] rounded-2xl w-16 h-16 flex items-center justify-center hover:bg-slate-600 transition-colors">
              <svg
                className="w-6 h-6 text-gray-300"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg">
                <path d="M17.6 6.32A8.78 8.78 0 0 0 12.23 4 8.91 8.91 0 0 0 3.39 13a9 9 0 0 0 1.28 4.57L3.26 22l4.51-1.17a8.91 8.91 0 0 0 13.14-7.72 8.83 8.83 0 0 0-3.31-6.79ZM12.23 20.26a7.43 7.43 0 0 1-3.8-1l-.27-.16-2.82.74.76-2.76-.18-.28a7.42 7.42 0 0 1-1.17-4 7.4 7.4 0 0 1 7.44-7.44 7.54 7.54 0 0 1 5.34 2.2 7.31 7.31 0 0 1 2.17 5.25 7.43 7.43 0 0 1-7.47 7.45Zm4.07-5.55c-.22-.11-1.32-.65-1.53-.73s-.35-.11-.5.11-.58.73-.71.88-.26.17-.48.06a6 6 0 0 1-1.78-1.09 6.81 6.81 0 0 1-1.23-1.53c-.13-.22 0-.34.1-.45s.22-.25.33-.38a1.41 1.41 0 0 0 .22-.36.41.41 0 0 0 0-.38c0-.11-.5-1.2-.69-1.65s-.36-.37-.5-.38h-.42a.82.82 0 0 0-.58.27 2.41 2.41 0 0 0-.78 1.81 4.28 4.28 0 0 0 .88 2.25 9.6 9.6 0 0 0 3.73 3.26 12.32 12.32 0 0 0 1.24.46 3 3 0 0 0 1.38.09 2.3 2.3 0 0 0 1.5-1.06 1.85 1.85 0 0 0 .13-1.06c-.05-.08-.19-.13-.41-.24Z" />
              </svg>
            </a>
          </div>

          {/* Start Recording Button */}
          <div className="">
            <button
              onClick={handleStartRecording}
              disabled={isCreating}
              className="w-full bg-white text-black py-4 rounded-xl font-medium hover:bg-gray-100 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-black mr-2">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="12" r="8"></circle>
              </svg>
              <span>{isCreating ? "Creating..." : "Start Recording"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
