import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  Image as ImageIcon, Video, Smile, Send, Youtube, Radio, X, Loader2,
  Globe, Users, Lock, MapPin, Palette, ChevronDown, Type,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Profile {
  id: string; full_name: string | null; username: string | null;
  avatar_url: string | null; verified: boolean | null;
}

const FEELINGS = [
  { e: "😊", t: "سعيد" }, { e: "😍", t: "محب" }, { e: "🥳", t: "محتفل" },
  { e: "😎", t: "رائع" }, { e: "😢", t: "حزين" }, { e: "😡", t: "غاضب" },
  { e: "🤩", t: "متحمس" }, { e: "🙏", t: "ممتن" }, { e: "😴", t: "متعب" },
  { e: "❤️", t: "محبوب" }, { e: "🔥", t: "متقد" }, { e: "✨", t: "ملهم" },
];

const EMOJIS = ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","☺️","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","🔥","✨","🌟","⭐","💫","🎉","🎊","🎁","🌹","🌸","🌺","🌻","🌷","🌼","🌈","☀️","🌙","⚡","💯","💪","👍","👎","👏","🙌","🤝","🙏","✌️","🤞","🤟","🤘","👌","🤌","🤏","👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖","👋","🤙","💋","💍","👑","🎯","🚀","💎","🏆","🥇"];

const BACKGROUNDS: { id: string; bg: string; text: string }[] = [
  { id: "g1", bg: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)", text: "#fff" },
  { id: "g2", bg: "linear-gradient(135deg,#f093fb 0%,#f5576c 100%)", text: "#fff" },
  { id: "g3", bg: "linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)", text: "#0a2540" },
  { id: "g4", bg: "linear-gradient(135deg,#fa709a 0%,#fee140 100%)", text: "#3a1a00" },
  { id: "g5", bg: "linear-gradient(135deg,#30cfd0 0%,#330867 100%)", text: "#fff" },
  { id: "g6", bg: "linear-gradient(135deg,#0f172a 0%,#1e293b 100%)", text: "#fff" },
  { id: "g7", bg: "linear-gradient(135deg,#11998e 0%,#38ef7d 100%)", text: "#062a25" },
  { id: "g8", bg: "linear-gradient(135deg,#ee0979 0%,#ff6a00 100%)", text: "#fff" },
  { id: "g9", bg: "linear-gradient(135deg,#dd5e89 0%,#f7bb97 100%)", text: "#3a0820" },
];

export function backgroundStyle(id: string | null | undefined): React.CSSProperties | null {
  if (!id) return null;
  const b = BACKGROUNDS.find(x => x.id === id);
  if (!b) return null;
  return { background: b.bg, color: b.text };
}

type Privacy = "public" | "friends" | "only_me";

const PRIVACY_META: Record<Privacy, { label: string; icon: typeof Globe }> = {
  public:   { label: "عام",     icon: Globe },
  friends:  { label: "الأصدقاء", icon: Users },
  only_me:  { label: "أنا فقط",  icon: Lock  },
};

function extractYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

interface Props {
  myProfile: Profile | null;
  onStartLive: () => void;
  onOpenStory: () => void;
}

