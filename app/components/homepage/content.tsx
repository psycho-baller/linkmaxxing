import { Button } from "~/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router";

export default function ContentSection() {
  return (
    <section id="features" className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-6 md:grid-cols-2 md:gap-12">
          <h2 className="text-4xl font-medium">
            A mirror for how you talk — so you can maxx out how you link.
          </h2>
          <div className="space-y-6">
            <p>
              We're flooded with noise, trapped in surface-level conversations, and robbed of real presence. 
              LinkMaxxing was born from one question: <span className="font-semibold italic">How can we help people truly connect—not just exist near each other?</span>
            </p>
            <p>
              The problem isn't just what we say—it's <span className="font-bold">how we say it.</span> From filler words to unfocused rambles, 
              most of us don't realize how much we get in our own way. LinkMaxxing gives you the power to understand 
              and improve how you speak, with the ultimate goal to unlock deeper relationships through better conversations.
            </p>
            <p className="text-muted-foreground text-sm">
              Privacy-first. On-device processing. Your conversations stay yours—like a therapist that would never share personal info with anyone else.
            </p>
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="gap-1 pr-1.5"
            >
              <Link to="#how-it-works">
                <span>See How It Works</span>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
