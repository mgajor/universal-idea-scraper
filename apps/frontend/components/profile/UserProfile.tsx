"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Code,
    Briefcase,
    TrendingUp,
    Target,
    CheckCircle2,
    X,
    Save,
    Sparkles,
} from "lucide-react";

// User profile for calculating "Your Fit" score
export interface UserProfile {
    name: string;
    skills: string[];
    experience: "beginner" | "intermediate" | "expert";
    preferredAudiences: string[];
    preferredMonetization: string[];
    weeklyHours: number;
    techStack: string[];
}

const DEFAULT_PROFILE: UserProfile = {
    name: "",
    skills: [],
    experience: "intermediate",
    preferredAudiences: [],
    preferredMonetization: [],
    weeklyHours: 20,
    techStack: [],
};

const SKILL_OPTIONS = [
    "Frontend Development",
    "Backend Development",
    "Mobile Development",
    "AI/ML",
    "Marketing",
    "Sales",
    "Design",
    "Content Creation",
    "SEO",
    "Data Analysis",
    "No-Code Tools",
    "API Integrations",
];

const AUDIENCE_OPTIONS = [
    "SaaS Founders",
    "Agencies",
    "Freelancers",
    "Small Business",
    "Enterprise",
    "Developers",
    "Marketers",
    "Creators",
];

const MONETIZATION_OPTIONS = [
    "SaaS Subscription",
    "One-time Purchase",
    "Marketplace",
    "Services/Consulting",
    "Templates/Downloads",
    "Freemium",
    "Usage-based",
];

const TECH_STACK_OPTIONS = [
    "React/Next.js",
    "Python",
    "Node.js",
    "PostgreSQL",
    "AI/LLM APIs",
    "Stripe",
    "Vercel/Netlify",
    "AWS/GCP",
    "WordPress",
    "Bubble/Webflow",
];

// Calculate fit score based on profile and opportunity
export function calculateFitScore(profile: UserProfile, opportunity: any): number {
    if (!profile.skills.length) return 0;

    let score = 50; // Base score

    // Skill match (+20 max)
    const skillRelevance = profile.skills.filter(s =>
        opportunity.problemStatement?.toLowerCase().includes(s.toLowerCase()) ||
        opportunity.category?.toLowerCase().includes(s.toLowerCase())
    ).length;
    score += Math.min(skillRelevance * 10, 20);

    // Audience match (+15 max)
    const audienceMatch = profile.preferredAudiences.filter(a =>
        opportunity.audiences?.includes(a)
    ).length;
    score += audienceMatch * 5;

    // Monetization match (+10 max)
    const monetizationMatch = profile.preferredMonetization.filter(m =>
        opportunity.monetization?.some((om: string) => om.toLowerCase().includes(m.toLowerCase()))
    ).length;
    score += monetizationMatch * 5;

    // Experience bonus
    if (profile.experience === "expert") score += 10;
    else if (profile.experience === "intermediate") score += 5;

    // Time availability (lower weeks = harder to implement = lower score)
    if (profile.weeklyHours >= 30) score += 5;
    else if (profile.weeklyHours < 10) score -= 5;

    return Math.min(Math.max(score, 0), 100);
}

