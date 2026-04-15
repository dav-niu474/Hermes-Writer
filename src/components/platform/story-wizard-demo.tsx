"use client";

import { useState, useEffect } from "react";
import { StoryWizard } from "@/components/platform/story-wizard";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useAppStore } from "@/lib/store";

/**
 * Floating demo button + StoryWizard integration.
 * Renders a floating "一键创作" button on the dashboard that opens the StoryWizard.
 */
export function StoryWizardDemoButton() {
  const { currentView } = useAppStore();
  const [wizardOpen, setWizardOpen] = useState(false);

  // Only show on dashboard
  if (currentView !== "dashboard") return null;

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        onClick={() => setWizardOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 pl-4 pr-5 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:from-amber-600 hover:to-orange-600 transition-all duration-200 hover:scale-105 active:scale-95 group"
      >
        <Sparkles className="size-5" />
        <span className="font-semibold text-sm">一键创作</span>
      </button>

      {/* Story Wizard Dialog */}
      <StoryWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onComplete={() => {
          // After wizard completes, could navigate to workspace
        }}
      />
    </>
  );
}
