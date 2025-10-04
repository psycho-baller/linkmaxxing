import { useParams, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { MoveUpLeft } from "lucide-react";
import PendingView from "../components/recording/PendingView";
import CurrentView from "../components/recording/CurrentView";
import CompletedView from "../components/recording/CompletedView";

export default function ConversationPage() {
  const { id } = useParams<{ id: Id<"conversations"> }>();
  const navigate = useNavigate();
  const conversation = useQuery(api.conversations.get, { id: id as Id<"conversations"> });

  if (!id) {
    return (
      <div className="h-screen bg-gradient-to-b from-[#343D40] to-[#131519] text-white flex items-center justify-center">
        <p>Invalid conversation ID</p>
      </div>
    );
  }

  if (conversation === undefined) {
    return (
      <div className="h-screen bg-gradient-to-b from-[#343D40] to-[#131519] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (conversation === null) {
    return (
      <div className="h-screen bg-gradient-to-b from-[#343D40] to-[#131519] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Conversation not found</p>
          <button
            onClick={() => navigate("/record")}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (conversation.status) {
      case "pending":
        return <PendingView conversationId={id} conversation={conversation} />;
      case "active":
        return <CurrentView conversationId={id} />;
      case "ended":
        return <CompletedView conversationId={id} conversation={conversation} />;
      default:
        return <PendingView conversationId={id} conversation={conversation} />;
    }
  };

  return (
    <div className="h-screen bg-gradient-to-b from-[#343D40] to-[#131519] text-white flex flex-col">
      <button
        onClick={() => navigate("/record")}
        className="w-[30px] h-[30px] mt-5 ml-5 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-100/10 transition-colors">
        <MoveUpLeft className="w-4 h-4 text-white" />
      </button>

      <div className="flex-1 flex flex-col items-center px-6">
        <h1
          className="text-2xl font-normal text-gray-200 mb-1"
          style={{ fontFamily: "Simonetta, serif" }}>
          Conversation {id.slice(0, 8)}
        </h1>
        <p className="text-[10px] text-gray-400 mb-4">
          Status: {conversation.status.toUpperCase()}
        </p>

        {renderContent()}
      </div>
    </div>
  );
}