export function PostComposer({ myProfile, onStartLive }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [youtubeInput, setYoutubeInput] = useState("");
  const [showYoutube, setShowYoutube] = useState(false);
  const [feeling, setFeeling] = useState<string | null>(null);
  const [background, setBackground] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [location, setLocation] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const initials = (s?: string | null) => (s || "K").slice(0, 2).toUpperCase();
  const canUseBackground = !mediaFile && !youtubeInput && content.length <= 130;

  useEffect(() => { if (!canUseBackground) setBackground(null); }, [canUseBackground]);

  const reset = () => {
    setContent(""); setMediaFile(null); setMediaPreview(null); setMediaType(null);
    setYoutubeInput(""); setShowYoutube(false); setFeeling(null); setBackground(null);
    setLocation(""); setShowLocation(false); setProgress(0);
  };

  const onFile = (f: File | null, type: "image" | "video") => {
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) return toast.error("الحد الأقصى 50MB");
    setMediaFile(f); setMediaType(type);
    setMediaPreview(URL.createObjectURL(f));
    setBackground(null);
  };

  const acceptFile = (f: File) => {
    if (f.type.startsWith("image/")) onFile(f, "image");
    else if (f.type.startsWith("video/")) onFile(f, "video");
    else toast.error("نوع الملف غير مدعوم");
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const f = e.clipboardData.files?.[0];
    if (f) { e.preventDefault(); acceptFile(f); }
  };

  const insertAtCursor = (txt: string) => {
    const ta = textRef.current;
    if (!ta) { setContent(c => c + txt); return; }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const next = content.slice(0, start) + txt + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => { ta.focus(); ta.selectionEnd = start + txt.length; });
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const t = setInterval(() => setProgress(p => Math.min(85, p + 7)), 180);
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false });
    clearInterval(t); setProgress(95);
    if (error) { toast.error("فشل رفع الملف"); return null; }
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  };

  const publish = async () => {
    if (!user || publishing) return;
    const yt = youtubeInput ? extractYoutubeId(youtubeInput) : null;
    if (youtubeInput && !yt) return toast.error("رابط يوتيوب غير صالح");
    if (!content.trim() && !mediaFile && !yt && !feeling) return;
    setPublishing(true); setProgress(10);
    let image_url: string | null = null, video_url: string | null = null;
    if (mediaFile && mediaType) {
      const url = await uploadMedia(mediaFile);
      if (!url) { setPublishing(false); setProgress(0); return; }
      if (mediaType === "image") image_url = url; else video_url = url;
    }
    setProgress(100);
    const payload: any = {
      user_id: user.id,
      content: content.trim() || null,
      image_url, video_url,
      youtube_url: yt ? `https://www.youtube.com/embed/${yt}` : null,
      media_type: image_url ? "image" : video_url ? "video" : yt ? "youtube" : null,
      feeling,
      background: canUseBackground ? background : null,
      privacy,
      location: location.trim() || null,
    };
    const { error } = await supabase.from("posts").insert(payload);
    setPublishing(false);
    if (error) return toast.error("تعذر النشر");
    reset(); setOpen(false);
    toast.success("تم النشر!");
  };

  const PrivacyIcon = PRIVACY_META[privacy].icon;
  const bgStyle = background ? backgroundStyle(background) : null;

  // Compact (collapsed) bar
  const CompactBar = (
    <Card className="p-3 sm:p-4 shadow-card">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 sm:h-11 sm:w-11">
          <AvatarImage src={myProfile?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-brand-gradient text-primary-foreground font-bold">{initials(myProfile?.full_name)}</AvatarFallback>
        </Avatar>
        <button
          onClick={() => setOpen(true)}
          className="flex-1 text-start rounded-full bg-muted/70 hover:bg-muted px-4 py-2.5 text-sm text-muted-foreground transition-colors"
        >
          ماذا يدور في بالك يا {myProfile?.full_name?.split(" ")[0] || "صديقي"}؟
        </button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1 border-t pt-2">
        <Button variant="ghost" size="sm" className="gap-1.5 sm:gap-2" onClick={() => { setOpen(true); setTimeout(() => imgRef.current?.click(), 50); }}>
          <ImageIcon className="h-4 w-4 text-green-600" /><span className="hidden xs:inline text-xs sm:text-sm">صورة/فيديو</span><span className="xs:hidden text-xs">صورة</span>
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5 sm:gap-2" onClick={onStartLive}>
          <Radio className="h-4 w-4 text-red-500" /><span className="text-xs sm:text-sm">بث مباشر</span>
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5 sm:gap-2" onClick={() => setOpen(true)}>
          <Smile className="h-4 w-4 text-yellow-500" /><span className="text-xs sm:text-sm">شعور</span>
        </Button>
      </div>
    </Card>
  );

  return (
    <>
      {CompactBar}

      {/* hidden inputs (live outside dialog so they keep refs) */}
      <input ref={imgRef} type="file" accept="image/*" hidden onChange={e => onFile(e.target.files?.[0] || null, "image")} />
      <input ref={vidRef} type="file" accept="video/*" hidden onChange={e => onFile(e.target.files?.[0] || null, "video")} />

      <Dialog open={open} onOpenChange={(v) => { if (!publishing) setOpen(v); }}>
        <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden max-h-[95vh] flex flex-col">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-center">إنشاء منشور</DialogTitle>
          </DialogHeader>

          <div
            className="flex-1 overflow-y-auto p-4 space-y-3"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false);
              const f = e.dataTransfer.files?.[0]; if (f) acceptFile(f);
            }}
          >
            {/* User row + privacy */}
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11">
                <AvatarImage src={myProfile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-brand-gradient text-primary-foreground font-bold">{initials(myProfile?.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate flex items-center gap-1">
                  {myProfile?.full_name || "مستخدم"}
                  {feeling && <span className="text-xs font-normal text-muted-foreground">— يشعر بـ {feeling}</span>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-muted hover:bg-muted/80 px-2 py-1 text-xs font-medium">
                      <PrivacyIcon className="h-3 w-3" />
                      {PRIVACY_META[privacy].label}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {(Object.keys(PRIVACY_META) as Privacy[]).map(p => {
                      const Ic = PRIVACY_META[p].icon;
                      return (
                        <DropdownMenuItem key={p} onClick={() => setPrivacy(p)} className="gap-2">
                          <Ic className="h-4 w-4" />{PRIVACY_META[p].label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Text area / colored background */}
            <div
              className={`relative rounded-xl transition-all ${bgStyle ? "min-h-[220px] flex items-center justify-center p-6" : ""}`}
              style={bgStyle ?? undefined}
            >
              <Textarea
                ref={textRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                onPaste={onPaste}
                placeholder={feeling ? `تشعر بـ ${feeling}...` : "ماذا يدور في بالك؟"}
                maxLength={5000}
                className={
                  bgStyle
                    ? "border-0 bg-transparent resize-none text-center text-2xl font-bold focus-visible:ring-0 placeholder:text-white/70 min-h-[120px] [&]:text-[color:inherit]"
                    : "min-h-[120px] resize-none border-0 bg-transparent text-lg focus-visible:ring-0 px-0"
                }
                style={bgStyle ? { color: bgStyle.color as string } : undefined}
              />
            </div>

            {/* Char counter */}
            {content.length > 0 && (
              <div className="flex justify-end">
                <span className={`text-[11px] ${content.length > 4500 ? "text-destructive" : "text-muted-foreground"}`}>
                  {content.length}/5000
                </span>
              </div>
            )}

            {/* Backgrounds */}
            {canUseBackground && (
              <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
                <button
                  onClick={() => setBackground(null)}
                  className={`shrink-0 h-9 w-9 rounded-lg border-2 grid place-items-center ${!background ? "border-primary" : "border-transparent"} bg-muted`}
                  title="بدون خلفية"
                  aria-label="بدون خلفية"
                >
                  <Type className="h-4 w-4" />
                </button>
                {BACKGROUNDS.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setBackground(b.id)}
                    className={`shrink-0 h-9 w-9 rounded-lg border-2 ${background === b.id ? "border-primary scale-110" : "border-transparent"} transition-transform`}
                    style={{ background: b.bg }}
                    title="خلفية"
                    aria-label="اختيار خلفية"
                  />
                ))}
              </div>
            )}

            {/* Feeling chip */}
            {feeling && (
              <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs">
                <span>تشعر بـ {feeling}</span>
                <button onClick={() => setFeeling(null)}><X className="h-3 w-3" /></button>
              </div>
            )}

            {/* Location */}
            {showLocation && (
              <div className="flex gap-2">
                <Input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="📍 أين أنت؟"
                  className="rounded-full"
                />
                <Button variant="ghost" size="icon" onClick={() => { setShowLocation(false); setLocation(""); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Youtube */}
            {showYoutube && (
              <div className="flex gap-2">
                <Input value={youtubeInput} onChange={e => setYoutubeInput(e.target.value)} placeholder="ألصق رابط يوتيوب هنا..." />
                <Button variant="ghost" size="icon" onClick={() => { setShowYoutube(false); setYoutubeInput(""); }}><X className="h-4 w-4" /></Button>
              </div>
            )}

            {/* Media preview / drag drop */}
            {mediaPreview ? (
              <div className="relative rounded-xl overflow-hidden border">
                {mediaType === "image" ? (
                  <img src={mediaPreview} className="max-h-80 w-full object-cover" alt="" />
                ) : (
                  <video src={mediaPreview} controls className="max-h-80 w-full" />
                )}
                <Button size="icon" variant="secondary" className="absolute top-2 left-2 rounded-full shadow" onClick={() => { setMediaFile(null); setMediaPreview(null); setMediaType(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <AnimatePresence>
                {dragOver && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="rounded-xl border-2 border-dashed border-primary bg-primary/5 p-8 text-center text-sm text-primary font-medium"
                  >
                    أفلت الصورة أو الفيديو هنا
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Youtube preview */}
            {youtubeInput && extractYoutubeId(youtubeInput) && (
              <div className="aspect-video w-full rounded-xl overflow-hidden">
                <iframe className="h-full w-full" src={`https://www.youtube.com/embed/${extractYoutubeId(youtubeInput)}`} allowFullScreen />
              </div>
            )}

            {/* Action toolbar (sticky-ish inside scroll) */}
            <div className="rounded-xl border p-2 flex items-center justify-between flex-wrap gap-1">
              <span className="text-sm font-semibold ps-2">أضف إلى منشورك</span>
              <div className="flex items-center gap-0.5 flex-wrap">
                <Button variant="ghost" size="icon" onClick={() => imgRef.current?.click()} title="صورة">
                  <ImageIcon className="h-5 w-5 text-green-600" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => vidRef.current?.click()} title="فيديو">
                  <Video className="h-5 w-5 text-blue-600" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowYoutube(s => !s)} title="يوتيوب">
                  <Youtube className="h-5 w-5 text-red-600" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" title="إيموجي">
                      <Smile className="h-5 w-5 text-yellow-500" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="end">
                    <div className="text-xs font-semibold mb-2 px-1">المشاعر</div>
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      {FEELINGS.map(f => (
                        <button key={f.t} onClick={() => setFeeling(`${f.e} ${f.t}`)} className={`flex flex-col items-center gap-0.5 rounded-lg p-1.5 hover:bg-muted ${feeling === `${f.e} ${f.t}` ? "bg-muted" : ""}`}>
                          <span className="text-xl">{f.e}</span>
                          <span className="text-[10px]">{f.t}</span>
                        </button>
                      ))}
                    </div>
                    <div className="text-xs font-semibold mb-1 px-1 border-t pt-2">إدراج إيموجي</div>
                    <div className="grid grid-cols-8 gap-0.5 max-h-40 overflow-y-auto">
                      {EMOJIS.map((e, i) => (
                        <button key={i} onClick={() => insertAtCursor(e)} className="text-lg rounded hover:bg-muted p-1">
                          {e}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" onClick={() => setShowLocation(s => !s)} title="الموقع">
                  <MapPin className="h-5 w-5 text-rose-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onStartLive} title="بث مباشر">
                  <Radio className="h-5 w-5 text-red-500" />
                </Button>
                {canUseBackground && (
                  <Button variant="ghost" size="icon" onClick={() => setBackground(background ? null : BACKGROUNDS[0].id)} title="خلفية">
                    <Palette className="h-5 w-5 text-fuchsia-500" />
                  </Button>
                )}
              </div>
            </div>

            {publishing && <Progress value={progress} className="h-1.5" />}
          </div>

          <DialogFooter className="p-4 border-t">
            <Button
              onClick={publish}
              disabled={publishing || (!content.trim() && !mediaFile && !youtubeInput && !feeling)}
              className="w-full rounded-lg bg-brand-gradient font-bold shadow-elegant"
            >
              {publishing ? <><Loader2 className="h-4 w-4 animate-spin ms-2" />جارٍ النشر... {progress}%</> : <><Send className="h-4 w-4 ms-2" />نشر</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
