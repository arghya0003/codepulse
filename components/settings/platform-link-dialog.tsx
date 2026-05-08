"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { linkPlatform } from "@/actions/platforms";
import { useAuth } from "@clerk/nextjs";

type Props = {
  platform: string | null; // e.g., 'github', 'leetcode'
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function PlatformLinkDialog({ platform, isOpen, onClose, onSuccess }: Props) {
  const [handle, setHandle] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAuth(); // Clerk Auth context

  if (!platform) return null;

  const titleFormat = platform.charAt(0).toUpperCase() + platform.slice(1);
  const requiresToken = platform === "github";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      if (platform !== "github" && platform !== "leetcode" && platform !== "codeforces" && platform !== "codechef") {
        throw new Error("Invalid platform");
      }
      
      await linkPlatform(userId, platform, handle, requiresToken ? token : undefined);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to link platform");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect {titleFormat}</DialogTitle>
          <DialogDescription>
            {requiresToken 
              ? "Provide your GitHub handle and a Personal Access Token (classic) with public_repo scopes to enable sync."
              : `Enter your ${titleFormat} username or handle to fetch your coding activity.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="handle">Handle / Username</Label>
            <Input
              id="handle"
              required
              placeholder={platform === "github" ? "e.g., torvalds" : "Your username"}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>

          {requiresToken && (
            <div className="space-y-2">
              <Label htmlFor="token">Personal Access Token</Label>
              <Input
                id="token"
                type="password"
                required={requiresToken}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Your token is AES-256 encrypted before being securely stored.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Linking..." : "Link Platform"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
