"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import { NOVEL_STATUS_MAP, type Novel } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Plus,
  TrendingUp,
  Bot,
  FileText,
  ArrowRight,
  Sparkles,
  Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function DashboardView() {
  const {
    novels,
    setNovels,
    setCurrentView,
    setSelectedNovel,
    setIsCreatingNovel,
  } = useAppStore();

  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNovels() {
      try {
        const res = await fetch("/api/novels");
        if (res.ok) {
          const data = await res.json();
          setNovels(data);
        } else {
          toast({
            title: "加载失败",
            description: "无法获取作品列表",
            variant: "destructive",
          });
        }
      } catch (e) {
        console.error("Failed to load novels:", e);
      } finally {
        setLoading(false);
      }
    }
    loadNovels();
  }, [setNovels, toast]);

  const totalWords = novels.reduce((sum, n) => sum + n.wordCount, 0);
  const totalChapters = novels.reduce(
    (sum, n) => sum + (n._count?.chapters || 0),
    0
  );
  const writingNovels = novels.filter((n) => n.status === "writing").length;

  function openNovel(novel: Novel) {
    setSelectedNovel(novel.id);
    setCurrentView("workspace");
  }

  function openCreateDialog() {
    setIsCreatingNovel(true);
  }

  return (
    <div className="flex flex-col gap-6 p-6 overflow-y-auto h-full">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/40 flex-shrink-0">
        <div className="absolute inset-0 bg-[url('/hero-banner.png')] bg-cover bg-center opacity-20 dark:opacity-10" />
        <div className="relative flex flex-col gap-4 p-8 md:p-12">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Hermes Writer
              </h1>
              <p className="text-sm text-muted-foreground">
                AI 全流程网文创作平台
              </p>
            </div>
          </div>
          <p className="max-w-xl text-muted-foreground leading-relaxed">
            基于 Hermes
            Agent多智能体架构，集剧情策划、内容创作、角色管理、世界观构建、质量审核于一体的智能网文创作平台。
          </p>
          <div className="flex gap-3">
            <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md" onClick={openCreateDialog}>
              <Plus className="size-4 mr-2" />
              创建新作品
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentView("agents")}
            >
              <Bot className="size-4 mr-2" />
              了解 Agent 系统
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">作品总数</CardTitle>
            <BookOpen className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{novels.length}</div>
            <p className="text-xs text-muted-foreground">部作品</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">总字数</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalWords.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">字</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">章节总数</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChapters}</div>
            <p className="text-xs text-muted-foreground">章</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">创作中</CardTitle>
            <Target className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{writingNovels}</div>
            <p className="text-xs text-muted-foreground">部进行中</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Novels */}
      <div className="flex-1 min-h-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">我的作品</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentView("novels")}
          >
            查看全部 <ArrowRight className="size-4 ml-1" />
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full mb-2" />
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : novels.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="size-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
                <BookOpen className="size-8 text-amber-500" />
              </div>
              <div className="text-center">
                <h3 className="font-medium mb-1">还没有作品</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  创建你的第一部网文，让 Hermes Agent 助力你的创作
                </p>
                <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white" onClick={openCreateDialog}>
                  <Plus className="size-4 mr-2" />
                  开始创作
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {novels.slice(0, 6).map((novel) => (
              <Card
                key={novel.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openNovel(novel)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base line-clamp-1">
                      {novel.title}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className={
                        NOVEL_STATUS_MAP[
                          novel.status as keyof typeof NOVEL_STATUS_MAP
                        ]?.color
                      }
                    >
                      {
                        NOVEL_STATUS_MAP[
                          novel.status as keyof typeof NOVEL_STATUS_MAP
                        ]?.label || novel.status
                      }
                    </Badge>
                  </div>
                  {novel.genre && (
                    <CardDescription className="text-xs">
                      {novel.genre}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {novel.description || "暂无简介"}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{novel._count?.chapters || 0} 章</span>
                      <span>{novel.wordCount.toLocaleString()} 字</span>
                    </div>
                    <Progress
                      value={
                        novel.status === "completed"
                          ? 100
                          : Math.min(
                              30,
                              (novel._count?.chapters || 0) * 5
                            )
                      }
                      className="h-1.5"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
