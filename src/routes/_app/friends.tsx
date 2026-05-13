import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserPlus, Check, X, Search, UserMinus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/friends")({ component: FriendsPage });

interface Profile { id: string; full_name: string | null; username: string | null; avatar_url: string | null; verified: boolean | null; }
interface Friendship { id: string; requester_id: string; addressee_id: string; status: string; created_at: string; }

function FriendsPage() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<{ f: Friendship; p: Profile }[]>([]);
  const [incoming, setIncoming] = useState<{ f: Friendship; p: Profile }[]>([]);
  const [outgoing, setOutgoing] = useState<{ f: Friendship; p: Profile }[]>([]);
  const [suggested, setSuggested] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const initials = (s?: string | null) => (s || "K").slice(0, 2).toUpperCase();

  const load = async () => {
    if (!user) return;
    const { data: fs } = await supabase.from("friendships").select("*").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    const list = (fs || []) as Friendship[];
    const otherIds = list.map(f => f.requester_id === user.id ? f.addressee_id : f.requester_id);
    const { data: profs } = await supabase.from("profiles").select("id, full_name, username, avatar_url, verified").in("id", otherIds.length ? otherIds : ["00000000-0000-0000-0000-000000000000"]);
    const pmap = new Map((profs || []).map(p => [p.id, p as Profile]));
    const decorate = (f: Friendship) => ({ f, p: pmap.get(f.requester_id === user.id ? f.addressee_id : f.requester_id)! });
    setFriends(list.filter(f => f.status === "accepted").map(decorate).filter(x => x.p));
    setIncoming(list.filter(f => f.status === "pending" && f.addressee_id === user.id).map(decorate).filter(x => x.p));
    setOutgoing(list.filter(f => f.status === "pending" && f.requester_id === user.id).map(decorate).filter(x => x.p));

    // suggestions: profiles not connected
    const connectedIds = new Set([...otherIds, user.id]);
    const { data: all } = await supabase.from("profiles").select("id, full_name, username, avatar_url, verified").limit(30);
    setSuggested((all || []).filter(p => !connectedIds.has(p.id)).slice(0, 12) as Profile[]);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase.channel("friends")
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles")
        .select("id, full_name, username, avatar_url, verified")
        .or(`full_name.ilike.%${search}%,username.ilike.%${search}%`)
        .neq("id", user!.id).limit(20);
      setResults((data || []) as Profile[]);
    }, 250);
    return () => clearTimeout(t);
  }, [search, user?.id]);

  const sendRequest = async (otherId: string) => {
    if (!user || busy[otherId]) return;
    setBusy(b => ({ ...b, [otherId]: true }));
    const { error } = await supabase.from("friendships").insert({ requester_id: user.id, addressee_id: otherId, status: "pending" });
    setBusy(b => ({ ...b, [otherId]: false }));
    if (error) return toast.error("تعذر إرسال الطلب");
    toast.success("تم إرسال طلب الصداقة");
  };

  const accept = async (id: string) => {
    setBusy(b => ({ ...b, [id]: true }));
    const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
    setBusy(b => ({ ...b, [id]: false }));
    if (error) return toast.error("تعذر القبول");
    toast.success("تم قبول الصداقة");
  };

  const remove = async (id: string) => {
    setBusy(b => ({ ...b, [id]: true }));
    const { error } = await supabase.from("friendships").delete().eq("id", id);
    setBusy(b => ({ ...b, [id]: false }));
    if (error) return toast.error("تعذر الحذف");
    toast.success("تم");
  };

  const PersonRow = ({ p, actions }: { p: Profile; actions: React.ReactNode }) => (
    <Card className="p-3 flex items-center gap-3">
      <Avatar className="h-12 w-12">
        <AvatarImage src={p.avatar_url ?? undefined} />
        <AvatarFallback className="bg-brand-gradient text-primary-foreground font-bold">{initials(p.full_name)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-bold truncate flex items-center gap-1">{p.full_name || "مستخدم"}{p.verified && <span className="text-primary">✓</span>}</p>
        <p className="text-xs text-muted-foreground truncate">@{p.username || "—"}</p>
      </div>
      <div className="flex gap-2">{actions}</div>
    </Card>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Card className="p-4 shadow-card mb-4">
        <h1 className="text-2xl font-black mb-3">الأصدقاء</h1>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن أشخاص..." className="pr-10 rounded-full bg-muted/60 border-0" />
        </div>
      </Card>

      {search.trim() && (
        <Card className="p-4 mb-4 shadow-card">
          <h3 className="font-bold mb-3">نتائج البحث</h3>
          {results.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">لا توجد نتائج</p> : (
            <div className="grid sm:grid-cols-2 gap-2">
              {results.map(p => (
                <PersonRow key={p.id} p={p} actions={
                  <Button size="sm" onClick={() => sendRequest(p.id)} disabled={busy[p.id]} className="bg-brand-gradient gap-1">
                    {busy[p.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}إضافة
                  </Button>
                } />
              ))}
            </div>
          )}
        </Card>
      )}

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">الطلبات {incoming.length > 0 && <span className="ms-1 rounded-full bg-primary text-primary-foreground text-xs px-1.5">{incoming.length}</span>}</TabsTrigger>
          <TabsTrigger value="friends">أصدقائي ({friends.length})</TabsTrigger>
          <TabsTrigger value="sent">مُرسلة ({outgoing.length})</TabsTrigger>
          <TabsTrigger value="suggested">اقتراحات</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          {incoming.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground shadow-card">لا توجد طلبات صداقة</Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {incoming.map(({ f, p }) => (
                <PersonRow key={f.id} p={p} actions={<>
                  <Button size="sm" onClick={() => accept(f.id)} disabled={busy[f.id]} className="bg-brand-gradient gap-1">
                    {busy[f.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}قبول
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(f.id)} disabled={busy[f.id]}>
                    <X className="h-3 w-3" />
                  </Button>
                </>} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="friends" className="mt-4">
          {friends.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground shadow-card">لا يوجد أصدقاء بعد</Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {friends.map(({ f, p }) => (
                <PersonRow key={f.id} p={p} actions={
                  <Button size="sm" variant="outline" onClick={() => remove(f.id)} disabled={busy[f.id]} className="gap-1">
                    <UserMinus className="h-3 w-3" />إزالة
                  </Button>
                } />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          {outgoing.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground shadow-card">لا توجد طلبات مرسلة</Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {outgoing.map(({ f, p }) => (
                <PersonRow key={f.id} p={p} actions={
                  <Button size="sm" variant="outline" onClick={() => remove(f.id)} disabled={busy[f.id]}>إلغاء</Button>
                } />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="suggested" className="mt-4">
          {suggested.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground shadow-card">لا توجد اقتراحات</Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {suggested.map(p => (
                <PersonRow key={p.id} p={p} actions={
                  <Button size="sm" onClick={() => sendRequest(p.id)} disabled={busy[p.id]} className="bg-brand-gradient gap-1">
                    {busy[p.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}إضافة
                  </Button>
                } />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
