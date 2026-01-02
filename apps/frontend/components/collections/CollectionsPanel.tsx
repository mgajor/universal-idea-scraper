"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Folder,
    FolderPlus,
    ChevronDown,
    ChevronRight,
    X,
    Loader2,
    MoreHorizontal,
    Trash2,
    Edit3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api, Collection } from "@/lib/api";

// Preset colors for collections
const PRESET_COLORS = [
    "#6366f1", // Indigo
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#f43f5e", // Rose
    "#f97316", // Orange
    "#eab308", // Yellow
    "#22c55e", // Green
    "#14b8a6", // Teal
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
];

interface CollectionsPanelProps {
    onSelectCollection?: (collection: Collection | null) => void;
    selectedCollectionId?: string | null;
    compact?: boolean;
}

export function CollectionsPanel({
    onSelectCollection,
    selectedCollectionId,
    compact = false
}: CollectionsPanelProps) {
    const router = useRouter();
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);

    // Fetch collections
    useEffect(() => {
        fetchCollections();
    }, []);

    async function fetchCollections() {
        try {
            const data = await api.collections.list();
            setCollections(data);
        } catch (e) {
            console.error("Failed to fetch collections:", e);
        } finally {
            setLoading(false);
        }
    }

    async function createCollection() {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const collection = await api.collections.create({
                name: newName,
                color: newColor,
            });
            setCollections([collection, ...collections]);
            setShowCreateModal(false);
            setNewName("");
            setNewColor(PRESET_COLORS[0]);
        } catch (e) {
            console.error("Failed to create collection:", e);
        } finally {
            setCreating(false);
        }
    }

    async function deleteCollection(id: string) {
        try {
            await api.collections.delete(id);
            setCollections(collections.filter(c => c.id !== id));
            setMenuOpen(null);
            if (selectedCollectionId === id) {
                onSelectCollection?.(null);
            }
        } catch (e) {
            console.error("Failed to delete collection:", e);
        }
    }

    return (
        <div className={compact ? "" : "mt-6"}>
            {/* Header */}
            <div className="w-full px-3 mb-2 flex items-center justify-between group">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-gray-400 transition-colors"
                >
                    {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    Collections
                </button>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                    title="Create Collection"
                >
                    <FolderPlus className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Collections List */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-0.5"
                    >
                        {loading ? (
                            <div className="px-3 py-4 flex justify-center">
                                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                            </div>
                        ) : collections.length === 0 ? (
                            <div className="px-3 py-4 text-center">
                                <Folder className="w-6 h-6 mx-auto text-gray-600 mb-2" />
                                <p className="text-xs text-gray-500">No collections yet</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="mt-2 text-xs text-indigo-400 hover:text-indigo-300"
                                >
                                    Create your first
                                </button>
                            </div>
                        ) : (
                            collections.map((collection) => (
                                <div
                                    key={collection.id}
                                    className="relative group"
                                >
                                    <button
                                        onClick={() => onSelectCollection?.(collection)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 ${selectedCollectionId === collection.id
                                            ? "bg-white/[0.08] text-white"
                                            : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                                            }`}
                                    >
                                        <div
                                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                                            style={{ backgroundColor: collection.color }}
                                        />
                                        <span className="text-sm font-medium truncate flex-1 text-left">
                                            {collection.name}
                                        </span>
                                        <span className="text-xs text-gray-500 tabular-nums">
                                            {collection.problem_count}
                                        </span>
                                    </button>

                                    {/* Context Menu Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMenuOpen(menuOpen === collection.id ? null : collection.id);
                                        }}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
                                    >
                                        <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
                                    </button>

                                    {/* Context Menu */}
                                    <AnimatePresence>
                                        {menuOpen === collection.id && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="absolute right-0 top-full mt-1 z-50 bg-[#1a1f2e] border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[120px]"
                                            >
                                                <button
                                                    onClick={() => deleteCollection(collection.id)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Delete
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-[#0f172a] border border-white/10 rounded-xl p-6 w-full max-w-sm shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-white">New Collection</h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-1 hover:bg-white/10 rounded transition-colors"
                                >
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-2">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g., SaaS Ideas Q1"
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-gray-600 focus:border-indigo-500 outline-none transition-colors"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-2">
                                        Color
                                    </label>
                                    <div className="flex gap-2 flex-wrap">
                                        {PRESET_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                onClick={() => setNewColor(color)}
                                                className={`w-7 h-7 rounded-lg transition-all ${newColor === color
                                                    ? "ring-2 ring-white ring-offset-2 ring-offset-[#0f172a] scale-110"
                                                    : "hover:scale-105"
                                                    }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createCollection}
                                    disabled={!newName.trim() || creating}
                                    className="px-4 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                                >
                                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Create
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


// Dropdown component for adding problems to collections
interface AddToCollectionDropdownProps {
    problemId: string;
    onAdded?: () => void;
}

export function AddToCollectionDropdown({ problemId, onAdded }: AddToCollectionDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");

    useEffect(() => {
        if (isOpen && collections.length === 0) {
            fetchCollections();
        }
    }, [isOpen]);

    async function fetchCollections() {
        setLoading(true);
        try {
            const data = await api.collections.list();
            setCollections(data);
        } catch (e) {
            console.error("Failed to fetch collections:", e);
        } finally {
            setLoading(false);
        }
    }

    async function addToCollection(collectionId: string) {
        setAdding(collectionId);
        try {
            await api.collections.addProblems(collectionId, [problemId]);
            onAdded?.();
            setIsOpen(false);
        } catch (e) {
            console.error("Failed to add to collection:", e);
        } finally {
            setAdding(null);
        }
    }

    async function createAndAdd() {
        if (!newName.trim()) return;
        setAdding("new");
        try {
            const collection = await api.collections.create({ name: newName });
            await api.collections.addProblems(collection.id, [problemId]);
            setCollections([collection, ...collections]);
            setNewName("");
            setShowCreate(false);
            onAdded?.();
            setIsOpen(false);
        } catch (e) {
            console.error("Failed to create collection:", e);
        } finally {
            setAdding(null);
        }
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Add to Collection"
            >
                <FolderPlus className="w-4 h-4" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Dropdown */}
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-2 z-50 bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl w-56 overflow-hidden"
                        >
                            <div className="p-2 border-b border-white/5">
                                <p className="text-xs font-medium text-gray-400 px-2">Add to Collection</p>
                            </div>

                            <div className="max-h-48 overflow-y-auto p-2">
                                {loading ? (
                                    <div className="py-4 flex justify-center">
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                                    </div>
                                ) : collections.length === 0 && !showCreate ? (
                                    <div className="py-4 text-center">
                                        <p className="text-xs text-gray-500 mb-2">No collections yet</p>
                                    </div>
                                ) : (
                                    collections.map((collection) => (
                                        <button
                                            key={collection.id}
                                            onClick={() => addToCollection(collection.id)}
                                            disabled={adding === collection.id}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50"
                                        >
                                            <div
                                                className="w-2.5 h-2.5 rounded-sm shrink-0"
                                                style={{ backgroundColor: collection.color }}
                                            />
                                            <span className="truncate flex-1">{collection.name}</span>
                                            {adding === collection.id && (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>

                            {/* Create New */}
                            {showCreate ? (
                                <div className="p-2 border-t border-white/5">
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Collection name..."
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-gray-600 focus:border-indigo-500 outline-none mb-2"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") createAndAdd();
                                            if (e.key === "Escape") setShowCreate(false);
                                        }}
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowCreate(false)}
                                            className="flex-1 text-xs text-gray-400 py-1.5 hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={createAndAdd}
                                            disabled={!newName.trim() || adding === "new"}
                                            className="flex-1 text-xs bg-indigo-500 text-white py-1.5 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                                        >
                                            {adding === "new" && <Loader2 className="w-3 h-3 animate-spin" />}
                                            Create
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowCreate(true)}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-indigo-400 hover:bg-indigo-500/10 border-t border-white/5 transition-colors"
                                >
                                    <FolderPlus className="w-4 h-4" />
                                    Create New Collection
                                </button>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
