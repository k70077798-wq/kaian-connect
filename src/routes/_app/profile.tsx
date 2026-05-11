import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Pencil, MapPin, Calendar, Briefcase, Heart } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

export const Route = createFileRoute("/_app/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data));
    supabase.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setPosts(data || []));
  }, [user?.id]);

  if (!profile) return <div className="p-12 text-center text-muted-foreground">جاري التحميل...</div>;
  const initials = (profile.full_name || "K").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Card className="overflow-hidden shadow-card">
        <div className="h-64 sm:h-80 bg-brand-gradient relative">
          {profile.cover_url && <img src={profile.cover_url} className="absolute inset-0 w-full h-full object-cover" alt="" />}
        </div>
        <div className="px-6 pb-6 -mt-16 flex flex-col sm:flex-row items-start sm:items-end gap-4 sm:gap-6">
          <Avatar className="h-32 w-32 ring-4 ring-card">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="bg-brand-gradient text-primary-foreground text-4xl font-black">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 mt-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black">{profile.full_name || "مستخدم"}</h1>
              {profile.verified && <span className="text-primary text-xl">✓</span>}
            </div>
            <p className="text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
          </div>
          <div className="flex gap-2">
            <Button className="bg-brand-gradient gap-2"><Pencil className="h-4 w-4" />تعديل الملف</Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="timeline" className="mt-6">
        <TabsList>
          <TabsTrigger value="timeline">الخط الزمني</TabsTrigger>
          <TabsTrigger value="about">عن</TabsTrigger>
          <TabsTrigger value="friends">الأصدقاء</TabsTrigger>
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
          </div>
          <div className="space-y-4">
            {posts.length === 0 && <Card className="p-12 text-center text-muted-foreground shadow-card">لا توجد منشورات بعد</Card>}
            {posts.map(p => (
              <Card key={p.id} className="p-4 shadow-card">
                <p className="text-sm">{p.content}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(p.created_at).toLocaleString("ar")}</p>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="about" className="mt-4"><Card className="p-8 shadow-card">قسم "عن" — قيد التطوير.</Card></TabsContent>
        <TabsContent value="friends" className="mt-4"><Card className="p-8 shadow-card">قائمة الأصدقاء — قريباً.</Card></TabsContent>
        <TabsContent value="photos" className="mt-4"><Card className="p-8 shadow-card">ألبوم الصور — قريباً.</Card></TabsContent>
      </Tabs>
    </div>
  );
}
