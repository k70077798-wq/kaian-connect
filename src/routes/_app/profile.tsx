import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, MapPin, Calendar, Briefcase, Heart, Camera, Loader2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const loadAll = async () => {
    if (!user) return;
    const [{ data: prof }, { data: ps }, { data: friends }, { data: requests }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("friendships").select("*").eq("status", "accepted").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
      supabase.from("friendships").select("*").eq("status", "pending").eq("addressee_id", user.id),
    ]);
    setProfile(prof);
    setPosts(ps || []);
    setFriendsCount((friends || []).length);
    setFollowersCount((friends || []).length + (requests || []).length);
    setPhotos((ps || []).filter((p: any) => p.image_url).map((p: any) => p.image_url));

    const friendIds = (friends || []).map((f: any) => f.requester_id === user.id ? f.addressee_id : f.requester_id);
    if (friendIds.length) {
      const { data: fProfs } = await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", friendIds);
      setFriendsList(fProfs || []);
    } else setFriendsList([]);
  };

  useEffect(() => { loadAll(); }, [user?.id]);

  const uploadFile = async (file: File, kind: "avatar" | "cover") => {
    if (!user) return null;
    if (file.size > 10 * 1024 * 1024) { toast.error("الحد الأقصى 10MB"); return null; }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
    if (error) { toast.error("فشل الرفع"); return null; }
    return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
  };

  const onAvatarChange = async (f: File | null) => {
    if (!f || uploadingAvatar) return;
    setUploadingAvatar(true);
    const url = await uploadFile(f, "avatar");
    if (url) {
      await supabase.from("profiles").update({ avatar_url: url }).eq("id", user!.id);
      setProfile((p: any) => ({ ...p, avatar_url: url }));
      toast.success("تم تحديث الصورة الشخصية");
    }
    setUploadingAvatar(false);
  };

  const onCoverChange = async (f: File | null) => {
    if (!f || uploadingCover) return;
    setUploadingCover(true);
    const url = await uploadFile(f, "cover");
    if (url) {
      await supabase.from("profiles").update({ cover_url: url }).eq("id", user!.id);
      setProfile((p: any) => ({ ...p, cover_url: url }));
      toast.success("تم تحديث صورة الغلاف");
    }
    setUploadingCover(false);
  };

  const openEdit = () => {
    setFullName(profile?.full_name || "");
    setBio(profile?.bio || "");
    setEditOpen(true);
  };

  const saveProfile = async () => {
    if (savingProfile) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, bio }).eq("id", user!.id);
    setSavingProfile(false);
    if (error) return toast.error("تعذر الحفظ");
    setProfile((p: any) => ({ ...p, full_name: fullName, bio }));
    setEditOpen(false);
    toast.success("تم الحفظ");
  };

  if (!profile) return <div className="p-12 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  const initials = (profile.full_name || "K").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <input ref={avatarRef} type="file" accept="image/*" hidden onChange={e => onAvatarChange(e.target.files?.[0] || null)} />
      <input ref={coverRef} type="file" accept="image/*" hidden onChange={e => onCoverChange(e.target.files?.[0] || null)} />

      <Card className="overflow-hidden shadow-card">
        <div className="h-64 sm:h-80 bg-brand-gradient relative group">
          {profile.cover_url && <img src={profile.cover_url} className="absolute inset-0 w-full h-full object-cover" alt="" />}
          <Button
            onClick={() => coverRef.current?.click()}
            disabled={uploadingCover}
            size="sm"
            className="absolute bottom-3 left-3 gap-2 bg-black/60 text-white hover:bg-black/80 backdrop-blur"
          >
            {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            تغيير الغلاف
          </Button>
        </div>
        <div className="px-6 pb-6 -mt-16 flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
          <div className="relative">
            <Avatar className="h-32 w-32 ring-4 ring-card">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-brand-gradient text-primary-foreground text-4xl font-black">{initials}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => avatarRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-1 left-1 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-elegant hover:scale-105 transition disabled:opacity-60"
              aria-label="تغيير الصورة"
            >
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex-1 mt-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black">{profile.full_name || "مستخدم"}</h1>
              {profile.verified && <span className="text-primary text-xl">✓</span>}
            </div>
            <p className="text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
            <div className="mt-3 flex gap-4 text-sm">
              <div className="flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /><b>{friendsCount}</b><span className="text-muted-foreground">صديق</span></div>
              <div className="flex items-center gap-1.5"><UserPlus className="h-4 w-4 text-primary" /><b>{followersCount}</b><span className="text-muted-foreground">متابع</span></div>
              <div className="flex items-center gap-1.5"><b>{posts.length}</b><span className="text-muted-foreground">منشور</span></div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={openEdit} className="bg-brand-gradient gap-2"><Pencil className="h-4 w-4" />تعديل الملف</Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="timeline" className="mt-6">
        <TabsList>
          <TabsTrigger value="timeline">الخط الزمني</TabsTrigger>
          <TabsTrigger value="about">عن</TabsTrigger>
          <TabsTrigger value="friends">الأصدقاء ({friendsCount})</TabsTrigger>
          <TabsTrigger value="photos">الصور</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline" className="mt-4 grid lg:grid-cols-[280px_1fr] gap-6">
          <div className="space-y-4">
            <Card className="p-5 shadow-card">
              <h3 className="font-bold mb-3">المعلومات</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Briefcase className="h-4 w-4" />يعمل في KAIAN</li>
                <li className="flex items-center gap-2"><MapPin className="h-4 w-4" />يعيش في الرياض</li>
                <li className="flex items-center gap-2"><Heart className="h-4 w-4" />الحالة الاجتماعية</li>
                <li className="flex items-center gap-2"><Calendar className="h-4 w-4" />انضم {new Date(profile.created_at).toLocaleDateString("ar")}</li>
              </ul>
            </Card>
            <Card className="p-5 shadow-card">
              <h3 className="font-bold mb-3">الأصدقاء · {friendsCount}</h3>
              <div className="grid grid-cols-3 gap-2">
                {friendsList.slice(0, 9).map(f => (
                  <div key={f.id} className="flex flex-col items-center gap-1">
                    <Avatar className="h-16 w-16 rounded-lg"><AvatarImage src={f.avatar_url ?? undefined} className="rounded-lg" /><AvatarFallback className="rounded-lg bg-muted">{(f.full_name || "K").slice(0, 2)}</AvatarFallback></Avatar>
                    <span className="text-[11px] truncate w-full text-center">{f.full_name}</span>
                  </div>
                ))}
                {friendsList.length === 0 && <p className="col-span-3 text-xs text-muted-foreground text-center py-3">لا يوجد أصدقاء بعد</p>}
              </div>
            </Card>
          </div>
          <div className="space-y-4">
            {posts.length === 0 && <Card className="p-12 text-center text-muted-foreground shadow-card">لا توجد منشورات بعد</Card>}
            {posts.map(p => (
              <Card key={p.id} className="p-4 shadow-card">
                {p.content && <p className="text-sm whitespace-pre-wrap">{p.content}</p>}
                {p.image_url && <img src={p.image_url} className="mt-2 w-full rounded-xl" alt="" />}
                <p className="text-xs text-muted-foreground mt-2">{new Date(p.created_at).toLocaleString("ar")}</p>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="about" className="mt-4">
          <Card className="p-8 shadow-card space-y-3">
            <h3 className="font-bold text-lg">نبذة</h3>
            <p className="text-sm text-muted-foreground">{profile.bio || "لا توجد نبذة بعد. اضغط على \"تعديل الملف\" لإضافة واحدة."}</p>
          </Card>
        </TabsContent>
        <TabsContent value="friends" className="mt-4">
          <Card className="p-6 shadow-card">
            {friendsList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا يوجد أصدقاء بعد</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {friendsList.map(f => (
                  <Card key={f.id} className="p-3 flex flex-col items-center gap-2">
                    <Avatar className="h-20 w-20"><AvatarImage src={f.avatar_url ?? undefined} /><AvatarFallback className="bg-brand-gradient text-primary-foreground">{(f.full_name || "K").slice(0, 2)}</AvatarFallback></Avatar>
                    <p className="font-semibold text-sm">{f.full_name}</p>
                    <p className="text-xs text-muted-foreground">@{f.username}</p>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
        <TabsContent value="photos" className="mt-4">
          <Card className="p-6 shadow-card">
            {photos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد صور بعد</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {photos.map((src, i) => <img key={i} src={src} className="aspect-square w-full rounded-lg object-cover" alt="" />)}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل الملف الشخصي</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold">الاسم الكامل</label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold">نبذة</label>
              <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>إلغاء</Button>
            <Button onClick={saveProfile} disabled={savingProfile} className="bg-brand-gradient gap-2">
              {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