// Toggle chip component
function ToggleChip({
    label,
    selected,
    onClick,
}: {
    label: string;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selected
                    ? "bg-teal-500 text-white"
                    : "bg-white/[0.05] text-gray-400 hover:bg-white/[0.08]"
                }`}
        >
            {label}
        </button>
    );
}

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (profile: UserProfile) => void;
    initialProfile?: UserProfile;
}

export function UserProfileModal({
    isOpen,
    onClose,
    onSave,
    initialProfile,
}: UserProfileModalProps) {
    const [profile, setProfile] = useState<UserProfile>(initialProfile || DEFAULT_PROFILE);

    const toggleArrayItem = (field: keyof UserProfile, item: string) => {
        const current = profile[field] as string[];
        const updated = current.includes(item)
            ? current.filter(i => i !== item)
            : [...current, item];
        setProfile({ ...profile, [field]: updated });
    };

    const handleSave = () => {
        // Save to localStorage
        localStorage.setItem("userProfile", JSON.stringify(profile));
        onSave(profile);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="w-full max-w-2xl bg-[#0f172a] rounded-2xl border border-white/[0.06] overflow-hidden"
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-violet-500 flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Your Profile</h2>
                                <p className="text-xs text-gray-500">
                                    Personalize "Your Fit" scores
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white">Your Name</label>
                            <input
                                type="text"
                                value={profile.name}
                                onChange={e => setProfile({ ...profile, name: e.target.value })}
                                placeholder="Enter your name"
                                className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50"
                            />
                        </div>

                        {/* Experience */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-teal-400" />
                                Experience Level
                            </label>
                            <div className="flex gap-2">
                                {["beginner", "intermediate", "expert"].map(level => (
                                    <button
                                        key={level}
                                        onClick={() => setProfile({ ...profile, experience: level as any })}
                                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${profile.experience === level
                                                ? "bg-teal-500 text-white"
                                                : "bg-white/[0.05] text-gray-400 hover:bg-white/[0.08]"
                                            }`}
                                    >
                                        {level.charAt(0).toUpperCase() + level.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Weekly Hours */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white flex items-center justify-between">
                                <span>Hours/week available</span>
                                <span className="text-teal-400">{profile.weeklyHours}h</span>
                            </label>
                            <input
                                type="range"
                                min={5}
                                max={50}
                                value={profile.weeklyHours}
                                onChange={e => setProfile({ ...profile, weeklyHours: parseInt(e.target.value) })}
                                className="w-full accent-teal-500"
                            />
                        </div>

                        {/* Skills */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white flex items-center gap-2">
                                <Code className="w-4 h-4 text-violet-400" />
                                Your Skills
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {SKILL_OPTIONS.map(skill => (
                                    <ToggleChip
                                        key={skill}
                                        label={skill}
                                        selected={profile.skills.includes(skill)}
                                        onClick={() => toggleArrayItem("skills", skill)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Preferred Audiences */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white flex items-center gap-2">
                                <Target className="w-4 h-4 text-amber-400" />
                                Preferred Audiences
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {AUDIENCE_OPTIONS.map(aud => (
                                    <ToggleChip
                                        key={aud}
                                        label={aud}
                                        selected={profile.preferredAudiences.includes(aud)}
                                        onClick={() => toggleArrayItem("preferredAudiences", aud)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Preferred Monetization */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-emerald-400" />
                                Preferred Monetization
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {MONETIZATION_OPTIONS.map(mon => (
                                    <ToggleChip
                                        key={mon}
                                        label={mon}
                                        selected={profile.preferredMonetization.includes(mon)}
                                        onClick={() => toggleArrayItem("preferredMonetization", mon)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Tech Stack */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-pink-400" />
                                Tech Stack
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {TECH_STACK_OPTIONS.map(tech => (
                                    <ToggleChip
                                        key={tech}
                                        label={tech}
                                        selected={profile.techStack.includes(tech)}
                                        onClick={() => toggleArrayItem("techStack", tech)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/[0.06] flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-white/[0.05] text-gray-400 font-medium hover:bg-white/[0.08] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-1 py-3 rounded-xl bg-teal-500 text-white font-medium hover:bg-teal-400 transition-colors flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Save Profile
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// Hook to get/set user profile
export function useUserProfile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem("userProfile");
        if (saved) {
            try {
                setProfile(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse user profile:", e);
            }
        }
    }, []);

    const updateProfile = (newProfile: UserProfile) => {
        setProfile(newProfile);
        localStorage.setItem("userProfile", JSON.stringify(newProfile));
    };

    return { profile, updateProfile };
}

export default UserProfileModal;
