'use client';

import { useState } from 'react';
import type { WorldSetting, WorldSettingCategory } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Globe,
  Plus,
  Sparkles,
  Map,
  Scroll,
  Shield,
  Zap,
  Crown,
  Mountain,
  Compass,
  Building,
  Swords,
  BookOpen,
  Trash2,
  Pencil,
  Save,
  Loader2,
  Layers,
  Archive,
  Clock,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// ===== Props =====
interface WorldviewGalleryProps {
  novelId: string;
  worldSettings: WorldSetting[];
  onRefresh: () => void;
}

// ===== Category Configuration =====
interface CategoryConfig {
  key: WorldSettingCategory;
  label: string;
  icon: React.ElementType;
  bgColor: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  emptyMessage: string;
}

const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    key: 'geography',
    label: '地理环境',
    icon: Map,
    bgColor: 'bg-emerald-50/60 dark:bg-emerald-950/20',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200/60 dark:border-emerald-800/40',
    emptyMessage: '暂无地理设定，点击添加大陆、山脉、河流等地理要素',
  },
  {
    key: 'history',
    label: '历史纪年',
    icon: Clock,
    bgColor: 'bg-amber-50/60 dark:bg-amber-950/20',
    iconBg: 'bg-amber-100 dark:bg-amber-900/60',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200/60 dark:border-amber-800/40',
    emptyMessage: '暂无历史设定，点击添加纪年、重大事件等历史记录',
  },
  {
    key: 'culture',
    label: '文化风俗',
    icon: Scroll,
    bgColor: 'bg-rose-50/60 dark:bg-rose-950/20',
    iconBg: 'bg-rose-100 dark:bg-rose-900/60',
    iconColor: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-200/60 dark:border-rose-800/40',
    emptyMessage: '暂无文化设定，点击添加风俗、节日、宗教等文化要素',
  },
  {
    key: 'magic',
    label: '魔法体系',
    icon: Zap,
    bgColor: 'bg-violet-50/60 dark:bg-violet-950/20',
    iconBg: 'bg-violet-100 dark:bg-violet-900/60',
    iconColor: 'text-violet-600 dark:text-violet-400',
    borderColor: 'border-violet-200/60 dark:border-violet-800/40',
    emptyMessage: '暂无魔法设定，点击添加修炼体系、法术规则等力量设定',
  },
  {
    key: 'technology',
    label: '科技设定',
    icon: Shield,
    bgColor: 'bg-sky-50/60 dark:bg-sky-950/20',
    iconBg: 'bg-sky-100 dark:bg-sky-900/60',
    iconColor: 'text-sky-600 dark:text-sky-400',
    borderColor: 'border-sky-200/60 dark:border-sky-800/40',
    emptyMessage: '暂无科技设定，点击添加科技水平、发明创造等技术要素',
  },
  {
    key: 'other',
    label: '其他设定',
    icon: Layers,
    bgColor: 'bg-gray-50/60 dark:bg-gray-950/20',
    iconBg: 'bg-gray-100 dark:bg-gray-800/60',
    iconColor: 'text-gray-600 dark:text-gray-400',
    borderColor: 'border-gray-200/60 dark:border-gray-700/40',
    emptyMessage: '暂无其他设定，点击添加种族、势力、物品等自定义设定',
  },
];

