import { MoveUpRight } from "lucide-react";
import { useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface ConversationHistoryProps {
  className?: string;
  onScrollBack?: () => void;
}

export default function ConversationHistory({
  className = "",
  onScrollBack,
}: ConversationHistoryProps) {
  const navigate = useNavigate();
  const conversations = useQuery(api.conversations.list) || [];

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const getConversationTitle = (conv: any) => {
    return conv.location || `Conversation ${conv._id.slice(0, 8)}`;
  };

  const handleScrollBack = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (onScrollBack) {
      onScrollBack();
    }
  };

  return (
    <div className={`text-white w-full ${className}`}>
      {conversations.length === 0 ? (
        <p className="text-gray-400 text-sm text-center">
          Your conversation history will appear here
        </p>
      ) : (
        <div className="w-full max-w-md mx-auto space-y-3">
          {conversations.map((conversation) => (
            <div
              key={conversation._id}
              onClick={() => navigate(`conversations/${conversation._id}`)}
              className="bg-[#353E41] rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-slate-600 transition-colors">
              <div className="flex flex-col">
                <h3
                  className="text-white text-sm font-medium"
                  style={{ fontFamily: "Simonetta, serif" }}>
                  {getConversationTitle(conversation)}
                </h3>
                <p className="text-gray-400 text-xs mt-1">
                  {formatDate(conversation._creationTime)}
                </p>
                <p className="text-gray-500 text-xs mt-1 capitalize">
                  {conversation.status}
                </p>
              </div>
              <MoveUpRight className="w-4 h-4 text-gray-400" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
