import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Wallet as WalletIcon, ArrowDownToLine, ArrowUpFromLine, CreditCard, Sparkles, History, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import walletLogo from "@/assets/wallet-logo.png";

export const Route = createFileRoute("/_app/wallet")({ component: WalletPage });

const METHODS = [
  { id: "visa", name: "بطاقة فيزا / ماستركارد", color: "from-blue-600 to-indigo-700", emoji: "💳" },
  { id: "onecash", name: "ون كاش OneCash", color: "from-red-500 to-rose-600", emoji: "🔴" },
  { id: "floosak", name: "فلوسك Floosak", color: "from-emerald-500 to-teal-600", emoji: "💚" },
  { id: "jaib", name: "جيب Jaib", color: "from-amber-500 to-orange-600", emoji: "🟡" },
  { id: "jawali", name: "جوالي Jawali", color: "from-violet-500 to-fuchsia-600", emoji: "📱" },
];

function WalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [txs, setTxs] = useState<any[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [minWithdraw, setMinWithdraw] = useState(10);
  const [openTop, setOpenTop] = useState(false);
  const [openWD, setOpenWD] = useState(false);
  const [method, setMethod] = useState("visa");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [account, setAccount] = useState("");

  const refresh = async () => {
    if (!user) return;
    const [{ data: w }, { data: t }, { data: tu }, { data: wd }, { data: s }] = await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("topup_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("withdrawal_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("app_settings").select("value").eq("key", "min_withdrawal").maybeSingle(),
    ]);
    if (!w && user) await supabase.from("wallets").insert({ user_id: user.id });
    setBalance(Number(w?.balance ?? 0));
    setTxs(t || []);
    setTopups(tu || []);
    setWithdrawals(wd || []);
    if (s) setMinWithdraw(Number(s.value));
  };

  useEffect(() => { refresh(); }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`wallet-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallet_transactions", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const submitTopup = async () => {
    const amt = Number(amount);
    if (!amt || amt < 1) return toast.error("أدخل مبلغًا صحيحًا");
    const { error } = await supabase.from("topup_requests").insert({
      user_id: user!.id, amount: amt, method, reference,
    });
    if (error) return toast.error(error.message);
    toast.success("تم إرسال طلب التعبئة. سيتم مراجعته من قبل الإدارة.");
    setOpenTop(false); setAmount(""); setReference(""); refresh();
  };

  const submitWithdraw = async () => {
    const amt = Number(amount);
    if (!amt || amt < minWithdraw) return toast.error(`الحد الأدنى للسحب ${minWithdraw}$`);
    if (amt > balance) return toast.error("الرصيد غير كافٍ");
    if (!account.trim()) return toast.error("أدخل تفاصيل الحساب");
    const { error } = await supabase.from("withdrawal_requests").insert({
      user_id: user!.id, amount: amt, method, account_info: account,
    });
    if (error) return toast.error(error.message);
    toast.success("تم إرسال طلب السحب. سيتم تحويل المبلغ بعد المراجعة.");
    setOpenWD(false); setAmount(""); setAccount(""); refresh();
  };

  const statusBadge = (s: string) => {
    if (s === "approved" || s === "completed") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0"><CheckCircle2 className="h-3 w-3 ms-1"/>مكتمل</Badge>;
    if (s === "rejected") return <Badge variant="destructive"><XCircle className="h-3 w-3 ms-1"/>مرفوض</Badge>;
    return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0"><Clock className="h-3 w-3 ms-1"/>قيد المراجعة</Badge>;
  };

  const typeLabel = (t: string) => ({
    share_reward: "مكافأة مشاركة", topup: "تعبئة", withdraw: "سحب",
    ad_spend: "حملة إعلانية", admin_credit: "إضافة من الإدارة", admin_debit: "خصم من الإدارة",
  } as any)[t] || t;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Header card */}
      <Card className="p-6 bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/30 overflow-hidden relative">
        <div className="flex items-center gap-4">
          <img src={walletLogo} alt="wallet" width={80} height={80} className="h-20 w-20 object-contain drop-shadow-lg" />
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">رصيد محفظتك</p>
            <h1 className="text-5xl font-black tracking-tight">{balance.toFixed(2)} <span className="text-2xl text-muted-foreground">$</span></h1>
            <p className="text-xs text-muted-foreground mt-1">اربح 1$ مقابل كل مشاركة لمنشور 🎁 — الحد الأدنى للسحب {minWithdraw}$</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Dialog open={openTop} onOpenChange={setOpenTop}>
            <DialogTrigger asChild>
              <Button className="bg-brand-gradient text-primary-foreground border-0 gap-2"><ArrowDownToLine className="h-4 w-4"/>تعبئة المحفظة</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>تعبئة المحفظة</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>طريقة الدفع</Label>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {METHODS.map(m => (
                      <button key={m.id} onClick={() => setMethod(m.id)} className={`p-3 rounded-xl border text-xs font-bold transition ${method === m.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                        <div className={`h-10 rounded-lg bg-gradient-to-br ${m.color} grid place-items-center text-xl mb-2`}>{m.emoji}</div>
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>المبلغ ($)</Label>
                  <Input type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} placeholder="مثلاً 10" />
                </div>
                <div>
                  <Label>رقم العملية / المرجع</Label>
                  <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="رقم التحويل أو آخر 4 أرقام للبطاقة" />
                </div>
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">سيتم مراجعة الطلب وإضافة الرصيد إلى محفظتك بعد التحقق من العملية.</p>
              </div>
              <DialogFooter>
                <Button onClick={submitTopup} className="bg-brand-gradient text-primary-foreground border-0">إرسال الطلب</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={openWD} onOpenChange={setOpenWD}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" disabled={balance < minWithdraw}><ArrowUpFromLine className="h-4 w-4"/>سحب رصيد</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>سحب رصيد</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>طريقة الاستلام</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      {METHODS.map(m => <SelectItem key={m.id} value={m.id}>{m.emoji} {m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>المبلغ ($) — متاح {balance.toFixed(2)}$</Label>
                  <Input type="number" min={minWithdraw} max={balance} value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div>
                  <Label>تفاصيل الحساب / رقم الجوال</Label>
                  <Input value={account} onChange={e => setAccount(e.target.value)} placeholder="رقم الجوال أو حساب الاستلام" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={submitWithdraw} className="bg-brand-gradient text-primary-foreground border-0">تأكيد السحب</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "إجمالي المكافآت", value: txs.filter(t => t.type === "share_reward").reduce((a, b) => a + Number(b.amount), 0).toFixed(2), icon: Sparkles },
          { label: "إجمالي التعبئة", value: txs.filter(t => t.type === "topup").reduce((a, b) => a + Number(b.amount), 0).toFixed(2), icon: ArrowDownToLine },
          { label: "إجمالي السحب", value: txs.filter(t => t.type === "withdraw" && t.status === "completed").reduce((a, b) => a + Number(b.amount), 0).toFixed(2), icon: ArrowUpFromLine },
          { label: "صرف الإعلانات", value: txs.filter(t => t.type === "ad_spend").reduce((a, b) => a + Number(b.amount), 0).toFixed(2), icon: CreditCard },
        ].map((s, i) => (
          <Card key={i} className="p-4">
            <s.icon className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-black">{s.value}$</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="history">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="history"><History className="h-4 w-4 ms-1"/>الحركات</TabsTrigger>
          <TabsTrigger value="topups">طلبات التعبئة</TabsTrigger>
          <TabsTrigger value="withdrawals">طلبات السحب</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          <Card className="p-4 divide-y">
            {txs.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد حركات بعد</p>}
            {txs.map(t => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold">{typeLabel(t.type)}</p>
                  <p className="text-xs text-muted-foreground">{t.note || ""} • {new Date(t.created_at).toLocaleString("ar")}</p>
                </div>
                <div className="text-end">
                  <p className={`font-black ${["withdraw","ad_spend","admin_debit"].includes(t.type) ? "text-rose-600" : "text-emerald-600"}`}>
                    {["withdraw","ad_spend","admin_debit"].includes(t.type) ? "-" : "+"}{Number(t.amount).toFixed(2)}$
                  </p>
                  {statusBadge(t.status)}
                </div>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="topups" className="mt-4">
          <Card className="p-4 divide-y">
            {topups.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد طلبات تعبئة</p>}
            {topups.map(t => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold">{Number(t.amount).toFixed(2)}$ — {METHODS.find(m=>m.id===t.method)?.name || t.method}</p>
                  <p className="text-xs text-muted-foreground">{t.reference} • {new Date(t.created_at).toLocaleString("ar")}</p>
                  {t.admin_note && <p className="text-xs text-rose-600 mt-1">ملاحظة الإدارة: {t.admin_note}</p>}
                </div>
                {statusBadge(t.status)}
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-4">
          <Card className="p-4 divide-y">
            {withdrawals.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد طلبات سحب</p>}
            {withdrawals.map(t => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold">{Number(t.amount).toFixed(2)}$ — {METHODS.find(m=>m.id===t.method)?.name || t.method}</p>
                  <p className="text-xs text-muted-foreground">{t.account_info} • {new Date(t.created_at).toLocaleString("ar")}</p>
                </div>
                {statusBadge(t.status)}
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