// ===== Component =====
export default function WorldviewGallery({ novelId, worldSettings, onRefresh }: WorldviewGalleryProps) {
  const { toast } = useToast();
  const { setWorldSettings, worldSettings: storeSettings } = useAppStore();

  // UI state
  const [selectedSetting, setSelectedSetting] = useState<WorldSetting | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Create form state
  const [createName, setCreateName] = useState('');
  const [createCategory, setCreateCategory] = useState<WorldSettingCategory>('geography');
  const [createDescription, setCreateDescription] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<WorldSettingCategory>('geography');
  const [editDescription, setEditDescription] = useState('');

  // Group settings by category
  const groupedSettings = CATEGORY_CONFIGS.map((config) => ({
    ...config,
    settings: worldSettings.filter((s) => s.category === config.key),
  }));

  // ===== Create Setting =====
  const handleCreate = async () => {
    if (!createName.trim()) {
      toast({ title: '请输入设定名称', description: '设定名称不能为空', variant: 'destructive' });
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch('/api/world-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novelId,
          name: createName.trim(),
          category: createCategory,
          description: createDescription.trim(),
        }),
      });
      if (!res.ok) throw new Error('创建失败');
      toast({ title: '创建成功', description: `已添加「${createName.trim()}」到${getCategoryLabel(createCategory)}` });
      // Reset form
      setCreateName('');
      setCreateCategory('geography');
      setCreateDescription('');
      setIsCreateOpen(false);
      onRefresh();
    } catch {
      toast({ title: '创建失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  // ===== Delete Setting =====
  const handleDelete = async (id: string, name: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/world-settings?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      toast({ title: '删除成功', description: `已删除「${name}」` });
      setIsDetailOpen(false);
      setSelectedSetting(null);
      setIsEditing(false);
      onRefresh();
    } catch {
      toast({ title: '删除失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  // ===== Open Detail/Edit =====
  const openDetail = (setting: WorldSetting) => {
    setSelectedSetting(setting);
    setEditName(setting.name);
    setEditCategory(setting.category);
    setEditDescription(setting.description);
    setIsEditing(false);
    setIsDetailOpen(true);
  };

  // ===== Save Edit =====
  const handleSaveEdit = async () => {
    if (!selectedSetting || !editName.trim()) {
      toast({ title: '请输入设定名称', description: '设定名称不能为空', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      // Use PUT-like approach: delete old + create new
      // Or better: use the existing data to update via store
      const res = await fetch(`/api/world-settings?id=${selectedSetting.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('更新失败');

      const createRes = await fetch('/api/world-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novelId,
          name: editName.trim(),
          category: editCategory,
          description: editDescription.trim(),
        }),
      });
      if (!createRes.ok) throw new Error('更新失败');

      toast({ title: '保存成功', description: `已更新「${editName.trim()}」` });
      setIsEditing(false);
      setIsDetailOpen(false);
      setSelectedSetting(null);
      onRefresh();
    } catch {
      toast({ title: '保存失败', description: '请稍后重试', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  // ===== Open Create with pre-selected category =====
  const openCreateWithCategory = (category: WorldSettingCategory) => {
    setCreateName('');
    setCreateCategory(category);
    setCreateDescription('');
    setIsCreateOpen(true);
  };

  // Helper to get category label
  const getCategoryLabel = (cat: WorldSettingCategory) => {
    return CATEGORY_CONFIGS.find((c) => c.key === cat)?.label ?? cat;
  };

  // Helper to get category config
  const getCategoryConfig = (cat: WorldSettingCategory) => {
    return CATEGORY_CONFIGS.find((c) => c.key === cat)!;
  };

  // Total setting count
  const totalCount = worldSettings.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
            <Globe className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">世界观设定</h2>
            <p className="text-sm text-muted-foreground">
              共 {totalCount} 个设定 · {CATEGORY_CONFIGS.filter((c) => worldSettings.some((s) => s.category === c.key)).length} 个类别
            </p>
          </div>
        </div>
        <Button
          onClick={() => openCreateWithCategory('geography')}
          className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          新建设定
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Empty overall state */}
          {totalCount === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
                <Wand2 className="w-8 h-8 text-orange-500 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">尚未构建世界观</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                为你的小说创建丰富的世界观设定，包括地理环境、历史纪年、文化风俗、魔法体系等。
                一个完整的世界观是优秀网文的基石。
              </p>
              <Button
                onClick={() => openCreateWithCategory('geography')}
                className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
              >
                <Sparkles className="w-4 h-4" />
                开始构建世界观
              </Button>
            </div>
          )}

          {/* Category Sections */}
          {groupedSettings.map((group) => (
            <section key={group.key} className={cn('rounded-xl border p-5', group.bgColor, group.borderColor)}>
              {/* Category Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', group.iconBg)}>
                    <group.icon className={cn('w-4 h-4', group.iconColor)} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{group.label}</h3>
                    <p className="text-xs text-muted-foreground">{group.settings.length} 个设定</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1.5"
                  onClick={() => openCreateWithCategory(group.key)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加
                </Button>
              </div>

              <Separator className="mb-4 opacity-50" />

              {/* Cards Grid or Empty */}
              {group.settings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.settings.map((setting) => {
                    const config = getCategoryConfig(setting.category);
                    return (
                      <Card
                        key={setting.id}
                        className="group relative cursor-pointer border-border/60 hover:border-border hover:shadow-md transition-all duration-200"
                        onClick={() => openDetail(setting)}
                      >
                        {/* Delete button on hover */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(setting.id, setting.name);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>

                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                                config.iconBg
                              )}
                            >
                              <config.icon className={cn('w-4.5 h-4.5', config.iconColor)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-foreground truncate">
                                {setting.name}
                              </h4>
                              {setting.description && (
                                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3 leading-relaxed">
                                  {setting.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-3">
                            <Badge
                              variant="secondary"
                              className={cn('text-[10px] px-2 py-0.5 font-normal', config.iconBg, config.iconColor)}
                            >
                              {config.label}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center mb-3 opacity-40',
                      group.iconBg
                    )}
                  >
                    <group.icon className={cn('w-6 h-6', group.iconColor)} />
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xs">{group.emptyMessage}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-xs gap-1.5"
                    onClick={() => openCreateWithCategory(group.key)}
                  >
                    <Plus className="w-3 h-3" />
                    添加{group.label}
                  </Button>
                </div>
              )}
            </section>
          ))}
        </div>
      </ScrollArea>

      {/* ===== Create Dialog ===== */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                <Plus className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              新建世界观设定
            </DialogTitle>
            <DialogDescription>为小说添加新的世界观设定要素</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">设定名称</label>
              <Input
                placeholder="例如：天玄大陆、灵气复苏历法、修炼等级体系..."
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                autoFocus
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">设定类别</label>
              <Select value={createCategory} onValueChange={(v) => setCreateCategory(v as WorldSettingCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_CONFIGS.map((cat) => (
                    <SelectItem key={cat.key} value={cat.key}>
                      <span className="flex items-center gap-2">
                        <cat.icon className={cn('w-3.5 h-3.5', cat.iconColor)} />
                        {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">详细描述</label>
              <Textarea
                placeholder="详细描述这个世界观设定的内容..."
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !createName.trim()}
              className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  创建
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Detail/Edit Dialog ===== */}
      <Dialog open={isDetailOpen} onOpenChange={(open) => {
        setIsDetailOpen(open);
        if (!open) {
          setIsEditing(false);
          setSelectedSetting(null);
        }
      }}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          {selectedSetting && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const config = getCategoryConfig(selectedSetting.category);
                    return (
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.iconBg)}>
                        <config.icon className={cn('w-4 h-4', config.iconColor)} />
                      </div>
                    );
                  })()}
                  {isEditing ? '编辑设定' : selectedSetting.name}
                </DialogTitle>
                <DialogDescription>
                  {getCategoryLabel(selectedSetting.category)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {isEditing ? (
                  <>
                    {/* Edit Name */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">设定名称</label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="设定名称"
                      />
                    </div>

                    {/* Edit Category */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">设定类别</label>
                      <Select value={editCategory} onValueChange={(v) => setEditCategory(v as WorldSettingCategory)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_CONFIGS.map((cat) => (
                            <SelectItem key={cat.key} value={cat.key}>
                              <span className="flex items-center gap-2">
                                <cat.icon className={cn('w-3.5 h-3.5', cat.iconColor)} />
                                {cat.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Edit Description */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">详细描述</label>
                      <Textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={8}
                        className="resize-none"
                        placeholder="详细描述这个世界观设定..."
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* View Mode */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">设定名称</label>
                      <p className="text-sm text-foreground bg-muted/50 rounded-lg px-3 py-2 min-h-[36px]">
                        {selectedSetting.name}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">设定类别</label>
                      <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 min-h-[36px]">
                        {(() => {
                          const config = getCategoryConfig(selectedSetting.category);
                          return (
                            <>
                              <config.icon className={cn('w-4 h-4', config.iconColor)} />
                              <Badge
                                variant="secondary"
                                className={cn('text-xs', config.iconBg, config.iconColor)}
                              >
                                {config.label}
                              </Badge>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">详细描述</label>
                      <div className="text-sm text-foreground/80 bg-muted/50 rounded-lg px-3 py-2.5 min-h-[120px] whitespace-pre-wrap leading-relaxed">
                        {selectedSetting.description || (
                          <span className="text-muted-foreground italic">暂无描述</span>
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                      <span>创建于 {new Date(selectedSetting.createdAt).toLocaleDateString('zh-CN')}</span>
                      {selectedSetting.updatedAt !== selectedSetting.createdAt && (
                        <span>更新于 {new Date(selectedSetting.updatedAt).toLocaleDateString('zh-CN')}</span>
                      )}
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="gap-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                    >
                      取消
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      disabled={isSaving || !editName.trim()}
                      className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          保存
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleDelete(selectedSetting.id, selectedSetting.name)}
                      disabled={isDeleting}
                      className="gap-2"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          删除中...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          删除
                        </>
                      )}
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                      className="gap-2"
                    >
                      <Pencil className="w-4 h-4" />
                      编辑
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
