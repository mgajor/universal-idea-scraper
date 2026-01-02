"use client";

import { Search, Command as CommandIcon, CreditCard, LogOut, Settings, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

export function Topbar() {
    const [searchOpen, setSearchOpen] = useState(false);

    // Keyboard shortcut: ⌘K / Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen(prev => !prev);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <header className="fixed top-0 right-0 left-[260px] h-20 z-30 px-8 flex items-center justify-between pointer-events-none">
            {/* Search - Floating Island */}
            <div className="pointer-events-auto">
                <Button
                    variant="outline"
                    className="flex items-center gap-3 px-4 py-6 rounded-xl bg-card/50 backdrop-blur-md border border-border text-sm text-muted-foreground hover:text-foreground hover:border-border hover:shadow-lg transition-all w-80 shadow-black/20 justify-start"
                    onClick={() => setSearchOpen(true)}
                >
                    <Search className="w-4 h-4 text-indigo-400" />
                    <span className="font-medium mr-auto">Search anything...</span>
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </Button>
            </div>

            {/* Right section - Floating Island */}
            <div className="flex items-center gap-3 pointer-events-auto">
                {/* Status Container */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card/50 backdrop-blur-md border border-border shadow-lg shadow-black/20 text-xs">
                    <div className="relative flex items-center justify-center w-2 h-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
                    </div>
                    <span className="font-semibold text-foreground">Connected</span>
                    <div className="w-px h-3 bg-border mx-2" />
                    <span className="text-muted-foreground font-mono">US-EAST</span>
                </div>

                {/* Notifications */}
                <NotificationCenter />

                {/* User Profile */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                            <Avatar className="h-10 w-10 border border-border">
                                <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                                <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-bold">L</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">Local User</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    admin@redditops.io
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem>
                                <User className="mr-2 h-4 w-4" />
                                <span>Profile</span>
                                <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <CreditCard className="mr-2 h-4 w-4" />
                                <span>Billing</span>
                                <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                            <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Command Palette */}
            <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Suggestions">
                        <CommandItem>
                            <CommandIcon className="mr-2 h-4 w-4" />
                            <span>Search Jobs</span>
                        </CommandItem>
                        <CommandItem>
                            <Search className="mr-2 h-4 w-4" />
                            <span>Search Analysis</span>
                        </CommandItem>
                        <CommandItem>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                            <CommandShortcut>⌘S</CommandShortcut>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </header>
    );
}
