"use client";

import { useParams, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Loader2,
  ArrowLeft,
  Clock,
  MessageSquare,
  Calendar,
  MapPin,
  TrendingUp,
  FileText
} from "lucide-react";

function getInitials(name?: string | null, email?: string | null) {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
    return initials.join("");
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return "?";
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "ended":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "pending":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    default:
      return "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20";
  }
}

export default function ContactDetailPage() {
  const { userId } = useParams<{ userId: Id<"users"> }>();
  const navigate = useNavigate();
  const contactDetails = useQuery(
    api.network.getContactDetails,
    userId ? { contactId: userId as Id<"users"> } : "skip"
  );

  const isLoading = contactDetails === undefined;

  if (!userId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Invalid contact ID</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading contact details...</p>
      </div>
    );
  }

  if (!contactDetails) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold text-foreground">Contact not found</p>
        <Button onClick={() => navigate("/dashboard/network")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Network
        </Button>
      </div>
    );
  }

  const { contact, conversations, sharedFacts, stats } = contactDetails;
  const displayName = contact.name || contact.email || "Unknown";

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard/network")}
              className="mt-1">
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="flex flex-1 items-start gap-4">
              <Avatar className="h-16 w-16">
                {contact.image ? (
                  <AvatarImage src={contact.image} alt={displayName} />
                ) : null}
                <AvatarFallback className="text-lg font-medium">
                  {getInitials(contact.name, contact.email)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
                {contact.email && (
                  <p className="text-sm text-muted-foreground">{contact.email}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {stats.totalConversations} conversation{stats.totalConversations === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant="outline">
                    {formatDuration(stats.totalDuration)} total time
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Content - Left 2 columns */}
            <div className="space-y-6 lg:col-span-2">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm">Your Contributions</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.currentUserTurns}</p>
                  <p className="text-xs text-muted-foreground mt-1">transcript turns</p>
                </div>

                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">Their Contributions</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.contactTurns}</p>
                  <p className="text-xs text-muted-foreground mt-1">transcript turns</p>
                </div>
              </div>

              {/* Conversations List */}
              <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Conversations
                </h2>

                {conversations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No completed conversations yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {conversations.map((conversation) => (
                      <button
                        key={conversation._id}
                        onClick={() => navigate(`/dashboard/conversations/${conversation._id}`)}
                        className="w-full group rounded-lg border border-border bg-muted/30 p-4 text-left transition-all hover:border-primary/50 hover:bg-muted/50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-foreground">
                                {formatDate(conversation.endedAt || conversation.startedAt || conversation._creationTime)}
                              </span>
                              <Badge className={getStatusColor(conversation.status)} variant="outline">
                                {conversation.status}
                              </Badge>
                            </div>

                            {conversation.summary && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {conversation.summary}
                              </p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {conversation.startedAt && conversation.endedAt && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDuration(conversation.endedAt - conversation.startedAt)}</span>
                                </div>
                              )}
                              {conversation.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>{conversation.location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar - Right column */}
            <div className="space-y-6 md:sticky md:top-6 md:self-start">
              {/* Your Facts About Them */}
              {sharedFacts.contactFacts.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">
                      What You Know About Them
                    </h2>
                  </div>
                  <ul className="space-y-2">
                    {sharedFacts.contactFacts.map((fact, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="flex-1">{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What They Know About You */}
              {sharedFacts.currentUserFacts.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">
                      What They Know About You
                    </h2>
                  </div>
                  <ul className="space-y-2">
                    {sharedFacts.currentUserFacts.map((fact, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="flex-1">{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {sharedFacts.contactFacts.length === 0 && sharedFacts.currentUserFacts.length === 0 && (
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No shared facts yet. Complete more conversations to build your knowledge base.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
