"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { GENRE_OPTIONS, type Novel } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/**
 * Global Create Novel Dialog.
 * This component is rendered at the page level (page.tsx) so that
 * the create dialog is accessible from ANY view (Dashboard, Novels, etc.)
 */
export function CreateNovelDialog() {
  const {
    isCreatingNovel,
    setIsCreatingNovel,
    setNovels,
    novels,
    setSelectedNovel,
    setCurrentView,
  } = useAppStore();

  const { toast } = useToast();

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formGenre, setFormGenre] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setFormTitle("");
    setFormDescription("");
    setFormGenre("");
    setSubmitting(false);
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetForm();
        setIsCreatingNovel(false);
      }
    },
    [resetForm, setIsCreatingNovel]
  );

  const handleSubmit = useCallback(async () => {
    if (!formTitle.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/novels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim(),
          genre: formGenre,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "创建失败");
      }

      const novel: Novel = await res.json();
      resetForm();
      setIsCreatingNovel(false);

      // Update novels list
      const updatedNovels = [novel, ...novels];
      setNovels(updatedNovels);

      // Navigate to workspace
      setSelectedNovel(novel.id);
      setCurrentView("workspace");

      toast({
        title: "作品创建成功",
        description: `《${novel.title}》已创建，开始你的创作吧！`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "创建作品失败，请重试";
      toast({
        title: "创建失败",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    formTitle,
    formDescription,
    formGenre,
    submitting,
    resetForm,
    setIsCreatingNovel,
    setNovels,
    novels,
    setSelectedNovel,
    setCurrentView,
    toast,
  ]);

  return (
    <Dialog open={isCreatingNovel} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>创建新作品</DialogTitle>
          <DialogDescription>
            填写基本信息，开始你的网文创作之旅
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="novel-title">作品标题 *</Label>
            <Input
              id="novel-title"
              placeholder="输入你的作品标题"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="novel-genre">作品类型</Label>
            <Select value={formGenre} onValueChange={setFormGenre}>
              <SelectTrigger>
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                {GENRE_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="novel-desc">作品简介</Label>
            <Textarea
              id="novel-desc"
              placeholder="简要描述你的故事..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formTitle.trim() || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                创建中...
              </>
            ) : (
              "创建并开始"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
