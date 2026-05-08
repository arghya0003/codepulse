"use client";

import { useState, useEffect } from "react";
import { searchUsers, getAllUsers, sendFriendRequest, acceptFriendRequest, getPendingRequests, getFriendsLeaderboard } from "@/actions/friends";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, Check, Users, Trophy, Code2, Star, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

const GithubIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const PLATFORM_ICONS: Record<string, any> = {
  github: GithubIcon,
  leetcode: Code2,
  codeforces: Trophy,
  codechef: Star,
};

/** Returns the best available display name for a user row. */
function displayName(u: { username?: string | null; firstName?: string | null; lastName?: string | null }) {
  if (u.username) return u.username;
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return full || "User";
}

export default function FriendsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const loadData = async () => {
    const [reqs, board, discovered] = await Promise.all([
      getPendingRequests(),
      getFriendsLeaderboard(),
      getAllUsers(),
    ]);
    setPendingRequests(reqs);
    setLeaderboard(board);
    setAllUsers(discovered);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery || searchQuery.length < 2) return;
    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setLoadingAction(userId);
    try {
      await sendFriendRequest(userId);
      setSearchResults(prev => prev.filter(u => u.id !== userId));
      setAllUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(err.message || "Failed to send request");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAcceptRequest = async (connId: string) => {
    setLoadingAction(connId);
    try {
      await acceptFriendRequest(connId);
      await loadData(); // refresh lists
    } catch (err: any) {
      alert(err.message || "Failed to accept");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Friends & Leaderboard</h1>
        <p className="text-muted-foreground">Connect with friends and compete for the top spot.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Search & Inbox */}
        <div className="space-y-6 md:col-span-1">
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                Find Friends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                <Input 
                  placeholder="Username or Email..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button type="submit" disabled={isSearching} size="icon">
                  <Search className="w-4 h-4" />
                </Button>
              </form>

              <div className="space-y-3">
                {searchResults.length === 0 && searchQuery && !isSearching && (
                  <p className="text-sm text-muted-foreground text-center py-2">No users found.</p>
                )}
                {searchResults.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-md bg-background/50 border border-border/50">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={u.imageUrl || ""} />
                        <AvatarFallback>{u.firstName?.charAt(0) || u.username?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <p className="text-sm font-medium truncate">{u.username || u.firstName}</p>
                      </div>
                    </div>
                    <Button 
                      size="icon" 
                      variant="secondary" 
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleSendRequest(u.id)}
                      disabled={loadingAction === u.id}
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Discover Users */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Discover Users
              </CardTitle>
              <CardDescription className="text-xs">
                {allUsers.length} member{allUsers.length !== 1 ? "s" : ""} on CodePulse
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  You're connected with everyone! 🎉
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {allUsers.map((u) => (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage src={u.imageUrl || ""} />
                          <AvatarFallback className="text-xs">
                            {(u.firstName || u.username || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                          <p className="text-sm font-medium truncate leading-tight">
                            {u.username || [u.firstName, u.lastName].filter(Boolean).join(" ") || "User"}
                          </p>
                          {u.username && (u.firstName || u.lastName) && (
                            <p className="text-xs text-muted-foreground truncate">
                              {[u.firstName, u.lastName].filter(Boolean).join(" ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 hover:bg-primary/10 hover:text-primary"
                        onClick={() => handleSendRequest(u.id)}
                        disabled={loadingAction === u.id}
                        title="Send friend request"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {pendingRequests.length > 0 && (
            <Card className="border-border/50 bg-card/50 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Incoming Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-2 rounded-md bg-background/50 border border-border/50">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={req.requester.imageUrl || ""} />
                        <AvatarFallback>{req.requester.firstName?.charAt(0) || "?"}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">{req.requester.username || req.requester.firstName}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        size="icon" 
                        variant="default" 
                        className="h-8 w-8 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleAcceptRequest(req.id)}
                        disabled={loadingAction === req.id}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Leaderboard */}
        <div className="md:col-span-2">
          <Card className="border-border/50 bg-card/50 h-full">
            <CardHeader>
              <CardTitle>Global Ranking</CardTitle>
              <CardDescription>Compete against your friends across different metrics.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="contributions">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="contributions">Contributions</TabsTrigger>
                  <TabsTrigger value="questions">Questions Solved</TabsTrigger>
                  <TabsTrigger value="ratings">Platform Ratings</TabsTrigger>
                </TabsList>

                {/* CONTRIBUTIONS TAB */}
                <TabsContent value="contributions" className="space-y-4">
                  {[...leaderboard]
                    .sort((a, b) => b.totalContributions - a.totalContributions)
                    .map((entry, idx) => (
                      <motion.div
                        key={entry.user.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <Link
                          href={entry.isSelf ? "/dashboard" : `/dashboard/profile/${entry.user.id}`}
                          className={`flex items-center justify-between p-4 rounded-xl border transition-colors group ${entry.isSelf ? 'bg-primary/5 border-primary/30' : 'bg-background/50 border-border/50 hover:border-border hover:bg-accent/30'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold shrink-0 ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' : idx === 1 ? 'bg-slate-300/20 text-slate-300' : idx === 2 ? 'bg-amber-700/20 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                              #{idx + 1}
                            </div>
                            <Avatar>
                              <AvatarImage src={entry.user.imageUrl} />
                              <AvatarFallback>{displayName(entry.user).charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold group-hover:text-primary transition-colors">{displayName(entry.user)}</p>
                              <p className="text-xs text-muted-foreground">Level {Math.max(1, Math.floor(entry.totalContributions / 100))}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-2xl font-bold font-mono tracking-tighter text-primary">{entry.totalContributions}</p>
                              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Commits</p>
                            </div>
                            {!entry.isSelf && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                          </div>
                        </Link>
                      </motion.div>
                  ))}
                </TabsContent>

                 {/* QUESTIONS SOLVED TAB */}
                <TabsContent value="questions">
                   <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                       <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                         <tr>
                           <th className="px-4 py-3 rounded-l-lg">Rank</th>
                           <th className="px-4 py-3">User</th>
                           <th className="px-4 py-3 text-center">Total</th>
                           <th className="px-4 py-3 text-center text-orange-400">LeetCode</th>
                           <th className="px-4 py-3 text-center text-red-400">Codeforces</th>
                           <th className="px-4 py-3 text-center text-amber-500 rounded-r-lg">CodeChef</th>
                         </tr>
                       </thead>
                       <tbody>
                         {[...leaderboard]
                           .map(entry => {
                             const hasLc = !!entry.platforms.leetcode;
                             const hasCf = !!entry.platforms.codeforces;
                             const hasCc = !!entry.platforms.codechef;
                             const lc = entry.platforms.leetcode?.problemsSolved || 0;
                             const cf = entry.platforms.codeforces?.problemsSolved || 0;
                             const cc = entry.platforms.codechef?.problemsSolved || 0;
                             const total = lc + cf + cc;
                             return { ...entry, qTotal: total, lc, cf, cc, hasLc, hasCf, hasCc };
                           })
                           .sort((a, b) => b.qTotal - a.qTotal)
                           .map((entry, idx) => (
                             <tr key={entry.user.id} className={`border-b border-border/50 group cursor-pointer transition-colors ${entry.isSelf ? 'bg-primary/5' : 'hover:bg-accent/30'}`}
                               onClick={() => !entry.isSelf && (window.location.href = `/dashboard/profile/${entry.user.id}`)}>
                               <td className="px-4 py-4 font-mono">#{idx + 1}</td>
                               <td className="px-4 py-4 font-medium">
                                 <div className="flex items-center gap-2">
                                   <Avatar className="w-6 h-6 shrink-0">
                                     <AvatarImage src={entry.user.imageUrl} />
                                     <AvatarFallback>{displayName(entry.user).charAt(0).toUpperCase()}</AvatarFallback>
                                   </Avatar>
                                   <span className="group-hover:text-primary transition-colors">{displayName(entry.user)}</span>
                                   {!entry.isSelf && <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                                 </div>
                               </td>
                               <td className="px-4 py-4 text-center font-bold text-primary">{entry.qTotal}</td>
                               <td className="px-4 py-4 text-center">{entry.hasLc ? entry.lc : "-"}</td>
                               <td className="px-4 py-4 text-center">{entry.hasCf ? entry.cf : "-"}</td>
                               <td className="px-4 py-4 text-center">{entry.hasCc ? entry.cc : "-"}</td>
                             </tr>
                           ))}
                       </tbody>
                     </table>
                   </div>
                </TabsContent>

                {/* RATINGS TAB */}
                <TabsContent value="ratings">
                  <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                       <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                         <tr>
                           <th className="px-4 py-3 rounded-l-lg">User</th>
                           <th className="px-4 py-3 text-center text-red-500">Codeforces</th>
                           <th className="px-4 py-3 text-center text-amber-500">CodeChef</th>
                           <th className="px-4 py-3 text-center text-orange-400">LeetCode</th>
                         </tr>
                       </thead>
                       <tbody>
                         {[...leaderboard].map(entry => {
                           const cf = entry.platforms.codeforces?.rating || 0;
                           const cc = entry.platforms.codechef?.rating || 0;
                           const lc = entry.platforms.leetcode?.rating || 0;
                           return { ...entry, cf, cc, lc, maxRat: Math.max(cf, cc, lc) };
                         })
                         .sort((a, b) => b.maxRat - a.maxRat)
                         .map((entry) => (
                             <tr key={entry.user.id} className={`border-b border-border/50 group cursor-pointer transition-colors ${entry.isSelf ? 'bg-primary/5' : 'hover:bg-accent/30'}`}
                               onClick={() => !entry.isSelf && (window.location.href = `/dashboard/profile/${entry.user.id}`)}>
                               <td className="px-4 py-4 font-medium">
                                 <div className="flex items-center gap-2">
                                   <Avatar className="w-6 h-6 shrink-0">
                                     <AvatarImage src={entry.user.imageUrl} />
                                     <AvatarFallback>{displayName(entry.user).charAt(0).toUpperCase()}</AvatarFallback>
                                   </Avatar>
                                   <span className="group-hover:text-primary transition-colors">{displayName(entry.user)}</span>
                                   {!entry.isSelf && <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                                 </div>
                               </td>
                               <td className="px-4 py-4 text-center font-mono">
                                 {entry.cf > 0 ? <span className="text-red-400">{entry.cf}</span> : <span className="text-muted-foreground">-</span>}
                               </td>
                               <td className="px-4 py-4 text-center font-mono">
                                 {entry.cc > 0 ? <span className="text-amber-400">{entry.cc}</span> : <span className="text-muted-foreground">-</span>}
                               </td>
                               <td className="px-4 py-4 text-center font-mono">
                                 {entry.lc > 0 ? <span className="text-orange-400">{Math.round(entry.lc)}</span> : <span className="text-muted-foreground">-</span>}
                               </td>
                             </tr>
                           ))}
                       </tbody>
                     </table>
                   </div>
                </TabsContent>

              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
