"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  NOVEL_STATUS_MAP,
  GENRE_OPTIONS,
  type Novel,
  type NovelStatus,
} from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileText,
  MoreVertical,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export function NovelsView() {
  const {
    novels,
    setNovels,
    setCurrentView,
    setSelectedNovel,
    setIsCreatingNovel,
  } = useAppStore();

  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingNovel, setEditingNovel] = useState<Novel | null>(null);
  const [deletingNovel, setDeletingNovel] = useState<Novel | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formGenre, setFormGenre] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const loadNovels = useCallback(async () => {
    try {
      const res = await fetch("/api/novels");
      if (res.ok) {
        setNovels(await res.json());
      } else {
        toast({
          title: "加载失败",
          description: "无法获取作品列表，请刷新重试",
          variant: "destructive",
        });
      }
    } catch (e) {
      console.error("Failed to load novels:", e);
      toast({
        title: "网络错误",
        description: "无法连接服务器",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [setNovels, toast]);

  useEffect(() => {
    loadNovels();
  }, [loadNovels]);

  const filteredNovels = novels.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.genre.toLowerCase().includes(search.toLowerCase())
  );

  function resetForm() {
    setFormTitle("");
    setFormDescription("");
    setFormGenre("");
    setEditingNovel(null);
    setFormSubmitting(false);
  }

  function openCreateDialog() {
    resetForm();
    setIsCreatingNovel(true);
  }

  function openEditDialog(novel: Novel) {
    setFormTitle(novel.title);
    setFormDescription(novel.description);
    setFormGenre(novel.genre);
    setEditingNovel(novel);
  }

  async function handleEditSubmit() {
    if (!formTitle.trim() || !editingNovel) return;
    setFormSubmitting(true);

    try {
      const res = await fetch(`/api/novels/${editingNovel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim(),
          genre: formGenre,
        }),
      });
      if (res.ok) {
        toast({
          title: "保存成功",
          description: `《${formTitle.trim()}》信息已更新`,
        });
        resetForm();
        loadNovels();
      } else {
        const err = await res.json();
        throw new Error(err.error || "保存失败");
      }
    } catch (e) {
      toast({
        title: "保存失败",
        description: e instanceof Error ? e.message : "请重试",
        variant: "destructive",
      });
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingNovel) return;
    try {
      const res = await fetch(`/api/novels/${deletingNovel.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast({
          title: "删除成功",
          description: `《${deletingNovel.title}》已删除`,
        });
        setDeletingNovel(null);
        loadNovels();
      } else {
        throw new Error("删除失败");
      }
    } catch (e) {
      toast({
        title: "删除失败",
        description: "请重试",
        variant: "destructive",
      });
    }
  }

  function openNovel(novel: Novel) {
    setSelectedNovel(novel.id);
    setCurrentView("workspace");
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">作品管理</h1>
          <p className="text-sm text-muted-foreground">管理你的所有网文作品</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4 mr-2" />
          创建新作品
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="搜索作品..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Novel Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
      ) : filteredNovels.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <BookOpen className="size-12 text-muted-foreground" />
            <div className="text-center">
              <p className="text-muted-foreground mb-2">
                {search ? "没有找到匹配的作品" : "还没有作品"}
              </p>
              {!search && (
                <Button variant="outline" onClick={openCreateDialog}>
                  <Plus className="size-4 mr-2" />
                  创建你的第一部作品
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredNovels.map((novel) => (
            <Card
              key={novel.id}
              className="group cursor-pointer hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex-1 min-w-0"
                    onClick={() => openNovel(novel)}
                  >
                    <CardTitle className="text-base line-clamp-1">
                      {novel.title}
                    </CardTitle>
                    {novel.genre && (
                      <CardDescription className="text-xs mt-1">
                        {novel.genre}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openNovel(novel)}>
                        <FileText className="size-4 mr-2" />
                        打开编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditDialog(novel)}>
                        <Pencil className="size-4 mr-2" />
                        编辑信息
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setDeletingNovel(novel)}
                      >
                        <Trash2 className="size-4 mr-2" />
                        删除作品
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent
                className="space-y-3"
                onClick={() => openNovel(novel)}
              >
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                  {novel.description || "暂无简介"}
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <Badge
                      variant="secondary"
                      className={
                        NOVEL_STATUS_MAP[novel.status as NovelStatus]?.color
                      }
                    >
                      {NOVEL_STATUS_MAP[novel.status as NovelStatus]?.label}
                    </Badge>
                    <span>{novel.wordCount.toLocaleString()} 字</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{novel._count?.chapters || 0} 章</span>
                    <span>
                      {new Date(novel.updatedAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                  <Progress
                    value={
                      novel.status === "completed"
                        ? 100
                        : Math.min(30, (novel._count?.chapters || 0) * 5)
                    }
                    className="h-1.5"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editingNovel}
        onOpenChange={(open) => !open && resetForm()}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑作品信息</DialogTitle>
            <DialogDescription>修改作品的基本信息</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">作品标题 *</Label>
              <Input
                id="edit-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-genre">类型</Label>
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
              <Label htmlFor="edit-description">作品简介</Label>
              <Textarea
                id="edit-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              取消
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={!formTitle.trim() || formSubmitting}
            >
              {formSubmitting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deletingNovel}
        onOpenChange={(open) => !open && setDeletingNovel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除《{deletingNovel?.title}》吗？此操作不可撤销，所有章节和设定都将被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
