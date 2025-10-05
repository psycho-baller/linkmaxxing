import { 
  MessageSquare, 
  Brain, 
  Zap, 
  Shield, 
  TrendingUp, 
  Phone, 
  Network, 
  Clock 
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Real-Time Speech Analysis",
    description: "On-device transcription powered by Whisper-tiny analyzes your conversations as they happen, tracking filler words, pacing, pauses, and sentence structure.",
  },
  {
    icon: Brain,
    title: "Intelligent Feedback",
    description: "Get personalized insights on redundancy, weak phrasing, vague language, and conciseness. See exactly how your words affect your connections.",
  },
  {
    icon: Zap,
    title: "Context-Aware Suggestions",
    description: "Receive smart rewording suggestions and coaching tips that help you communicate with clarity and intention in the moment.",
  },
  {
    icon: Shield,
    title: "Privacy-First Architecture",
    description: "Everything works on-device. Your conversations are processed locally and stay private—no data leaves your device unless you explicitly opt-in.",
  },
  {
    icon: Phone,
    title: "AI Conversation Reflection",
    description: "After each conversation, chat with an AI to reflect on what you learned about yourself and the other person, plus key topics for next time.",
  },
  {
    icon: Network,
    title: "Relationship Network Mapping",
    description: "Visualize your connections and track conversation patterns over time. Understand who you connect with and how relationships evolve.",
  },
  {
    icon: TrendingUp,
    title: "Growth Analytics",
    description: "Track your communication improvements over weeks and months. See how your filler words decrease and your clarity increases.",
  },
  {
    icon: Clock,
    title: "Speaker Diarization",
    description: "Real-time identification of different speakers in conversations, enabling precise turn-by-turn analysis and deeper insights.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="all-features" className="py-16 md:py-32 bg-muted/50">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything you need to connect better
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            LinkMaxxing combines cutting-edge AI with privacy-first design to help you unlock deeper, 
            more meaningful relationships through better communication.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-background rounded-lg border p-6 hover:border-primary/50 transition-colors"
              >
                <div className="mb-4 w-fit rounded-lg bg-primary/10 p-3">
                  <Icon className="size-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 md:mt-16 text-center">
          <p className="text-muted-foreground text-sm max-w-3xl mx-auto">
            <span className="font-semibold">Coming Soon:</span> Emotional tone detection, 
            conversation challenges, long-term memory tracking, IRL community integrations, 
            and ambient wearable mode for screen-free reflection.
          </p>
        </div>
      </div>
    </section>
  );
}
