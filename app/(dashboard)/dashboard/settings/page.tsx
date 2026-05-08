"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PlatformLinkDialog } from "@/components/settings/platform-link-dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getUserPlatforms, unlinkPlatform } from "@/actions/platforms";
import { getUserByClerkId, setUserVisibility } from "@/actions/users";
import { Code2, Trophy, Star, Trash2, Shield, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const PLATFORMS = [
  { id: "github", name: "GitHub", icon: GithubIcon, color: "hsl(210 100% 60%)" },
  { id: "leetcode", name: "LeetCode", icon: Code2, color: "hsl(38 92% 55%)" },
  { id: "codeforces", name: "Codeforces", icon: Trophy, color: "hsl(0 72% 55%)" },
  { id: "codechef", name: "CodeChef", icon: Star, color: "hsl(38 80% 45%)" },
];

function SettingsContent() {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [activeDialogUrl, setActiveDialogUrl] = useState<string | null>(null);
  const [linkedPlatforms, setLinkedPlatforms] = useState<any[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const linkParam = searchParams.get("link");
    if (linkParam) {
      setActiveDialogUrl(linkParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    const [platforms, dbUser] = await Promise.all([
      getUserPlatforms(user.id),
      getUserByClerkId(user.id),
    ]);
    setLinkedPlatforms(platforms);
    if (dbUser) {
      setIsPublic(dbUser.isPublic === 1);
    }
  };

  const handleUnlink = async (platformId: string) => {
    if (!user || !confirm("Are you sure you want to unlink this platform? Realtime sync will stop.")) return;
    await unlinkPlatform(user.id, platformId as any);
    await loadData();
    router.refresh();
  };

  const handleVisibilityToggle = async (checked: boolean) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await setUserVisibility(user.id, checked);
      setIsPublic(checked);
    } finally {
      setIsSaving(false);
    }
  };

  const closeDialog = () => {
    setActiveDialogUrl(null);
    if (searchParams.has("link")) {
      router.replace("/dashboard/settings");
    }
  };

  if (!isLoaded) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your integrations, security, and profile preferences.</p>
      </div>

      <div className="grid gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Privacy
              </CardTitle>
              <CardDescription>
                Control who can view your combined portfolio and statistics.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base flex items-center gap-2">
                  {isPublic ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  Public Profile
                </Label>
                <p className="text-sm text-muted-foreground">
                  If disabled, you will not appear in the friend search leaderboard.
                </p>
              </div>
              <Switch 
                checked={isPublic} 
                onCheckedChange={handleVisibilityToggle} 
                disabled={isSaving}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle>Platform Integrations</CardTitle>
              <CardDescription>
                Connect your coding profiles below. Data is synced in the background every 6 hours.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              {PLATFORMS.map((plat) => {
                const linkedInfo = linkedPlatforms.find((p) => p.platform === plat.id);
                return (
                  <div key={plat.id} className="flex flex-col border border-border/50 rounded-lg p-4 bg-background/50">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <plat.icon className="w-5 h-5" style={{ color: plat.color }} />
                        <span className="font-medium">{plat.name}</span>
                      </div>
                      {linkedInfo ? (
                         <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-500 rounded-full font-medium">
                           Connected
                         </span>
                      ) : (
                         <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full font-medium">
                           Not Connected
                         </span>
                      )}
                    </div>
                    {linkedInfo ? (
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                        <span className="text-sm font-medium">@{linkedInfo.handle}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleUnlink(plat.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-auto">
                        <Button className="w-full" variant="outline" onClick={() => setActiveDialogUrl(plat.id)}>
                          Connect {plat.name}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <PlatformLinkDialog 
        platform={activeDialogUrl} 
        isOpen={!!activeDialogUrl} 
        onClose={closeDialog} 
        onSuccess={() => {
          loadData();
          router.refresh();
        }}
      />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading settings...</div>}>
            <SettingsContent />
          </Suspense>
       </div>
    </div>
  );
}
